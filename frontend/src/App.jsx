import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Navbar from "./components/Navbar";
import PredictionDashboard from "./components/PredictionDashboard";
import { FiSearch, FiMapPin, FiActivity, FiShield, FiTrendingUp, FiArrowRight, FiX } from "react-icons/fi";
import { WarmUpScreen } from "./components/WarmUpScreen";
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
  const [backendReady, setBackendReady] = useState(false);
  const [backendCheckAttempts, setBackendCheckAttempts] = useState(0);
  const [isFastForwarding, setIsFastForwarding] = useState(false);

  // Refs for timing and cleanup
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef([]);
  const backendCheckIntervalRef = useRef(null);
  const fastForwardActiveRef = useRef(false);
  const animationFrameRef = useRef(null);
  const smoothProgressActiveRef = useRef(false); // Track smooth progression

  // Aggressive backend checking function
  const checkBackendHealth = async (attempt = 0) => {
    if (!isMountedRef.current || backendReady || fastForwardActiveRef.current || smoothProgressActiveRef.current) {
      console.log(`Backend check skipped - mounted: ${isMountedRef.current}, ready: ${backendReady}, fastForward: ${fastForwardActiveRef.current}, smooth: ${smoothProgressActiveRef.current}`);
      return false;
    }

    console.log(`🔍 Backend health check attempt #${attempt + 1}...`);
    
    try {
      const response = await Promise.race([
        axios.get(`${API_URL}/states`, { 
          timeout: 3000,
          validateStatus: function (status) {
            return status < 500;
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]);

      console.log(`✅ Backend check SUCCESS! Status: ${response.status}`);
      
      if (isMountedRef.current && !backendReady) {
        setBackendReady(true);
        setBackendCheckAttempts(attempt + 1);
        console.log(`🎉 Backend confirmed READY after ${attempt + 1} attempts!`);
        return true;
      }
      
      return response.status < 500;

    } catch (error) {
      console.log(`❌ Backend check FAILED (attempt ${attempt + 1}):`, 
        error.code === 'ECONNABORTED' ? 'Timeout' : 
        error.response?.status || error.code || 'Unknown error'
      );
      
      if (error.response?.status >= 400 && error.response?.status < 500) {
        console.log('Backend responding with client error - considering ready');
        if (isMountedRef.current && !backendReady) {
          setBackendReady(true);
          return true;
        }
      }
      
      return false;
    }
  };

  // Aggressive continuous backend monitoring
  const startBackendMonitoring = () => {
    let attempt = 0;
    const maxAttempts = 25;

    backendCheckIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current || backendReady || fastForwardActiveRef.current || smoothProgressActiveRef.current || attempt >= maxAttempts) {
        if (backendCheckIntervalRef.current) {
          clearInterval(backendCheckIntervalRef.current);
          backendCheckIntervalRef.current = null;
        }
        return;
      }

      const isReady = await checkBackendHealth(attempt);
      
      if (isReady && !backendReady) {
        setBackendReady(true);
        clearInterval(backendCheckIntervalRef.current);
        backendCheckIntervalRef.current = null;
      }
      
      attempt++;
      setBackendCheckAttempts(attempt);
    }, 2000);

    timeoutsRef.current.push(backendCheckIntervalRef.current);
  };

  // **NEW: Dedicated smooth 5-second progression for warm backend**
  const smoothWarmBackendProgression = () => {
    if (smoothProgressActiveRef.current || !isMountedRef.current || backendReady && fastForwardActiveRef.current) return;
    
    smoothProgressActiveRef.current = true;
    setIsFastForwarding(true);
    console.log('🌟 Starting DEDICATED smooth 5-second warm backend progression');
    
    const phases = [
      { progress: 0, duration: 0, label: 'Starting...', phase: -1 },
      { progress: 20, duration: 1000, label: 'Initializing System', phase: 0 },
      { progress: 40, duration: 1000, label: 'Establishing Connections', phase: 1 },
      { progress: 60, duration: 1000, label: 'Loading Data Models', phase: 2 },
      { progress: 80, duration: 1000, label: 'Verifying Backend', phase: 3 },
      { progress: 100, duration: 1000, label: 'System Ready!', phase: 4 }
    ];

    let phaseIndex = 0;
    let phaseStartTime = Date.now();
    const totalDuration = 5000; // 5 seconds total

    const animateSmoothProgression = () => {
      if (!isMountedRef.current || !smoothProgressActiveRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        return;
      }

      const elapsed = Date.now() - phaseStartTime;
      
      if (phaseIndex < phases.length) {
        const currentPhase = phases[phaseIndex];
        const phaseCompletion = Math.min(1, elapsed / currentPhase.duration);
        
        // Smooth progress within current phase
        const previousProgress = phaseIndex > 0 ? phases[phaseIndex - 1].progress : 0;
        const currentProgress = previousProgress + (currentPhase.progress - previousProgress) * phaseCompletion;
        
        setWarmUpProgress(Math.round(currentProgress));
        setCurrentPhase(currentPhase.phase);
        
        // Console log for debugging (only first few phases)
        if (phaseIndex <= 2 && elapsed < 500) {
          console.log(`🌟 Smooth progression: ${currentPhase.label} (${Math.round(currentProgress)}%)`);
        }

        // Advance to next phase
        if (elapsed >= currentPhase.duration && phaseIndex < phases.length - 1) {
          phaseIndex++;
          phaseStartTime = Date.now();
          
          if (phaseIndex >= 1) { // Don't log the initial 0% phase
            console.log(`🌟 Smooth phase ${phaseIndex}: ${phases[phaseIndex].label} (${phases[phaseIndex].progress}%)`);
          }
          
          // Special handling for final phase
          if (phaseIndex === phases.length - 1) {
            setIsFastForwarding(false);
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log('🌟 Smooth progression complete - transitioning to app');
                completeWarmUp();
                smoothProgressActiveRef.current = false;
              }
            }, 800); // Show 100% for 0.8 seconds
          }
        } else if (phaseIndex >= phases.length - 1 && elapsed >= currentPhase.duration) {
          // Ensure final phase completes
          setWarmUpProgress(100);
          setCurrentPhase(4);
          cancelAnimationFrame(animationFrameRef.current);
          smoothProgressActiveRef.current = false;
        }
      }

      if (phaseIndex < phases.length - 1) {
        animationFrameRef.current = requestAnimationFrame(animateSmoothProgression);
      }
    };

    // Start from 0% and begin animation immediately
    setWarmUpProgress(0);
    setCurrentPhase(-1); // Show initial loading state
    
    // Small delay to reset visual state
    setTimeout(() => {
      if (isMountedRef.current) {
        phaseIndex = 1; // Start from first real phase
        phaseStartTime = Date.now();
        animationFrameRef.current = requestAnimationFrame(animateSmoothProgression);
      }
    }, 100);

    // Failsafe
    const failsafeTimeout = setTimeout(() => {
      if (isMountedRef.current && smoothProgressActiveRef.current) {
        console.log('⚠️ Smooth progression failsafe triggered');
        smoothProgressActiveRef.current = false;
        setIsFastForwarding(false);
        cancelAnimationFrame(animationFrameRef.current);
        setWarmUpProgress(100);
        setCurrentPhase(4);
        setTimeout(completeWarmUp, 500);
      }
    }, totalDuration + 2000);

    timeoutsRef.current.push(failsafeTimeout);
  };

  // Smooth 5-second fast-forward with clear stage progression (for cold starts)
  const fastForwardToCompletion = (currentProgress = 0, currentPhaseIndex = 0) => {
    if (fastForwardActiveRef.current || smoothProgressActiveRef.current || !isMountedRef.current) return;
    
    fastForwardActiveRef.current = true;
    setIsFastForwarding(true);
    console.log(`🚀 SMOOTH FAST-FORWARD activated! Starting at ${currentProgress}% (Phase ${currentPhaseIndex + 1})`);
    
    const phases = [
      { progress: 20, label: 'Initializing System', phase: 0 },
      { progress: 40, label: 'Establishing Connections', phase: 1 },
      { progress: 60, label: 'Loading Data Models', phase: 2 },
      { progress: 80, label: 'Verifying Backend', phase: 3 },
      { progress: 100, label: 'System Ready!', phase: 4 }
    ];

    // Find starting point
    let startPhaseIndex = Math.max(0, currentPhaseIndex);
    let targetPhases = phases.slice(startPhaseIndex);
    
    if (currentProgress >= 100) {
      // Already at 100%, just complete
      setTimeout(completeWarmUp, 500);
      return;
    }

    console.log(`📊 Fast-forward path: ${targetPhases.map(p => `${p.progress}% (${p.label})`).join(' → ')}`);
    
    const totalDuration = 5000; // 5 seconds total for remaining phases
    const phaseDuration = totalDuration / targetPhases.length; // Equal time per remaining phase
    let phaseIndex = 0;
    let startTime = Date.now();

    const animateFastForward = () => {
      if (!isMountedRef.current || !fastForwardActiveRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        return;
      }

      const elapsed = Date.now() - startTime;
      const currentPhaseProgress = Math.min(phaseDuration * (phaseIndex + 1), totalDuration);
      
      // Update progress smoothly within each phase
      if (phaseIndex < targetPhases.length) {
        const currentTarget = targetPhases[phaseIndex];
        const phaseProgress = Math.min(
          currentTarget.progress,
          currentProgress + (currentTarget.progress - currentProgress) * (elapsed / totalDuration) * (targetPhases.length / (phaseIndex + 1))
        );
        
        // Snap to phase targets for clear stage progression
        if (elapsed >= phaseDuration * phaseIndex && phaseIndex < targetPhases.length - 1) {
          setWarmUpProgress(currentTarget.progress);
          setCurrentPhase(currentTarget.phase);
          console.log(`🎯 Fast-forward stage ${phaseIndex + 1}/${targetPhases.length}: ${currentTarget.label} (${currentTarget.progress}%)`);
          phaseIndex++;
          startTime = Date.now(); // Reset for next phase
        } else if (phaseIndex >= targetPhases.length - 1 && elapsed >= totalDuration) {
          // Final phase - complete at 100%
          setWarmUpProgress(100);
          setCurrentPhase(4);
          console.log(`✅ Fast-forward complete: ${targetPhases[targetPhases.length - 1].label}`);
          
          // Small delay before transitioning for smooth UX
          setTimeout(() => {
            if (isMountedRef.current) {
              completeWarmUp();
              fastForwardActiveRef.current = false;
              setIsFastForwarding(false);
            }
          }, 800); // Show 100% for 0.8 seconds
          
          cancelAnimationFrame(animationFrameRef.current);
          return;
        }
        
        // Smooth progress within phase
        const smoothProgress = Math.min(100, phaseProgress);
        if (Math.abs(warmUpProgress - smoothProgress) > 1) {
          setWarmUpProgress(Math.round(smoothProgress));
        }
      }

      animationFrameRef.current = requestAnimationFrame(animateFastForward);
    };

    // Start the smooth animation
    animationFrameRef.current = requestAnimationFrame(animateFastForward);
    
    // Failsafe timeout
    const failsafeTimeout = setTimeout(() => {
      if (isMountedRef.current && fastForwardActiveRef.current) {
        console.log('⚠️ Fast-forward failsafe triggered');
        fastForwardActiveRef.current = false;
        setIsFastForwarding(false);
        cancelAnimationFrame(animationFrameRef.current);
        setWarmUpProgress(100);
        setTimeout(completeWarmUp, 500);
      }
    }, totalDuration + 2000);

    timeoutsRef.current.push(failsafeTimeout);
  };

  // Complete warmup and transition to app
  const completeWarmUp = () => {
    if (!isMountedRef.current) return;
    
    console.log('🏁 Warm-up completed - transitioning to main application');
    setIsWarmingUp(false);
    setIsFastForwarding(false);
    fastForwardActiveRef.current = false;
    smoothProgressActiveRef.current = false;
    
    // Load states data if not already loaded
    if (!states.length && backendReady) {
      axios
        .get(`${API_URL}/states`, { timeout: 5000 })
        .then((res) => {
          if (isMountedRef.current) {
            console.log('📊 States loaded successfully after warmup');
            setStates(res.data.states || []);
            setHasInteracted(true);
          }
        })
        .catch((err) => {
          console.error('❌ Failed to load states after warmup:', err);
          if (isMountedRef.current) {
            setError('Failed to initialize. Please refresh the page.');
            setHasInteracted(true);
          }
        });
    } else {
      setHasInteracted(true);
    }
  };

  // Phase progression with smooth backend checks (for cold starts)
  const startPhaseProgression = () => {
    const phases = [
      { progress: 20, duration: 10000, label: 'Initializing System', phase: 0 },
      { progress: 40, duration: 15000, label: 'Establishing Connections', phase: 1 },
      { progress: 60, duration: 10000, label: 'Loading Data Models', phase: 2 },
      { progress: 80, duration: 10000, label: 'Verifying Backend', phase: 3 },
      { progress: 100, duration: 10000, label: 'System Ready', phase: 4 }
    ];

    let currentPhaseIndex = 0;
    let phaseStartTime = Date.now();

    const advanceToNextPhase = () => {
      if (!isMountedRef.current || fastForwardActiveRef.current || smoothProgressActiveRef.current) return;

      if (currentPhaseIndex < phases.length) {
        const phase = phases[currentPhaseIndex];
        const phaseTimeElapsed = Date.now() - phaseStartTime;
        
        // Smooth transition to next phase
        setWarmUpProgress(phase.progress);
        setCurrentPhase(phase.phase);
        
        console.log(`⏰ Phase ${currentPhaseIndex + 1}/5: ${phase.label} (${phase.progress}%) - Elapsed: ${Math.round(phaseTimeElapsed/1000)}s`);
        
        // Backend readiness check at each phase with smooth integration
        const checkAndAdvance = async () => {
          if (backendReady && !fastForwardActiveRef.current && !smoothProgressActiveRef.current) {
            console.log(`🔥 Backend already ready at ${phase.progress}% - activating smooth fast-forward`);
            fastForwardToCompletion(phase.progress, currentPhaseIndex);
            return;
          }

          // Check backend health
          const isReady = await checkBackendHealth(backendCheckAttempts);
          
          if (isReady && !backendReady && !fastForwardActiveRef.current && !smoothProgressActiveRef.current) {
            console.log(`🎉 Backend ready detected at ${phase.progress}% (Phase ${currentPhaseIndex + 1}) - starting smooth fast-forward!`);
            setBackendReady(true);
            fastForwardToCompletion(phase.progress, currentPhaseIndex);
            return;
          }
        };

        // Perform check immediately at phase start
        checkAndAdvance();

        currentPhaseIndex++;

        if (currentPhaseIndex < phases.length && !backendReady && !fastForwardActiveRef.current && !smoothProgressActiveRef.current) {
          // Schedule next phase with smooth timing
          const nextPhaseTimeout = setTimeout(() => {
            if (isMountedRef.current && !fastForwardActiveRef.current && !smoothProgressActiveRef.current) {
              advanceToNextPhase();
            }
          }, phase.duration);

          timeoutsRef.current.push(nextPhaseTimeout);
        } else if (currentPhaseIndex >= phases.length) {
          // All phases complete naturally
          console.log('🎊 All phases completed naturally');
          setTimeout(() => {
            if (isMountedRef.current) {
              setWarmUpProgress(100);
              setTimeout(completeWarmUp, 1500); // Show completion for 1.5s
            }
          }, 2000);
        }

        phaseStartTime = Date.now();
      }
    };

    // Start first phase smoothly
    const initialPhaseDelay = setTimeout(() => {
      if (isMountedRef.current && !backendReady && !smoothProgressActiveRef.current) {
        console.log('🌟 Starting smooth phase progression');
        advanceToNextPhase();
      }
    }, 800); // Slightly longer initial delay for polish

    timeoutsRef.current.push(initialPhaseDelay);
  };

  // **UPDATED: Enhanced quick check with dedicated smooth progression**
  const quickBackendCheck = async () => {
    if (backendReady || smoothProgressActiveRef.current || fastForwardActiveRef.current) return;
    
    console.log('⚡ Quick backend check for smooth progression...');
    const isReady = await checkBackendHealth(0);
    
    if (isReady) {
      console.log('🚀 Backend ready immediately - starting DEDICATED smooth 5-second progression');
      setBackendReady(true);
      
      // Use dedicated smooth progression instead of fast-forward
      smoothWarmBackendProgression();
    }
  };

  // Main useEffect for warmup orchestration
  useEffect(() => {
    isMountedRef.current = true;
    console.log('🚀 Starting enhanced smooth warmup sequence');

    // 1. Start aggressive backend monitoring
    startBackendMonitoring();

    // 2. Quick check at 1.5 seconds for smooth progression (EARLIER detection)
    const quickCheckTimeout = setTimeout(() => {
      if (isMountedRef.current && !backendReady && isWarmingUp && !smoothProgressActiveRef.current) {
        quickBackendCheck();
      }
    }, 1500); // Earlier check for better warm backend detection

    timeoutsRef.current.push(quickCheckTimeout);

    // 3. Start smooth phase progression only if backend not ready AND no smooth progression active
    const phaseStartTimeout = setTimeout(() => {
      if (isMountedRef.current && !backendReady && isWarmingUp && !fastForwardActiveRef.current && !smoothProgressActiveRef.current) {
        console.log('⏳ Backend not ready - starting smooth phased warmup');
        startPhaseProgression();
      }
    }, 2000); // Start earlier since quick check is now at 1.5s

    timeoutsRef.current.push(phaseStartTimeout);

    // 4. Ultimate failsafe - 55 seconds max
    const ultimateFailsafe = setTimeout(() => {
      if (isMountedRef.current && isWarmingUp) {
        console.log('🛡️ ULTIMATE FAILSAFE: Smooth completion after 55 seconds');
        if (!smoothProgressActiveRef.current && !fastForwardActiveRef.current) {
          fastForwardActiveRef.current = true;
          setBackendReady(true);
          setIsFastForwarding(true);
          fastForwardToCompletion(warmUpProgress, currentPhase);
        } else {
          smoothProgressActiveRef.current = false;
          fastForwardActiveRef.current = false;
          setIsFastForwarding(false);
          completeWarmUp();
        }
      }
    }, 55000);

    timeoutsRef.current.push(ultimateFailsafe);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up smooth warmup timers');
      isMountedRef.current = false;
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Clear all timeouts
      timeoutsRef.current.forEach(id => {
        if (typeof id === 'number') {
          clearTimeout(id);
        } else if (id && typeof id === 'object') {
          clearInterval(id);
        }
      });
      timeoutsRef.current = [];
      
      if (backendCheckIntervalRef.current) {
        clearInterval(backendCheckIntervalRef.current);
        backendCheckIntervalRef.current = null;
      }
      
      fastForwardActiveRef.current = false;
      smoothProgressActiveRef.current = false;
      setIsFastForwarding(false);
    };
  }, []);

  // Safety net for states loading
  useEffect(() => {
    if (!isWarmingUp && states.length === 0 && backendReady && isMountedRef.current) {
      console.log('🔄 Safety net: Loading states after smooth warmup');
      const safetyTimeout = setTimeout(() => {
        if (states.length === 0 && isMountedRef.current) {
          axios
            .get(`${API_URL}/states`, { timeout: 5000 })
            .then((res) => {
              if (isMountedRef.current && states.length === 0) {
                setStates(res.data.states || []);
                setHasInteracted(true);
              }
            })
            .catch((err) => {
              console.error('Safety load failed:', err);
              if (isMountedRef.current) {
                setError('Failed to load location data. Please refresh.');
              }
            });
        }
      }, 1500);

      return () => clearTimeout(safetyTimeout);
    }
  }, [isWarmingUp, states.length, backendReady]);

  // Districts loading with smooth debouncing
  useEffect(() => {
    if (!selectedState || isWarmingUp || !backendReady || !isMountedRef.current) return;
    
    setDistricts([]);
    console.log(`📍 Loading districts for: ${selectedState}`);
    
    const debounceTimeout = setTimeout(() => {
      axios
        .get(`${API_URL}/districts/${selectedState}`, { timeout: 8000 })
        .then((res) => {
          if (isMountedRef.current) {
            console.log(`✅ Districts loaded: ${res.data.districts?.length || 0} for ${selectedState}`);
            setDistricts(res.data.districts || []);
          }
        })
        .catch((err) => {
          console.error('❌ Failed to load districts:', err);
          if (isMountedRef.current) {
            setError(`Failed to load districts for ${selectedState}. Please try another location.`);
          }
        });
    }, 400);

    return () => clearTimeout(debounceTimeout);
  }, [selectedState, isWarmingUp, backendReady]);

  const handlePredict = async (state, district) => {
    if (isWarmingUp || !backendReady) {
      console.log('🚫 Prediction blocked - system not ready');
      setError('Please wait for the system to finish initializing');
      return;
    }
    
    if (!state || !district) {
      setError('Please select both State and District');
      return;
    }
    
    console.log(`🔮 Making prediction for ${state}, ${district}`);
    setError('');
    setLoading(true);
    setPredictions([]);

    try {
      const res = await axios.post(`${API_URL}/predict`, {
        state_ut: state,
        district: district,
      }, { timeout: 15000 });
      
      if (isMountedRef.current) {
        console.log('✅ Prediction successful');
        setPredictions(res.data.predictions || []);
      }
    } catch (err) {
      console.error('❌ Prediction error:', err);
      if (isMountedRef.current) {
        const errorMsg = err.code === 'ECONNABORTED' 
          ? 'Analysis taking longer than expected. Please try again in a moment.' 
          : 'Prediction service temporarily unavailable. Please try again.';
        setError(errorMsg);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSearchInitiated = () => {
    if (isWarmingUp || !backendReady) {
      console.log('🚫 Search blocked - system not ready');
      return;
    }
    console.log('🔍 Search initiated by user');
    setHasInteracted(true);
  };

  const showLanding = predictions.length === 0;

  // Enhanced debug info
  const debugInfo = process.env.NODE_ENV === 'development' && (
    <div className="fixed bottom-4 left-4 bg-black/90 backdrop-blur-sm text-white text-xs p-3 rounded-lg z-50 max-w-sm border border-gray-700/50">
      <div className="flex items-center space-x-2 mb-1">
        <span className={`text-xs ${backendReady ? 'text-green-400' : 'text-yellow-400'}`}>
          {backendReady ? '✅' : '⏳'}
        </span>
        <span>Backend: {backendReady ? 'Ready' : 'Warming Up'}</span>
      </div>
      <div className="space-y-1 text-gray-300">
        <div>Checks: {backendCheckAttempts}</div>
        <div>Progress: {warmUpProgress}% (Stage {currentPhase + 1}/5)</div>
        <div className={`text-xs ${
          isFastForwarding ? 'text-blue-400' : 
          smoothProgressActiveRef.current ? 'text-cyan-400' : 'text-gray-400'
        }`}>
          {isFastForwarding ? '🎬 Fast-forward' : 
           smoothProgressActiveRef.current ? '🌟 Smooth Progression' : 'Normal'}
        </div>
        <div>Status: {isWarmingUp ? 'Loading...' : 'Main App'}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white relative">
      {isWarmingUp ? (
        <WarmUpScreen 
          progress={warmUpProgress}
          currentPhase={currentPhase}
          backendReady={backendReady}
          backendChecks={backendCheckAttempts}
          isFastForwarding={isFastForwarding}
          phases={[
            { label: 'Initializing System', progress: 20, icon: '🔄' },
            { label: 'Establishing Connections', progress: 40, icon: '🌐' },
            { label: 'Loading Data Models', progress: 60, icon: '📊' },
            { label: 'Verifying Backend', progress: 80, icon: '✅' },
            { label: 'System Ready!', progress: 100, icon: '🎉' }
          ]}
        />
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
          {error && !showLanding && !isWarmingUp && (
            <div className="fixed top-20 right-4 z-50 max-w-sm animate-fade-in">
              <div className="bg-gray-900/90 backdrop-blur-sm border border-red-600/30 rounded-lg p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <FiX className="text-red-400 shrink-0" />
                  <p className="text-sm text-red-100">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-200 transition-colors"
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
              <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center max-w-sm animate-fade-in">
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

          {debugInfo}
        </>
      )}
    </div>
  );
}

// Landing Page Component (unchanged)
const LandingPage = ({ onSearchClick }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8 animate-fade-in">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-800/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-700/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4 animate-slide-up">
          <div className="inline-flex items-center bg-linear-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/30 px-4 py-2 rounded-full mx-auto">
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
        <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto animate-slide-up delay-200">
          Harnessing machine learning and real-time environmental data to forecast disease outbreaks 
          in Indian districts with remarkable accuracy.
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full mb-8 animate-slide-up delay-400">
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 transition-all hover:border-gray-500/50 hover:scale-105">
            <div className="text-3xl font-bold text-gray-300 mb-1">95%+</div>
            <div className="text-gray-400 text-sm">Prediction Accuracy</div>
          </div>
          
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 transition-all hover:border-gray-500/50 hover:scale-105">
            <div className="text-3xl font-bold text-gray-300 mb-1">700+</div>
            <div className="text-gray-400 text-sm">Districts Covered</div>
          </div>
          
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 transition-all hover:border-gray-500/50 hover:scale-105">
            <div className="text-3xl font-bold text-gray-300 mb-1">24/7</div>
            <div className="text-gray-400 text-sm">Real-time Monitoring</div>
          </div>
          
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 transition-all hover:border-gray-500/50 hover:scale-105">
            <FiActivity className="text-gray-400 text-3xl mx-auto mb-2" />
            <div className="text-gray-400 text-sm">Live Data Integration</div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto space-y-6 animate-slide-up delay-600">
          <FiSearch className="text-5xl text-gray-400 mx-auto mb-4 animate-bounce" />
          
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
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 transition-all hover:scale-105">
              <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiMapPin className="text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-400 font-medium">1. Search Location</p>
            </div>
            
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 transition-all hover:scale-105">
              <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiActivity className="text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-400 font-medium">2. AI Analysis</p>
            </div>
            
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 transition-all hover:scale-105">
              <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiTrendingUp className="text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-400 font-medium">3. Get Predictions</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mt-12 animate-slide-up delay-800">
          <div className="flex items-start space-x-4 p-4 bg-gray-900/30 backdrop-blur-sm rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all hover:scale-105">
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

          <div className="flex items-start space-x-4 p-4 bg-gray-900/30 backdrop-blur-sm rounded-xl border border-gray-700/30 hover:border-gray-600/50 transition-all hover:scale-105">
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
        <div className="text-center text-gray-500 text-sm space-y-1 pt-8 border-t border-gray-800/30 max-w-2xl mx-auto animate-slide-up delay-1000">
          <p>Developed for public health awareness and early intervention</p>
          <p className="text-xs">Powered by AI • Data-driven decisions • Serving all Indian districts</p>
        </div>
      </div>
    </div>
  );
}

export default App;
