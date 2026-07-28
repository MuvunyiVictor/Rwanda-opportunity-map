# 🇷🇼 Rwanda Opportunity Map

**An interactive intelligence platform for investors, developers, and policymakers to discover economic opportunities across Rwanda's 30 districts.**

---

## 📌 Introduction: Aligning with Rwanda's Vision 2050

Rwanda's **Vision 2050** sets an ambitious goal: transforming the country into a **high-income, knowledge-based economy** by the middle of the century. Central to this vision is the creation of a **vibrant private sector**, the attraction of **foreign and domestic investment**, and the development of **competitive, inclusive markets** across all 30 districts.

The **Rwanda Opportunity Map** is designed to empower investors — whether internal or external — by providing a **data-driven, district-level intelligence tool** that answers a fundamental question:

> *"Where in Rwanda should I invest, and what does the opportunity landscape look like?"*

By visualizing **four factors of production** — Land, Labor, Capital, and Entrepreneurship — alongside real-time infrastructure data from OpenStreetMap, agriculture intelligence, and major development projects, the platform enables users to:

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
| **Land** | Physical readiness for development — includes zoning, infrastructure, and urbanization patterns | NISR, district-level analysis |
| **Labor** | Availability and quality of human capital — skills, education, and workforce density | NISR, TVET data, proximity to educational institutions |
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

### Step 2: Normalization (0–100 Scale)

For each indicator, the raw values are normalized using the formula:
Normalized Score = (Value − Min) / (Max − Min) × 100

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

### Example: Gasabo District

| Factor | Raw Value | Min | Max | Normalized Score |
|--------|-----------|-----|-----|------------------|
| Land | 92.0 | 58.0 | 92.0 | 100.0 |
| Labor | 95.0 | 52.0 | 95.0 | 100.0 |
| Capital | 97.0 | 42.0 | 97.0 | 100.0 |
| Entrepreneurship | 94.0 | 46.0 | 94.0 | 100.0 |
| **Composite** | **94.5** | — | — | **100.0** |

*Note: Scores are relative to the current dataset and will adjust as new data is added.*

---

## ✨ Key Features

### 1. District Intelligence Dashboard
- **Dropdown selector** for all 30 districts
- **Score cards** showing Composite, Land, Labor, Capital, and Entrepreneurship scores
- **OSM Intelligence** showing district-specific counts for:
  - 🏗️ Construction sites
  - 🏪 Hardware shops
  - 🏢 Commercial buildings
  - 🏭 Industrial sites
  - 🏫 Education facilities
  - 🏥 Health facilities

### 2. Interactive Map
- **Leaflet-powered map** with district boundaries
- **Color-coded districts** based on composite scores
- **Click to zoom** to any district
- **Toggle between dark and light map themes**

### 3. Detailed District Analysis
- **Radar chart** visualizing 5 opportunity dimensions
- **Progress bars** for each dimension
- **Agriculture profile** showing crop intensity, major crops, seasonal yield, and irrigated land
- **Nearby major projects** display

### 4. Admin Panel (Data Entry)
- **Secure login** (admin / admin123)
- **Add new major projects** — form to add projects with name, location, coordinates, status, and description
- **Add OSM elements** — manually add construction, hardware, education, health, or commercial elements to a specific district

### 5. Real-Time Data
- All data is stored in JSON files and updates in real-time
- OSM data is fetched from the Overpass API and cached locally
- New projects appear immediately on the map and in the projects list

---

## 🏗️ Technical Architecture

### Layers

