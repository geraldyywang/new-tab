import {describe, expect, it, vi} from 'vitest';
import {
  classifyWeatherApiError,
  currentWeatherUrl,
  describeWeatherApiProblem,
  isWeatherApiResponse,
  testWeatherApiKey,
} from './weatherApi';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });
}

function apiError(status: number, code: number, message = 'msg') {
  return jsonResponse(status, {error: {code, message}});
}

describe('currentWeatherUrl', () => {
  it('encodes the key and query', () => {
    const url = new URL(currentWeatherUrl('a&b=c d', '43.6,-79.4'));
    expect(url.origin + url.pathname).toBe(
      'https://api.weatherapi.com/v1/current.json',
    );
    expect(url.searchParams.get('key')).toBe('a&b=c d');
    expect(url.searchParams.get('q')).toBe('43.6,-79.4');
    expect(url.searchParams.has('aqi')).toBe(false);
  });

  it('adds aqi=yes on request', () => {
    expect(currentWeatherUrl('k', 'London', {aqi: true})).toBe(
      'https://api.weatherapi.com/v1/current.json?key=k&q=London&aqi=yes',
    );
  });
});

describe('classifyWeatherApiError', () => {
  it.each([
    [401, 1002, 'key'],
    [401, 2006, 'key'],
    [403, 2007, 'quota'],
    [403, 2008, 'disabled'],
  ] as const)(
    'HTTP %i with code %i is a %s problem',
    async (status, code, kind) => {
      const problem = await classifyWeatherApiError(apiError(status, code));
      expect(problem).toMatchObject({kind, code, detail: 'msg'});
    },
  );

  it('treats a bare 401 as a key problem', async () => {
    const res = new Response('nope', {status: 401});
    expect(await classifyWeatherApiError(res)).toMatchObject({kind: 'key'});
  });

  it('does not blame the key for unknown codes or a bare 403', async () => {
    expect(await classifyWeatherApiError(apiError(400, 1006))).toMatchObject({
      kind: 'other',
      status: 400,
      code: 1006,
    });
    expect(
      await classifyWeatherApiError(new Response('', {status: 403})),
    ).toMatchObject({kind: 'other', status: 403});
    expect(
      await classifyWeatherApiError(jsonResponse(500, {error: 'weird'})),
    ).toMatchObject({kind: 'other', status: 500});
  });

  it('has a message for every kind', () => {
    expect(describeWeatherApiProblem({kind: 'key'})).toMatch(/rejected/);
    expect(describeWeatherApiProblem({kind: 'quota'})).toBe(
      'WeatherAPI monthly quota reached.',
    );
    expect(describeWeatherApiProblem({kind: 'disabled'})).toBe(
      'Your key has been disabled.',
    );
    expect(
      describeWeatherApiProblem({kind: 'other', status: 500, detail: 'x'}),
    ).toBe('WeatherAPI returned an error (HTTP 500: x).');
  });
});

describe('testWeatherApiKey', () => {
  it('makes one request for London with the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    expect(await testWeatherApiKey('my key')).toEqual({kind: 'ok'});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.weatherapi.com/v1/current.json?key=my%20key&q=London',
    );
  });

  it('reports an invalid key (401)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiError(401, 2006)));
    expect(await testWeatherApiKey('k')).toEqual({
      kind: 'problem',
      problem: {kind: 'key', code: 2006, detail: 'msg'},
    });
  });

  it('reports an exhausted quota (403 / 2007)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiError(403, 2007)));
    expect(await testWeatherApiKey('k')).toMatchObject({
      kind: 'problem',
      problem: {kind: 'quota'},
    });
  });

  it('reports other HTTP errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', {status: 502})),
    );
    expect(await testWeatherApiKey('k')).toMatchObject({
      kind: 'problem',
      problem: {kind: 'other', status: 502},
    });
  });

  it('reports network errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    expect(await testWeatherApiKey('k')).toEqual({kind: 'network'});
  });

  it('rethrows when aborted', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        controller.abort();
        return Promise.reject(new DOMException('aborted', 'AbortError'));
      }),
    );
    await expect(testWeatherApiKey('k', controller.signal)).rejects.toThrow(
      'aborted',
    );
  });
});

describe('isWeatherApiResponse', () => {
  const valid = {
    location: {name: 'Toronto', region: 'Ontario'},
    current: {temp_c: 3, condition: {text: 'Sunny', code: 1000}},
  };

  it('accepts the fields we rely on', () => {
    expect(isWeatherApiResponse(valid)).toBe(true);
  });

  it.each([
    ['null', null],
    ['an error body', {error: {code: 1006}}],
    ['no current', {location: valid.location}],
    ['no location', {current: valid.current}],
    ['no condition', {location: valid.location, current: {temp_c: 3}}],
    [
      'a string temperature',
      {...valid, current: {...valid.current, temp_c: '3'}},
    ],
  ])('rejects %s', (_, value) => {
    expect(isWeatherApiResponse(value)).toBe(false);
  });
});
