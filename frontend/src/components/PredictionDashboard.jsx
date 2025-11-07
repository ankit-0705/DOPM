import React, { useState } from "react";

const PredictionDashboard = ({ predictions }) => {
  if (!predictions || predictions.length === 0) return null;

  const [activeDisease, setActiveDisease] = useState(predictions[0]);

  // Helper function to get AQI color and description
  const getAQIInfo = (aqi) => {
    const aqiValue = parseInt(aqi);
    switch (aqiValue) {
      case 1: return { color: "bg-gray-600/20 text-gray-400 border-gray-500/30", label: "Good" };
      case 2: return { color: "bg-gray-500/20 text-gray-300 border-gray-400/30", label: "Moderate" };
      case 3: return { color: "bg-gray-400/20 text-gray-200 border-gray-300/30", label: "Unhealthy" };
      case 4: return { color: "bg-gray-300/20 text-gray-100 border-gray-200/30", label: "Unhealthy" };
      case 5: return { color: "bg-gray-200/20 text-gray-50 border-gray-100/30", label: "Very Unhealthy" };
      default: return { color: "bg-gray-700/20 text-gray-500 border-gray-600/30", label: "Unknown" };
    }
  };

  // Format population with commas
  const formatPopulation = (pop) => {
    if (!pop) return "N/A";
    return pop.toLocaleString();
  };

  // Get weather icon based on description
  const getWeatherIcon = (description, isDay) => {
    const desc = description.toLowerCase().trim();
    if (desc.includes("clear")) return isDay ? "☀️" : "🌙";
    if (desc.includes("cloud")) return "☁️";
    if (desc.includes("rain") || desc.includes("precip")) return "🌧️";
    if (desc.includes("sunny")) return "☀️";
    if (desc.includes("partly")) return "⛅";
    return "🌤️";
  };

  // Get risk status for disease cards
  const getRiskStatus = (outbreak, probability) => {
    const prob = (probability * 100).toFixed(1);
    if (outbreak) {
      return { text: `🚨 Outbreak Expected`, color: "text-red-400", bg: "bg-red-900/20 border-red-600/30" };
    } else if (prob > 70) {
      return { text: "⚠️ High Risk", color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-600/30" };
    } else {
      return { text: "✅ Low Risk", color: "text-gray-400", bg: "bg-gray-800/30 border-gray-600/30" };
    }
  };

  return (
    <div className="py-8 px-4 max-w-7xl mx-auto">
      {/* Main Layout: Left Tall Panel | Right 3-Row Stack */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* LEFT SIDE: Single Tall Panel (Disease Overview + Air Quality) */}
        <div className="xl:col-span-1 space-y-4">
          {/* Disease Overview Section */}
          <div className="bg-black/80 rounded-2xl p-6 shadow-2xl border border-gray-800/50 h-fit backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-200 mb-6 border-b border-gray-700/50 pb-3 flex items-center">
              <span className="mr-2">🦠</span>
              Disease Overview
            </h2>
            <div className="space-y-4">
              {predictions.slice(0, 3).map((p) => {
                const isActive = p.Disease === activeDisease.Disease;
                const risk = getRiskStatus(p.outbreak, p.probability);
                return (
                  <button
                    key={p.Disease}
                    onClick={() => setActiveDisease(p)}
                    disabled={isActive}
                    className={`w-full text-left rounded-xl p-4 transition-all duration-300 ease-out transform hover:scale-[1.02] group ${
                      isActive
                        ? `ring-2 ring-offset-2 ring-offset-black/80 shadow-lg ${risk.bg} border ${risk.color}`
                        : "bg-gray-900/50 hover:bg-gray-800/70 border border-gray-700/50 hover:border-gray-600/70 shadow-md hover:shadow-xl"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-lg font-bold text-white mb-1 group-hover:text-gray-200 transition-colors">
                          {p.Disease}
                        </p>
                        <p className={risk.color}>
                          {risk.text}
                        </p>
                      </div>
                      <div className={`text-xs font-semibold px-3 py-1 rounded-full min-w-[60px] text-center ml-3 ${risk.bg}`}>
                        {(p.probability * 100).toFixed(1)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Air Quality Index Section */}
          <div className="bg-black/80 rounded-2xl p-6 shadow-2xl border border-gray-800/50 h-fit backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-200 mb-6 border-b border-gray-700/50 pb-3 flex items-center">
              <span className="mr-2">🌫️</span>
              Air Quality Index
            </h2>
            
            {/* Air Quality Pollutants */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { key: "PM2.5", value: activeDisease?.PM2_5, unit: "µg/m³", color: "text-gray-300" },
                { key: "PM10", value: activeDisease?.PM10, unit: "µg/m³", color: "text-gray-400" },
                { key: "NO₂", value: activeDisease?.NO2, unit: "ppb", color: "text-red-400" },
                { key: "O₃", value: activeDisease?.O3, unit: "ppb", color: "text-yellow-400" },
                { key: "SO₂", value: activeDisease?.SO2, unit: "ppb", color: "text-purple-400" },
                { key: "CO", value: activeDisease?.CO, unit: "ppm", color: "text-gray-500" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`bg-gray-900/70 p-3 rounded-lg border transition-all hover:scale-105 ${
                    item.value > 50 ? "border-red-500/30 bg-red-900/10" : "border-gray-700/40"
                  }`}
                >
                  <p className={`text-xs mb-1 ${item.color} font-medium`}>{item.key}</p>
                  <p className="text-white font-medium">
                    {item.value?.toFixed(1) ?? "N/A"} {item.unit}
                  </p>
                </div>
              ))}
            </div>

            {/* AQI Summary Card */}
            <div className={`p-4 rounded-xl border transition-all ${
              getAQIInfo(activeDisease?.AQI).color + " shadow-lg"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 font-semibold">Overall AQI</p>
                <div className={`px-3 py-2 rounded-full text-sm font-bold shadow-md ${
                  getAQIInfo(activeDisease?.AQI).color
                }`}>
                  {getAQIInfo(activeDisease?.AQI).label} • {activeDisease?.AQI}
                </div>
              </div>
              <div className="flex justify-between text-xs mb-3">
                <span className="text-gray-400">EPA Index:</span>
                <span className="text-white font-medium">{activeDisease?.US_EPA_Index}</span>
                <span className="text-gray-400">UK Index:</span>
                <span className="text-white font-medium">{activeDisease?.GB_DEFRa_Index}</span>
              </div>
              <div className="w-full bg-gray-800/50 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-700 ${
                    getAQIInfo(activeDisease?.AQI).color
                  }`}
                  style={{ width: `${(activeDisease?.AQI / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Three Stacked Rows */}
        <div className="xl:col-span-3 space-y-5">
          
          {/* 1. TOP ROW: Disease Info + Current Conditions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Disease Info (Left - Clean Layout) */}
            <div className="bg-black/80 rounded-2xl p-6 shadow-2xl border border-gray-800/50 h-80 flex flex-col justify-center items-center text-center backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-bold text-gray-200 tracking-wide">
                {activeDisease?.Disease} Outbreak Analysis
              </h2>
              
              {/* Main Status Icon */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transform transition-all duration-700 ${
                activeDisease?.outbreak 
                  ? "bg-linear-to-br from-red-900/30 to-red-800/30 border-4 border-red-600/50" 
                  : "bg-linear-to-br from-gray-800/30 to-gray-700/30 border-4 border-gray-600/50"
              }`}>
                {activeDisease?.outbreak ? (
                  <span className="text-3xl animate-pulse text-red-400">⚠️</span>
                ) : (
                  <span className="text-3xl opacity-90 text-gray-400">✅</span>
                )}
              </div>
              
              <h3
                className={`text-lg font-black transition-all duration-500 ${
                  activeDisease?.outbreak ? "text-red-400" : "text-gray-400"
                }`}
              >
                {activeDisease?.outbreak
                  ? "HIGH RISK"
                  : "LOW RISK"}
              </h3>
              
              <p className={`text-sm font-semibold ${
                activeDisease?.outbreak ? "text-red-400" : "text-gray-400"
              }`}>
                {activeDisease?.outbreak
                  ? "Outbreak Expected"
                  : "No Outbreak Expected"}
              </p>
              
              {/* Risk Probability Bar */}
              <div className="w-full max-w-xs">
                <div className="w-full h-2 bg-linear-to-r from-gray-800 to-gray-900 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full ${
                      activeDisease?.outbreak
                        ? "bg-linear-to-r from-red-600 to-red-500"
                        : "bg-linear-to-r from-gray-600 to-gray-500"
                    } rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min((activeDisease?.probability * 100), 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-gray-400">0%</span>
                  <span className="text-white font-bold">
                    {(activeDisease?.probability * 100).toFixed(1)}%
                  </span>
                  <span className={`font-bold ${
                    activeDisease?.outbreak ? "text-red-400" : "text-gray-400"
                  }`}>100%</span>
                </div>
              </div>
              
              <p className="text-gray-400 text-sm font-semibold">
                Confidence Level: <span className="text-white">High</span>
              </p>
              
              {activeDisease?.outbreak && activeDisease?.cases && (
                <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-2 w-full max-w-xs">
                  <p className="text-red-400 font-semibold text-xs text-center">
                    ⚠️ {activeDisease.cases.toLocaleString()} cases projected
                  </p>
                </div>
              )}
            </div>

            {/* Current Conditions (Right - Improved Compact Layout) */}
            <div className="bg-black/80 rounded-2xl p-6 shadow-2xl border border-gray-800/50 h-80 backdrop-blur-sm space-y-4">
              <h3 className="text-lg font-bold text-gray-200 border-b border-gray-700/50 pb-3 flex items-center">
                <span className="mr-2">🌤️</span>
                Current Conditions
              </h3>
              
              <div className="grid grid-cols-2 gap-4 h-full">
                {/* Main Weather Display */}
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="text-6xl mb-2">
                    {getWeatherIcon(activeDisease?.Weather_Description, activeDisease?.Is_Day)}
                  </div>
                  <p className="text-xl font-bold text-white capitalize">
                    {activeDisease?.Weather_Description}
                  </p>
                  <p className="text-3xl font-black text-gray-300">
                    {activeDisease?.Temperature}°C
                  </p>
                  <p className="text-gray-400 text-sm">
                    Feels like {activeDisease?.FeelsLike}°C
                  </p>
                  <p className="text-gray-500 text-xs">
                    {activeDisease?.Localtime}
                  </p>
                </div>

                {/* Quick Stats - Vertical Compact */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-900/60 rounded-lg border border-gray-700/40">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Humidity</p>
                      <p className="text-white font-bold">{activeDisease?.Humidity}%</p>
                    </div>
                    <span className="text-xl ml-3">💧</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-900/60 rounded-lg border border-gray-700/40">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Wind</p>
                      <p className="text-white font-bold">{activeDisease?.Wind_Speed} km/h</p>
                    </div>
                    <span className="text-xl ml-3">💨</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-900/60 rounded-lg border border-gray-700/40">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Visibility</p>
                      <p className="text-white font-bold">{activeDisease?.Visibility} km</p>
                    </div>
                    <span className="text-xl ml-3">👁️</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. MIDDLE ROW: Weather Parameters */}
          <div className="bg-black/80 rounded-2xl p-6 shadow-2xl border border-gray-800/50 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700/50 pb-2">
              Weather Parameters
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                { icon: "💧", label: "Humidity", value: `${activeDisease?.Humidity}%`, desc: "Relative humidity level" },
                { icon: "💨", label: "Wind", value: `${activeDisease?.Wind_Speed} km/h ${activeDisease?.Wind_Direction}`, desc: "Wind speed and direction" },
                { icon: "☁️", label: "Cloud Cover", value: `${activeDisease?.Cloud_Cover}%`, desc: "Cloud coverage percentage" },
                { icon: "🌧️", label: "Precipitation", value: `${activeDisease?.Precipitation} mm`, desc: "Rainfall amount" },
                { icon: "📏", label: "Atm. Pressure", value: `${activeDisease?.Pressure} hPa`, desc: "Atmospheric pressure" },
                { icon: "👁️", label: "UV Index", value: "Low", desc: "Ultraviolet radiation level" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center p-3 bg-gray-900/70 rounded-lg border border-gray-700/40 hover:bg-gray-800/50 transition-all">
                  <span className="text-xl mr-3 text-gray-400">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1 truncate">{item.value}</p>
                    <p className="text-gray-400 text-xs">{item.label}</p>
                  </div>
                  <p className="text-gray-500 text-xs ml-2">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. BOTTOM ROW: Location Details (Population, Area, Coordinates) */}
          <div className="bg-black/80 rounded-2xl p-6 shadow-2xl border border-gray-800/50 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-200 mb-6 border-b border-gray-700/50 pb-3 flex items-center">
              <span className="mr-2">📍</span>
              Location & Demographics
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Population Card */}
              <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700/50 text-center hover:shadow-lg transition-all">
                <div className="text-2xl mb-2">👥</div>
                <p className="text-gray-400 text-sm mb-1">Population</p>
                <p className="text-2xl font-bold text-white mb-1">
                  {formatPopulation(activeDisease?.Population)}
                </p>
                <p className="text-gray-500 text-xs">
                  {activeDisease?.Population_Density?.toFixed(0)}/km² density
                </p>
              </div>

              {/* Area Card */}
              <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700/50 text-center hover:shadow-lg transition-all">
                <div className="text-2xl mb-2">📏</div>
                <p className="text-gray-400 text-sm mb-1">District Area</p>
                <p className="text-xl font-bold text-white mb-1">
                  {activeDisease?.Area_km2?.toFixed(0)} km²
                </p>
                <p className="text-gray-500 text-xs">
                  {activeDisease?.LAI?.toFixed(2)} LAI Index
                </p>
              </div>

              {/* Coordinates Card */}
              <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700/50 text-center hover:shadow-lg transition-all">
                <div className="text-2xl mb-2">🌐</div>
                <p className="text-gray-400 text-sm mb-2">Coordinates</p>
                <div className="space-y-1 text-xs">
                  <p className="text-white font-mono">
                    Lat: {activeDisease?.Latitude?.toFixed(4) ?? "N/A"}
                  </p>
                  <p className="text-white font-mono">
                    Lon: {activeDisease?.Longitude?.toFixed(4) ?? "N/A"}
                  </p>
                </div>
                <p className="text-gray-500 text-xs mt-1">UTC+5:30 Asia/Kolkata</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionDashboard;
