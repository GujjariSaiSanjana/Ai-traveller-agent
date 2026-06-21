import { logger } from '../config/logger';

/** Compact weather summary fed into the packing/itinerary prompt. */
export interface WeatherSummary {
  source: 'forecast' | 'climatology';
  avgHighC: number;
  avgLowC: number;
  precipChance: number; // 0-100, mean daily chance over the range
  summary: string;      // human sentence for the prompt
}

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function mean(nums: number[]): number {
  const v = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
}

/**
 * Best-effort weather for a destination over a date range.
 * - Within ~16 days  -> real forecast.
 * - Further out      -> climatology (same dates, previous year, from the archive).
 * Returns null on any failure so the caller can fall back to the season heuristic.
 */
export async function getWeather(destination: string, startDate?: string, endDate?: string): Promise<WeatherSummary | null> {
  if (!destination) return null;

  const geo = await getJson(`${GEO}?name=${encodeURIComponent(destination)}&count=1`);
  const place = geo?.results?.[0];
  if (!place) return null;
  const { latitude, longitude } = place;

  const start = startDate ? new Date(startDate) : null;
  const today = new Date();
  const daysOut = start ? Math.round((start.getTime() - today.getTime()) / 86_400_000) : 0;

  try {
    // No dates, or dates within the forecast window -> forecast.
    if (!start || (daysOut >= 0 && daysOut <= 14)) {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_mean',
        timezone: 'auto',
      });
      if (startDate && endDate) {
        params.set('start_date', startDate);
        params.set('end_date', endDate);
      }
      const d = await getJson(`${FORECAST}?${params}`);
      const daily = d?.daily;
      if (!daily?.temperature_2m_max?.length) return null;
      const high = mean(daily.temperature_2m_max);
      const low = mean(daily.temperature_2m_min);
      const precip = mean(daily.precipitation_probability_mean ?? []);
      return {
        source: 'forecast',
        avgHighC: high,
        avgLowC: low,
        precipChance: precip,
        summary: `Forecast for ${place.name}: average high ${high}°C, low ${low}°C, ~${precip}% daily chance of rain.`,
      };
    }

    // Further out -> same dates last year from the archive as a climatology proxy.
    const lyStart = startDate ? `${start.getFullYear() - 1}${startDate.slice(4)}` : undefined;
    const lyEnd = endDate ? `${new Date(endDate).getFullYear() - 1}${endDate.slice(4)}` : lyStart;
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      start_date: lyStart!,
      end_date: lyEnd!,
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
      timezone: 'auto',
    });
    const d = await getJson(`${ARCHIVE}?${params}`);
    const daily = d?.daily;
    if (!daily?.temperature_2m_max?.length) return null;
    const high = mean(daily.temperature_2m_max);
    const low = mean(daily.temperature_2m_min);
    const rainyDays = (daily.precipitation_sum ?? []).filter((p: number) => p > 1).length;
    const total = daily.temperature_2m_max.length;
    const precip = total ? Math.round((rainyDays / total) * 100) : 0;
    return {
      source: 'climatology',
      avgHighC: high,
      avgLowC: low,
      precipChance: precip,
      summary: `Typical climate for ${place.name} at this time of year: average high ${high}°C, low ${low}°C, rain on ~${precip}% of days.`,
    };
  } catch (err) {
    logger.warn({ err, destination }, 'weather lookup failed');
    return null;
  }
}
