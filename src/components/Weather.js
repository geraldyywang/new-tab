import { useEffect, useState } from "react";
import WEATHER_CONDITIONS_RAW from "./weatherConditions";

const Weather = () => {
  const [iconMapping, setIconMapping] = useState({});

  // Stores the current location of the user
  const [currentPos, setCurrentPos] = useState("");

  // Stores weather data from API call
  const [data, setData] = useState("");
  const [temp, setTemp] = useState(0);
  const [condition, setCondition] = useState("");
  const [windSpeed, setWindSpeed] = useState(0);
  const [nameRegion, setNameRegion] = useState("");
  const [precipitationIn, setPrecipitationIn] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [aqi, setAqi] = useState("");
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
    if (currentPos !== "") {
      // Change to `http://api.weatherapi.com/v1/current.json?key=${process.env.REACT_APP_WEATHERAPI_API_KEY}&q=${currentPos}&aqi=yes`
      // for local build and personal usage (might also have to change resdata.data to resdata on line 63)
      fetch(`/.netlify/functions/getWeather?currentPos=${currentPos}`)
        .then((response) => {
          return response.json();
        })
        .then((resdata) => {
          setData(resdata.data);
        });
    }
  }, [currentPos]);

  // Set up rest of weather states
  useEffect(() => {
    if (data !== "") {
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
        default:
          console.log("Not a valid AQI");
      }
    }
  }, [data]);

  // Guarantee loading for icon
  useEffect(() => {
    if (iconMapping !== [] && condition !== "") {
      setIconSrc(`/assets/${iconMapping[condition]}.png`);
    }
  }, [iconMapping, condition]);

  return (
    <div className="flex flex-col px-5 py-3">
      {/* Header and weather text */}
      <div className="flex flex-col justify-center text-neutral-500">
        <h1 className="font-bold text-lg pr-3">{nameRegion}</h1>
        <p className="text-sm">{condition}</p>
      </div>

      {/* Stats row */}
      <div className="flex flex-row text-neutral-500 items-center">
        {/* Icon and temp */}
        <div className="flex flex-row items-center justify-between pr-4">
          <img src={iconSrc} alt={condition} width={40} height={40} />
          <p className="pl-2 font-bold text-xl">{temp}°C</p>
        </div>

        <div className="pr-2 text-base">
          Wind Speed: <p className="font-bold">{windSpeed} mph</p>
        </div>
        <div className="pr-2 text-base">
          Preciptation: <p className="font-bold">{precipitationIn} in</p>
        </div>
        <div className="pr-2 text-base">
          Humidity: <p className="font-bold">{humidity}</p>
        </div>
        <div className="text-base">
          AQI: <p className="font-bold">{aqi}</p>
        </div>
      </div>
    </div>
  );
};

export default Weather;
