export interface WeatherResult {
  source: 'api' | 'unavailable';
  temperature?: number;
  summary?: string;
  clima?: 'Ensolarado' | 'Nublado' | 'Chuvoso' | 'Tempestade';
}

// WMO weather codes used by Open-Meteo: https://open-meteo.com/en/docs
function classifyWmoCode(code: number): { clima: WeatherResult['clima']; summary: string } {
  if (code === 0 || code === 1) return { clima: 'Ensolarado', summary: code === 0 ? 'Céu limpo' : 'Predominantemente ensolarado' };
  if (code === 2 || code === 3) return { clima: 'Nublado', summary: code === 2 ? 'Parcialmente nublado' : 'Encoberto' };
  if (code === 45 || code === 48) return { clima: 'Nublado', summary: 'Neblina' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { clima: 'Chuvoso', summary: 'Chuva' };
  if (code >= 71 && code <= 86) return { clima: 'Chuvoso', summary: 'Precipitação' };
  if (code >= 95) return { clima: 'Tempestade', summary: 'Tempestade' };
  return { clima: 'Nublado', summary: 'Condição indefinida' };
}

// Best-effort forecast lookup (NF0019 pattern): no lat/lon or any network failure
// falls back to 'unavailable' rather than throwing, so the RDO flow and dashboard
// never get blocked by a flaky/unreachable weather provider.
export async function fetchWeatherForProject(project: { latitude: number | null; longitude: number | null }): Promise<WeatherResult> {
  if (project.latitude === null || project.longitude === null) {
    return { source: 'unavailable' };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${project.latitude}&longitude=${project.longitude}&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { source: 'unavailable' };
    const data = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } };
    if (!data.current || typeof data.current.weather_code !== 'number') return { source: 'unavailable' };
    const { clima, summary } = classifyWmoCode(data.current.weather_code);
    return { source: 'api', temperature: data.current.temperature_2m, summary, clima };
  } catch {
    return { source: 'unavailable' };
  }
}
