package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class OpenMeteoResponse {
    private CurrentWeather current_weather;
    private CurrentWeatherUnits current_weather_units;
    private Hourly hourly;
    private HourlyUnits hourly_units;

    @Getter
    @Setter
    public static class CurrentWeather {
        private double temperature;
        private double windspeed;
        private int weathercode;
        private String time;
    }

    @Getter
    @Setter
    public static class CurrentWeatherUnits {
        private String windspeed;
    }

    @Getter
    @Setter
    public static class Hourly {
        private List<Integer> precipitation_probability;
        private List<Double> windspeed_10m;
    }

    @Getter
    @Setter
    public static class HourlyUnits {
        private String windspeed_10m;
    }
}
