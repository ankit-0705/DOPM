import pandas as pd
from sklearn.preprocessing import LabelEncoder
import joblib
import os

def preprocess_data(input_path='../data/Final_data.csv', save_encoders=True):
    # Load data
    df = pd.read_csv(input_path)

    # Drop unnecessary columns
    if 'Unnamed: 0' in df.columns:
        df.drop(columns=['Unnamed: 0'], inplace=True)

    # Convert 'Cases' to numeric
    df['Cases'] = pd.to_numeric(df['Cases'], errors='coerce')

    # Handle missing values
    df['Deaths'].fillna(0, inplace=True)
    df['preci'].fillna(df['preci'].mean(), inplace=True)
    df['LAI'].fillna(df['LAI'].mean(), inplace=True)
    df['Temp'].fillna(df['Temp'].mean(), inplace=True)

    # Create binary target (outbreak or not)
    df['Outbreak'] = (df['Cases'] > 50).astype(int)

    # Encode categorical columns
    label_encoders = {}
    categorical_cols = ['week_of_outbreak', 'state_ut', 'district', 'Disease']
    
    for col in categorical_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col])
        label_encoders[col] = le

    # Save encoders if needed
    if save_encoders:
        os.makedirs('../models', exist_ok=True)
        joblib.dump(label_encoders, '../models/label_encoders.pkl')

    # Save processed data (optional)
    df.to_csv('../data/processed_data.csv', index=False)

    return df
