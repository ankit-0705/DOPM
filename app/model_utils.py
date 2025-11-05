import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from difflib import get_close_matches

# Load models
combined_model = joblib.load('models/combined_outbreak_model.pkl')
cases_model = joblib.load('models/xgb_cases_model.pkl')
deaths_model = joblib.load('models/xgb_deaths_model.pkl')

# Load label encoders
label_encoders = joblib.load('models/label_encoders.pkl')

# Load location data
location_data = pd.read_csv('data/processed_data.csv')

# Load feature order for inference
FEATURE_ORDER_FILE = "models/feature_order.npy"
feature_order = np.load(FEATURE_ORDER_FILE, allow_pickle=True)


# ---------------------------
#   Helper functions
# ---------------------------

def get_all_states():
    le = label_encoders['state_ut']
    return sorted(le.classes_)


def get_districts_by_state(state):
    """Return all districts for a given state."""
    if state not in label_encoders['state_ut'].classes_:
        matches = get_close_matches(state, label_encoders['state_ut'].classes_, n=1, cutoff=0.8)
        if matches:
            state = matches[0]
        else:
            raise ValueError(f"Unknown state: {state}")

    state_encoded = label_encoders['state_ut'].transform([state])[0]
    districts_encoded = location_data[location_data['state_ut'] == state_encoded]['district'].unique()
    return sorted(label_encoders['district'].inverse_transform(districts_encoded))


def get_all_diseases():
    le = label_encoders['Disease']
    return sorted(le.classes_)


def safe_get_label(label, le):
    """Try exact and fuzzy match for a label before encoding."""
    label = label.strip()
    if label in le.classes_:
        return label
    # fuzzy match for near names
    matches = get_close_matches(label, le.classes_, n=1, cutoff=0.8)
    if matches:
        print(f"⚠️ Using closest match for '{label}': '{matches[0]}'")
        return matches[0]
    raise ValueError(f"Unknown label: {label}")


def get_lat_long(state, district):
    """Safely fetch latitude and longitude for a given state/district."""
    state_le = label_encoders['state_ut']
    district_le = label_encoders['district']

    # Normalize input
    state = safe_get_label(state.title().strip(), state_le)
    district = safe_get_label(district.title().strip(), district_le)

    state_encoded = state_le.transform([state])[0]
    district_encoded = district_le.transform([district])[0]

    match = location_data[
        (location_data['state_ut'] == state_encoded) &
        (location_data['district'] == district_encoded)
    ]

    if not match.empty:
        return float(match['Latitude'].values[0]), float(match['Longitude'].values[0])
    else:
        return None, None


# ---------------------------
#   Model Input Utilities
# ---------------------------

def encode_inputs(df):
    for col in ['state_ut', 'district', 'Disease']:
        if col in df.columns:
            df[col] = label_encoders[col].transform(df[col])
    return df


def prepare_input(features):
    # Add week_of_outbreak column if needed
    if 'week_of_outbreak' not in features.columns:
        current_week = datetime.now().isocalendar()[1]
        features['week_of_outbreak'] = current_week

    # Encode categorical columns
    features = encode_inputs(features)

    # Reorder columns as per feature_order.npy; raise error if any missing
    missing_cols = [col for col in feature_order if col not in features.columns]
    if missing_cols:
        raise ValueError(f"Missing columns for prediction: {missing_cols}")

    features = features.reindex(columns=feature_order)
    return features


def predict_outbreak(user_input_df, threshold=0.45):
    X = prepare_input(user_input_df.copy())
    proba = combined_model.predict_proba(X)[:, 1]
    prediction = (proba >= threshold).astype(int)
    return prediction, proba


def predict_cases_and_deaths(user_input_df):
    X = prepare_input(user_input_df.copy())
    predicted_cases = np.expm1(cases_model.predict(X))
    predicted_deaths = deaths_model.predict(X)
    return predicted_cases, predicted_deaths
