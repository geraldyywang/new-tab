import { useEffect, useState } from "react";
import {
  TiWeatherCloudy,
  TiWeatherDownpour,
  TiWeatherPartlySunny,
  TiWeatherNight,
  TiWeatherShower,
  TiWeatherSnow,
  TiWeatherStormy,
  TiWeatherSunny,
  TiWeatherWindy,
  TiWeatherWindyCloudy,
} from "react-icons/ti";
import WEATHERAPI_API_KEY from "../apikeys";
import WEATHER_CONDITIONS_RAW from "./weatherConditions";

const Weather = () => {
  const [iconMapping, setIconMapping] = useState({});

  // Stores the current location of the user
  const [currentPos, setCurrentPos] = useState("");

  // Stores weather data from API call
  const [temp, setTemp] = useState(20.7);
  const [condition, setCondition] = useState("");
  const [windSpeed, setWindSpeed] = useState(0);
  const [nameRegion, setNameRegion] = useState("");
  const [precipitationIn, setPrecipitationIn] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [isDay, setIsDay] = useState(true);
  const [aqi, setAqi] = useState("1 - 50");
  const [iconSrc, setIconSrc] = useState("");

  const getUserLocation = () => {
    const successCallback = (pos) => {
      setCurrentPos(`${pos.coords.latitude}, ${pos.coords.longitude}`);
    };

    const errorCallback = (err) => {
      console.log(err);
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
  };

  // Get the user's latitude and longitude
  useEffect(() => {
    getUserLocation();

    // Create mapping of condition to icon code
    var mapping = {};
    for (let obj of WEATHER_CONDITIONS_RAW) {
      if (!(obj.day in mapping)) {
        mapping[obj.day] = obj.icon;
      }
      if (!(obj.night in mapping)) {
        mapping[obj.night] = obj.icon;
      }
    }

    setIconMapping(mapping);
  }, []);

  // Get the weather for the user's location
  useEffect(() => {
    if (currentPos != "") {
      fetch(
        `http://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_API_KEY}&q=${currentPos}&aqi=yes`
      )
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          console.log(data.current);
          setTemp(data.current.temp_c);
          setCondition(data.current.condition.text);
          setWindSpeed(data.current.wind_mph);
          setNameRegion(`${data.location.name}, ${data.location.region}`);
          setPrecipitationIn(data.current.precip_in);
          setHumidity(data.current.humidity);
          setIsDay(data.current.is_day === 1);

          const us_epa_index = data.current.air_quality["us-epa-index"];
          console.log(us_epa_index);
          switch (us_epa_index) {
            case 1:
              setAqi("0 - 50");
              break;
            case 2:
              setAqi("51 - 100");
              break;
            case 3:
              setAqi("101 - 150");
              break;
            case 4:
              setAqi("151 - 200");
              break;
            case 5:
              setAqi("201 - 300");
              break;
            case 6:
              setAqi("301 - 500");
              break;
          }

          console.log(condition);
          setIconSrc(`../../assets/${iconMapping[condition]}.png`);
          console.log(iconSrc);
        });
    }
  }, [currentPos]);

  return (
    <div className="flex flex-col px-5 py-3 max-w-xl">
      <h1 className=" text-neutral-500 font-bold text-lg">{nameRegion}</h1>
      <div className="flex flex-row text-neutral-500 items-center">
        <div className="flex flex-row items-center pr-4">
          <img src="C:/Code/new-tab/assets/230.png" />
          <TiWeatherCloudy className="h-16 w-16" />
          <p className="pl-2 font-bold text-2xl">{temp}°C</p>
        </div>

        <p className="pr-2">
          Wind Speed: <p className="font-bold">{windSpeed}mph</p>
        </p>
        <p className="pr-2">
          Preciptation: <p className="font-bold">{precipitationIn}in</p>
        </p>
        <p className="pr-2">
          Humidity: <p className="font-bold">{humidity}</p>
        </p>
        <p className="">
          AQI: <p className="font-bold">{aqi} &#128308;</p>
        </p>
      </div>
    </div>
  );
};

export default Weather;