import streamlit as st
import pandas as pd
from datetime import date
from model_utils import (
    predict_outbreak,
    predict_cases_and_deaths,
    get_lat_long,
    get_all_states,
    get_districts_by_state,
    get_all_diseases,
)

st.set_page_config(page_title="Disease Outbreak Predictor", layout="centered")
st.title("🦠 Disease Outbreak Prediction System")
st.caption("A climate-health intelligence tool for early warning of epidemic outbreaks.")

# --- Administrative Section ---
st.markdown("### 📍 Administrative Details")
states = get_all_states()
selected_state = st.selectbox("Select State", states)
districts = get_districts_by_state(selected_state)
selected_district = st.selectbox("Select District", districts)
diseases = get_all_diseases()
selected_disease = st.selectbox("Select Disease", diseases)

# --- Environmental Input Section ---
st.markdown("### 🌦️ Environmental Data")
col1, col2 = st.columns(2)
with col1:
    selected_date = st.date_input("Date of Report", value=date.today())
    temperature_c = st.number_input("Temperature (°C)", value=25.0, help="Mean temp over week")
    rainfall = st.number_input("Rainfall (mm)", value=10.0)
    lai = st.number_input("Leaf Area Index (LAI)", value=3.5)
with col2:
    humidity = st.slider("Humidity (%)", 0, 100, 60)
    population_density = st.number_input("Population Density (per km²)", min_value=1, value=1000)
    sanitation_index = st.slider("Sanitation Index", 0, 10, 5)

submit = st.button("🔍 Predict")

if submit:
    lat, lon = get_lat_long(selected_state, selected_district)
    if lat is None or lon is None:
        st.error("❌ Could not find latitude and longitude for the provided State/District.")
    else:
        temp = temperature_c + 273.15
        input_data = pd.DataFrame([{
            "state_ut": selected_state,
            "district": selected_district,
            "Disease": selected_disease,
            "week_of_outbreak": selected_date.isocalendar()[1],
            "day": selected_date.day,
            "mon": selected_date.month,
            "year": selected_date.year,
            "preci": rainfall,
            "LAI": lai,
            "Temp": temp,
            "Humidity": humidity,
            "Population_Density": population_density,
            "Sanitation_Index": sanitation_index,
            "Latitude": lat,
            "Longitude": lon
        }])

        try:
            outbreak_pred, outbreak_proba = predict_outbreak(input_data)
            st.markdown("---")
            st.subheader("🧬 Prediction Results")
            if outbreak_pred[0] == 1:
                st.error(f"⚠️ **High Risk of Outbreak** (Probability: {outbreak_proba[0]:.2f})")
                predicted_cases, predicted_deaths = predict_cases_and_deaths(input_data)
                st.metric("Estimated Cases", f"{int(predicted_cases[0])}")
                st.metric("Estimated Deaths", f"{int(predicted_deaths[0])}")
            else:
                st.success(f"✅ **No Outbreak Predicted** (Probability: {outbreak_proba[0]:.2f})")
        except ValueError as err:
            st.error(f"❌ Input error: {err}")
