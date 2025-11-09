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
  const [appInitialized, setAppInitialized] = useState(false);
  
  // FIXED: Recovery cycle management - STRICTLY CAPPED AT 2
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0); // 0 = none, 1 = quick check, 2 = final
  const [quickRecoveryCheck, setQuickRecoveryCheck] = useState(false);
  
  // Refs for timing and cleanup
  const isMountedRef = useRef(true);
  const timeoutsRef = useRef([]);
  const backendCheckIntervalRef = useRef(null);
  const fastForwardActiveRef = useRef(false);
  const animationFrameRef = useRef(null);
  const smoothProgressActiveRef = useRef(false);
  const recoveryInProgressRef = useRef(false);
  const recoveryTimeoutRef = useRef(null);
  const warmupCycleRef = useRef(0); // FIXED: Strictly 0 or 1 (max 2 cycles)
  const warmupProgressTimerRef = useRef(null);
  const cycleLimitReachedRef = useRef(false); // NEW: Prevent infinite cycles
  
  // NEW: Recovery monitoring ref
  const recoveryMonitorIntervalRef = useRef(null);
  
  // FIXED: NEW: Flag to prevent recovery when backend is confirmed ready mid-cycle
  const bypassRecoveryRef = useRef(false);

  // Backend health check
  const checkBackendHealth = async (attempt = 0) => {
    if (!isMountedRef.current || backendReady || fastForwardActiveRef.current || smoothProgressActiveRef.current || recoveryInProgressRef.current || cycleLimitReachedRef.current) {
      return false;
    }
    
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

      
      if (isMountedRef.current && !backendReady && !cycleLimitReachedRef.current) {
        setBackendReady(true);
        setBackendCheckAttempts(attempt + 1);
        return true;
      }
      
      return response.status < 500;

    } catch (error) {
      
      if (error.response?.status >= 400 && error.response?.status < 500) {
        if (isMountedRef.current && !backendReady && !cycleLimitReachedRef.current) {
          setBackendReady(true);
          return true;
        }
      }
      
      return false;
    }
  };

  // FIXED: Reduced quick backend verification to ~4.5s (2 retries with 1.5s delays)
  const quickBackendVerify = async () => {
    if (!isMountedRef.current || cycleLimitReachedRef.current) return false;
    
    const maxRetries = 2; // FIXED: Reduced from 3 to 2
    const retryDelay = 1500; // FIXED: Reduced from 2000ms to 1500ms, total ~4.5s
    
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const response = await Promise.race([
          axios.get(`${API_URL}/states`, { 
            timeout: 1500, // Short timeout per retry
            validateStatus: (status) => status < 500 
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Retry timeout')), 1500)
          )
        ]);
        
        return response.status < 500; // Success if <500 (ready or minor error)
        
      } catch (error) {
        
        if (retry < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    return false;
  };

  // FIXED: Enhanced monitoring - triggers smooth progression instead of direct skip for second cycle
  // FIXED: Set bypass flag to prevent recovery triggers
  const startRecoveryMonitoring = () => {
    if (recoveryMonitorIntervalRef.current) {
      clearInterval(recoveryMonitorIntervalRef.current);
    }
    
    recoveryMonitorIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current || cycleLimitReachedRef.current || backendReady) {
        if (recoveryMonitorIntervalRef.current) {
          clearInterval(recoveryMonitorIntervalRef.current);
          recoveryMonitorIntervalRef.current = null;
        }
        return;
      }
      
      const isReady = await checkBackendHealth(0); // Quick check
      if (isReady) {
        setBackendReady(true);
        
        // FIXED: Set bypass flag to prevent recovery triggers
        bypassRecoveryRef.current = true;
        setRecoveryMode(false);
        setQuickRecoveryCheck(false);
        
        // For second cycle, use smooth progression instead of direct skip
        if (warmupCycleRef.current === 1 && isWarmingUp) {
          setIsFastForwarding(true);
          smoothWarmBackendProgression(); // Use smooth progression for second cycle
          if (recoveryMonitorIntervalRef.current) {
            clearInterval(recoveryMonitorIntervalRef.current);
            recoveryMonitorIntervalRef.current = null;
          }
          return;
        }
        
        // For first cycle or non-warmup, direct completion
        setIsWarmingUp(false);
        setIsFastForwarding(false);
        fastForwardActiveRef.current = false;
        smoothProgressActiveRef.current = false;
        
        clearRecoveryTimeouts();
        
        setTimeout(() => {
          if (isMountedRef.current && !cycleLimitReachedRef.current) {
            initializeApp();
          }
        }, 300);
        
        if (recoveryMonitorIntervalRef.current) {
          clearInterval(recoveryMonitorIntervalRef.current);
          recoveryMonitorIntervalRef.current = null;
        }
      }
    }, 1000); // Check every 1s during recovery/warmup
  };

  // UPDATED: Handle Quick Recovery Check with reduced timing and better monitoring
  const handleQuickRecoveryCheck = async () => {
    if (recoveryInProgressRef.current || recoveryAttempts > 0 || 
        warmupCycleRef.current > 0 || cycleLimitReachedRef.current || 
        !isMountedRef.current) {
      return;
    }

    recoveryInProgressRef.current = true;
    setQuickRecoveryCheck(true);
    setRecoveryAttempts(1); // First attempt
    
    // Start monitoring during recovery
    startRecoveryMonitoring();
    
    // FIXED: Reduced duration screen display with enhanced verify
    const quickCheck = await quickBackendVerify();
    recoveryInProgressRef.current = false;
    setQuickRecoveryCheck(false);
    
    // Stop monitoring if still active
    if (recoveryMonitorIntervalRef.current) {
      clearInterval(recoveryMonitorIntervalRef.current);
      recoveryMonitorIntervalRef.current = null;
    }
    
    if (quickCheck && isMountedRef.current && !cycleLimitReachedRef.current) {
      setBackendReady(true);
      setRecoveryMode(false);
      setError(''); // Clear any error
      setTimeout(() => {
        if (isMountedRef.current) {
          setIsWarmingUp(false);
          initializeApp();
        }
      }, 500); // FIXED: Reduced from 800ms
      return true;
    }
    
    // If failed, but monitoring might have caught it - check again
    if (backendReady) {
      setIsWarmingUp(false);
      return true;
    }
    
    // Quick check failed - proceed to second warmup cycle
    setRecoveryMode(false);
    setTimeout(() => {
      if (isMountedRef.current && !cycleLimitReachedRef.current) {
        warmupCycleRef.current = 1; // FIXED: Set to exactly 1 for second cycle
        setWarmUpProgress(0);
        setCurrentPhase(0);
        setBackendCheckAttempts(0);
        setBackendReady(false);
        setIsWarmingUp(true);
        
        // FIXED: Clear all progress timers and restart
        if (warmupProgressTimerRef.current) {
          clearTimeout(warmupProgressTimerRef.current);
          warmupProgressTimerRef.current = null;
        }
        
        // Clear existing phase progression timeouts
        timeoutsRef.current = timeoutsRef.current.filter(timeoutId => {
          if (typeof timeoutId === 'number' && timeoutId < 100000) {
            clearTimeout(timeoutId);
            return false;
          }
          return true;
        });
        
        startPhaseProgression(); // Restart progression for second cycle
        
        // FIXED: Start monitoring for second cycle to catch backend readiness
        startRecoveryMonitoring();
      }
    }, 1000); // FIXED: Reduced from 1500ms
    return false;
  };

  // UPDATED: Initiate Final Recovery with better backend ready checks
  const initiateFinalRecovery = async () => {
    if (recoveryInProgressRef.current || recoveryAttempts >= 2 || 
        warmupCycleRef.current !== 1 || cycleLimitReachedRef.current || 
        !isMountedRef.current || backendReady) { // FIXED: Added backendReady check
      if (backendReady) {
        // FIXED: If backend is ready, skip recovery and go to app
        setRecoveryMode(false);
        setIsWarmingUp(false);
        setTimeout(initializeApp, 500);
      }
      return;
    }

    recoveryInProgressRef.current = true;
    setRecoveryMode(true);
    setRecoveryAttempts(2); // Final attempt
    
    setError('🔄 Final system recovery attempt... (2/2)');
    
    // Start monitoring during final recovery
    startRecoveryMonitoring();
    
    const backendOk = await quickBackendVerify();
    recoveryInProgressRef.current = false;
    
    // Stop monitoring if still active
    if (recoveryMonitorIntervalRef.current) {
      clearInterval(recoveryMonitorIntervalRef.current);
      recoveryMonitorIntervalRef.current = null;
    }
    
    if (backendOk && isMountedRef.current && !cycleLimitReachedRef.current) {
      setBackendReady(true);
      
      setTimeout(() => {
        if (isMountedRef.current) {
          setRecoveryMode(false);
          setError('');
          setIsWarmingUp(false);
          initializeApp();
        }
      }, 1000); // FIXED: Reduced from 1500ms
      return true;
    }
    
    // If failed, but monitoring might have caught it
    if (backendReady) {
      setRecoveryMode(false);
      setIsWarmingUp(false);
      return true;
    }
    
    // FIXED: Final failure - mark cycle limit reached, show error
    cycleLimitReachedRef.current = true; // FIXED: Prevent any further cycles
    if (isMountedRef.current) {
      setBackendReady(false);
      setRecoveryMode(false); // Exit recovery mode to show error screen
      setError('Currently, the backend server is not responding. Please try again later or refresh the page to retry.');
    }
    clearRecoveryTimeouts();
    return false;
  };

  // Clear recovery timeouts
  const clearRecoveryTimeouts = () => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
    
    if (warmupProgressTimerRef.current) {
      clearTimeout(warmupProgressTimerRef.current);
      warmupProgressTimerRef.current = null;
    }
    
    // FIXED: Clear phase progression timeouts
    timeoutsRef.current = timeoutsRef.current.filter(timeoutId => {
      if (typeof timeoutId === 'number' && (timeoutId < 100000 || timeoutId > 120000)) {
        clearTimeout(timeoutId);
        return false;
      }
      return true;
    });
  };

  // Load states data
  const loadStatesData = async (attempt = 0) => {
    if (!isMountedRef.current || states.length > 0 || attempt > 3 || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) {
      if (states.length === 0 && attempt > 3 && backendReady && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        setStates([{ name: 'Limited Mode', code: 'limited', districts: [] }]);
        setAppInitialized(true);
      }
      return;
    }

    
    try {
      const response = await axios.get(`${API_URL}/states`, { 
        timeout: 8000,
        validateStatus: status => status < 500
      });
      
      if (isMountedRef.current && response.data && response.data.states && Array.isArray(response.data.states) && response.data.states.length > 0 && !cycleLimitReachedRef.current) {
        setStates(response.data.states);
        setAppInitialized(true);
        setHasInteracted(true);
        clearRecoveryTimeouts();
        return;
      }
    } catch (error) {
      console.error(`❌ States load failed (attempt ${attempt + 1}, Cycle ${warmupCycleRef.current + 1}):`, error.message);
    }

    if (attempt < 3 && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
      const retryDelay = 1500 * (attempt + 1);
      const retryTimeout = setTimeout(() => loadStatesData(attempt + 1), retryDelay);
      timeoutsRef.current.push(retryTimeout);
    }
  };

  // FIXED: Reverted to original initializeApp without temporary flag
  const initializeApp = async () => {
    if (appInitialized || !backendReady || !isMountedRef.current || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) {
      return;
    }

    await loadStatesData(0);
    
    if ((states.length > 0 || backendReady) && isMountedRef.current && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
      setAppInitialized(true);
    }
  };

  // Start backend monitoring
  const startBackendMonitoring = () => {
    let attempt = 0;
    const maxAttempts = 25;

    backendCheckIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current || backendReady || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current || attempt >= maxAttempts) {
        if (backendCheckIntervalRef.current) {
          clearInterval(backendCheckIntervalRef.current);
          backendCheckIntervalRef.current = null;
        }
        return;
      }
      
      const isReady = await checkBackendHealth(attempt);
      
      if (isReady && !backendReady && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        setBackendReady(true);
        if (backendCheckIntervalRef.current) {
          clearInterval(backendCheckIntervalRef.current);
          backendCheckIntervalRef.current = null;
        }
        clearRecoveryTimeouts();
        setTimeout(initializeApp, 500);
      }
      
      attempt++;
      setBackendCheckAttempts(attempt);
    }, 2000);

    timeoutsRef.current.push(backendCheckIntervalRef.current);
  };

  // Smooth progression for warm backend
  const smoothWarmBackendProgression = () => {
    if (smoothProgressActiveRef.current || !isMountedRef.current || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) return;
    
    smoothProgressActiveRef.current = true;
    setIsFastForwarding(true);
    
    const phases = [
      { progress: 20, duration: 1000, label: 'Initializing System', phase: 0 },
      { progress: 40, duration: 1000, label: 'Establishing Connections', phase: 1 },
      { progress: 60, duration: 1000, label: 'Loading Data Models', phase: 2 },
      { progress: 80, duration: 1000, label: 'Verifying Backend', phase: 3 },
      { progress: 100, duration: 1000, label: 'System Ready', phase: 4 }
    ];

    let phaseIndex = 0;
    let phaseStartTime = Date.now();

    const animateProgression = () => {
      if (!isMountedRef.current || !smoothProgressActiveRef.current || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) return;

      const elapsed = Date.now() - phaseStartTime;
      
      if (phaseIndex < phases.length) {
        const currentPhase = phases[phaseIndex];
        const phaseProgress = phaseIndex * 20 + (elapsed / currentPhase.duration) * 20;
        
        setWarmUpProgress(Math.min(100, Math.round(phaseProgress)));
        setCurrentPhase(phaseIndex);
        
        if (elapsed >= currentPhase.duration && phaseIndex < phases.length - 1) {
          phaseIndex++;
          phaseStartTime = Date.now();
        } else if (phaseIndex >= phases.length - 1 && elapsed >= 1000) {
          setWarmUpProgress(100);
          setCurrentPhase(4);
          setIsFastForwarding(false);
          smoothProgressActiveRef.current = false;
          setTimeout(completeWarmUp, 800);
          return;
        }
      }

      if (!recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        animationFrameRef.current = requestAnimationFrame(animateProgression);
      }
    };

    setWarmUpProgress(0);
    animationFrameRef.current = requestAnimationFrame(animateProgression);

    const failsafe = setTimeout(() => {
      if (smoothProgressActiveRef.current && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        smoothProgressActiveRef.current = false;
        setIsFastForwarding(false);
        completeWarmUp();
      }
    }, 6000);

    timeoutsRef.current.push(failsafe);
  };

  // Fast-forward for cold starts
  const fastForwardToCompletion = (currentProgress = 0, currentPhaseIndex = 0) => {
    if (fastForwardActiveRef.current || smoothProgressActiveRef.current || !isMountedRef.current || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) return;
    
    fastForwardActiveRef.current = true;
    setIsFastForwarding(true);
    
    const totalDuration = 3000;
    let startTime = Date.now();

    const animateFastForward = () => {
      if (!isMountedRef.current || !fastForwardActiveRef.current || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, currentProgress + (elapsed / totalDuration) * (100 - currentProgress));
      const currentPhase = Math.floor(progress / 20);
      
      setWarmUpProgress(Math.round(progress));
      setCurrentPhase(Math.min(4, currentPhase));
      
      if (progress >= 100) {
        setWarmUpProgress(100);
        setCurrentPhase(4);
        setIsFastForwarding(false);
        fastForwardActiveRef.current = false;
        setTimeout(completeWarmUp, 800);
        return;
      }
      
      if (!recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        animationFrameRef.current = requestAnimationFrame(animateFastForward);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateFastForward);
  };

  // FIXED: Complete warmup - Enhanced check with synchronous re-verification and bypass flag
  const completeWarmUp = () => {
    if (!isMountedRef.current || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) {
      return;
    }
    setIsWarmingUp(false);
    setIsFastForwarding(false);
    fastForwardActiveRef.current = false;
    smoothProgressActiveRef.current = false;

    // FIXED: Enhanced check - synchronous re-verification and bypass flag
    const isActuallyReady = backendReady || bypassRecoveryRef.current;
    if (isActuallyReady && !appInitialized && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
      // Clear any pending monitoring
      if (recoveryMonitorIntervalRef.current) {
        clearInterval(recoveryMonitorIntervalRef.current);
        recoveryMonitorIntervalRef.current = null;
      }
      setTimeout(initializeApp, 300);
      return;
    }

    // FIXED: Exit early if bypass flag is set (prevents recovery even if state timing issue)
    if (bypassRecoveryRef.current && !cycleLimitReachedRef.current) {
      setTimeout(initializeApp, 300);
      return;
    }

    // Original recovery logic only if truly not ready
    if (!backendReady && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
      // Stop any active recovery monitoring before deciding
      if (recoveryMonitorIntervalRef.current) {
        clearInterval(recoveryMonitorIntervalRef.current);
        recoveryMonitorIntervalRef.current = null;
      }
      if (recoveryAttempts === 0 && warmupCycleRef.current === 0) {
        // First warmup failure - trigger quick recovery check 1/2
        setTimeout(() => {
          if (isMountedRef.current && !recoveryMode && !cycleLimitReachedRef.current) {
            handleQuickRecoveryCheck();
          }
        }, 1000);
      } else if (recoveryAttempts === 1 && warmupCycleRef.current === 1 && !backendReady) {
        // Second warmup failure - trigger final recovery 2/2
        setTimeout(() => {
          if (isMountedRef.current && !recoveryMode && !cycleLimitReachedRef.current) {
            initiateFinalRecovery();
          }
        }, 1000);
      } else {
        // Any other case - we've exceeded limits
        cycleLimitReachedRef.current = true;
        setError('Maximum recovery attempts reached. Please refresh to try again.');
      }
    }
  };

  // FIXED: Phase progression with strict cycle limiting
  const startPhaseProgression = () => {
    // FIXED: Don't start if we've exceeded cycle limits
    if (cycleLimitReachedRef.current || recoveryMode || quickRecoveryCheck) {
      return;
    }

    // Clear any existing progress timer
    if (warmupProgressTimerRef.current) {
      clearTimeout(warmupProgressTimerRef.current);
      warmupProgressTimerRef.current = null;
    }
    
    const phases = [
      { progress: 20, duration: 10000, label: 'Initializing System', phase: 0 },
      { progress: 40, duration: 15000, label: 'Establishing Connections', phase: 1 },
      { progress: 60, duration: 10000, label: 'Loading Data Models', phase: 2 },
      { progress: 80, duration: 10000, label: 'Verifying Backend', phase: 3 },
      { progress: 100, duration: 10000, label: 'System Ready', phase: 4 }
    ];

    let currentPhaseIndex = 0;

    const advanceToNextPhase = () => {
      if (!isMountedRef.current || fastForwardActiveRef.current || smoothProgressActiveRef.current || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) return;

      if (currentPhaseIndex < phases.length) {
        const phase = phases[currentPhaseIndex];
        setWarmUpProgress(phase.progress);
        setCurrentPhase(phase.phase);
        
        if (currentPhaseIndex >= 2 && !backendReady && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
          checkBackendHealth(backendCheckAttempts).then(isReady => {
            if (isReady && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
              setBackendReady(true);
              // FIXED: Use smooth progression for both cycles when backend becomes ready
              if (warmupCycleRef.current === 0) {
                smoothWarmBackendProgression();
              } else {
                // For second cycle, start smooth from current progress
                fastForwardActiveRef.current = false;
                smoothProgressActiveRef.current = false;
                smoothWarmBackendProgression();
              }
            }
          });
        }
        
        currentPhaseIndex++;
        
        if (currentPhaseIndex < phases.length && !backendReady && !fastForwardActiveRef.current && !smoothProgressActiveRef.current && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
          const timeout = setTimeout(advanceToNextPhase, phase.duration);
          timeoutsRef.current.push(timeout);
        } else if (currentPhaseIndex >= phases.length) {
          // FIXED: Only complete warmup if we haven't exceeded limits
          setTimeout(() => {
            if (!recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
              setWarmUpProgress(100);
              completeWarmUp();
            }
          }, 2000);
        }
      }
    };

    // Start progression only if within limits
    const initialDelay = setTimeout(() => {
      if (isMountedRef.current && !backendReady && !smoothProgressActiveRef.current && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        advanceToNextPhase();
      }
    }, 800);

    timeoutsRef.current.push(initialDelay);
  };

  // Quick backend check
  const quickBackendCheck = async () => {
    if (backendReady || smoothProgressActiveRef.current || fastForwardActiveRef.current || recoveryMode || quickRecoveryCheck || recoveryInProgressRef.current || cycleLimitReachedRef.current) return;
    
    const isReady = await checkBackendHealth(0);
    
    if (isReady && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
      setBackendReady(true);
      smoothWarmBackendProgression();
    }
  };

  // FIXED: 50-second trigger - STRICTLY FIRST CYCLE ONLY
  const setupRecoverySystem = () => {
    if (warmupCycleRef.current > 0 || cycleLimitReachedRef.current) return;
    
    const recoveryTimeout = setTimeout(() => {
      if (isMountedRef.current && !backendReady && !recoveryMode && !quickRecoveryCheck && warmupCycleRef.current === 0 && !cycleLimitReachedRef.current) {
        // Let warmup complete naturally to trigger quick recovery in completeWarmUp()
      }
    }, 50000);

    recoveryTimeoutRef.current = recoveryTimeout;
    timeoutsRef.current.push(recoveryTimeout);
  };

  // FIXED: Second cycle 50-second timeout - ONLY FOR SECOND CYCLE
  const setupSecondCycleRecovery = () => {
    if (warmupCycleRef.current !== 1 || cycleLimitReachedRef.current) return;
    
    const secondCycleTimeout = setTimeout(() => {
      if (isMountedRef.current && !backendReady && !recoveryMode && !quickRecoveryCheck && warmupCycleRef.current === 1 && !cycleLimitReachedRef.current) {
        initiateFinalRecovery();
      }
    }, 50000);

    timeoutsRef.current.push(secondCycleTimeout);
  };

  // Main useEffect
  useEffect(() => {
    isMountedRef.current = true;
    recoveryInProgressRef.current = false;
    recoveryTimeoutRef.current = null;
    warmupCycleRef.current = 0;
    cycleLimitReachedRef.current = false; // FIXED: Reset cycle limit
    bypassRecoveryRef.current = false; // NEW: Reset bypass flag on mount

    startBackendMonitoring();

    const quickCheck = setTimeout(() => {
      if (!backendReady && !smoothProgressActiveRef.current && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        quickBackendCheck();
      }
    }, 1500);

    timeoutsRef.current.push(quickCheck);

    const phaseStart = setTimeout(() => {
      if (!backendReady && !fastForwardActiveRef.current && !smoothProgressActiveRef.current && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        startPhaseProgression();
      }
    }, 2000);

    timeoutsRef.current.push(phaseStart);

    setupRecoverySystem();
    
    // FIXED: Ultimate failsafe - 120 seconds total (strictly 2 cycles max)
    const ultimateFailsafe = setTimeout(() => {
      if (isMountedRef.current && isWarmingUp && !backendReady && !recoveryMode && !cycleLimitReachedRef.current) {
        if (warmupCycleRef.current === 1 && recoveryAttempts === 1) {
          initiateFinalRecovery();
        } else if (recoveryAttempts === 0 && warmupCycleRef.current === 0) {
          handleQuickRecoveryCheck();
        } else {
          // FIXED: Any other case - we've hit the limit
          cycleLimitReachedRef.current = true;
          setError('Maximum recovery attempts reached. Please refresh to try again.');
        }
      }
    }, 120000);

    timeoutsRef.current.push(ultimateFailsafe);

    // FIXED: Watch for warmup cycle changes with strict limits
    const cycleWatcher = setInterval(() => {
      if (warmupCycleRef.current === 1 && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        setupSecondCycleRecovery();
        // FIXED: Ensure monitoring runs during second cycle
        if (!recoveryMonitorIntervalRef.current) {
          startRecoveryMonitoring();
        }
        clearInterval(cycleWatcher);
      }
    }, 1000);

    timeoutsRef.current.push(cycleWatcher);

    // UPDATED: Cleanup with new recovery monitor ref and bypass flag
    return () => {
      isMountedRef.current = false;
      recoveryInProgressRef.current = false;
      cycleLimitReachedRef.current = true; // FIXED: Ensure cleanup stops all cycles
      bypassRecoveryRef.current = false; // NEW: Reset bypass flag
      
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }
      if (warmupProgressTimerRef.current) {
        clearTimeout(warmupProgressTimerRef.current);
        warmupProgressTimerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      timeoutsRef.current.forEach(id => {
        if (typeof id === 'number') clearTimeout(id);
        else if (id && typeof id === 'object') clearInterval(id);
      });
      timeoutsRef.current = [];
      if (backendCheckIntervalRef.current) {
        clearInterval(backendCheckIntervalRef.current);
        backendCheckIntervalRef.current = null;
      }
      // NEW: Clear recovery monitoring
      if (recoveryMonitorIntervalRef.current) {
        clearInterval(recoveryMonitorIntervalRef.current);
        recoveryMonitorIntervalRef.current = null;
      }
      fastForwardActiveRef.current = false;
      smoothProgressActiveRef.current = false;
      setIsFastForwarding(false);
      setRecoveryMode(false);
      setQuickRecoveryCheck(false);
    };
  }, []);

  // Reverted: Original safety net without aggressive initialization
  useEffect(() => {
    if (!isWarmingUp && !appInitialized && backendReady && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
      const safetyTimeout = setTimeout(() => {
        if (!appInitialized && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
          initializeApp();
        }
      }, 1500); // Reverted: Original 1500ms delay
      return () => clearTimeout(safetyTimeout);
    }
  }, [isWarmingUp, appInitialized, backendReady, recoveryMode, quickRecoveryCheck, cycleLimitReachedRef.current]);

  // Districts loading
  useEffect(() => {
    if (!selectedState || isWarmingUp || !backendReady || !appInitialized || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) return;
    
    setDistricts([]);
    
    const loadTimeout = setTimeout(() => {
      axios.get(`${API_URL}/districts/${selectedState}`, { timeout: 8000 })
        .then(res => {
          if (isMountedRef.current && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
            setDistricts(res.data.districts || []);
          }
        })
        .catch(err => {
          if (isMountedRef.current && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
            setError('Failed to load districts. Some locations may not be available.');
          }
        });
    }, 400);
    
    return () => clearTimeout(loadTimeout);
  }, [selectedState, isWarmingUp, backendReady, appInitialized, recoveryMode, quickRecoveryCheck, cycleLimitReachedRef.current]);

  const handlePredict = async (state, district) => {
    if (isWarmingUp || !backendReady || !appInitialized || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) {
      setError('System not ready. Please wait for initialization.');
      return;
    }
    
    if (!state || !district || states.length === 0) {
      setError('Please select both State and District');
      return;
    }
    
    setError('');
    setLoading(true);
    setPredictions([]);
    
    try {
      const res = await axios.post(`${API_URL}/predict`, {
        state_ut: state,
        district: district,
      }, { timeout: 15000 });
      
      if (isMountedRef.current && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        setPredictions(res.data.predictions || []);
      }
    } catch (err) {
      if (isMountedRef.current && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current) {
        setError(err.code === 'ECONNABORTED' 
          ? 'Analysis taking longer than expected.' 
          : 'Prediction failed. Please try again.'
        );
        
        // FIXED: Only trigger recovery if within limits
        if (err.response?.status >= 500 && !recoveryMode && !quickRecoveryCheck && !recoveryInProgressRef.current && !cycleLimitReachedRef.current) {
          if (recoveryAttempts === 1 && warmupCycleRef.current === 1) {
            initiateFinalRecovery();
          } else if (recoveryAttempts === 0 && warmupCycleRef.current === 0) {
            handleQuickRecoveryCheck();
          }
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSearchInitiated = () => {
    if (isWarmingUp || !backendReady || !appInitialized || recoveryMode || quickRecoveryCheck || cycleLimitReachedRef.current) {
      return;
    }
    setHasInteracted(true);
  };

  // FIXED: Reverted to original showLanding logic
  const showLanding = predictions.length === 0; // Reverted: Original logic without appInitialized check

  // FIXED: Enhanced debug info with cycle limits and bypass flag
  const debugInfo = process.env.NODE_ENV === 'development' && (
    <div className={`fixed bottom-4 left-4 text-white text-xs p-3 rounded-lg z-50 max-w-sm border ${
      cycleLimitReachedRef.current
        ? 'bg-red-900/90 border-red-600/50' 
        : recoveryMode 
        ? 'bg-red-900/90 border-red-600/50' 
        : quickRecoveryCheck
        ? 'bg-yellow-900/90 border-yellow-600/50'
        : 'bg-black/90 border-gray-700/50'
    } backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`${backendReady ? 'text-green-400' : cycleLimitReachedRef.current ? 'text-red-400' : recoveryMode ? 'text-red-400' : quickRecoveryCheck ? 'text-yellow-400' : 'text-yellow-400'}`}>
          {backendReady ? '✅' : cycleLimitReachedRef.current ? '🚫' : recoveryMode ? '🚨' : quickRecoveryCheck ? '🔍' : '⏳'}
        </span>
        <span className={`${cycleLimitReachedRef.current ? 'text-red-300' : recoveryMode ? 'text-red-300' : quickRecoveryCheck ? 'text-yellow-300' : 'text-gray-300'}`}>
          {cycleLimitReachedRef.current ? 'Limit Reached' : recoveryMode ? `Final Recovery 2/2` : quickRecoveryCheck ? `Quick Check 1/2` : backendReady ? 'Ready' : `Warmup Cycle ${warmupCycleRef.current + 1}/2`}
        </span>
      </div>
      <div className="text-gray-300 text-[10px] space-y-0.5">
        <div>App: {appInitialized ? 'Ready' : 'Loading'}</div>
        <div>States: {states.length}</div>
        <div>Progress: {warmUpProgress}%</div>
        <div>Backend: {backendReady ? 'Ready' : 'Checking'}</div>
        <div className={`${isFastForwarding ? 'text-blue-400' : smoothProgressActiveRef.current ? 'text-cyan-400' : 'text-gray-400'}`}>
          {isFastForwarding ? 'Fast-forward' : smoothProgressActiveRef.current ? 'Smooth' : 'Normal'}
        </div>
        <div>Attempts: {recoveryAttempts}/2</div>
        <div>Cycle: {warmupCycleRef.current + 1}/2</div>
        <div>Bypass: {bypassRecoveryRef.current ? 'Active' : 'Inactive'}</div>
        {cycleLimitReachedRef.current && <div className="text-red-400">MAX LIMIT: No more retries</div>}
      </div>
    </div>
  );

  // FIXED: Quick recovery check screen (1/2) - 50% progress bar, 4.5s duration
  if (quickRecoveryCheck) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full bg-yellow-900/95 backdrop-blur-sm border border-yellow-600/50 rounded-2xl p-6">
          <div className="flex items-center justify-center mb-4">
            <FiActivity className="text-yellow-400 text-3xl animate-pulse mr-2" />
            <span className="text-xl font-semibold text-gray-200">Quick System Check</span>
          </div>
          <p className="text-gray-300 mb-4 text-sm">
            Connection issue detected. Checking backend connectivity... (1/2)
          </p>
          {/* FIXED: Progress bar shows 50% for 1/2 attempt, reduced duration */}
          <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
            <div 
              className="bg-linear-to-r from-yellow-600 to-yellow-400 h-2 rounded-full transition-all duration-4500 ease-linear" 
              style={{ width: '50%' }} // FIXED: 50% for first attempt
            />
          </div>
          <p className="text-xs text-gray-400">
            Checking for 4.5 seconds. If successful, you'll be taken to the main app.
          </p>
        </div>
        {debugInfo}
      </div>
    );
  }

  // FIXED: Final recovery screen (2/2) - 100% progress bar, reduced duration
  if (recoveryMode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full bg-red-900/95 backdrop-blur-sm border border-red-600/50 rounded-2xl p-6">
          <div className="flex items-center justify-center mb-4">
            <FiActivity className="text-red-400 text-3xl animate-pulse mr-2" />
            <span className="text-xl font-semibold text-gray-200">System Recovery</span>
          </div>
          <p className="text-gray-300 mb-4 text-sm">
            Final connection attempt... (2/2)
          </p>
          {/* FIXED: Progress bar shows 100% for 2/2 attempt, reduced duration */}
          <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
            <div 
              className="bg-linear-to-r from-red-600 to-red-400 h-2 rounded-full transition-all duration-4500 ease-linear" 
              style={{ width: '100%' }} // FIXED: 100% for final attempt
            />
          </div>
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700/50 rounded-lg">
            <p className="text-red-200 text-sm">
              This is the final attempt after two warmup cycles.
            </p>
          </div>
        </div>
        {debugInfo}
      </div>
    );
  }

  // Normal warmup
  if (isWarmingUp) {
    return (
      <div className="min-h-screen bg-black relative">
        <WarmUpScreen 
          progress={warmUpProgress}
          currentPhase={currentPhase}
          backendReady={backendReady}
          backendChecks={backendCheckAttempts}
          isFastForwarding={isFastForwarding}
          cycle={warmupCycleRef.current + 1}
          maxCycles={2}
          phases={[
            { label: 'Initializing System', progress: 20, icon: '🔄' },
            { label: 'Establishing Connections', progress: 40, icon: '🌐' },
            { label: 'Loading Data Models', progress: 60, icon: '📊' },
            { label: 'Verifying Backend', progress: 80, icon: '✅' },
            { label: 'System Ready!', progress: 100, icon: '🎉' }
          ]}
        />
        {debugInfo}
      </div>
    );
  }

  // FIXED: Reverted to original initialization overlay logic
  const showInitOverlay = !appInitialized && backendReady && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current;
  if (showInitOverlay) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center mb-4">
            <svg className="animate-spin mr-3 h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-white font-medium">Final Setup...</span>
          </div>
          <p className="text-gray-300 mb-6">Loading location data</p>
          <div className="text-sm text-blue-400">Backend ready • Initializing app</div>
        </div>
        {debugInfo}
      </div>
    );
  }

  // FIXED: Error screen for final failure - only shows when cycle limit reached
  if (cycleLimitReachedRef.current || (error && error.includes('not responding')) && !showLanding && !isWarmingUp && !showInitOverlay && !recoveryMode && !quickRecoveryCheck) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full bg-red-900/95 backdrop-blur-sm border border-red-600/50 rounded-2xl p-6">
          <div className="flex items-center justify-center mb-4">
            <FiX className="text-red-400 text-3xl mr-2" />
            <span className="text-xl font-semibold text-gray-200">Service Unavailable</span>
          </div>
          <p className="text-gray-300 mb-4 text-sm">
            {cycleLimitReachedRef.current 
              ? 'Maximum recovery attempts (2 cycles + 2 checks) reached.' 
              : error
            }
          </p>
          <div className="mt-4 p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg">
            <p className="text-gray-200 text-sm">
              We've tried all recovery attempts but the backend server is currently down.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 border border-red-500 rounded-lg text-white font-medium transition-colors"
            >
              Refresh to Retry
            </button>
          </div>
        </div>
        {debugInfo}
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-black text-white relative">
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
        appReady={appInitialized && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current}
        statesData={states}
      />

      {error && !showLanding && !isWarmingUp && !showInitOverlay && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current && !error.includes('not responding') && (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-fade-in">
          <div className="bg-gray-900/90 backdrop-blur-sm border border-red-600/30 rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-2">
              <FiX className="text-red-400" />
              <p className="text-sm text-red-100">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="absolute top-2 right-2 text-red-400 hover:text-red-200"
            >
              <FiX size={14} />
            </button>
          </div>
        </div>
      )}

      {showLanding ? (
        <LandingPage onSearchClick={handleSearchInitiated} appReady={appInitialized && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current} />
      ) : (
        <>
          {predictions.length > 0 && <PredictionDashboard predictions={predictions} />}
          {hasInteracted && predictions.length === 0 && !loading && appInitialized && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current && (
            <div className="flex items-center justify-center min-h-[60vh] px-4">
              <div className="text-center max-w-md">
                <FiTrendingUp className="text-6xl text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-200 mb-2">Ready for Analysis</h2>
                <p className="text-gray-400 mb-6">Select a location using the search icon above.</p>
                <button
                  onClick={handleSearchInitiated}
                  className="px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-white font-medium transition-colors"
                  disabled={!appInitialized}
                >
                  Start Search
                </button>
              </div>
            </div>
          )}
          {hasInteracted && predictions.length === 0 && !loading && !appInitialized && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current && (
            <div className="flex items-center justify-center min-h-[60vh] px-4">
              <div className="text-center max-w-md">
                <FiActivity className="text-6xl text-blue-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-200 mb-2">System Active</h2>
                <p className="text-gray-400 mb-6">Location data loading complete soon</p>
              </div>
            </div>
          )}
        </>
      )}

      {loading && !recoveryMode && !quickRecoveryCheck && !cycleLimitReachedRef.current && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center max-w-sm">
            <div className="flex items-center justify-center mb-4">
              <svg className="animate-spin mr-3 h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-white font-medium">Analyzing...</span>
            </div>
            <p className="text-gray-300 text-sm">Processing data</p>
          </div>
        </div>
      )}

      {debugInfo}
    </div>
  );
}

// Landing Page component (unchanged)
const LandingPage = ({ onSearchClick, appReady }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-800/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gray-700/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center bg-gray-800/50 backdrop-blur-sm border border-gray-600/30 px-4 py-2 rounded-full mx-auto">
            <FiShield className="mr-2 text-gray-300" />
            <span className="text-gray-300 font-medium">AI-Powered Early Warning</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            <span className="bg-linear-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
              Predict Disease Outbreaks
            </span>
            <span className="block text-2xl md:text-3xl text-gray-400 mt-2">Before They Spread</span>
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
          Harnessing machine learning and real-time environmental data to forecast disease outbreaks 
          in Indian districts with remarkable accuracy.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full mb-8">
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:scale-105 transition-all">
            <div className="text-3xl font-bold text-gray-300 mb-1">95%+</div>
            <div className="text-gray-400 text-sm">Prediction Accuracy</div>
          </div>
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:scale-105 transition-all">
            <div className="text-3xl font-bold text-gray-300 mb-1">700+</div>
            <div className="text-gray-400 text-sm">Districts Covered</div>
          </div>
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:scale-105 transition-all">
            <div className="text-3xl font-bold text-gray-300 mb-1">24/7</div>
            <div className="text-gray-400 text-sm">Real-time Monitoring</div>
          </div>
          <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:scale-105 transition-all">
            <FiActivity className="text-gray-400 text-3xl mx-auto mb-2" />
            <div className="text-gray-400 text-sm">Live Data Integration</div>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/30 rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto space-y-6">
          <FiSearch className={`text-5xl mx-auto mb-4 ${appReady ? 'text-gray-400 animate-pulse' : 'text-blue-400'}`} />
          
          <div className="space-y-3">
            <h3 className={`text-xl md:text-2xl font-semibold ${!appReady ? 'text-blue-200' : 'text-gray-200'}`}>
              {appReady ? 'Ready to Get Started?' : 'Almost Ready!'}
            </h3>
            <p className={`${!appReady ? 'text-blue-300' : 'text-gray-400'}`}>
              {appReady 
                ? "Click the search icon above to select your district and get outbreak predictions."
                : "The system is finalizing. Location data will be ready in moments."
              }
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 hover:scale-105 transition-all">
              <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiMapPin className="text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-400 font-medium">1. Search Location</p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 hover:scale-105 transition-all">
              <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiActivity className="text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-400 font-medium">2. AI Analysis</p>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/30 hover:scale-105 transition-all">
              <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <FiTrendingUp className="text-gray-400" size={16} />
              </div>
              <p className="text-xs text-gray-400 font-medium">3. Get Predictions</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mt-12">
          <div className="flex items-start space-x-4 p-4 bg-gray-900/30 backdrop-blur-sm rounded-xl border border-gray-700/30 hover:border-gray-600/50 hover:scale-105 transition-all">
            <div className="shrink-0 mt-1">
              <FiActivity className="text-gray-400 text-2xl" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-200 text-lg mb-1">Real-time Environmental Analysis</h4>
              <p className="text-gray-400 leading-relaxed">
                Integrates live weather data, air quality indices, and population density metrics.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4 p-4 bg-gray-900/30 backdrop-blur-sm rounded-xl border border-gray-700/30 hover:border-gray-600/50 hover:scale-105 transition-all">
            <div className="shrink-0 mt-1">
              <FiShield className="text-gray-400 text-2xl" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-200 text-lg mb-1">Advanced Machine Learning</h4>
              <p className="text-gray-400 leading-relaxed">
                Trained on epidemiological data using cutting-edge algorithms for accurate predictions.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm space-y-1 pt-8 border-t border-gray-800/30 max-w-2xl mx-auto">
          <p>Developed for public health awareness and early intervention</p>
          <p className="text-xs">Powered by AI • Serving all Indian districts</p>
        </div>
      </div>
    </div>
  );
}

export default App;
