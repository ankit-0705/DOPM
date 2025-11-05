import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000"; // FastAPI backend URL

function App() {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stateQuery, setStateQuery] = useState("");
  const [districtQuery, setDistrictQuery] = useState("");

  // 🟢 Fetch all states on mount
  useEffect(() => {
    axios
      .get(`${API_URL}/states`)
      .then((res) => setStates(res.data.states))
      .catch(() => setError("Failed to load states"));
  }, []);

  // 🟢 Fetch districts when state changes
  useEffect(() => {
    if (!selectedState) return;
    axios
      .get(`${API_URL}/districts/${selectedState}`)
      .then((res) => setDistricts(res.data.districts))
      .catch(() => setError("Failed to load districts"));
  }, [selectedState]);

  // 🧠 Predict disease outbreaks
  const handlePredict = async () => {
    if (!selectedState || !selectedDistrict) {
      setError("Please select both State and District");
      return;
    }

    setError("");
    setLoading(true);
    setPredictions([]);

    try {
      const res = await axios.post(`${API_URL}/predict`, {
        state_ut: selectedState,
        district: selectedDistrict,
      });
      setPredictions(res.data.predictions || []);
    } catch (err) {
      console.error(err);
      setError("Prediction failed. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filtered dropdowns with type-to-search
  const filteredStates = states.filter((s) =>
    s.toLowerCase().includes(stateQuery.toLowerCase())
  );
  const filteredDistricts = districts.filter((d) =>
    d.toLowerCase().includes(districtQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex flex-col items-center py-10 px-4">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-blue-700">
        🧬 Disease Outbreak Predictor
      </h1>

      {/* --- Selection Form --- */}
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
        {/* --- State Input --- */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">State</label>
          <input
            type="text"
            placeholder="Type to search state..."
            value={stateQuery}
            onChange={(e) => setStateQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 mb-2"
          />
          <select
            className="w-full border border-gray-300 rounded-md p-2"
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedDistrict("");
              setDistrictQuery("");
              setPredictions([]);
            }}
          >
            <option value="">-- Select State --</option>
            {filteredStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* --- District Input --- */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-1">
            District
          </label>
          <input
            type="text"
            placeholder="Type to search district..."
            value={districtQuery}
            onChange={(e) => setDistrictQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 mb-2"
            disabled={!selectedState}
          />
          <select
            className="w-full border border-gray-300 rounded-md p-2"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={!selectedState}
          >
            <option value="">-- Select District --</option>
            {filteredDistricts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePredict}
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md font-semibold text-white transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Predicting..." : "Predict Outbreak"}
        </button>

        {error && (
          <p className="text-red-600 text-center mt-3 font-medium">{error}</p>
        )}
      </div>

      {/* --- Prediction Results --- */}
      {predictions.length > 0 && (
        <div className="mt-10 w-full max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            Prediction Results
          </h2>

          {/* 🧠 Shared Info (shown once) */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-gray-700">
            <p>
              <strong>Location:</strong> {selectedDistrict}, {selectedState}
            </p>
            <p>
              <strong>Latitude:</strong> {predictions[0]?.Latitude?.toFixed(4)} |{" "}
              <strong>Longitude:</strong> {predictions[0]?.Longitude?.toFixed(4)}
            </p>
            <p>
              <strong>Population Density:</strong>{" "}
              {predictions[0]?.Population_Density
                ? predictions[0].Population_Density.toFixed(2)
                : "N/A"}
            </p>
            <p>
              <strong>LAI:</strong>{" "}
              {predictions[0]?.LAI ? predictions[0].LAI.toFixed(2) : "N/A"}
            </p>
            <p>
              <strong>PM2.5:</strong> {predictions[0]?.PM2_5 ?? "N/A"} |{" "}
              <strong>NO₂:</strong> {predictions[0]?.NO2 ?? "N/A"} |{" "}
              <strong>O₃:</strong> {predictions[0]?.O3 ?? "N/A"}
            </p>
          </div>

          {/* 🧩 Disease-specific predictions */}
          <div className="grid gap-4 md:grid-cols-2">
            {predictions.map((p) => (
              <div
                key={p.Disease}
                className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition"
              >
                <h3 className="text-xl font-semibold text-blue-700 mb-2">
                  {p.Disease}
                </h3>

                <p className="text-gray-700">
                  <strong>Outbreak:</strong>{" "}
                  <span
                    className={`font-bold ${
                      p.outbreak ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {p.outbreak ? "🚨 Yes" : "✅ No"}
                  </span>
                </p>

                <p className="text-gray-700">
                  <strong>Probability:</strong>{" "}
                  {p.probability
                    ? (p.probability * 100).toFixed(2) + "%"
                    : "N/A"}
                </p>

                {p.outbreak && (
                  <div className="mt-2">
                    <p className="text-gray-700">
                      <strong>Predicted Cases:</strong> {p.cases ?? "N/A"}
                    </p>
                    <p className="text-gray-700">
                      <strong>Predicted Deaths:</strong> {p.deaths ?? "N/A"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
