// Small helpers for https://www.weatherapi.com/docs/

export const WEATHERAPI_SIGNUP_URL = 'https://www.weatherapi.com/signup.aspx';

// Subset of the current.json response we use
export interface WeatherApiResponse {
  location: {name: string; region: string};
  current: {
    temp_c: number;
    wind_mph: number;
    precip_in: number;
    humidity: number;
    is_day: 0 | 1;
    condition: {text: string; icon: string; code: number};
    air_quality?: {'us-epa-index'?: number};
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Minimal shape check so a malformed body can't crash rendering. */
export function isWeatherApiResponse(
  value: unknown,
): value is WeatherApiResponse {
  if (!isObject(value) || !isObject(value.location)) return false;
  const {location, current} = value;
  if (!isObject(current) || !isObject(current.condition)) return false;
  return (
    typeof location.name === 'string' &&
    typeof current.temp_c === 'number' &&
    typeof current.condition.text === 'string' &&
    typeof current.condition.code === 'number'
  );
}

export function currentWeatherUrl(
  apiKey: string,
  query: string,
  {aqi = false}: {aqi?: boolean} = {},
): string {
  return (
    `https://api.weatherapi.com/v1/current.json` +
    `?key=${encodeURIComponent(apiKey)}` +
    `&q=${encodeURIComponent(query)}` +
    (aqi ? '&aqi=yes' : '')
  );
}

/**
 * What went wrong with a failed request. Only `key` means the user should
 * change the key in settings.
 */
export type WeatherApiProblem = {code?: number; detail?: string} & (
  {kind: 'key' | 'quota' | 'disabled'} | {kind: 'other'; status: number}
);

// https://www.weatherapi.com/docs/#intro-error-codes
const KIND_BY_CODE: Record<number, 'key' | 'quota' | 'disabled'> = {
  1002: 'key', // API key not provided
  2006: 'key', // API key provided is invalid
  2007: 'quota', // API key has exceeded calls per month quota
  2008: 'disabled', // API key has been disabled
};

/** Classifies a non-OK response using WeatherAPI's JSON `error.code`. */
export async function classifyWeatherApiError(
  res: Response,
): Promise<WeatherApiProblem> {
  let code: number | undefined;
  let detail: string | undefined;
  try {
    const body: unknown = await res.json();
    const error = isObject(body) && isObject(body.error) ? body.error : {};
    if (typeof error.code === 'number') code = error.code;
    if (typeof error.message === 'string') detail = error.message;
  } catch {
    // Not JSON; classify by status alone
  }

  const kind = code !== undefined ? KIND_BY_CODE[code] : undefined;
  if (kind) return {kind, code, detail};
  if (code === undefined && res.status === 401) return {kind: 'key', detail};
  return {kind: 'other', status: res.status, code, detail};
}

export function describeWeatherApiProblem(problem: WeatherApiProblem) {
  switch (problem.kind) {
    case 'key':
      return 'Your WeatherAPI key was rejected — check it in settings.';
    case 'quota':
      return 'WeatherAPI monthly quota reached.';
    case 'disabled':
      return 'Your key has been disabled.';
    case 'other':
      return `WeatherAPI returned an error (HTTP ${problem.status}${problem.detail ? `: ${problem.detail}` : ''}).`;
  }
}

export type KeyTestResult =
  | {kind: 'ok'}
  | {kind: 'network'}
  | {kind: 'problem'; problem: WeatherApiProblem};

/**
 * Makes a single request for London's current weather to check a key.
 * Rethrows if `signal` aborts the request.
 */
export async function testWeatherApiKey(
  apiKey: string,
  signal?: AbortSignal,
): Promise<KeyTestResult> {
  let res: Response;
  try {
    res = await fetch(currentWeatherUrl(apiKey, 'London'), {signal});
  } catch (err) {
    if (signal?.aborted) throw err;
    return {kind: 'network'};
  }
  if (res.ok) return {kind: 'ok'};
  return {kind: 'problem', problem: await classifyWeatherApiError(res)};
}
