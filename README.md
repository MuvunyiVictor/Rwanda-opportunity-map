# 🇷🇼 Rwanda Opportunity Map

**An interactive intelligence platform for investors, developers, and policymakers to discover economic opportunities across Rwanda's 30 districts.**

---

## 📌 Introduction: Aligning with Rwanda's Vision 2050

Rwanda's **Vision 2050** sets an ambitious goal: transforming the country into a **high-income, knowledge-based economy** by the middle of the century. Central to this vision is the creation of a **vibrant private sector**, the attraction of **foreign and domestic investment**, and the development of **competitive, inclusive markets** across all 30 districts.

The **Rwanda Opportunity Map** is designed to empower investors — whether internal or external — by providing a **data-driven, district-level intelligence tool** that answers a fundamental question:

> *"Where in Rwanda should I invest, and what does the opportunity landscape look like?"*

By visualizing **four factors of production** — Land, Labor, Capital, and Entrepreneurship — alongside real-time infrastructure data, skills pipeline intelligence, and land readiness scores, the platform enables users to:

- **Identify high-potential districts** for their specific investment profile
- **Compare districts** across multiple dimensions
- **Discover infrastructure gaps and opportunities**
- **Make informed, data-backed decisions**

In doing so, the Opportunity Map contributes directly to Rwanda's Vision 2050 by **lowering information barriers**, **promoting equitable regional development**, and **accelerating private sector growth**.

---

## 🧭 The Four Factors of Production

The platform is built on the classic economic framework of the **four factors of production**, customized for Rwanda's development context:

| Factor | Description | Data Source |
|--------|-------------|-------------|
| **Land** | Physical readiness for development — includes zoning, infrastructure, and urbanization patterns | NISR, Land Center Basemap |
| **Labor** | Availability and quality of human capital — skills, education, and workforce density | NISR, TVET data, Schools Directory |
| **Capital** | Access to financial resources, credit, and investment flows | NISR, banking data, proximity to banks and ATMs |
| **Entrepreneurship** | Business density, innovation, and startup activity | NISR, proximity to markets, commercial buildings, and hardware shops |

Each factor is scored on a **0–100 scale**, normalized to enable direct comparison across districts.

---

## 📊 Normalization Methodology

To ensure fair and meaningful comparisons across districts, the platform uses a **min-max normalization** approach, consistent with the methodology used in global indices like the Global Innovation Index (GII).

### Step 1: Raw Data Collection

Raw data for each district is collected from multiple sources:
- **NISR** (National Institute of Statistics of Rwanda) — for demographic, economic, and infrastructure data
- **OpenStreetMap** — for point-of-interest data (schools, hospitals, shops, construction sites)
- **MININFRA / RDB** — for major project locations and status
- **Schools Directory** — for workforce skills pipeline intelligence
- **Land Center Basemap** — for spatial development readiness scores

### Step 2: Normalization (0–100 Scale)

For each indicator, the raw values are normalized using the formula:

Where:
- `Value` = the raw value for a given district
- `Min` = the minimum value across all districts
- `Max` = the maximum value across all districts

This ensures that all indicators are placed on a common scale, regardless of their original units.

### Step 3: Factor Aggregation

Each of the four factors (Land, Labor, Capital, Entrepreneurship) is computed as the **arithmetic mean** of its constituent normalized indicators:
Factor Score = (Indicator₁ + Indicator₂ + ... + Indicatorₙ) / n

### Step 4: Composite Score

The **Composite Score** is the average of the four factor scores:
Composite Score = (Land + Labor + Capital + Entrepreneurship) / 4


This provides a single, holistic measure of opportunity for each district.

### Step 5: Dynamic Boosts

The scoring engine incorporates three additional intelligence layers:

- **Asset Boosts** – Submitted assets (hospitals, schools, farms, markets, factories, banks, hotels, major projects) add points to relevant factors
- **News Signal Boosts** – Curated news articles with impact scores boost specific dimensions
- **Skills Pipeline Boosts** – Schools and their programs contribute to workforce readiness scores

