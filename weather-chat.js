const maxApi = require("max-api");

const { OpenWeatherAPI } = require('openweather-api-node');
let weather = new OpenWeatherAPI({
    key: "57eea7e1a116807b6ac9763459a5ac32",
    locationName: "Los Angeles",
    units: "imperial"
});



function getWeather() {
    console.log('Script is going');
    weather.getCurrent().then(data => {
        console.log(data.weather)
        maxApi.outlet(data.weather.main);
    })

}
maxApi.addHandler("getWeather", (msg) => {

    getWeather();
    //console.log()
}); 