import { Droplets, Wind, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface WeatherData {
    temperature: number;
    condition: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    aqi: number;
    aqiLabel: string;
    forecast: { day: string; high: number; low: number; icon: string }[];
    alerts: { type: string; message: string }[];
}

const WEATHER_DATA: WeatherData = {
    temperature: 72,
    condition: 'Partly Cloudy',
    icon: '⛅',
    humidity: 45,
    windSpeed: 12,
    aqi: 10,
    aqiLabel: 'Unhealthy',
    forecast: [
        { day: 'Today', high: 75, low: 58, icon: '⛅' },
        { day: 'Thu', high: 78, low: 60, icon: '☀️' },
        { day: 'Fri', high: 72, low: 55, icon: '🌧️' },
    ],
    alerts: [
        { type: 'air', message: 'Poor air quality - Wear N95 masks outdoors' },
    ],
};

export function WeatherWidget() {
    const data = WEATHER_DATA;

    const getAqiColor = (aqi: number) => {
        if (aqi <= 50) return 'text-green-400 bg-green-500/20';
        if (aqi <= 100) return 'text-yellow-400 bg-yellow-500/20';
        if (aqi <= 150) return 'text-orange-400 bg-orange-500/20';
        if (aqi <= 200) return 'text-red-400 bg-red-500/20';
        return 'text-purple-400 bg-purple-500/20';
    };

    return (
        <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/30 rounded-xl p-3 border border-blue-500/20">
            {/* Alert Banner */}
            {data.alerts.length > 0 && (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-orange-500/20 rounded-lg mb-2 border border-orange-500/30">
                    <AlertTriangle size={12} className="text-orange-400 shrink-0" />
                    <p className="text-[10px] text-orange-300 truncate">{data.alerts[0].message}</p>
                </div>
            )}

            <div className="flex items-start justify-between">
                {/* Current Weather */}
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{data.icon}</span>
                    <div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white">{data.temperature}°</span>
                            <span className="text-xs text-gray-400">F</span>
                        </div>
                        <p className="text-xs text-gray-400">{data.condition}</p>
                    </div>
                </div>

                {/* AQI Badge */}
                <div className={clsx(
                    "px-2 py-1 rounded-lg text-center",
                    getAqiColor(data.aqi)
                )}>
                    <p className="text-lg font-bold">{data.aqi}</p>
                    <p className="text-[8px] font-medium uppercase">AQI</p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                    <Droplets size={10} className="text-blue-400" />
                    {data.humidity}%
                </span>
                <span className="flex items-center gap-1">
                    <Wind size={10} className="text-gray-400" />
                    {data.windSpeed} mph
                </span>
                <span className={clsx(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded",
                    getAqiColor(data.aqi)
                )}>
                    {data.aqiLabel}
                </span>
            </div>

            {/* 3-Day Forecast */}
            <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                {data.forecast.map((day, i) => (
                    <div key={i} className="flex-1 text-center">
                        <p className="text-[10px] text-gray-500">{day.day}</p>
                        <span className="text-lg">{day.icon}</span>
                        <p className="text-[10px]">
                            <span className="text-white">{day.high}°</span>
                            <span className="text-gray-500 ml-1">{day.low}°</span>
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
