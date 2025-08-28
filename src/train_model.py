import os
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.ensemble import VotingClassifier, RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, classification_report, mean_absolute_error,
    mean_squared_error, precision_recall_curve, f1_score
)

from catboost import CatBoostClassifier
from xgboost import XGBRegressor

FEATURE_ORDER_FILE = '../models/feature_order.npy'


def save_feature_order(columns):
    np.save(FEATURE_ORDER_FILE, columns)


def load_data_and_features():
    df = pd.read_csv('../data/processed_data.csv')

    # Save the order of input features (used later during inference)
    feature_cols = df.drop(['Cases', 'Deaths', 'Outbreak'], axis=1).columns
    save_feature_order(feature_cols)
    return df


def train_outbreak_classifier(df):
    print("🚀 Training combined CatBoost + RandomForest classifier")

    X = df.drop(['Cases', 'Deaths', 'Outbreak'], axis=1)
    y = df['Outbreak']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    catboost_clf = CatBoostClassifier(
        iterations=200,
        learning_rate=0.05,
        depth=6,
        verbose=0,
        loss_function='Logloss',
        class_weights=[1, float(np.bincount(y_train)[0]) / np.bincount(y_train)[1]]
    )

    rf_clf = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
        random_state=42,
        class_weight='balanced'
    )

    ensemble = VotingClassifier(
        estimators=[('catboost', catboost_clf), ('random_forest', rf_clf)],
        voting='soft'
    )

    ensemble.fit(X_train, y_train)

    y_pred = ensemble.predict(X_test)
    print("\n🔍 Combined Model Performance @ Default Threshold (0.5)")
    print(f"✅ Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print("📝 Classification Report:\n", classification_report(y_test, y_pred))

    y_proba = ensemble.predict_proba(X_test)[:, 1]
    thresholds = np.arange(0.2, 0.6, 0.05)
    best_f1 = 0
    best_threshold = 0.5

    print("\n🔎 Evaluating performance at various thresholds:")
    for threshold in thresholds:
        y_pred_thresh = (y_proba >= threshold).astype(int)
        f1 = f1_score(y_test, y_pred_thresh)
        print(f"Threshold: {threshold:.2f} | F1-Score: {f1:.4f}")
        if f1 > best_f1:
            best_f1 = f1
            best_threshold = threshold

    y_best_pred = (y_proba >= best_threshold).astype(int)
    print(f"\n🎯 Best Threshold based on F1: {best_threshold:.2f}")
    print(f"📝 Classification Report @ Best Threshold ({best_threshold:.2f}):\n",
          classification_report(y_test, y_best_pred))

    precision, recall, pr_thresholds = precision_recall_curve(y_test, y_proba)
    plt.figure(figsize=(8, 5))
    plt.plot(pr_thresholds, precision[:-1], label='Precision')
    plt.plot(pr_thresholds, recall[:-1], label='Recall')
    plt.axvline(x=best_threshold, color='r', linestyle='--', label=f'Best Threshold = {best_threshold:.2f}')
    plt.xlabel('Threshold')
    plt.ylabel('Score')
    plt.title('Precision vs Recall Tradeoff')
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()

    joblib.dump(ensemble, '../models/combined_outbreak_model.pkl')
    print("💾 Saved: combined_outbreak_model.pkl")


def train_cases_regressor(df):
    print("\n🔧 Training Cases Regressor...")
    df_outbreaks = df[df['Outbreak'] == 1].copy()
    df_outbreaks = df_outbreaks[df_outbreaks['Cases'] > 0]
    df_outbreaks['Cases'] = np.log1p(df_outbreaks['Cases'])

    X = df_outbreaks.drop(['Cases', 'Deaths', 'Outbreak'], axis=1)
    y = df_outbreaks['Cases']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor(max_depth=5, n_estimators=150, learning_rate=0.05)
    model.fit(X_train, y_train)

    y_pred_log = model.predict(X_test)
    y_pred = np.expm1(y_pred_log)
    y_test_exp = np.expm1(y_test)

    print("\n🔍 Cases Regressor Performance")
    print("MAE:", mean_absolute_error(y_test_exp, y_pred))
    print("RMSE:", np.sqrt(mean_squared_error(y_test_exp, y_pred)))

    joblib.dump(model, '../models/xgb_cases_model.pkl')
    print("✅ Saved: xgb_cases_model.pkl")


def train_deaths_regressor(df):
    print("\n🔧 Training Deaths Regressor...")
    df_outbreaks = df[df['Outbreak'] == 1]

    X = df_outbreaks.drop(['Cases', 'Deaths', 'Outbreak'], axis=1)
    y = df_outbreaks['Deaths']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = XGBRegressor()
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    print("\n🔍 Deaths Regressor Performance")
    print("MAE:", mean_absolute_error(y_test, y_pred))
    print("RMSE:", np.sqrt(mean_squared_error(y_test, y_pred)))

    joblib.dump(model, '../models/xgb_deaths_model.pkl')
    print("✅ Saved: xgb_deaths_model.pkl")


def main():
    print("🚀 Loading processed data and starting training...")
    df = load_data_and_features()
    os.makedirs('../models', exist_ok=True)

    train_outbreak_classifier(df)
    train_cases_regressor(df)
    train_deaths_regressor(df)

    print("\n✅ All models trained and saved successfully!")


if __name__ == "__main__":
    main()
