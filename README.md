# 🦠 Disease Outbreak Prediction System 2.0

> An AI-powered climate-health intelligence platform that predicts potential disease outbreaks using real-time environmental and demographic data, enabling proactive public health decision-making.

---

## 🎯 Overview & Motivation

**Disease Outbreak Prediction System 2.0** is a full-stack machine learning application designed to forecast disease outbreak risks across Indian districts by analyzing a comprehensive suite of environmental, climatic, and demographic factors. The system leverages advanced ensemble models (CatBoost and XGBoost) trained on historical epidemiological data to provide real-time risk assessments for diseases like Dengue, Chikungunya, and Cholera.

### Why This Matters

Climate change and environmental factors significantly influence disease transmission patterns. By integrating live weather data, air quality indices, population density metrics, and geographical features, this system empowers public health officials, researchers, and policymakers to:

- **Anticipate outbreaks** before they escalate into public health crises
- **Allocate resources** more effectively based on data-driven risk assessments
- **Understand correlations** between environmental conditions and disease prevalence
- **Make informed decisions** using real-time, location-specific intelligence

### Evolution from v1.0

This version represents a significant evolution from our initial Streamlit-based prototype. Version 2.0 introduces:

- **Production-ready architecture** with a decoupled frontend and backend
- **Enhanced performance** through optimized API endpoints and asynchronous data fetching
- **Refined data modeling** with improved feature engineering and model ensemble techniques
- **Superior user experience** with a modern, responsive React interface
- **Scalable deployment** on cloud infrastructure (Vercel + Render)

---

## 🧩 Key Features

### User-Facing Capabilities

- **📍 Location-Based Predictions**: Select any state or district across India to receive instant outbreak risk assessments
- **🌡️ Real-Time Environmental Analysis**: Automatically fetches and integrates live weather data, air quality metrics, and atmospheric conditions
- **📊 Comprehensive Risk Visualization**: 
  - Outbreak probability scores (0-100%)
  - Estimated case counts and projected fatalities
  - Risk level classifications (Low/High/Outbreak Expected)
- **🔄 Multi-Disease Support**: Simultaneous predictions for Dengue, Chikungunya, and Cholera
- **📱 Responsive Design**: Seamless experience across desktop, tablet, and mobile devices

### Intelligent System Components

- **🗺️ Geoapify API Integration**: Dynamic district polygon and area calculations for accurate population density metrics
- **🌤️ Weather API Integration**: Live environmental data including temperature, humidity, precipitation, wind patterns, and air quality indices
- **⚡ FastAPI Backend**: High-performance RESTful API with optimized prediction endpoints
- **🎨 Modern React UI**: Built with Vite and TailwindCSS for lightning-fast load times and smooth interactions
- **🧠 Ensemble ML Models**: Combined CatBoost and XGBoost models for robust, accurate predictions
- **💾 Smart Caching**: District area data caching to minimize API calls and improve response times

### Performance & Accuracy Improvements

Version 2.0 introduces several enhancements over the prototype:

- **Faster backend pipeline**: Optimized data preprocessing and model inference reduce prediction latency
- **Refined data modeling**: Enhanced feature selection and engineering improve prediction accuracy
- **Enhanced frontend experience**: Progressive loading, warm-up sequences, and intuitive visualizations
- **Production-grade error handling**: Graceful fallbacks and comprehensive error management

---

## ⚙️ Technical Architecture

