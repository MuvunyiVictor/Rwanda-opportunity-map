# Construction Opportunity Intelligence Map (v2.0)
## Two-Page Redesign & Scoring Reference Guide

This workspace has been restructured into a **Two-Page Experience** to improve usability, reduce cognitive load, and present data-rich features without cluttering the initial exploration. The entire administrative boundaries map of Rwanda remains fully shared and integrated between views.

---

## 1. Quick Start & Execution

1. **Launch the Application**:
   Double-click the `run_server.bat` launcher located in the `New_version` project root:
   `C:\Users\pc\Desktop\my_folder_project\opportunity_map\New_version\run_server.bat`
   
   This will spin up the Python background server and open the landing page automatically at `http://localhost:8000`.
   
2. **Stop the Application**:
   Select the active command prompt window and press `Ctrl+C` or close the window.

---

## 2. The Two-Page Layout

The map container is shared dynamically using client-side Hash Routing, enabling instant transitions and maintaining map state (loaded layers, markers, tile themes) across pages.

### Page 1: Overview / Explore Map (Landing Page)
- **Visual Goal**: Minimal, clean, map-focused layout.
- **Key Features**:
  - **Full-Screen Map**: The Leaflet map occupies 100% of the screen.
  - **Floating Compact Sidebar (Top-Left)**: Holds search, view toggle (Provinces/Districts), layer overlays checkboxes, and legend.
  - **Dynamic Persona Selector**: Sets the weighting bias. Toggling recalculates the color scale gradients across all districts instantly.
  - **Interactive Mini-Popups**: Clicking any district displays a compact card showing the **District Name**, **Composite Score**, **5 sub-score badges**, and a prominent `🔍 View Full Report` button which navigates to Page 2.

### Page 2: Detailed Analysis (Drill-Down Page)
- **Visual Goal**: Split-screen, data-rich analysis dashboard.
- **Access URL**: Accessible via the hash route `#/details/DistrictName` (e.g. `#/details/Gasabo`).
- **Key Features**:
  - **Top Navigation Bar**: Displays a `← Back to Map Overview` button (returns to Page 1) and location breadcrumbs (`Home / Rwanda / Gasabo District`).
  - **Print/TXT Exporter**: A `Export Report` button generates a formatted text document (`.txt`) of the district's metrics for download.
  - **Dynamic Radar Chart**: Visualizes the 5 opportunity dimensions.
  - **5 Score Breakdown Progress Bars**: Full indicators for Readiness, Supply, Labor, Investment, and Opp Gap.
  - **Enhanced Query Filters**:
    - **Presets**: Four quick buttons (⚡ Utility Ready, 🏪 Supply Depot, 👷 Labor Pool, 💰 High ROI) that set filters programmatically.
    - **Sliders & Dropdowns**: Interactive filters to isolate land types or composite scores, with live feedback of matching districts (e.g. *"Active: 2 filters, 8 districts matching"*). Non-matching districts are dimmed on the map.
  - **Logistics Delivery Router**: Clicking `Optimize Supply Route` draws a dotted path connecting the district center to the closest hardware supplier, calculating distance and estimated travel times.
  - **Field Reporting Form**: An accordion panel to submit price updates or bottlenecks.

---

## 3. Dynamic Scoring Architecture (0-100 Scale)

1. **🏗️ Development Readiness Score**: Mapped to grid connections and water links. Combines district zoning baselines with proximity to nearest OSM **electricity substations** and **water works**.
2. **🏪 Supply Chain Efficiency Score**: Counts OSM **hardware stores** within 10km, proximity to **warehouses/quarries**, and subtracts active crowdsourced **logistics bottlenecks**.
3. **👷 Labor Availability Score**: Counts proximity to the nearest **TVET (technical/vocational) college** combined with baseline labor indices.
4. **💰 Investment Attractiveness Score**: Density of ongoing **construction sites** (within 15km) + proximity to **Special Economic Zones** (SEZ) + bank access + crowdsourced project logs.
5. **🔍 Opportunity Gap Index**: Highlights untapped markets where development demand is high but local materials and labor supply are low. Formula: `50 + (Demand - Supply) * 1.6`.

---

## 4. Persona-Specific Weighting Models

| Target Persona | Readiness | Supply Chain | Labor | Attractiveness | Opportunity Gap | Primary Mapping Focus |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **⚖️ Balanced Composite** | 20% | 20% | 20% | 20% | 20% | Equal weights across all factors. |
| **🏢 Real Estate Developer** | **35%** | 10% | 10% | **30%** | 15% | Best zones for land readiness and economic growth. |
| **🏪 Material Supplier** | 15% | 10% | 10% | **30%** | **35%** | High demand centers with major supplier deficits. |
| **👷 Contractor / Builder** | 10% | **35%** | **35%** | 10% | 10% | Maximizes operational efficiency and labor access. |
| **📐 Urban Planner / Gov** | **30%** | 15% | 15% | 10% | **30%** | Pinpoints high-risk infrastructure gaps. |
| **💰 Foreign Investor** | 20% | 10% | 10% | **40%** | 20% | Highlights high-ROI zoning and economic hotspots. |