This makes the scoring engine **dynamic and responsive** to new data.

---

## ✨ Key Features

### 1. District Intelligence Dashboard
- **Dropdown selector** for all 30 districts
- **Score cards** showing Composite, Land, Labor, Capital, and Entrepreneurship scores
- **Skills Pipeline Intelligence** – Shows schools, programs, and workforce impact boosts per district
- **Land Readiness Basemap** – Displays 5 spatial development layers (Land Use, Infrastructure Density, Zoning Flexibility, Urbanization Pattern, Environmental Suitability)

### 2. Infrastructure Intelligence (Pills)
- Clickable filters showing district-specific counts for:
  - 🏗️ Construction sites
  - 🏪 Hardware shops
  - 🏢 Commercial buildings
  - 🏭 Industrial sites
  - 🏫 Education facilities
  - 🏥 Health facilities
  - 🏨 Hospitality & Tourism
  - 🏦 Banking & Finance

### 3. Interactive Map
- **Leaflet-powered map** with district boundaries
- **Heatmap mode** – Click any infrastructure pill to color districts by that category
- **Click to zoom** to any district
- **Toggle between dark and light map themes**
- **Strategic Anchor Markers** – Shows major projects on the map

### 4. Detailed District Analysis (Full Details View)
- **Radar chart** visualizing all 5 opportunity dimensions
- **Progress bars** for each dimension
- **Agriculture profile** – Crop intensity, major crops, seasonal yield, and irrigated land
- **Major Projects** – Nearby strategic anchors and investments
- **Skills Pipeline Profile** – Full list of schools, programs, and enrollment
- **Land Readiness Breakdown** – Detailed breakdown of all 5 spatial layers
- **News Intelligence** – Curated news signals for the district
- **Opportunity Gap Analysis** – Short-term and long-term investment opportunities with archetype classification (Rocket, Quick Win, Foundation, Saturated)

### 5. Analytics Tab
- **Sector Distribution & Site Selection Engine** – Recommends top 3 districts for new facilities based on infrastructure gaps
- **Comparative Geographic Neighbor Performance** – Compares districts against their neighbors
- **National Investment Rankings** – Top 5 districts and full 30-district ranking table
- **Executive District Recommendations** – Investment strategy for each district

### 6. Admin Panel (Data Entry)
- **Secure login** (admin / admin123)
- **Submit New Asset** – Add hospitals, schools, farms, markets, factories, banks, hotels, construction sites, and major projects
- **News & Government Data Curator Ingestion** – Add curated news signals that boost district scores
- **Schools Directory Ingestion** – Add schools with programs and enrollment data
- **Land Center Basemap Data Manager** – Update spatial development readiness scores per district
- **View All Submitted Assets** – See a list of all user-submitted assets

---

## 🏗️ Technical Architecture

### Layers

| Layer | Technology | Description |
|-------|------------|-------------|
| **Frontend** | HTML, CSS, JavaScript | Single-page application with dynamic rendering |
| **Mapping** | Leaflet.js + OpenStreetMap | Interactive map with custom tile layers |
| **Charts** | Chart.js | Radar charts for district analysis |
| **Geospatial** | Turf.js | Point-in-polygon calculations for district-specific OSM filtering |
| **Backend** | Python (http.server) | Lightweight HTTP server with API endpoints |
| **Data Storage** | JSON files | All data stored as JSON in the project directory |

### Data Files

| File | Description |
|------|-------------|
| `data.json` | Base district scores (Land, Labor, Capital, Entrepreneurship) |
| `data/agriculture_data.json` | NISR agriculture data per district |
| `data/district_infra_curated.json` | Curated infrastructure counts and anchors |
| `data/district_neighbors.json` | Geographic adjacency map for all 30 districts |
| `data/schools_directory.json` | Schools with programs and enrollment data |
| `data/land_center_data.json` | Spatial development readiness scores |
| `data/assets.json` | User-submitted assets |
| `data/curated_news.json` | Curated news signals with impact scores |
| `data/rwanda-districts.geojson` | District boundaries |
| `major_projects.json` | Major development projects |