| Layer | Technology | Description |
|-------|------------|-------------|
| **Frontend** | HTML, CSS, JavaScript | Single-page application with dynamic rendering |
| **Mapping** | Leaflet.js + OpenStreetMap | Interactive map with custom tile layers |
| **Charts** | Chart.js | Radar charts for district analysis |
| **Geospatial** | Turf.js | Point-in-polygon calculations for district-specific OSM filtering |
| **Backend** | Python (http.server) | Lightweight HTTP server with REST API endpoints |
| **Data Storage** | JSON files | All data stored as JSON in the project directory |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/osm` | GET | Returns cached OSM data |
| `/api/osm/refresh` | POST | Fetches fresh OSM data from Overpass API |
| `/api/osm/add` | POST | Adds a new OSM element |
| `/api/major-projects` | GET | Returns major projects |
| `/api/major-projects/add` | POST | Adds a new major project |
| `/api/agriculture` | GET | Returns agriculture data |
| `/api/crowdsourced` | GET / POST | Returns or adds crowdsourced reports |

---

## 📁 Project Structure
opportunity_map/
├── index.html # Main application (frontend)
├── app.js # Core application logic
├── construction.js # OSM construction layer logic
├── styles.css # Custom styling
├── serve.py # Python HTTP server with API
├── run_server.bat # Windows launcher
├── data.json # District scores (Land, Labor, Capital, Entrepreneurship)
├── major_projects.json # Major development projects
├── data/
│ ├── rwanda-districts.geojson # District boundaries
│ ├── rwanda-provinces.geojson # Province boundaries
│ ├── osm_cache.json # Cached OSM data
│ ├── agriculture_data.json # NISR agriculture data
│ └── crowdsourced.json # User-submitted reports
└── CONSTRUCTION_MAP_GUIDE.md # Detailed technical documentation


---
🛠️ How It Works
Data Flow
text
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │  Dropdown   │  │  Score      │  │  OSM        │           │
│  │  (District) │  │  Cards      │  │  Intelligence│          │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Leaflet Map                         │   │
│  │  (District polygons colored by composite score)        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LOGIC (app.js)                 │
├─────────────────────────────────────────────────────────────────┤
│  • Fetches data from API endpoints                            │
│  • Renders districts on map                                   │
│  • Calculates OSM counts per district using Turf.js           │
│  • Generates radar charts                                     │
│  • Handles login and admin functions                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER (serve.py)                 │
├─────────────────────────────────────────────────────────────────┤
│  GET  /api/osm            → Returns cached OSM data           │
│  POST /api/osm/refresh    → Fetches fresh OSM from Overpass   │
│  POST /api/osm/add        → Adds new OSM element              │
│  GET  /api/major-projects → Returns projects                  │
│  POST /api/major-projects/add → Adds new project              │
│  GET  /api/agriculture    → Returns agriculture data          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA STORAGE                           │
├─────────────────────────────────────────────────────────────────┤
│  data.json          → District scores                         │
│  major_projects.json → Major projects                         │
│  data/osm_cache.json → OSM data cache                         │
│  data/agriculture_data.json → Agriculture data                │
└─────────────────────────────────────────────────────────────────┘

OSM Intelligence — District-Specific Filtering
The OSM Intelligence section uses Turf.js to filter OSM elements by district:

A district polygon is loaded from the GeoJSON file

Each OSM element's coordinates are checked against the polygon

If the point falls inside the polygon, the element is counted

Counts are displayed for six categories: Construction, Hardware, Commercial, Industrial, Education, Health

📊 Data Sources
Data	Source	Description
District Scores	NISR + Custom Analysis	Land, Labor, Capital, Entrepreneurship, and Composite scores for 30 districts
District Boundaries	OpenStreetMap / Humanitarian Data Exchange	GeoJSON polygons for all 30 districts
OSM Data	OpenStreetMap (Overpass API)	Construction sites, hardware shops, commercial/industrial buildings, schools, hospitals
Agriculture Data	NISR Seasonal Agricultural Survey	Crop intensity, major crops, seasonal yield, irrigated land per district
Major Projects	MININFRA, RDB, The New Times	KIC, Bugesera Airport, Rubavu Port, Rusizi Port, and user-added projects


🐛 Known Issues & Limitations
Issue	Status	Workaround
OSM data filtering only processes first 10,000 elements	Performance optimization	Acceptable for current dataset size
OSM data does not have district names attached	Uses Turf.js point-in-polygon	Working solution
Login credentials are hardcoded	Not secure for production	Environment variables or database for production
No user registration	Admin only	For internal use only

📚 Future Improvements
Feature	Description
User Registration	Allow multiple users with different roles
Data Export	Export district reports as PDF or CSV
District Comparison	Compare two districts side-by-side
Time Series Data	Track changes in scores over time
Mobile App	React Native or Flutter version
API Authentication	Secure API endpoints with JWT tokens
Database Integration	Move from JSON to PostgreSQL
