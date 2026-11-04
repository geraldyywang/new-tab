import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import Weather from './Weather';

const position = {
  coords: {latitude: 43.65, longitude: -79.38},
} as GeolocationPosition;

const okBody = {
  location: {name: 'Toronto', region: 'Ontario'},
  current: {
    temp_c: 4,
    wind_mph: 10,
    precip_in: 0,
    humidity: 70,
    is_day: 1,
    condition: {text: 'Sunny', icon: '', code: 1000},
  },
};

const respond = (status: number, body: unknown) =>
  vi.stubGlobal(
    'fetch',
    // A fresh Response per call: a body can only be read once
    vi.fn(async () => new Response(JSON.stringify(body), {status})),
  );

const setKey = (key: string) =>
  window.localStorage.setItem('new-tab:weatherApiKey', JSON.stringify(key));

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback) => ok(position),
    },
  });
});

afterEach(() => window.localStorage.clear());

describe('Weather', () => {
  it('asks for a key when none is saved', async () => {
    const onOpenSettings = vi.fn();
    render(<Weather onOpenSettings={onOpenSettings} />);
    await screen.findByText(
      'Add your free WeatherAPI key to see local weather',
    );
    expect(
      screen.getByRole('link', {name: /Get a free key/}).getAttribute('href'),
    ).toBe('https://www.weatherapi.com/signup.aspx');
    fireEvent.click(screen.getByRole('button', {name: 'Open settings'}));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('shows the weather for the saved key', async () => {
    setKey('good-key');
    respond(200, okBody);
    render(<Weather onOpenSettings={() => {}} />);
    await screen.findByText('Toronto, Ontario');
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('key=good-key');
    expect(url).toContain('q=43.65%2C-79.38');
  });

  it('offers settings when the key is invalid', async () => {
    setKey('bad-key');
    respond(401, {error: {code: 2006, message: 'API key is invalid.'}});
    render(<Weather onOpenSettings={() => {}} />);
    await screen.findByText(
      'Your WeatherAPI key was rejected — check it in settings.',
    );
    screen.getByRole('button', {name: 'Open settings'});
  });

  it.each([
    [2007, 'WeatherAPI monthly quota reached.'],
    [2008, 'Your key has been disabled.'],
  ])('explains 403 code %i without blaming the key', async (code, text) => {
    setKey('k');
    respond(403, {error: {code, message: '...'}});
    render(<Weather onOpenSettings={() => {}} />);
    await screen.findByText(text);
    expect(screen.queryByRole('button', {name: 'Open settings'})).toBeNull();
  });

  it('treats a malformed body as a load failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setKey('k');
    respond(200, {location: {name: 'Nowhere'}});
    render(<Weather onOpenSettings={() => {}} />);
    await screen.findByText('Could not load the weather.');
  });
});
