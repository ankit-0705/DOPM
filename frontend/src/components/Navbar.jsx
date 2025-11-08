import React, { useState, useRef, useEffect } from "react";
import { FiSearch, FiX, FiChevronDown, FiMapPin, FiTrendingUp } from "react-icons/fi";
import dops_logo from '../assets/dops_logo.png';

const Navbar = ({
  states,
  districts,
  selectedState,
  setSelectedState,
  selectedDistrict,
  setSelectedDistrict,
  onPredict,
  loading,
  error,
  setError,
  onSearchInitiated,
  showLanding,
}) => {
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSearchBox(false);
        setStateSearch("");
        setDistrictSearch("");
        setShowStateDropdown(false);
        setShowDistrictDropdown(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter states and districts based on search
  const filteredStates = states.filter((state) =>
    state.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredDistricts = districts.filter((district) =>
    district.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const handleStateSelect = (state) => {
    setSelectedState(state);
    setStateSearch("");
    setShowStateDropdown(false);
    setSelectedDistrict("");
    setDistrictSearch("");
  };

  const handleDistrictSelect = (district) => {
    setSelectedDistrict(district);
    setDistrictSearch("");
    setShowDistrictDropdown(false);
  };

  const handlePredict = () => {
    onPredict(selectedState, selectedDistrict);
    setShowSearchBox(false);
  };

  const handleClearSearch = () => {
    setShowSearchBox(false);
    setStateSearch("");
    setDistrictSearch("");
    setShowStateDropdown(false);
    setShowDistrictDropdown(false);
    setSelectedState("");
    setSelectedDistrict("");
    setError("");
    setIsExpanded(false);
  };

  const handleSearchClick = () => {
    if (showLanding && onSearchInitiated) {
      onSearchInitiated();
    }
    setShowSearchBox(true);
    setTimeout(() => {
      // Auto-focus state input
      const stateInput = dropdownRef.current?.querySelector('input[placeholder*="state"]');
      stateInput?.focus();
    }, 100);
  };

  const handleStateInputFocus = () => {
    if (stateSearch.length > 0) {
      setShowStateDropdown(true);
    }
  };

  const handleDistrictInputFocus = () => {
    if (districtSearch.length > 0) {
      setShowDistrictDropdown(true);
    }
  };

  const handleStateInputChange = (e) => {
    const value = e.target.value;
    setStateSearch(value);
    setShowStateDropdown(value.length > 0);
    if (selectedState && selectedState !== value) {
      setSelectedState("");
      setSelectedDistrict("");
      setDistrictSearch("");
    }
  };

  const handleDistrictInputChange = (e) => {
    const value = e.target.value;
    setDistrictSearch(value);
    setShowDistrictDropdown(value.length > 0);
    if (selectedDistrict && selectedDistrict !== value) {
      setSelectedDistrict("");
    }
  };

  const isPredictEnabled = selectedState && selectedDistrict && !loading;

  return (
    <nav className="bg-black/95 backdrop-blur-sm border-b border-gray-800/50 relative z-40">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        {/* Left: App Name - Enhanced */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-linear-to-br from-gray-700 to-gray-600 rounded-xl flex items-center justify-center shadow-lg border border-gray-600/30">
              {/* <FiSearch className="text-gray-200 text-lg" /> */}
              <img src={dops_logo} alt="" height="40px" width="40px"/>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 rounded-full border-2 border-black"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-linear-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
              Disease Outbreak Predictor
            </h1>
            <p className="text-xs text-gray-500">AI-Powered Early Warning System</p>
          </div>
        </div>

        {/* Right: Enhanced Search Button */}
        <div className="relative group">
          <button
            onClick={handleSearchClick}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border-2 transition-all hover:cursor-pointer duration-300 ${
              showLanding || showSearchBox
                ? "bg-gray-800/50 border-gray-600 text-gray-300 shadow-lg shadow-gray-600/25 hover:bg-gray-700/50"
                : "border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300 hover:shadow-md hover:shadow-gray-600/20"
            } ${loading ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <FiSearch className={`text-lg transition-transform ${showSearchBox ? "rotate-90" : ""}`} />
            <span className="font-medium hidden sm:inline">
              {showSearchBox ? "Searching..." : showLanding ? "Start Analysis" : "Search Location"}
            </span>
            {showLanding && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700/30 border-2 border-gray-600/50 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-gray-300 text-xs font-bold">NEW</span>
              </div>
            )}
          </button>

          {/* Tooltip for first-time users */}
          {showLanding && !showSearchBox && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900/95 backdrop-blur-sm border border-gray-800/50 rounded-xl p-3 shadow-2xl z-50 group-hover:opacity-100 opacity-0 transition-opacity duration-300">
              <div className="flex items-start space-x-2">
                <FiSearch className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-200 text-sm mb-1">Get Started</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Click to search for your location and get instant disease outbreak predictions
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Search Dropdown */}
      {showSearchBox && (
        <div 
          ref={dropdownRef}
          className="absolute right-6 top-full mt-2 w-96 bg-black/95 backdrop-blur-sm border border-gray-800/50 rounded-2xl shadow-2xl z-50 max-h-[calc(100vh-120px)] min-h-80 animate-in slide-in-from-top-2 duration-200"
        >
          {/* Sticky Header */}
          <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-gray-800/50 px-5 py-3 z-10 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold bg-linear-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
                Location Search
              </h3>
              <button
                onClick={handleClearSearch}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1.5 rounded-xl hover:bg-gray-900/50"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          {/* Search Content */}
          <div className="p-5 space-y-4">
            {/* State Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                State
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder={selectedState ? "Click to change..." : "Type state name..."}
                  value={stateSearch}
                  onChange={handleStateInputChange}
                  onFocus={handleStateInputFocus}
                  className="w-full bg-gray-900/50 backdrop-blur-sm text-white border border-gray-700/50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-gray-600/50 focus:border-gray-600/50 transition-all h-11"
                />
                
                {/* Clear state search */}
                {stateSearch && (
                  <button 
                    onClick={() => setStateSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 transition-colors"
                  >
                    <FiX size={14} />
                  </button>
                )}

                {/* State Results */}
                {showStateDropdown && stateSearch && filteredStates.length > 0 && (
                  <div className="absolute w-full mt-1 bg-gray-900/90 backdrop-blur-sm border border-gray-800/50 rounded-xl shadow-xl max-h-40 overflow-y-auto z-20">
                    {filteredStates.slice(0, 8).map((state) => (
                      <div
                        key={state}
                        onClick={() => handleStateSelect(state)}
                        className="px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-800/50 transition-colors border-b border-gray-800/20 last:border-b-0 flex items-center space-x-2"
                      >
                        <FiMapPin className="text-gray-500 shrink-0" size={14} />
                        <span className="text-gray-200">{state}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected State */}
              {selectedState && !stateSearch && (
                <div className="mt-2 p-2.5 bg-linear-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FiMapPin className="text-gray-400" size={14} />
                      <span className="text-gray-300 font-medium text-sm">{selectedState}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedState("");
                        setStateSearch("");
                        setSelectedDistrict("");
                        setDistrictSearch("");
                      }}
                      className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700/50 transition-colors"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* District Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                District
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    selectedState 
                      ? (selectedDistrict ? "Click to change..." : "Type district name...")
                      : "Select state first"
                  }
                  value={districtSearch}
                  onChange={handleDistrictInputChange}
                  onFocus={handleDistrictInputFocus}
                  disabled={!selectedState}
                  className={`w-full bg-gray-900/50 backdrop-blur-sm text-white border rounded-xl p-3 text-sm transition-all h-11 ${
                    selectedState
                      ? "border-gray-700/50 focus:ring-2 focus:ring-gray-600/50 focus:border-gray-600/50"
                      : "border-gray-700/30 bg-gray-900/70 cursor-not-allowed text-gray-500"
                  }`}
                />
                
                {/* Clear district search */}
                {districtSearch && selectedState && (
                  <button 
                    onClick={() => setDistrictSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 transition-colors"
                  >
                    <FiX size={14} />
                  </button>
                )}

                {/* District Results */}
                {showDistrictDropdown && districtSearch && selectedState && filteredDistricts.length > 0 && (
                  <div className="absolute w-full mt-1 bg-gray-900/90 backdrop-blur-sm border border-gray-800/50 rounded-xl shadow-xl max-h-40 overflow-y-auto z-20">
                    {filteredDistricts.slice(0, 8).map((district) => (
                      <div
                        key={district}
                        onClick={() => handleDistrictSelect(district)}
                        className="px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-800/50 transition-colors border-b border-gray-800/20 last:border-b-0 flex items-center space-x-2"
                      >
                        <FiMapPin className="text-gray-500 shrink-0" size={14} />
                        <span className="text-gray-200">{district}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected District */}
              {selectedDistrict && selectedState && !districtSearch && (
                <div className="mt-2 p-2.5 bg-linear-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm border border-gray-600/30 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FiMapPin className="text-gray-400" size={14} />
                      <span className="text-gray-300 font-medium text-sm">{selectedDistrict}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDistrict("");
                        setDistrictSearch("");
                      }}
                      className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700/50 transition-colors"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Helper text */}
              {!selectedState ? (
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <FiMapPin className="mr-1" />
                  Select a state to search districts
                </p>
              ) : districtSearch && !selectedDistrict ? (
                <p className="text-xs text-gray-500 mt-2">Keep typing to find your district</p>
              ) : null}
            </div>

            {/* Progress Indicator */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${selectedState ? "bg-gray-500" : "bg-gray-700"}`}></div>
                <span className={selectedState ? "text-gray-500" : "text-gray-600"}>State Selected</span>
                
                <div className={`w-2 h-2 rounded-full ml-auto ${selectedDistrict ? "bg-gray-500" : "bg-gray-700"}`}></div>
                <span className={selectedDistrict ? "text-gray-500" : "text-gray-600"}>District Selected</span>
              </div>
              
              <div className="w-full bg-gray-800/50 rounded-full h-1">
                <div 
                  className={`h-1 bg-linear-to-r from-gray-600 to-gray-500 rounded-full transition-all duration-300 ${
                    selectedState && selectedDistrict ? "w-full" : selectedState ? "w-1/2" : "w-0"
                  }`}
                ></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {/* Predict Button */}
              <button
                onClick={handlePredict}
                disabled={!isPredictEnabled || loading}
                className={`w-full h-12 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center text-sm shadow-lg hover:cursor-pointer ${
                  isPredictEnabled && !loading
                    ? "bg-linear-to-r from-gray-700 via-gray-600 to-gray-500 hover:from-gray-600 hover:via-gray-500 hover:to-gray-400 transform hover:scale-[1.02] active:scale-[0.98] shadow-gray-600/25"
                    : "bg-gray-800/50 cursor-not-allowed shadow-none"
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Analyzing...</span>
                  </>
                ) : isPredictEnabled ? (
                  <>
                    <FiTrendingUp className="mr-2" size={16} />
                    <span>Generate Prediction</span>
                  </>
                ) : (
                  <>
                    <FiMapPin className="mr-2" size={16} />
                    <span>Select Location</span>
                  </>
                )}
              </button>

              {/* Secondary Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedState("");
                    setStateSearch("");
                    setSelectedDistrict("");
                    setDistrictSearch("");
                  }}
                  disabled={loading}
                  className="flex-1 h-9 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 transition-colors border border-gray-700/50 hover:cursor-pointer"
                >
                  Clear All
                </button>
                
                {selectedState && !selectedDistrict && (
                  <button
                    onClick={() => {
                      setSelectedDistrict("");
                      setDistrictSearch("");
                    }}
                    disabled={loading}
                    className="flex-1 h-9 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 transition-colors border border-gray-700/50"
                  >
                    Clear District
                  </button>
                )}
              </div>
            </div>

            {/* Status Message */}
            {isPredictEnabled && !loading && (
              <div className="text-center py-2 px-3 bg-gray-800/30 border border-gray-600/30 rounded-lg">
                <p className="text-xs text-gray-300 font-medium">
                  ✅ Ready! {selectedState}, {selectedDistrict}
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="text-center py-2 px-3 bg-gray-900/50 border border-red-600/30 rounded-lg">
                <p className="text-xs text-red-300">{error}</p>
                <button
                  onClick={() => setError("")}
                  className="text-red-400 hover:text-red-200 text-xs mt-1 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Footer Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-linear-to-t from-black to-transparent pointer-events-none"></div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
