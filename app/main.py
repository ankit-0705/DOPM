from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import requests
import json
import os
from shapely.geometry import shape, Polygon, MultiPolygon
from pyproj import Geod

# --- Import helper functions from model_utils ---
from app.model_utils import (
    get_all_states,
    get_districts_by_state,
    prepare_input,
    get_lat_long,
)

# --- Initialize API ---
app = FastAPI(title="Disease Outbreak Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load models and assets ---
combined_model = joblib.load("models/combined_outbreak_model.pkl")
cases_model = joblib.load("models/xgb_cases_model.pkl")
deaths_model = joblib.load("models/xgb_deaths_model.pkl")
label_encoders = joblib.load("models/label_encoders.pkl")
feature_order = np.load("models/feature_order.npy", allow_pickle=True)

with open("data/LAI.json") as f:
    lai_data = json.load(f)
with open("data/Population.json") as f:
    pop_data = json.load(f)

# --- API Keys and Cache Setup ---
GEOAPIFY_API_KEY = "75d4a0aeca9d4aafba92b0e78d7aa01c"
WEATHER_API_KEY = "bd085879aea5ab9b48a1b4bec38d4269"  # Your Weatherstack key
AREA_CACHE_FILE = "data/District_Area.json"
AREA_CACHE = {}

if os.path.exists(AREA_CACHE_FILE):
    with open(AREA_CACHE_FILE, "r") as f:
        AREA_CACHE = json.load(f)
else:
    AREA_CACHE = {}

# --- Request Schema ---
class LocationInput(BaseModel):
    state_ut: str
    district: str

# --- Helper Functions ---
def get_weather(state, district):
    """Fetch comprehensive weather, air quality, and atmospheric data safely."""
    try:
        location = f"{district}, {state}"
        url = f"http://api.weatherstack.com/current?access_key={WEATHER_API_KEY}&query={location}"
        res = requests.get(url, timeout=10).json()
        
        if res.get("error"):
            raise ValueError(f"Weather API error: {res['error']}")
        
        current = res.get("current", {})
        air_quality = current.get("air_quality", {})
        location_info = res.get("location", {})
        
        # Calculate simple AQI based on PM2.5, NO2, O3 (EPA-inspired index: 1=Good, 2=Moderate, etc.)
        pm25 = float(air_quality.get("pm2_5", 0))
        no2 = float(air_quality.get("no2", 0))
        o3 = float(air_quality.get("o3", 0))
        aqi = 1  # Default Good
        if pm25 > 35.4 or no2 > 53 or o3 > 70:
            aqi = 2  # Moderate
        if pm25 > 55.4 or no2 > 100 or o3 > 137:
            aqi = 3  # Unhealthy for sensitive groups
        
        # Consolidated weather data - selective important factors only
        return {
            # Core weather
            "temperature": float(current.get("temperature", 0.0)),
            "feelslike": float(current.get("feelslike", 0.0)),
            "humidity": float(current.get("humidity", 0.0)),
            "precip": float(current.get("precip", 0.0)),
            "wind_speed": float(current.get("wind_speed", 0.0)),
            "wind_dir": current.get("wind_dir", "N/A"),
            "pressure": float(current.get("pressure", 0.0)),
            "cloudcover": float(current.get("cloudcover", 0.0)),
            "visibility": float(current.get("visibility", 10.0)),
            
            # Air quality (expanded but selective)
            "pm2_5": pm25,
            "pm10": float(air_quality.get("pm10", 0.0)),
            "no2": no2,
            "o3": o3,
            "so2": float(air_quality.get("so2", 0.0)),
            "co": float(air_quality.get("co", 0.0)),
            "aqi": aqi,
            "us_epa_index": air_quality.get("us-epa-index", 1),
            "gb_defra_index": air_quality.get("gb-defra-index", 1),
            
            # Location (updated from API if available, fallback to static)
            "latitude": float(location_info.get("lat", 0.0)),
            "longitude": float(location_info.get("lon", 0.0)),
            "timezone": location_info.get("timezone_id", "Asia/Kolkata"),
            "localtime": current.get("observation_time", "N/A"),
            
            # Weather description for UI (e.g., "Clear", "Partly Cloudy")
            "weather_description": current.get("weather_descriptions", ["Clear"])[0] if current.get("weather_descriptions") else "Clear",
            "is_day": current.get("is_day", "yes") == "yes",
        }
    except Exception as e:
        print(f"⚠️ Weather fetch failed for {district}, {state}: {e}")
        # Fallback with sensible defaults (e.g., for Leh in winter)
        return {
            "temperature": 0.0,
            "feelslike": 0.0,
            "humidity": 50.0,
            "precip": 0.0,
            "wind_speed": 5.0,
            "wind_dir": "N",
            "pressure": 1013.0,
            "cloudcover": 20.0,
            "visibility": 10.0,
            "pm2_5": 10.0,
            "pm10": 15.0,
            "no2": 5.0,
            "o3": 20.0,
            "so2": 2.0,
            "co": 0.5,
            "aqi": 1,
            "us_epa_index": 1,
            "gb_defra_index": 1,
            "latitude": 0.0,
            "longitude": 0.0,
            "timezone": "Asia/Kolkata",
            "localtime": "N/A",
            "weather_description": "Clear",
            "is_day": True,
        }

def get_district_area(state, district, lat, lon, force_refresh=False):
    """Fetch or compute district area using Geoapify (safe)."""
    key = f"{state}_{district}".lower()
    if not force_refresh and key in AREA_CACHE:
        return AREA_CACHE[key]

    total_area_km2 = 0.0
    try:
        url = (
            f"https://api.geoapify.com/v1/boundaries/part-of?"
            f"lat={lat}&lon={lon}&geometry=geometry_1000&apiKey={GEOAPIFY_API_KEY}"
        )
        res = requests.get(url, timeout=15).json()
        features = res.get("features", [])
        print(f"🌍 Geoapify returned {len(features)} features for {district}, {state}")

        geod = Geod(ellps="WGS84")
        for feature in features:
            props = feature.get("properties", {})
            geometry = feature.get("geometry", {})
            admin_level = (
                props.get("admin_level")
                or props.get("datasource", {}).get("raw", {}).get("admin_level")
            )
            if admin_level not in [5, 6]:
                continue

            geom_type = geometry.get("type")
            if geom_type not in ["Polygon", "MultiPolygon"]:
                continue

            geom = shape(geometry)
            if isinstance(geom, MultiPolygon):
                for poly in geom.geoms:
                    area_m2 = abs(geod.geometry_area_perimeter(poly)[0])
                    total_area_km2 += area_m2 / 1e6
            elif isinstance(geom, Polygon):
                area_m2 = abs(geod.geometry_area_perimeter(geom)[0])
                total_area_km2 += area_m2 / 1e6

        if total_area_km2 == 0.0:
            print(f"⚠️ No valid boundaries found for {district}, {state}")

        AREA_CACHE[key] = total_area_km2
        with open(AREA_CACHE_FILE, "w") as f:
            json.dump(AREA_CACHE, f, indent=2)

        return total_area_km2

    except Exception as e:
        print(f"⚠️ Error fetching area for {district}, {state}: {e}")
        AREA_CACHE[key] = 0.0
        return 0.0

def get_location_features(state, district):
    """Fetch static features (LAI, population, sanitation, population density)."""
    try:
        lai_entry = next(
            (item for item in lai_data if item["District_Name"].lower() == district.lower()),
            None,
        )
        LAI = float(lai_entry["Mean_LAI"]) if lai_entry else 0.0

        pop_entry = next(
            (item for item in pop_data if item["District"].lower() == district.lower()), None
        )
        population = float(pop_entry["Population"].replace(",", "")) if pop_entry else 0.0

        try:
            lat, lon = get_lat_long(state, district)
        except ValueError as e:
            print(f"⚠️ Unknown label while fetching lat/lon: {e}")
            lat, lon = 0.0, 0.0

        area_km2 = get_district_area(state, district, lat, lon)
        pop_density = population / area_km2 if area_km2 > 0 else 0.0

        return {
            "LAI": LAI,
            "Population": population,
            "Area_km2": area_km2,
            "Population_Density": pop_density,
            "Sanitation_Index": 0.0,  # Placeholder - enhance if you have data
            "Latitude": lat,
            "Longitude": lon,
        }

    except Exception as e:
        print(f"⚠️ Error in get_location_features for {district}, {state}: {e}")
        return {
            "LAI": 0.0,
            "Population": 0.0,
            "Area_km2": 0.0,
            "Population_Density": 0.0,
            "Sanitation_Index": 0.0,
            "Latitude": 0.0,
            "Longitude": 0.0,
        }

# --- ROUTES ---
@app.get("/")
def root():
    return {"message": "Welcome to the Disease Outbreak Prediction API"}

@app.get("/states")
def get_states():
    try:
        return {"states": get_all_states()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/districts/{state}")
def get_districts(state: str):
    try:
        districts = get_districts_by_state(state)
        if not districts:
            raise HTTPException(status_code=404, detail=f"No districts found for '{state}'.")
        return {"districts": districts}
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Invalid state name '{state}'.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/area/{state}/{district}")
def get_area(state: str, district: str, force_refresh: bool = Query(False)):
    try:
        lat, lon = get_lat_long(state, district)
        area_km2 = get_district_area(state, district, lat, lon, force_refresh=force_refresh)
        return {
            "state": state,
            "district": district,
            "latitude": lat,
            "longitude": lon,
            "area_km2": area_km2,
            "cached": f"{state}_{district}".lower() in AREA_CACHE,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/weather/{state}/{district}")
def get_weather_only(state: str, district: str):
    """Separate endpoint for weather data only (for testing/UI refresh)."""
    try:
        weather_data = get_weather(state, district)
        return {"weather": weather_data, "location": f"{district}, {state}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
def predict(input_data: LocationInput):
    """Predict outbreak probability, cases, deaths, and return enhanced environmental context."""
    try:
        diseases = ["Dengue", "Chikungunya", "Cholera"]
        today = datetime.today()
        day, mon, year, week = today.day, today.month, today.year, today.isocalendar()[1]

        weather = get_weather(input_data.state_ut, input_data.district)
        loc = get_location_features(input_data.state_ut, input_data.district)

        results = []
        for disease in diseases:
            # Enhanced input row with new weather features (add to your model features if needed)
            row = {
                "state_ut": input_data.state_ut,
                "district": input_data.district,
                "Disease": disease,
                "week_of_outbreak": week,
                "day": day,
                "mon": mon,
                "year": year,
                "temperature": weather["temperature"],
                "feelslike": weather["feelslike"],
                "humidity": weather["humidity"],
                "precip": weather["precip"],
                "wind_speed": weather["wind_speed"],
                "cloudcover": weather["cloudcover"],
                "pressure": weather["pressure"],
                "visibility": weather["visibility"],
                "LAI": loc["LAI"],
                "Population": loc["Population"],
                "Area_km2": loc["Area_km2"],
                "Population_Density": loc["Population_Density"],
                "Sanitation_Index": loc["Sanitation_Index"],
                "pm2_5": weather["pm2_5"],
                "pm10": weather["pm10"],
                "no2": weather["no2"],
                "o3": weather["o3"],
                "so2": weather["so2"],
                "co": weather["co"],
                "aqi": weather["aqi"],
                "Latitude": weather["latitude"],
                "Longitude": weather["longitude"],
            }

            df = pd.DataFrame([row])
            df_prepared = prepare_input(df)  # Ensure prepare_input handles new features
            outbreak_proba = combined_model.predict_proba(df_prepared)[:, 1]
            outbreak_pred = (outbreak_proba >= 0.45).astype(int)

            result = {
                "Disease": disease,
                "outbreak": bool(outbreak_pred[0]),
                "probability": float(outbreak_proba[0]),
                
                # Static location features
                "LAI": loc["LAI"],
                "Population": int(loc["Population"]),
                "Area_km2": loc["Area_km2"],
                "Population_Density": loc["Population_Density"],
                "Sanitation_Index": loc["Sanitation_Index"],
                "Latitude": weather["latitude"],
                "Longitude": weather["longitude"],
                
                # Core air quality (for Environmental Factors panel)
                "PM2_5": weather["pm2_5"],
                "PM10": weather["pm10"],
                "NO2": weather["no2"],
                "O3": weather["o3"],
                "SO2": weather["so2"],
                "CO": weather["co"],
                "AQI": weather["aqi"],
                "US_EPA_Index": weather["us_epa_index"],
                "GB_DEFRa_Index": weather["gb_defra_index"],
                
                # Weather summary (for Key Factors panel)
                "Temperature": weather["temperature"],
                "FeelsLike": weather["feelslike"],
                "Humidity": weather["humidity"],
                "Precipitation": weather["precip"],
                "Wind_Speed": weather["wind_speed"],
                "Wind_Direction": weather["wind_dir"],
                "Cloud_Cover": weather["cloudcover"],
                "Visibility": weather["visibility"],
                "Pressure": weather["pressure"],
                "Weather_Description": weather["weather_description"],
                "Is_Day": weather["is_day"],
                "Localtime": weather["localtime"],
                "Timezone": weather["timezone"],
            }

            if outbreak_pred[0]:
                result["cases"] = int(np.expm1(cases_model.predict(df_prepared))[0])
                result["deaths"] = int(deaths_model.predict(df_prepared)[0])

            results.append(result)

        return {"predictions": results}

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