---

## 📁 Project Structure
opportunity_map/
├── index.html # Main application (frontend)
├── app.js # Core application logic
├── styles.css # Custom styling
├── serve.py # Python HTTP server with API
├── run_server.bat # Windows launcher
├── data.json # District scores (Land, Labor, Capital, Entrepreneurship)
├── major_projects.json # Major development projects
├── data/
│ ├── rwanda-districts.geojson # District boundaries
│ ├── rwanda-provinces.geojson # Province boundaries
│ ├── agriculture_data.json # NISR agriculture data
│ ├── district_infra_curated.json # Infrastructure counts and anchors
│ ├── district_neighbors.json # Geographic adjacency map
│ ├── schools_directory.json # Schools with programs and enrollment
│ ├── land_center_data.json # Spatial development readiness scores
│ ├── assets.json # User-submitted assets
│ ├── curated_news.json # Curated news signals
│ └── osm_cache.json # Cached OSM data
├── libs/
│ ├── fontawesome/ # Font Awesome icons
│ ├── leaflet/ # Leaflet.js map library
│ ├── chart/ # Chart.js for radar charts
│ └── turf/ # Turf.js for geospatial analysis
└── fonts/ # Custom fonts (Outfit, Plus Jakarta Sans, IBM Plex Mono)


---

## 🛠️ How It Works

### Data Flow

## 🛠️ How It Works

### Data Flow
┌─────────────────────────────────────────────────────────────────┐
│ USER INTERFACE │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Dropdown │ │ Score │ │ Skills │ │
│ │ (District) │ │ Cards │ │ Pipeline │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ┌───────────┐ ┌───────────┐ ┌───────────┐ │ │
│ │ │ Land │ │ Labor │ │ Capital │ │ │
│ │ │ Readiness │ │ Pipeline │ │ Access │ │ │
│ │ └───────────┘ └───────────┘ └───────────┘ │ │
│ │ Leaflet Map │ │
│ │ (District polygons colored by composite or infra) │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────┐
│ APPLICATION LOGIC (app.js) │
├─────────────────────────────────────────────────────────────────┤
│ • Fetches data from JSON files │
│ • Renders districts on map │
│ • Calculates dynamic scores (base + boosts) │
│ • Calculates OSM counts per district using Turf.js │
│ • Generates radar charts │
│ • Handles login and admin functions │
│ • Runs site selection engine │
└─────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────┐
│ DATA STORAGE │
├─────────────────────────────────────────────────────────────────┤
│ data.json → Base district scores │
│ data/schools_directory.json → Skills pipeline data │
│ data/land_center_data.json → Spatial readiness scores │
│ data/agriculture_data.json → Agriculture data │
│ data/district_infra_curated.json → Infrastructure counts │
│ data/assets.json → User-submitted assets │
│ data/curated_news.json → Curated news signals │
│ data/rwanda-districts.geojson → District boundaries │
└─────────────────────────────────────────────────────────────────┘


### Dynamic Scoring Engine

The platform uses a sophisticated scoring engine that combines multiple data sources:

1. **Base Scores** – Loaded from `data.json` (Land, Labor, Capital, Entrepreneurship)
2. **Asset Boosts** – User-submitted assets add points to relevant factors
3. **News Signal Boosts** – Curated news with impact scores boost specific dimensions
4. **Skills Pipeline Boosts** – Schools and their programs contribute to workforce scores
5. **Land Center Basemap Integration** – Spatial readiness scores blended (40% weight)

The result is a **dynamic, responsive scoring system** that updates in real-time as new data is added.

---

