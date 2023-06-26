import { useEffect, useState } from "react";
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
          //   console.log(data.current);
          setTemp(data.current.temp_c);
          setCondition(data.current.condition.text);
          setWindSpeed(data.current.wind_mph);
          setNameRegion(`${data.location.name}, ${data.location.region}`);
          setPrecipitationIn(data.current.precip_in);
          setHumidity(data.current.humidity);

          const us_epa_index = data.current.air_quality["us-epa-index"];

          switch (us_epa_index) {
            case 1:
              setAqi("0 - 50 \uD83D\uDFE2");
              break;
            case 2:
              setAqi("51 - 100 \uD83D\uDFE1");
              break;
            case 3:
              setAqi("101 - 150 \uD83D\uDFE0");
              break;
            case 4:
              setAqi("151 - 200 \uD83D\uDFE0");
              break;
            case 5:
              setAqi("201 - 300 \uD83D\uDD34");
              break;
            case 6:
              setAqi("301 - 500 \uD83D\uDD34");
              break;
          }
        });
    }
  }, [currentPos]);

  // Guarantee loading for icon
  useEffect(() => {
    if (iconMapping !== [] && condition !== "") {
      setIconSrc(`/assets/${iconMapping[condition]}.png`);
      //   console.log(iconSrc);
    }
  }, [iconMapping, condition]);

  return (
    <div className="flex flex-col px-5 py-3">
      <div className="flex flex-col justify-center text-neutral-500">
        <h1 className="font-bold text-lg pr-3">{nameRegion}</h1>
        <p className="text-sm">{condition}</p>
      </div>

      <div className="flex flex-row text-neutral-500 items-center">
        <div className="flex flex-row items-center pr-4">
          <img src={iconSrc} />
          <p className="pl-2 font-bold text-xl">{temp}°C</p>
        </div>

        <p className="pr-2">
          Wind Speed: <p className="font-bold">{windSpeed} mph</p>
        </p>
        <p className="pr-2">
          Preciptation: <p className="font-bold">{precipitationIn} in</p>
        </p>
        <p className="pr-2">
          Humidity: <p className="font-bold">{humidity}</p>
        </p>
        <p className="">
          AQI: <p className="font-bold">{aqi}</p>
        </p>
      </div>
    </div>
  );
};

export default Weather;
