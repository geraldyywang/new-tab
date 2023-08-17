require("dotenv").config();

const axios = require("axios");

// Lambda function handler
exports.handler = async function (event, context) {
  try {
    const { currentPos } = event.queryStringParameters;
    let response = await axios.get(
      `http://api.weatherapi.com/v1/current.json?key=${process.env.REACT_APP_WEATHERAPI_API_KEY}&q=${currentPos}&aqi=yes`,
      {
        headers: { Accept: "application/json", "Accept-Encoding": "identity" },
        params: { trophies: true },
      }
    );

    let data = response.data;

    return {
      statusCode: 200,
      body: JSON.stringify({ data }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    };
  }
};
