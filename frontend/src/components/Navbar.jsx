import React, { useState, useRef, useEffect } from "react";
import { FiSearch, FiX } from "react-icons/fi";

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
}) => {
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSearchBox(false);
        setStateSearch("");
        setDistrictSearch("");
        setShowStateDropdown(false);
        setShowDistrictDropdown(false);
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
    setStateSearch(""); // Clear the input after selection
    setShowStateDropdown(false);
    setSelectedDistrict("");
    setDistrictSearch("");
  };

  const handleDistrictSelect = (district) => {
    setSelectedDistrict(district);
    setDistrictSearch(""); // Clear the input after selection
    setShowDistrictDropdown(false);
  };

  const handlePredict = () => {
    onPredict(selectedState, selectedDistrict);
    setShowSearchBox(false); // Close dropdown after prediction
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
  };

  const handleStateInputFocus = () => {
    if (stateSearch) {
      setShowStateDropdown(true);
    }
  };

  const handleDistrictInputFocus = () => {
    if (districtSearch) {
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
    <nav className="bg-[#1E1E1E] flex items-center justify-between px-6 py-4 shadow-lg relative">
      {/* Left: App Name */}
      <h1 className="text-2xl font-bold text-green-400">🧬 Disease Predictor</h1>

      {/* Right: Search Icon and Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowSearchBox((prev) => !prev)}
          className="text-gray-300 hover:text-green-400 transition text-2xl"
          disabled={loading}
        >
          <FiSearch />
        </button>

        {/* Dropdown Tooltip - Optimized Height */}
        {showSearchBox && (
          <div className="absolute right-0 mt-2 w-80 bg-[#1E1E1E] border border-gray-700 rounded-xl shadow-2xl z-50 max-h-[calc(100vh-140px)] min-h-[380px]">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-[#1E1E1E] border-b border-gray-700 px-4 py-3 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Location Search</h3>
                <button
                  onClick={handleClearSearch}
                  className="text-gray-400 hover:text-white transition p-1 rounded-full hover:bg-gray-700"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* State Selection - Compact Layout */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Select State
                </label>
                
                {/* State Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={selectedState ? "Click to change state" : "Type to search states..."}
                    value={stateSearch}
                    onChange={handleStateInputChange}
                    onFocus={handleStateInputFocus}
                    className="w-full bg-[#282828] text-[#E0E0E0] border border-gray-700 rounded-md p-2.5 text-sm focus:ring-1 focus:ring-green-400 outline-none pr-8 h-9"
                  />
                  
                  {/* Clear button for search input */}
                  {stateSearch && (
                    <button
                      onClick={() => {
                        setStateSearch("");
                        setSelectedState("");
                        setSelectedDistrict("");
                        setDistrictSearch("");
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                    >
                      <FiX size={12} />
                    </button>
                  )}

                  {/* State Dropdown */}
                  {showStateDropdown && filteredStates.length > 0 && (
                    <div 
                      className="absolute w-full bg-[#282828] border border-gray-700 rounded-md mt-0.5 max-h-28 overflow-y-auto z-20 shadow-lg"
                      style={{ top: '100%' }}
                    >
                      {filteredStates.slice(0, 5).map((state) => (
                        <div
                          key={state}
                          onClick={() => handleStateSelect(state)}
                          className="px-2.5 py-1.5 text-sm text-[#E0E0E0] cursor-pointer hover:bg-gray-700 transition-colors"
                        >
                          {state}
                        </div>
                      ))}
                      {filteredStates.length > 5 && (
                        <div className="px-2.5 py-1.5 text-xs text-gray-400 border-t border-gray-700">
                          +{filteredStates.length - 5} more...
                        </div>
                      )}
                    </div>
                  )}
                  
                  {showStateDropdown && stateSearch && filteredStates.length === 0 && (
                    <div className="absolute w-full bg-[#282828] border border-gray-700 rounded-md mt-0.5 h-8 flex items-center px-2.5">
                      <span className="text-xs text-gray-400">No states found</span>
                    </div>
                  )}
                </div>

                {/* Selected State Display - Very Compact */}
                {selectedState && !stateSearch && (
                  <div className="mt-1.5 p-1.5 bg-green-900/15 border border-green-500/20 rounded text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-green-300 font-medium truncate flex-1">
                        📍 {selectedState}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedState("");
                          setStateSearch("");
                        }}
                        className="text-green-400 hover:text-white ml-1 p-0.5 hover:bg-green-900/20 rounded"
                      >
                        <FiX size={10} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* District Selection - Compact Layout */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Select District
                </label>
                
                {/* District Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={
                      selectedState 
                        ? (selectedDistrict ? "Click to change district" : "Type to search districts...")
                        : "First select a state"
                    }
                    value={districtSearch}
                    onChange={handleDistrictInputChange}
                    onFocus={handleDistrictInputFocus}
                    disabled={!selectedState}
                    className={`w-full text-[#E0E0E0] rounded-md p-2.5 text-sm pr-8 h-9 transition-all ${
                      selectedState
                        ? "bg-[#282828] border border-gray-700 focus:ring-1 focus:ring-green-400 outline-none"
                        : "bg-gray-800 border border-gray-600 cursor-not-allowed text-gray-500"
                    }`}
                  />
                  
                  {/* Clear button for district search input */}
                  {districtSearch && selectedState && (
                    <button
                      onClick={() => {
                        setDistrictSearch("");
                        setSelectedDistrict("");
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                    >
                      <FiX size={12} />
                    </button>
                  )}

                  {/* District Dropdown */}
                  {showDistrictDropdown && selectedState && filteredDistricts.length > 0 && (
                    <div 
                      className="absolute w-full bg-[#282828] border border-gray-700 rounded-md mt-0.5 max-h-28 overflow-y-auto z-20 shadow-lg"
                      style={{ top: '100%' }}
                    >
                      {filteredDistricts.slice(0, 5).map((district) => (
                        <div
                          key={district}
                          onClick={() => handleDistrictSelect(district)}
                          className="px-2.5 py-1.5 text-sm text-[#E0E0E0] cursor-pointer hover:bg-gray-700 transition-colors"
                        >
                          {district}
                        </div>
                      ))}
                      {filteredDistricts.length > 5 && (
                        <div className="px-2.5 py-1.5 text-xs text-gray-400 border-t border-gray-700">
                          +{filteredDistricts.length - 5} more...
                        </div>
                      )}
                    </div>
                  )}
                  
                  {showDistrictDropdown && selectedState && districtSearch && filteredDistricts.length === 0 && (
                    <div className="absolute w-full bg-[#282828] border border-gray-700 rounded-md mt-0.5 h-8 flex items-center px-2.5">
                      <span className="text-xs text-gray-400">No districts found</span>
                    </div>
                  )}
                </div>

                {/* Selected District Display - Very Compact */}
                {selectedDistrict && selectedState && !districtSearch && (
                  <div className="mt-1.5 p-1.5 bg-green-900/15 border border-green-500/20 rounded text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-green-300 font-medium truncate flex-1">
                        🏛️ {selectedDistrict}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedDistrict("");
                          setDistrictSearch("");
                        }}
                        className="text-green-400 hover:text-white ml-1 p-0.5 hover:bg-green-900/20 rounded"
                      >
                        <FiX size={10} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Helper text - Minimal */}
                {!selectedState ? (
                  <p className="text-xs text-gray-400 mt-1">
                    Select a state first
                  </p>
                ) : districtSearch && !selectedDistrict ? (
                  <p className="text-xs text-gray-400 mt-1">
                    Start typing to search districts
                  </p>
                ) : null}
              </div>

              {/* Predict Section - Sticky Bottom */}
              <div className="sticky bottom-0 left-0 right-0 bg-linear-to-t from-[#1E1E1E]/95 to-transparent border-t border-gray-700/50 pt-3 pb-2 z-10 backdrop-blur-sm">
                {/* Predict Button */}
                <button
                  onClick={handlePredict}
                  disabled={!isPredictEnabled || loading}
                  className={`w-full py-2.5 px-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center text-sm h-10 ${
                    isPredictEnabled && !loading
                      ? "bg-linear-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg"
                      : "bg-gray-600/80 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs">Predicting...</span>
                    </>
                  ) : (
                    <>
                      <FiSearch className="mr-1.5 text-xs" />
                      <span className="text-xs">Predict Outbreak</span>
                    </>
                  )}
                </button>

                {/* Error Display - Compact */}
                {error && (
                  <div className="mt-2">
                    <p className="text-red-400 text-xs bg-red-900/20 px-2 py-1 rounded border border-red-500/30 text-center leading-tight">
                      {error}
                    </p>
                  </div>
                )}

                {/* Selection Status Indicator */}
                {selectedState && selectedDistrict ? (
                  <div className="mt-1.5 text-xs text-green-400 text-center font-medium">
                    ✅ Ready to predict for {selectedState}, {selectedDistrict}
                  </div>
                ) : selectedState ? (
                  <div className="mt-1.5 text-xs text-yellow-400 text-center">
                    ⚠️ Select a district to continue
                  </div>
                ) : (
                  <div className="mt-1.5 text-xs text-gray-400 text-center">
                    Select state and district to enable prediction
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
