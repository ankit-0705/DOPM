import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./components/Navbar";
import PredictionDashboard from "./components/PredictionDashboard";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${API_URL}/states`)
      .then((res) => setStates(res.data.states))
      .catch(() => setError("Failed to load states"));
  }, []);

  useEffect(() => {
    if (!selectedState) return;
    axios
      .get(`${API_URL}/districts/${selectedState}`)
      .then((res) => setDistricts(res.data.districts))
      .catch(() => setError("Failed to load districts"));
  }, [selectedState]);

  const handlePredict = async (state, district) => {
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
      setError("Prediction failed. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#E0E0E0]">
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
      />

      {/* ✅ Dashboard (when predictions are available) */}
      {predictions.length > 0 && <PredictionDashboard predictions={predictions} />}
    </div>
  );
}

export default App;
