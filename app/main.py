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
WEATHER_API_KEY = "bd085879aea5ab9b48a1b4bec38d4269"
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
    """Fetch live weather and air-quality data."""
    location = f"{district}, {state}"
    url = f"http://api.weatherstack.com/current?access_key={WEATHER_API_KEY}&query={location}"
    res = requests.get(url).json()
    current = res.get("current", {})
    air_quality = current.get("air_quality", {})

    return {
        "preci": current.get("precip", 0.0),
        "Temp": current.get("temperature", 0.0),
        "Humidity": current.get("humidity", 0.0),
        "Latitude": float(res.get("location", {}).get("lat", 0.0)),
        "Longitude": float(res.get("location", {}).get("lon", 0.0)),
        "PM2_5": float(air_quality.get("pm2_5", 0.0)),
        "NO2": float(air_quality.get("no2", 0.0)),
        "O3": float(air_quality.get("o3", 0.0)),
    }



def get_district_area(state, district, lat, lon, force_refresh=False):
    """
    Fetch or compute district area using Geoapify.
    Includes admin_levels 5 and 6 (district-level boundaries).
    Returns area in km².
    """
    key = f"{state}_{district}".lower()

    # --- Check cache first ---
    if not force_refresh and key in AREA_CACHE:
        return AREA_CACHE[key]

    url = (
        f"https://api.geoapify.com/v1/boundaries/part-of?"
        f"lat={lat}&lon={lon}&geometry=geometry_10000&apiKey={GEOAPIFY_API_KEY}"
    )

    total_area_km2 = 0.0

    try:
        res = requests.get(url).json()
        features = res.get("features", [])
        print(f"🌍 Geoapify returned {len(features)} features for {district}, {state}")

        geod = Geod(ellps="WGS84")

        for feature in features:
            props = feature.get("properties", {})
            geometry = feature.get("geometry", {})

            # Read admin_level safely from both locations
            admin_level = (
                props.get("admin_level")
                or props.get("datasource", {}).get("raw", {}).get("admin_level")
            )

            # ✅ Accept district-level features (admin_level 5 or 6)
            if admin_level not in [5, 6]:
                continue

            geom_type = geometry.get("type")
            if geom_type not in ["Polygon", "MultiPolygon"]:
                continue

            geom = shape(geometry)

            if isinstance(geom, Polygon):
                area_m2 = abs(geod.geometry_area_perimeter(geom)[0])
                total_area_km2 += area_m2 / 1e6
            elif isinstance(geom, MultiPolygon):
                for poly in geom.geoms:
                    area_m2 = abs(geod.geometry_area_perimeter(poly)[0])
                    total_area_km2 += area_m2 / 1e6

        if total_area_km2 == 0.0:
            print(f"⚠️ No valid admin_level 5/6 Polygon/MultiPolygon found for {district}, {state}")
        else:
            print(f"✅ Total area computed for {district}, {state}: {total_area_km2:.2f} km²")

        # Cache result
        AREA_CACHE[key] = total_area_km2
        with open(AREA_CACHE_FILE, "w") as f:
            json.dump(AREA_CACHE, f, indent=2)

        return total_area_km2

    except Exception as e:
        print(f"⚠️ Error fetching area for {district}, {state}: {e}")

    # Fallback
    AREA_CACHE[key] = 0.0
    return 0.0

def get_location_features(state, district):
    """Fetch static features (LAI, population, sanitation, population density)."""
    # --- LAI ---
    lai_entry = next(
        (item for item in lai_data if item["District_Name"].lower() == district.lower()), None
    )
    LAI = float(lai_entry["Mean_LAI"]) if lai_entry else 0.0

    # --- Population ---
    pop_entry = next(
        (item for item in pop_data if item["District"].lower() == district.lower()), None
    )
    if pop_entry and pop_entry.get("Population"):
        population = float(pop_entry["Population"].replace(",", ""))
    else:
        population = 0.0

    # --- Coordinates ---
    lat, lon = get_lat_long(state, district)

    # --- Area & Density ---
    area_km2 = get_district_area(state, district, lat, lon)
    pop_density = population / area_km2 if area_km2 > 0 else 0.0

    return {
        "LAI": LAI,
        "Population_Density": pop_density,
        "Sanitation_Index": 0.0,
        "Latitude": lat,
        "Longitude": lon,
        "Area_km2": area_km2,
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
    """Debug endpoint to fetch district area (with optional cache refresh)."""
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


@app.post("/predict")
def predict(input_data: LocationInput):
    """Predict outbreak probability, cases, deaths, and return environmental context."""
    diseases = ["Dengue", "Chikungunya", "Cholera"]
    today = datetime.today()
    day, mon, year, week = today.day, today.month, today.year, today.isocalendar()[1]

    weather = get_weather(input_data.state_ut, input_data.district)
    loc = get_location_features(input_data.state_ut, input_data.district)

    results = []
    for disease in diseases:
        row = {
            "state_ut": input_data.state_ut,
            "district": input_data.district,
            "Disease": disease,
            "week_of_outbreak": week,
            "day": day,
            "mon": mon,
            "year": year,
            "preci": weather["preci"],
            "LAI": loc["LAI"],
            "Temp": weather["Temp"],
            "Humidity": weather["Humidity"],
            "Population_Density": loc["Population_Density"],
            "Sanitation_Index": loc["Sanitation_Index"],
            "Latitude": weather["Latitude"],
            "Longitude": weather["Longitude"],
            "PM2_5": weather["PM2_5"],
            "NO2": weather["NO2"],
            "O3": weather["O3"],
        }

        df = pd.DataFrame([row])
        df_prepared = prepare_input(df)
        outbreak_proba = combined_model.predict_proba(df_prepared)[:, 1]
        outbreak_pred = (outbreak_proba >= 0.45).astype(int)

        result = {
            "Disease": disease,
            "outbreak": bool(outbreak_pred[0]),
            "probability": float(outbreak_proba[0]),
        }

        if outbreak_pred[0]:
            result["cases"] = int(np.expm1(cases_model.predict(df_prepared))[0])
            result["deaths"] = int(deaths_model.predict(df_prepared)[0])

        result.update({
            "LAI": loc["LAI"],
            "Population_Density": loc["Population_Density"],
            "Latitude": loc["Latitude"],
            "Longitude": loc["Longitude"],
            "Area_km2": loc["Area_km2"],
            "PM2_5": weather["PM2_5"],
            "NO2": weather["NO2"],
            "O3": weather["O3"],
        })
        results.append(result)

    return {"predictions": results}