### Full-Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Navbar     │  │  Dashboard   │  │  WarmUp      │     │
│  │  Component   │  │  Component   │  │  Screen      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                         │                                    │
│                    Axios HTTP Client                         │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (FastAPI + Uvicorn)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /predict  │  /states  │  /districts  │  /weather   │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Model Inference Engine                              │   │
│  │  • Combined Outbreak Model (CatBoost)               │   │
│  │  • Cases Prediction Model (XGBoost)                 │   │
│  │  • Deaths Prediction Model (XGBoost)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Data Preprocessing & Feature Engineering           │   │
│  │  • Label Encoding                                   │   │
│  │  • Feature Alignment                                │   │
│  │  • Missing Value Handling                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┼────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Geoapify    │  │   Weather    │  │  Static Data │
│     API      │  │     API      │  │  (JSON/CSV)  │
│              │  │              │  │              │
│ • Boundaries │  │ • Weather    │  │ • Population │
│ • Area Calc  │  │ • Air Quality│  │ • LAI        │
│              │  │ • AQI        │  │ • Coordinates│
└──────────────┘  └──────────────┘  └──────────────┘
```

### Technology Stack

**Frontend:**
- **React 19.1.1** - Modern UI library with hooks and component architecture
- **Vite 7.1.7** - Next-generation build tool for fast development and optimized production builds
- **TailwindCSS 4.1.16** - Utility-first CSS framework for rapid UI development
- **Axios 1.13.2** - Promise-based HTTP client for API communication
- **React Icons 5.5.0** - Comprehensive icon library

**Backend:**
- **FastAPI 0.111.0** - High-performance Python web framework with automatic API documentation
- **Uvicorn 0.25.0** - Lightning-fast ASGI server
- **Python 3.x** - Core runtime environment

**Machine Learning:**
- **CatBoost 1.2.8** - Gradient boosting library for outbreak probability prediction
- **XGBoost 3.0.4** - Extreme gradient boosting for cases and deaths regression
- **Scikit-learn 1.7.1** - Machine learning utilities and preprocessing
- **Pandas 2.3.2** - Data manipulation and analysis
- **NumPy 2.2.0** - Numerical computing foundation
- **Joblib 1.5.1** - Model serialization and parallel processing

**External APIs:**
- **Geoapify API** - Geographic boundaries and area calculations
- **Weatherstack API** - Real-time weather and air quality data

**Deployment:**
- **Vercel** - Frontend hosting with global CDN and automatic deployments
- **Render** - Backend hosting with auto-scaling and zero-downtime deployments

---

## 💡 Methodology

### Prediction Pipeline

The system follows a sophisticated data flow from user input to prediction output:

1. **Input Collection**: User selects state and district through the frontend interface
2. **Data Aggregation**: 
   - Static features fetched from local datasets (population, LAI, coordinates)
   - Dynamic features retrieved from Weather API (temperature, humidity, air quality)
   - Geographic features computed via Geoapify API (district area, population density)
3. **Feature Engineering**:
   - Label encoding for categorical variables (state, district, disease type)
   - Temporal feature extraction (week of year, day, month)
   - Normalization and alignment with training feature order
4. **Model Inference**:
   - **Outbreak Probability**: CatBoost classifier predicts probability of outbreak (threshold: 0.45)
   - **Case Estimation**: XGBoost regressor estimates projected cases (if outbreak predicted)
   - **Death Projection**: XGBoost regressor estimates projected fatalities (if outbreak predicted)
5. **Response Assembly**: Results formatted with environmental context and returned to frontend
6. **Visualization**: Interactive dashboard displays risk levels, probabilities, and environmental factors

### Machine Learning Approach

**Model Training & Evaluation:**
- Trained on historical epidemiological data spanning multiple years
- Feature selection based on correlation analysis and domain expertise
- Ensemble approach combining CatBoost (classification) and XGBoost (regression)
- Cross-validation and hyperparameter tuning for optimal performance
- Model evaluation using precision, recall, F1-score, and RMSE metrics

**Feature Set:**
- **Temporal**: Week of outbreak, day, month, year
- **Environmental**: Temperature, humidity, precipitation, wind speed, cloud cover, pressure, visibility
- **Air Quality**: PM2.5, PM10, NO₂, O₃, SO₂, CO, AQI indices
- **Demographic**: Population, population density, district area
- **Geographic**: Latitude, longitude, Leaf Area Index (LAI)
- **Categorical**: State/UT, district, disease type

**Challenges Addressed:**
- **API Rate Limiting**: Implemented caching strategies for district area data
- **Asynchronous Calls**: Coordinated multiple API requests with proper error handling
- **Data Quality**: Robust fallback mechanisms for missing or invalid API responses
- **Model Accuracy**: Continuous refinement through feature engineering and ensemble techniques
- **Scalability**: Optimized preprocessing pipeline for fast inference under load

---

## 🚀 Deployment & Scalability

### Production Deployment

**Frontend (Vercel):**
- Automatic deployments from Git repository
- Global CDN for optimal performance worldwide
- Environment variable management for API endpoints
- Preview deployments for pull requests

**Backend (Render):**
- Auto-scaling web service with health checks
- Environment variable configuration for API keys
- Persistent storage for model files and cached data
- Automatic SSL/TLS encryption

### Production-Ready Features

- **Concurrent Request Handling**: FastAPI's async capabilities enable handling multiple simultaneous predictions
- **Caching Strategy**: District area data cached locally to minimize external API calls
- **Error Resilience**: Comprehensive error handling with graceful fallbacks for API failures
- **Performance Optimization**: 
  - Model loading at startup (not per-request)
  - Efficient data preprocessing pipelines
  - Optimized database queries and JSON parsing
- **Monitoring & Logging**: Structured logging for debugging and performance tracking

### Scalability Considerations

- **Horizontal Scaling**: Stateless backend design allows easy horizontal scaling
- **Load Balancing**: Can be deployed behind load balancers for high-traffic scenarios
- **Database Integration**: Architecture supports future migration to persistent databases
- **API Rate Management**: Built-in mechanisms to respect external API rate limits

---

## 🧠 Learnings & Takeaways

Building Disease Outbreak Prediction System 2.0 from prototype to production provided invaluable insights:

### Technical Growth

- **Full-Stack Architecture**: Gained deep understanding of decoupled frontend-backend systems, API design, and state management
- **ML Productionization**: Learned to bridge the gap between research models and production systems, including model serialization, versioning, and inference optimization
- **API Integration Complexity**: Navigated challenges of integrating multiple third-party APIs with different rate limits, response formats, and error handling requirements
- **Performance Optimization**: Discovered the importance of caching, lazy loading, and efficient data structures in real-world applications

### Problem-Solving Insights

- **Handling Real-World Data**: Developed robust error handling and fallback mechanisms for unpredictable external data sources
- **User Experience Design**: Learned to balance technical complexity with intuitive interfaces, including warm-up sequences for cold starts
- **Deployment Challenges**: Gained experience with cloud platforms, environment configuration, and CI/CD pipelines

### Team Collaboration

- **Version Control**: Effective use of Git for collaborative development and feature management
- **Code Organization**: Structured codebase with clear separation of concerns (models, utilities, components)
- **Documentation**: Importance of comprehensive documentation for maintainability and onboarding

### Future Directions

This project sparked interest in:
- Advanced time-series forecasting for temporal disease patterns
- Integration of satellite imagery for environmental monitoring
- Real-time data streaming and event-driven architectures
- Explainable AI techniques for model interpretability

---

## 🧰 Installation & Usage

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.9+
- **Git** for version control
- API keys for:
  - Geoapify API ([Get your key](https://www.geoapify.com/))
  - Weatherstack API ([Get your key](https://weatherstack.com/))

### Local Development Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd DOPS
```