## 📊 Data Sources

| Data | Source | Description |
|------|--------|-------------|
| District Scores | NISR + Custom Analysis | Land, Labor, Capital, Entrepreneurship, and Composite scores for 30 districts |
| District Boundaries | OpenStreetMap / Humanitarian Data Exchange | GeoJSON polygons for all 30 districts |
| Infrastructure Counts | Curated + OSM | Construction, hardware, commercial, industrial, education, health, hospitality, banking |
| Skills Pipeline | Schools Directory | Schools with programs and enrollment data |
| Land Readiness | Land Center Basemap | Spatial development readiness scores (5 layers) |
| Agriculture Data | NISR Seasonal Agricultural Survey | Crop intensity, major crops, seasonal yield, irrigated land per district |
| Major Projects | MININFRA, RDB, The New Times | KIC, Bugesera Airport, Rubavu Port, Rusizi Port, and user-added projects |
| Assets | User-submitted | Hospitals, schools, farms, markets, factories, banks, hotels, construction sites |
| News Signals | Curated | News articles with impact scores for specific dimensions |

---

## 🐛 Known Issues & Limitations

| Issue | Status | Workaround |
|-------|--------|------------|
| OSM data filtering only processes first 10,000 elements | Performance optimization | Acceptable for current dataset size |
| OSM data does not have district names attached | Uses Turf.js point-in-polygon | Working solution |
| Login credentials are hardcoded | Not secure for production | Environment variables or database for production |
| No user registration | Admin only | For internal use only |
| Map tiles require internet | Requires network | Background tiles load from CartoCDN |

---

## 📚 Future Improvements

| Feature | Description |
|---------|-------------|
| User Registration | Allow multiple users with different roles |
| Data Export | Export district reports as PDF or CSV |
| District Comparison | Compare two districts side-by-side |
| Time Series Data | Track changes in scores over time |
| Mobile App | React Native or Flutter version |
| API Authentication | Secure API endpoints with JWT tokens |
| Database Integration | Move from JSON to PostgreSQL |
| Offline Map Tiles | Cache map tiles for offline use |

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.7+** (for the server)
- **Git** (for version control)
- **Web browser** (Chrome, Firefox, Edge, or Safari)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MuvunyiVictor/Rwanda-opportunity-map.git
   cd Rwanda-opportunity-map

   python serve.py

   Open the application:
Navigate to http://localhost:8000 in your browser.

🤝 Contributing
This project is currently in active development. Contributions are welcome.

How to Contribute
Fork the repository

Create a feature branch (git checkout -b feature/your-feature)

Commit your changes (git commit -m "Add your feature")

Push to the branch (git push origin feature/your-feature)

Open a Pull Request

📄 License
This project is proprietary and confidential. All rights reserved.

🙏 Acknowledgments
NISR – National Institute of Statistics of Rwanda for providing foundational data

OpenStreetMap – For the base map and point-of-interest data

MININFRA, RDB – For major project data and strategic planning information

Land Center Rwanda – For spatial development readiness data


---

## What I Changed

| Section | What I Updated |
|---------|----------------|
| **Four Factors** | Added Land Center Basemap and Schools Directory as data sources |
| **Normalization** | Added Step 5: Dynamic Boosts (Assets, News, Skills Pipeline) |
| **Key Features** | Added Skills Pipeline, Land Readiness, Heatmap mode, Analytics tab, Admin Panel sections |
| **Technical Architecture** | Updated data files list with all new files |
| **Project Structure** | Added `assets.json`, `curated_news.json`, `district_neighbors.json`, `land_center_data.json`, `schools_directory.json` |
| **Data Flow** | Updated to show the 5-layer scoring engine |
| **Data Sources** | Added Skills Pipeline, Land Readiness, Assets, News Signals |

---

Copy this entire markdown block, paste it into your `README.md` file, save, commit, and push. Your partner will see a complete, up-to-date picture of what you built.


