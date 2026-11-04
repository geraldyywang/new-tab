import { useEffect, useState, type ReactNode } from "react";
import { WEATHERAPI_API_KEY } from "../config";
import WEATHER_CONDITIONS_RAW from "./weatherConditions";

// Subset of https://www.weatherapi.com/docs/ current.json response we use
interface WeatherApiResponse {
  location: { name: string; region: string };
  current: {
    temp_c: number;
    wind_mph: number;
    precip_in: number;
    humidity: number;
    is_day: 0 | 1;
    condition: { text: string; icon: string; code: number };
    air_quality?: { "us-epa-index"?: number };
  };
}

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
  | { status: "locating" }
  | { status: "loading" }
  | { status: "ready"; data: WeatherData }
  | { status: "error"; message: string };

// Condition code -> icon number, built once
const ICON_BY_CODE = new Map(
  WEATHER_CONDITIONS_RAW.map((c) => [c.code, c.icon] as const),
);

// US EPA index -> display string
const AQI_LABELS: Record<number, string> = {
  1: "0 - 50 \u{1F7E2}",
  2: "51 - 100 \u{1F7E1}",
  3: "101 - 150 \u{1F7E0}",
  4: "151 - 200 \u{1F7E0}",
  5: "201 - 300 \u{1F534}",
  6: "301 - 500 \u{1F534}",
};

const toWeatherData = ({
  location,
  current,
}: WeatherApiResponse): WeatherData => {
  const epa = current.air_quality?.["us-epa-index"];
  return {
    place: [location.name, location.region].filter(Boolean).join(", "),
    condition: current.condition.text,
    iconCode: ICON_BY_CODE.get(current.condition.code),
    tempC: current.temp_c,
    windMph: current.wind_mph,
    precipIn: current.precip_in,
    humidity: current.humidity,
    aqi: (epa !== undefined && AQI_LABELS[epa]) || "N/A",
  };
};

const geolocationErrorMessage = (err: GeolocationPositionError): string => {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location access denied — allow it to see local weather.";
    case err.POSITION_UNAVAILABLE:
      return "Your location is unavailable right now.";
    case err.TIMEOUT:
      return "Timed out while getting your location.";
    default:
      return "Could not get your location.";
  }
};

const Stat = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="pr-2 text-base">
    {label}: <span className="block font-bold">{children}</span>
  </div>
);

const initialState = (): WeatherState => {
  if (!WEATHERAPI_API_KEY) {
    return {
      status: "error",
      message: "Missing VITE_WEATHERAPI_API_KEY in .env.",
    };
  }
  if (!("geolocation" in navigator)) {
    return { status: "error", message: "Geolocation is not supported." };
  }
  return { status: "locating" };
};

const Weather = () => {
  const [state, setState] = useState<WeatherState>(initialState);

  useEffect(() => {
    // Missing API key / no geolocation: initialState already holds the error
    if (initialState().status === "error") return;
    const controller = new AbortController();

    const fetchWeather = async (pos: GeolocationPosition) => {
      if (controller.signal.aborted) return;
      setState({ status: "loading" });

      const query = `${pos.coords.latitude},${pos.coords.longitude}`;
      const url =
        `https://api.weatherapi.com/v1/current.json` +
        `?key=${encodeURIComponent(WEATHERAPI_API_KEY)}` +
        `&q=${encodeURIComponent(query)}&aqi=yes`;

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
        const json = (await res.json()) as WeatherApiResponse;
        setState({ status: "ready", data: toWeatherData(json) });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setState({ status: "error", message: "Could not load the weather." });
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => void fetchWeather(pos),
      (err) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: geolocationErrorMessage(err) });
      },
      { maximumAge: 10 * 60 * 1000, timeout: 15_000 },
    );

    return () => controller.abort();
  }, []);

  if (state.status !== "ready") {
    const message =
      state.status === "error"
        ? state.message
        : state.status === "locating"
          ? "Finding your location…"
          : "Loading weather…";
    return <p className="px-5 py-3 text-sm text-neutral-500">{message}</p>;
  }

  const { data } = state;

  return (
    <div className="flex flex-col px-5 py-3">
      {/* Header and weather text */}
      <div className="flex flex-col justify-center text-neutral-500">
        <h2 className="font-bold text-lg pr-3">{data.place}</h2>
        <p className="text-sm">{data.condition}</p>
      </div>

      {/* Stats row */}
      <div className="flex flex-row text-neutral-500 items-center">
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
};

export default Weather;