#### 2. Backend Setup

```bash
# Navigate to project root
cd DOPS

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a .env file in the project root:
# GEOAPIFY_API_KEY=your_geoapify_key
# WEATHER_API_KEY=your_weatherstack_key

# Run the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. API documentation (Swagger UI) is available at `http://localhost:8000/docs`.

#### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file for frontend
# VITE_API_BASE_URL=http://localhost:8000

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173` (default Vite port).

### Production Build

#### Backend

```bash
# Build and run with production settings
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### Frontend

```bash
cd frontend
npm run build
# Output will be in frontend/dist/
# Deploy the dist/ folder to Vercel or your hosting provider
```

### Environment Variables

**Backend (.env):**
```
GEOAPIFY_API_KEY=your_geoapify_api_key
WEATHER_API_KEY=your_weatherstack_api_key
```

**Frontend (.env):**
```
VITE_API_BASE_URL=https://your-backend-url.onrender.com
```

### Running Tests

```bash
# Backend tests (if available)
pytest tests/

# Frontend tests (if available)
cd frontend
npm test
```

---

## 🌍 Future Enhancements

Our roadmap for continued improvement includes:

### Short-Term (Next 3-6 Months)

- **📈 Expanded Disease Coverage**: Add predictions for Malaria, Typhoid, and other vector-borne diseases
- **🗺️ Interactive Maps**: Integrate Leaflet or Mapbox for visual geographic risk visualization
- **📊 Historical Trends**: Add time-series analysis to show risk trends over weeks/months
- **🔔 Alert System**: Email/SMS notifications for high-risk predictions
- **📱 Mobile App**: Native mobile application for field health workers

### Medium-Term (6-12 Months)

- **🛰️ Satellite Data Integration**: Incorporate satellite imagery for vegetation, water bodies, and urbanization metrics
- **🚶 Mobility Data**: Integrate anonymized mobility patterns to understand population movement
- **🤖 Model Explainability**: SHAP values and feature importance visualizations for transparency
- **🌐 Multi-Country Support**: Extend predictions to other countries in South Asia
- **📈 Advanced Forecasting**: Time-series models (LSTM, Prophet) for multi-week ahead predictions

### Long-Term Vision

- **🤝 Public Health Integration**: Direct integration with government health department systems
- **🔬 Research Collaboration**: Open-source model for academic research and validation
- **🌍 Global Expansion**: Scale to cover multiple continents and disease types
- **💾 Real-Time Data Streaming**: Kafka/RabbitMQ integration for live data ingestion
- **🧪 A/B Testing Framework**: Continuous model improvement through A/B testing

---

## 🏷️ Tech Stack Summary

**Frontend:** React (Vite) | TailwindCSS | Axios | React Icons

**Backend:** FastAPI | Uvicorn | Python

**Machine Learning:** CatBoost | XGBoost | Scikit-learn | Pandas | NumPy | Joblib

**APIs:** Geoapify API | Weatherstack API

**Deployment:** Render | Vercel

**Development Tools:** Git | ESLint | Python-dotenv

---

## ✨ Contributors

This project was developed with dedication and attention to detail. Special thanks to all contributors who helped transform the initial prototype into a production-ready system.

**Core Team:**
- [Your Name/Team Name] - Full-stack development, ML model training, and system architecture

**Acknowledgments:**
- Public health data providers and research institutions
- Open-source community for excellent tools and libraries
- Beta testers for valuable feedback and bug reports

---

## 📝 License

[Specify your license here - e.g., MIT, Apache 2.0, or proprietary]

---

## 🤝 Feedback Welcome

We're continuously improving Disease Outbreak Prediction System 2.0. Your feedback, suggestions, and contributions are invaluable!

- **Report Issues**: [GitHub Issues Link]
- **Feature Requests**: [GitHub Discussions Link]
- **Contact**: [Your Email/Contact Information]

---

**Built with ❤️ for public health awareness and early intervention.**

*Last Updated: [Current Date]*

