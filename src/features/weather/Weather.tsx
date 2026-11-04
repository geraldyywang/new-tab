import {useEffect, useState, type ReactNode} from 'react';
import {useSettings} from '../../settings/storage';
import {
  classifyWeatherApiError,
  currentWeatherUrl,
  describeWeatherApiProblem,
  isWeatherApiResponse,
  WEATHERAPI_SIGNUP_URL,
  type WeatherApiResponse,
} from './weatherApi';
import {Button} from '../../ui/Button';
import {WEATHER_CONDITIONS_RAW} from './weatherConditions';

interface WeatherData {
  place: string;
  condition: string;
  iconCode: number | undefined;
  tempC: number;
  windMph: number;
  precipIn: number;
  humidity: number;
  aqi: string;
}

type WeatherState =
  | {status: 'locating'}
  | {status: 'loading'}
  | {status: 'ready'; data: WeatherData}
  | {status: 'error'; message: string; keyProblem?: boolean};

// Condition code -> icon number, built once
const ICON_BY_CODE = new Map(
  WEATHER_CONDITIONS_RAW.map(c => [c.code, c.icon] as const),
);

// US EPA index -> display string
const AQI_LABELS: Record<number, string> = {
  1: '0 - 50 \u{1F7E2}',
  2: '51 - 100 \u{1F7E1}',
  3: '101 - 150 \u{1F7E0}',
  4: '151 - 200 \u{1F7E0}',
  5: '201 - 300 \u{1F534}',
  6: '301 - 500 \u{1F534}',
};

function toWeatherData({location, current}: WeatherApiResponse): WeatherData {
  const epa = current.air_quality?.['us-epa-index'];
  return {
    place: [location.name, location.region].filter(Boolean).join(', '),
    condition: current.condition.text,
    iconCode: ICON_BY_CODE.get(current.condition.code),
    tempC: current.temp_c,
    windMph: current.wind_mph,
    precipIn: current.precip_in,
    humidity: current.humidity,
    aqi: (epa !== undefined && AQI_LABELS[epa]) || 'N/A',
  };
}

function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location access denied — allow it to see local weather.';
    case err.POSITION_UNAVAILABLE:
      return 'Your location is unavailable right now.';
    case err.TIMEOUT:
      return 'Timed out while getting your location.';
    default:
      return 'Could not get your location.';
  }
}

function Stat({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="pr-2 text-base">
      {label}: <span className="block font-bold">{children}</span>
    </div>
  );
}

function geolocationSupported() {
  return 'geolocation' in navigator;
}

function initialState(): WeatherState {
  return geolocationSupported()
    ? {status: 'locating'}
    : {status: 'error', message: 'Geolocation is not supported.'};
}

interface WeatherProps {
  onOpenSettings: () => void;
}

function MissingKey({onOpenSettings}: WeatherProps) {
  return (
    <div className="px-5 py-3 text-sm text-fg-subtle">
      <p>Add your free WeatherAPI key to see local weather</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button onClick={onOpenSettings}>Open settings</Button>
        <a
          href={WEATHERAPI_SIGNUP_URL}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-fg-muted"
        >
          Get a free key at weatherapi.com
        </a>
      </div>
    </div>
  );
}

// Mounted with key={apiKey}, so a new key starts from a fresh state
function WeatherReport({
  apiKey,
  onOpenSettings,
}: WeatherProps & {apiKey: string}) {
  const [state, setState] = useState<WeatherState>(initialState);

  useEffect(() => {
    // No geolocation: initialState already holds the error
    if (!geolocationSupported()) return;
    const controller = new AbortController();

    async function fetchWeather(pos: GeolocationPosition) {
      if (controller.signal.aborted) return;
      setState({status: 'loading'});

      const query = `${pos.coords.latitude},${pos.coords.longitude}`;
      const url = currentWeatherUrl(apiKey, query, {aqi: true});

      try {
        const res = await fetch(url, {signal: controller.signal});
        if (!res.ok) {
          const problem = await classifyWeatherApiError(res);
          if (problem.kind === 'other') throw new Error(`HTTP ${res.status}`);
          setState({
            status: 'error',
            message: describeWeatherApiProblem(problem),
            // Only a missing/invalid key is fixable in settings
            keyProblem: problem.kind === 'key',
          });
          return;
        }
        const json: unknown = await res.json();
        if (!isWeatherApiResponse(json)) {
          throw new Error('Unexpected weather response');
        }
        setState({status: 'ready', data: toWeatherData(json)});
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setState({status: 'error', message: 'Could not load the weather.'});
      }
    }

    navigator.geolocation.getCurrentPosition(
      pos => void fetchWeather(pos),
      err => {
        if (controller.signal.aborted) return;
        setState({status: 'error', message: geolocationErrorMessage(err)});
      },
      {maximumAge: 10 * 60 * 1000, timeout: 15_000},
    );

    return () => controller.abort();
  }, [apiKey]);

  if (state.status === 'error' && state.keyProblem) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm text-fg-subtle">
        <p>{state.message}</p>
        <Button onClick={onOpenSettings}>Open settings</Button>
      </div>
    );
  }

  if (state.status !== 'ready') {
    const message =
      state.status === 'error'
        ? state.message
        : state.status === 'locating'
          ? 'Finding your location…'
          : 'Loading weather…';
    return <p className="px-5 py-3 text-sm text-fg-subtle">{message}</p>;
  }

  const {data} = state;

  return (
    <div className="flex flex-col px-5 py-3">
      {/* Header and weather text */}
      <div className="flex flex-col justify-center text-fg-subtle">
        <h2 className="font-bold text-lg pr-3">{data.place}</h2>
        <p className="text-sm">{data.condition}</p>
      </div>

      {/* Stats row */}
      <div className="flex flex-row text-fg-subtle items-center">
        <div className="flex flex-row items-center justify-between pr-4">
          {data.iconCode !== undefined && (
            <img
              src={`${import.meta.env.BASE_URL}assets/${data.iconCode}.png`}
              alt={data.condition}
              width={40}
              height={40}
            />
          )}
          <p className="pl-2 font-bold text-xl">{data.tempC}°C</p>
        </div>

        <Stat label="Wind Speed">{data.windMph} mph</Stat>
        <Stat label="Precipitation">{data.precipIn} in</Stat>
        <Stat label="Humidity">{data.humidity}%</Stat>
        <Stat label="AQI">{data.aqi}</Stat>
      </div>
    </div>
  );
}

/** Current weather for the user's location, or a prompt to add an API key. */
export function Weather({onOpenSettings}: WeatherProps) {
  const {loaded, weatherApiKey} = useSettings();
  if (!loaded) return null;
  if (!weatherApiKey) return <MissingKey onOpenSettings={onOpenSettings} />;
  return (
    <WeatherReport
      key={weatherApiKey}
      apiKey={weatherApiKey}
      onOpenSettings={onOpenSettings}
    />
  );
}
