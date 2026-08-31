export interface RainLookupResult {
  hasData: boolean;
  valueMm?: number;
  error?: string;
}

interface EcowittField {
  unit?: string;
  list?: Record<string, string | number>;
}

// Ecowitt returns the daily bucket keyed by epoch seconds inside `list`; with
// cycle_type=1day and a single-day range there is normally exactly one entry.
function lastNumericValue(field: EcowittField | undefined): number | undefined {
  if (!field?.list) return undefined;
  const values = Object.values(field.list)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  return values.length ? values[values.length - 1] : undefined;
}

export async function fetchEcowittDailyRain(
  applicationKey: string,
  apiKey: string,
  mac: string,
  date: string
): Promise<RainLookupResult> {
  const params = new URLSearchParams({
    application_key: applicationKey,
    api_key: apiKey,
    mac,
    start_date: `${date} 00:00:00`,
    end_date: `${date} 23:59:59`,
    cycle_type: '1day',
    call_back: 'rainfall,rainfall_piezo',
    rainfall_unitid: '12', // mm
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://api.ecowitt.net/api/v3/device/history?${params}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { hasData: false, error: `Ecowitt respondeu ${res.status}.` };

    const body = (await res.json()) as {
      code?: number;
      msg?: string;
      data?: { rainfall?: { daily?: EcowittField }; rainfall_piezo?: { daily?: EcowittField } };
    };
    if (body.code !== 0) return { hasData: false, error: body.msg ? `Ecowitt: ${body.msg}` : 'Ecowitt recusou a consulta.' };

    // Piezo (haptic) sensors report under rainfall_piezo; classic tipping-bucket
    // under rainfall. Stations have one or the other, so take whichever answered.
    const value = lastNumericValue(body.data?.rainfall?.daily) ?? lastNumericValue(body.data?.rainfall_piezo?.daily);
    if (value === undefined) return { hasData: false, error: 'A estação não retornou leitura de chuva para esta data.' };
    return { hasData: true, valueMm: value };
  } catch {
    return { hasData: false, error: 'Não foi possível contatar a estação Ecowitt.' };
  }
}
