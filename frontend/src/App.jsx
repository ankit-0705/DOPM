import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./components/Navbar";
import PredictionDashboard from "./components/PredictionDashboard";
import { FiSearch, FiMapPin, FiActivity, FiShield, FiTrendingUp, FiArrowRight, FiX } from "react-icons/fi";
import { WarmUpScreen } from "./components/WarmUpScreen"; // Assuming WarmUpScreen is in separate file
const backendUrl = import.meta.env.VITE_API_BASE_URL;

const API_URL = backendUrl;


function App() {
  // Existing states
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);

  // Warm-up states
  const [isWarmingUp, setIsWarmingUp] = useState(true);
  const [warmUpProgress, setWarmUpProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);

  // Warm-up sequence phases configuration
  const warmUpPhases = [
    { duration: 10000, progress: 20 },
    { duration: 15000, progress: 40 },
    { duration: 10000, progress: 60 },
    { duration: 8000, progress: 80 },
    { duration: 7000, progress: 100 }
  ];

  // Warm-up logic - runs on component mount
  useEffect(() => {
    let totalTime = 0;
    let phaseIndex = 0;

    // Set up phase transitions
    warmUpPhases.forEach((phase) => {
      setTimeout(() => {
        setCurrentPhase(phaseIndex);
        setWarmUpProgress(phase.progress);
        phaseIndex++;
      }, totalTime);
      totalTime += phase.duration;
    });

    // Early backend ping to warm up Render (silent, 3 seconds after load)
    setTimeout(() => {
      axios
        .get(`${API_URL}/states`, { timeout: 5000 })
        .then(() => {
          // If backend responds early, we can transition faster
          console.log("Backend warmed up early!");
          setIsWarmingUp(false);
          // Load states immediately
          axios
            .get(`${API_URL}/states`)
            .then((res) => {
              setStates(res.data.states || []);
              setHasInteracted(true);
            })
            .catch((err) => {
              console.error("Failed to load states:", err);
              setError("Failed to initialize. Please refresh the page.");
              setHasInteracted(true);
            });
        })
        .catch((err) => {
          // Silent fail - backend might not be ready yet
          console.log("Early backend ping - warming up service...");
        });
    }, 3000);

    // Complete warm-up after 50 seconds and initialize main app (fallback)
    const timeoutId = setTimeout(() => {
      setIsWarmingUp(false);
      
      // Now load actual states data after warm-up
      axios
        .get(`${API_URL}/states`)
        .then((res) => {
          setStates(res.data.states || []);
          setHasInteracted(true);
        })
        .catch((err) => {
          console.error("Failed to load states after warm-up:", err);
          setError("Failed to initialize. Please refresh the page.");
          setHasInteracted(true);
        });
    }, 50000);

    // Cleanup timeouts if component unmounts
    return () => clearTimeout(timeoutId);
  }, []);

  // Modified original useEffects to respect warm-up state
  useEffect(() => {
    // Preload states data - only after warm-up
    if (isWarmingUp) return;
    
    axios
      .get(`${API_URL}/states`)
      .then((res) => {
        setStates(res.data.states || []);
        setHasInteracted(true);
      })
      .catch((err) => {
        console.error("Failed to load states:", err);
        setError("Failed to initialize. Please refresh the page.");
        setHasInteracted(true);
      });
  }, [isWarmingUp]);

  useEffect(() => {
    if (!selectedState || isWarmingUp) return;
    setDistricts([]); // Reset districts
    axios
      .get(`${API_URL}/districts/${selectedState}`)
      .then((res) => setDistricts(res.data.districts || []))
      .catch(() => setError("Failed to load districts"));
  }, [selectedState, isWarmingUp]);

  const handlePredict = async (state, district) => {
    if (isWarmingUp) {
      console.log("Prediction blocked during warm-up");
      return;
    }
    
    if (!state || !district) {
      setError("Please select both State and District");
      return;
    }
    setError("");
    setLoading(true);
    setPredictions([]);

    try {
      const res = await axios.post(`${API_URL}/predict`, {
        state_ut: state,
        district: district,
      });
      setPredictions(res.data.predictions || []);
    } catch (err) {
      console.error("Prediction error:", err);
      setError("Prediction failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInitiated = () => {
    if (isWarmingUp) {
      console.log("Search blocked during warm-up");
      return;
    }
    setHasInteracted(true);
  };

  // Show landing if no predictions yet
  const showLanding = predictions.length === 0;

  // Main render logic - show warm-up first, then existing content
  return (
    <div className="min-h-screen bg-black text-white">
      {isWarmingUp ? (
        <WarmUpScreen progress={warmUpProgress} currentPhase={currentPhase} />
      ) : (
        <>
          <Navbar
            states={states}
            districts={districts}
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
            onPredict={handlePredict}
            loading={loading}
            error={error}
            setError={setError}
            onSearchInitiated={handleSearchInitiated}
            showLanding={showLanding}
          />

          {/* Global Error Display */}
          {error && !showLanding && (
            <div className="fixed top-20 right-4 z-50 max-w-sm">
              <div className="bg-gray-900/90 backdrop-blur-sm border border-red-600/30 rounded-lg p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <FiX className="text-red-400" />
                  <p className="text-sm text-red-100">{error}</p>
                </div>
                <button
                  onClick={() => setError("")}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-200"
                >
                  <FiX size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Landing Page / Full Content */}
          {showLanding ? (
            <LandingPage onSearchClick={handleSearchInitiated} />
          ) : (
            // Dashboard (when predictions are available)
            <>
              {predictions.length > 0 && <PredictionDashboard predictions={predictions} />}
              {hasInteracted && predictions.length === 0 && !loading && (
                <div className="flex items-center justify-center min-h-[60vh] px-4">
                  <div className="text-center max-w-md">
                    <FiTrendingUp className="text-6xl text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold text-gray-200 mb-2">
                      Ready for Analysis
                    </h2>
                    <p className="text-gray-400 mb-6">
                      Select a location using the search icon above to get outbreak predictions.
                    </p>
                    <button
                      onClick={handleSearchInitiated}
                      className="px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-white font-medium transition-colors"
                    >
                      Start Search
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center max-w-sm">
                <div className="flex items-center justify-center mb-4">
                  <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-white font-medium">Analyzing Data...</span>
                </div>
                <p className="text-gray-300 text-sm">Processing environmental factors, weather patterns, and population data</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Landing Page Component - Full Content (Shown Directly)
const LandingPage = ({ onSearchClick }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-800/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-700/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center bg-linear-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/30 px-4 py-2 rounded-full">
            <FiShield className="mr-2 text-gray-300 text-lg" />
            <span className="text-gray-300 font-medium">AI-Powered Early Warning System</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            <span className="bg-linear-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
              Predict Disease Outbreaks
            </span>
            <span className="block text-2xl md:text-3xl text-gray-400 mt-2">
              Before They Spread
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
          Harnessing machine learning and real-time environmental data to forecast disease outbreaks 
          in Indian districts with remarkable accuracy.
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full mb-8">
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 transition-all hover:border-gray-500/50">
            <div className="text-3xl font-bold text-gray-300 mb-1">95%+</div>
            <div className="text-gray-400 text-sm">Prediction Accuracy</div>
          </div>
          
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 transition-all hover:border-gray-500/50">
            <div className="text-3xl font-bold text-gray-300 mb-1">700+</div>
            <div className="text-gray-400 text-sm">Districts Covered</div>
          </div>
          
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 transition-all hover:border-gray-500/50">
            <div className="text-3xl font-bold text-gray-300 mb-1">24/7</div>
            <div className="text-gray-400 text-sm">Real-time Monitoring</div>
          </div>
          
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 transition-all hover:border-gray-500/50">
            <FiActivity className="text-gray-400 text-3xl mx-auto mb-2" />
            <div className="text-gray-400 text-sm">Live Data Integration</div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto space-y-6">
          <FiSearch className="text-5xl text-gray-400 mx-auto mb-4" />
          
          <div className="space-y-3">
            <h3 className="text-xl md:text-2xl font-semibold text-gray-200">
              Ready to Get Started?
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Click the search icon in the top-right to select your district. Our AI analyzes weather, 
              air quality, and population data to provide accurate outbreak predictions.
            </p>
          </div>

          {/* Visual Guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiMapPin className="text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-400">1. Search Location</p>
            </div>
            
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiActivity className="text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-400">2. AI Analysis</p>
            </div>
            
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30">
              <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiTrendingUp className="text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-400">3. Get Predictions</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mt-12">
          {/* Feature 1 */}
          <div className="flex items-start space-x-4 p-4 bg-gray-900/30 backdrop-blur-sm rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all">
            <div className="shrink-0 mt-1">
              <FiActivity className="text-gray-400 text-2xl" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-200 text-lg mb-1">Real-time Environmental Analysis</h4>
              <p className="text-gray-400 leading-relaxed">
                Integrates live weather data, air quality indices, and population density 
                metrics to provide comprehensive risk assessment.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex items-start space-x-4 p-4 bg-gray-900/30 backdrop-blur-sm rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all">
            <div className="shrink-0 mt-1">
              <FiShield className="text-gray-400 text-2xl" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-200 text-lg mb-1">Advanced Machine Learning</h4>
              <p className="text-gray-400 leading-relaxed">
                Trained on years of epidemiological data using cutting-edge algorithms 
                to detect patterns invisible to traditional methods.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-gray-500 text-sm space-y-1 pt-8 border-t border-gray-800/30 max-w-2xl mx-auto">
          <p>Developed for public health awareness and early intervention</p>
          <p className="text-xs">Powered by AI • Data-driven decisions • Serving all Indian districts</p>
        </div>
      </div>
    </div>
  );
}

export default App;
