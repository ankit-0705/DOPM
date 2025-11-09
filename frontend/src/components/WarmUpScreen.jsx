import React from "react";
import { FiShield, FiActivity, FiMapPin, FiTrendingUp, FiSearch } from "react-icons/fi";
import dops_logo from '../assets/dops_logo.png';

// WarmUpScreen Component - Full Implementation
const WarmUpScreen = ({ progress, currentPhase }) => {
  // Phase configuration with labels, icons, and educational tips
  const phases = [
    { 
      label: "Initializing AI Models", 
      subtitle: "(Random Forest, XGBoost, CatBoost)", 
      icon: FiActivity, 
      tip: "Loading advanced machine learning models trained on years of epidemiological data for 95%+ prediction accuracy.",
      color: "from-blue-500 to-blue-600"
    },
    { 
      label: "Loading Environmental Data", 
      subtitle: "Weather & Air Quality Integration", 
      icon: FiMapPin, 
      tip: "Fetching real-time data from 700+ Indian districts including temperature, humidity, and pollution indices.",
      color: "from-green-500 to-green-600"
    },
    { 
      label: "Analyzing Weather Patterns", 
      subtitle: "Climate Correlation Engine", 
      icon: FiTrendingUp, 
      tip: "Processing seasonal patterns and climate variables that influence disease transmission rates across regions.",
      color: "from-purple-500 to-purple-600"
    },
    { 
      label: "Integrating Population Metrics", 
      subtitle: "Demographic Risk Assessment", 
      icon: FiShield, 
      tip: "Incorporating population density, urban/rural distribution, and mobility patterns for precise district-level forecasts.",
      color: "from-indigo-500 to-indigo-600"
    },
    { 
      label: "Calibrating Prediction Engine", 
      subtitle: "Final System Optimization", 
      icon: FiSearch, 
      tip: "Fine-tuning ensemble models and preparing real-time outbreak risk calculations for your selected location.",
      color: "from-pink-500 to-pink-600"
    }
  ];

  // Get current phase data, fallback to first phase
  const currentPhaseData = phases[currentPhase] || phases[0];
  const totalPhases = phases.length;
  const phaseProgress = (currentPhase / (totalPhases - 1)) * 100;

  return (
    <div className="min-h-screen bg-linear-to-br from-black via-gray-900 to-black text-white flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating orbs with phase-based colors */}
        <div 
          className={`absolute top-20 left-10 w-32 h-32 bg-linear-to-r ${currentPhaseData.color} rounded-full blur-3xl opacity-20 animate-float`}
          style={{ animationDelay: `${currentPhase * 200}ms` }}
        ></div>
        <div 
          className={`absolute bottom-20 right-10 w-40 h-40 bg-linear-to-r ${currentPhaseData.color} rounded-full blur-3xl opacity-15 animate-float-slow`}
          style={{ animationDelay: `${currentPhase * 300}ms` }}
        ></div>
        <div 
          className="absolute top-1/2 left-1/4 w-24 h-24 bg-gray-800/30 rounded-full blur-xl animate-pulse"
          style={{ animationDelay: "1000ms" }}
        ></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8 w-full">
        {/* Header Section */}
        <div className="space-y-6">
          {/* App Logo/Icon */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-20 h-20 bg-linear-to-r from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center shadow-2xl">
              {/* <FiShield className="text-white text-3xl animate-spin-slow" /> */}
              <img src={dops_logo} alt="dops_logo"  className="text-3xl animate-pulse"/>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold bg-linear-to-r from-gray-300 via-white to-gray-300 bg-clip-text text-transparent tracking-tight">
              DOPS - Disease Outbreak Prediction System
            </h1>
            <div className="inline-flex items-center px-4 py-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-full text-sm text-gray-300">
              <FiActivity className="mr-2 text-blue-400" />
              AI-Powered Early Warning System
            </div>
          </div>

          {/* Tagline */}
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
            Preparing advanced analytics to forecast and prevent disease outbreaks across India
          </p>
        </div>

        {/* Main Progress Bar */}
        <div className="space-y-4">
          {/* Progress Container */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-1">
            <div className="bg-gray-900 rounded-xl h-2 relative overflow-hidden">
              {/* Background track with phase indicators */}
              <div className="absolute inset-0 bg-gray-800/30">
                {Array.from({ length: totalPhases }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`absolute top-0 h-full w-1 bg-gray-600/50 ${
                      idx * 25 <= progress ? 'bg-blue-400/50' : ''
                    }`}
                    style={{ left: `${(idx / (totalPhases - 1)) * 100}%` }}
                  />
                ))}
              </div>
              
              {/* Animated progress fill */}
              <div 
                className={`h-full bg-linear-to-r ${currentPhaseData.color} rounded-lg transition-all duration-1000 ease-out relative overflow-hidden`}
                style={{ 
                  width: `${progress}%`,
                  backgroundSize: '200% 100%',
                  animation: progress === 100 ? 'none' : 'progressShimmer 2s linear infinite'
                }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Progress Text */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">System Initialization</span>
            <span className="font-mono text-blue-400">{Math.round(progress)}% Complete</span>
          </div>
        </div>

        {/* Current Phase Card */}
        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-700/40 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl transition-all duration-500 hover:shadow-gray-500/10">
          <div className="flex flex-col items-center space-y-4">
            {/* Phase Icon with Animation */}
            <div className={`w-16 h-16 bg-linear-to-r ${currentPhaseData.color} rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${currentPhase > 0 ? 'scale-110' : ''}`}>
              <currentPhaseData.icon className="text-white text-3xl" />
            </div>

            {/* Phase Title */}
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {currentPhaseData.label}
              </h2>
              <p className="text-blue-400/80 text-sm font-medium">
                {currentPhaseData.subtitle}
              </p>
            </div>

            {/* Phase Description */}
            <p className="text-gray-300 text-center leading-relaxed text-sm md:text-base max-w-md">
              {currentPhaseData.tip}
            </p>

            {/* Progress Sub-indicator */}
            <div className="w-full bg-gray-800/50 rounded-full h-1 mt-4 overflow-hidden">
              <div 
                className={`h-full bg-white/30 rounded-full transition-all duration-700`}
                style={{ width: `${phaseProgress}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500">
              Phase {currentPhase + 1} of {totalPhases}
            </span>
          </div>
        </div>

        {/* Stats and Engagement Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { 
              icon: FiTrendingUp, 
              label: "Prediction Accuracy", 
              value: "95%+", 
              color: "text-green-400",
              delay: 0
            },
            { 
              icon: FiMapPin, 
              label: "Districts Covered", 
              value: "700+", 
              color: "text-blue-400",
              delay: 500
            },
            { 
              icon: FiActivity, 
              label: "Real-time Monitoring", 
              value: "24/7", 
              color: "text-purple-400",
              delay: 1000
            }
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className="group bg-gray-900/40 backdrop-blur-sm border border-gray-700/30 rounded-xl p-4 text-center transition-all duration-300 hover:border-gray-600/50 hover:bg-gray-900/60 hover:scale-105"
              style={{ animationDelay: `${stat.delay}ms` }}
            >
              <stat.icon className={`${stat.color} text-2xl mx-auto mb-2 group-hover:scale-110 transition-transform`} />
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-gray-400 capitalize">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Educational Quick Tips */}
        <div className="max-w-2xl mx-auto space-y-3">
          <h3 className="text-lg font-semibold text-gray-200 text-center">While We Prepare...</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Early detection can prevent 70% of outbreaks through timely interventions",
              "Our AI analyzes weather patterns that correlate with vector-borne diseases",
              "District-level predictions help local health authorities allocate resources effectively",
              "Real-time air quality data improves respiratory disease outbreak forecasts"
            ].map((tip, idx) => (
              <div 
                key={idx} 
                className="flex items-start space-x-3 p-3 bg-gray-800/30 border border-gray-700/20 rounded-lg transition-all hover:bg-gray-800/50"
              >
                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-blue-400 text-xs font-bold">•</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with Progress Indicator */}
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 bg-gray-900/50 backdrop-blur-sm border border-gray-800/30 rounded-xl px-6 py-3 w-full max-w-md mx-auto">
          <div className="flex items-center space-x-2">
            <FiSearch className="text-gray-400" size={16} />
            <span>System Status:</span>
            <span className={`font-medium ${progress === 100 ? 'text-green-400' : 'text-blue-400'}`}>
              {progress === 100 ? 'Ready for Predictions' : 'Initializing...'}
            </span>
          </div>
        </div>

        {/* Bottom Progress Dots */}
        <div className="flex justify-center space-x-2">
          {phases.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx <= currentPhase ? 'bg-blue-400 scale-125' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Custom CSS Styles - Add to your global CSS or inline */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(90deg); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes progressShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
      `}</style>
    </div>
  );
};

export { WarmUpScreen };
