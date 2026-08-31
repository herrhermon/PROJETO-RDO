import { env } from '../../config/env';
import type { RainLookupResult } from './ecowitt.service';

const SGAA_TOKEN_URL = 'https://sgaa.cemaden.gov.br/SGAA/rest/controle-token/tokens';
const PED_ACCUM_URL = 'https://sws.cemaden.gov.br/PED/rest/pcds-acum/acumulados-historicos';

interface AccumRow {
  codestacao?: string;
  acc24hr?: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

// CEMADEN hands out one active token per user and reuses it until expiry, so we
// keep it in memory rather than authenticating on every lookup.
async function getToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  if (!env.cemadenEmail || !env.cemadenPassword) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(SGAA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.cemadenEmail, password: env.cemadenPassword }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: string; timeToExp?: string | number };
    if (!body.token) return null;
    const ttlSeconds = Number(body.timeToExp) || 3600;
    cachedToken = { token: body.token, expiresAt: Date.now() + ttlSeconds * 1000 - 60_000 };
    return body.token;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// The API's `data` parameter is UTC, and acc24hr covers the 24h ending at that
// instant. A Brazilian calendar day (UTC-3) therefore ends at 03:00 UTC the
// following day — querying that gives exactly the local day's accumulated rain.
function utcCutoffForLocalDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1, 3, 0));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}${pad(next.getUTCHours())}${pad(next.getUTCMinutes())}`;
}

async function fetchAccumulations(codibge: string, date: string): Promise<AccumRow[] | { error: string }> {
  const token = await getToken();
  if (!token) return { error: 'Credenciais do CEMADEN não configuradas ou inválidas no servidor.' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const url = `${PED_ACCUM_URL}?codibge=${encodeURIComponent(codibge)}&data=${utcCutoffForLocalDay(date)}`;
    const res = await fetch(url, { headers: { token }, signal: controller.signal });
    if (res.status === 401) {
      cachedToken = null; // force re-auth on the next call
      return { error: 'Sessão com o CEMADEN expirou. Tente novamente.' };
    }
    if (!res.ok) return { error: `CEMADEN respondeu ${res.status}.` };
    const body = (await res.json()) as AccumRow[] | { Alerta?: string };
    if (!Array.isArray(body)) return { error: body.Alerta ?? 'Resposta inesperada do CEMADEN.' };
    return body;
  } catch {
    return { error: 'Não foi possível contatar o CEMADEN.' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCemadenAccumulatedForDate(
  project: { cemaden_station_code: string | null; cemaden_codibge: string | null },
  date: string
): Promise<RainLookupResult> {
  if (!project.cemaden_codibge) {
    return { hasData: false, error: 'Cadastre o código IBGE do município do projeto para consultar o CEMADEN.' };
  }
  const rows = await fetchAccumulations(project.cemaden_codibge, date);
  if (!Array.isArray(rows)) return { hasData: false, error: rows.error };

  const match = project.cemaden_station_code
    ? rows.find((r) => r.codestacao === project.cemaden_station_code)
    : undefined;
  if (!match) {
    return {
      hasData: false,
      error: project.cemaden_station_code
        ? `A estação ${project.cemaden_station_code} não retornou leitura para esta data.`
        : 'Cadastre o código da estação CEMADEN do projeto.',
    };
  }
  if (typeof match.acc24hr !== 'number') return { hasData: false, error: 'A estação não retornou acumulado de 24h para esta data.' };
  return { hasData: true, valueMm: Math.round(match.acc24hr * 100) / 100 };
}

// Powers the station picker in Editar Projeto: lists every station the CEMADEN
// network has in the project's município, so the admin doesn't have to know codes.
export async function listCemadenStations(codibge: string, date: string): Promise<{ stations: string[] } | { error: string }> {
  const rows = await fetchAccumulations(codibge, date);
  if (!Array.isArray(rows)) return rows;
  const stations = rows.map((r) => r.codestacao).filter((c): c is string => !!c);
  return { stations: [...new Set(stations)].sort() };
}
