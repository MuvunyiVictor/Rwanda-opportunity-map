/* ==========================================================================
   Rwanda Construction Opportunity Intelligence Map - Scoring & OSM Engine
   ========================================================================== */

const TARGET_CITIES = {
    "Kigali": { lat: -1.9441, lng: 30.0619, radius: 15000 },
    "Musanze": { lat: -1.5028, lng: 29.6350, radius: 8000 },
    "Rubavu": { lat: -1.6829, lng: 29.2573, radius: 8000 },
    "Muhanga": { lat: -2.0800, lng: 29.7584, radius: 8000 },
    "Nyagatare": { lat: -1.2996, lng: 30.3243, radius: 8000 },
    "Rusizi": { lat: -2.4896, lng: 28.8961, radius: 8000 },
    "Kayonza": { lat: -1.9366, lng: 30.5214, radius: 8000 }
};

const DISTRICT_COORDINATES = {
    // City of Kigali
    "Nyarugenge": { lat: -1.9587, lng: 30.0459 },
    "Gasabo": { lat: -1.9168, lng: 30.1044 },
    "Kicukiro": { lat: -1.9892, lng: 30.1204 },
    // Southern Province
    "Nyanza": { lat: -2.3524, lng: 29.7508 },
    "Gisagara": { lat: -2.6171, lng: 29.8453 },
    "Nyaruguru": { lat: -2.7161, lng: 29.5085 },
    "Huye": { lat: -2.5164, lng: 29.7236 },
    "Nyamagabe": { lat: -2.4641, lng: 29.4350 },
    "Ruhango": { lat: -2.2319, lng: 29.7828 },
    "Muhanga": { lat: -2.0800, lng: 29.7584 },
    "Kamonyi": { lat: -2.0069, lng: 29.9072 },
    // Western Province
    "Karongi": { lat: -2.1585, lng: 29.3664 },
    "Rutsiro": { lat: -2.0350, lng: 29.3453 },
    "Rubavu": { lat: -1.6829, lng: 29.2573 },
    "Nyabihu": { lat: -1.6375, lng: 29.4184 },
    "Ngororero": { lat: -1.8654, lng: 29.6268 },
    "Rusizi": { lat: -2.4896, lng: 28.8961 },
    "Nyamasheke": { lat: -2.3619, lng: 29.1350 },
    // Northern Province
    "Rulindo": { lat: -1.7375, lng: 30.0125 },
    "Gakenke": { lat: -1.6967, lng: 29.7886 },
    "Musanze": { lat: -1.5028, lng: 29.6350 },
    "Burera": { lat: -1.4114, lng: 29.8089 },
    "Gicumbi": { lat: -1.6167, lng: 30.1264 },
    // Eastern Province
    "Rwamagana": { lat: -1.9489, lng: 30.4347 },
    "Nyagatare": { lat: -1.2996, lng: 30.3243 },
    "Gatsibo": { lat: -1.5906, lng: 30.4578 },
    "Kayonza": { lat: -1.9366, lng: 30.5214 },
    "Kirehe": { lat: -2.1856, lng: 30.6492 },
    "Ngoma": { lat: -2.1820, lng: 30.4350 },
    "Bugesera": { lat: -2.1384, lng: 30.1458 }
};

const PERSONA_WEIGHTS = {
    composite: { readiness: 0.20, supply: 0.20, labor: 0.20, invest: 0.20, gap: 0.20 },
    developer: { readiness: 0.35, supply: 0.10, labor: 0.10, invest: 0.30, gap: 0.15 },
    supplier: { readiness: 0.15, supply: 0.10, labor: 0.10, invest: 0.30, gap: 0.35 },
    contractor: { readiness: 0.10, supply: 0.35, labor: 0.35, invest: 0.10, gap: 0.10 },
    planner: { readiness: 0.30, supply: 0.15, labor: 0.15, invest: 0.10, gap: 0.30 },
    investor: { readiness: 0.20, supply: 0.10, labor: 0.10, invest: 0.40, gap: 0.20 }
};

// Helper: Haversine distance formula
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Helper: Resolve OSM element lat/lng
function getElementCoords(element, elementsById) {
    if (element.type === 'node') {
        return { lat: element.lat, lng: element.lon };
    } else if (element.type === 'way' && element.nodes) {
        // Average coordinates of nodes
        let sumLat = 0, sumLng = 0, count = 0;
        element.nodes.forEach(id => {
            const node = elementsById[id];
            if (node) {
                sumLat += node.lat;
                sumLng += node.lon;
                count++;
            }
        });
        if (count > 0) {
            return { lat: sumLat / count, lng: sumLng / count };
        }
    }
    return null;
}

window.RwandaConstructionIntel = {
    cities: TARGET_CITIES,
    districtCoords: DISTRICT_COORDINATES,
    osmData: null,
    crowdsourcedData: [],
    majorProjectsData: [],
    agricultureData: {},
    baselineData: {}, // original data.json values
    calculatedScores: {}, // districtName -> construction scores
    activePersona: 'composite', 
    isLoaded: false,

    async init() {
        try {
            // 1. Fetch original district data.json
            const baseRes = await fetch('data.json');
            this.baselineData = await baseRes.json();

            // 2. Fetch OSM cached data
            const osmRes = await fetch('/api/osm');
            this.osmData = await osmRes.json();

            // 3. Fetch Crowdsourced reports
            const crowdRes = await fetch('/api/crowdsourced');
            this.crowdsourcedData = await crowdRes.json();

            // 4. Fetch Major Projects data
            try {
                let projRes = await fetch('/api/major-projects');
                if (!projRes.ok) projRes = await fetch('major_projects.json');
                const projJson = await projRes.json();
                this.majorProjectsData = projJson.projects || [];
            } catch (e) {
                console.warn("[Intel Engine] Could not load major_projects.json", e);
            }

            // 5. Fetch Agriculture data
            try {
                let agriRes = await fetch('/api/agriculture');
                if (!agriRes.ok) agriRes = await fetch('data/agriculture_data.json');
                const agriJson = await agriRes.json();
                this.agricultureData = agriJson.districts || {};
            } catch (e) {
                console.warn("[Intel Engine] Could not load agriculture_data.json", e);
            }

            // 6. Calculate scores
            this.calculateAllScores();
            this.isLoaded = true;
            console.log("[Intel Engine] Successfully loaded data and calculated scores.");
        } catch (error) {
            console.error("[Intel Engine] Error initializing RwandaConstructionIntel:", error);
        }
    },

    // Recalculates construction scores for all districts
    calculateAllScores() {
        const osmElements = this.osmData.elements || [];
        const elementsById = {};
        osmElements.forEach(el => {
            elementsById[el.id] = el;
        });

        // Loop over the districts in our baseline and recompute scoring profiles
        for (const distName in this.baselineData) {
            const baseline = this.baselineData[distName];
            const coords = DISTRICT_COORDINATES[distName];
            
            if (!coords) {
                // Fallback to baseline mapping
                this.calculatedScores[distName] = {
                    developmentReadiness: baseline.land,
                    supplyChainEfficiency: baseline.capital,
                    laborAvailability: baseline.labor,
                    investmentAttractiveness: baseline.entrepreneurship,
                    opportunityGap: 50,
                    composite: baseline.composite_score
                };
                continue;
            }

            const lat = coords.lat;
            const lng = coords.lng;

            // Distance search buffers
            let tvetDist = 999;
            let powerDist = 999;
            let waterDist = 999;
            let warehouseDist = 999;
            let quarryDist = 999;
            let sezDist = 999;

            let hardwareCount10k = 0;
            let constructionCount15k = 0;
            let bankCount5k = 0;

            osmElements.forEach(el => {
                const elCoords = getElementCoords(el, elementsById);
                if (!elCoords) return;

                const dist = getDistanceKm(lat, lng, elCoords.lat, elCoords.lng);
                const tags = el.tags || {};

                // TVET & technical schools
                if (tags.amenity === 'school' && 
                    (tags['school:type'] === 'technical' || 
                     (tags.name && (tags.name.toLowerCase().includes('tvet') || 
                                    tags.name.toLowerCase().includes('technical') || 
                                    tags.name.toLowerCase().includes('vocational') || 
                                    tags.name.toLowerCase().includes('institute'))))) {
                    if (dist < tvetDist) tvetDist = dist;
                }

                // Power substations
                if (tags.power === 'substation') {
                    if (dist < powerDist) powerDist = dist;
                }

                // Water points / treatment
                if (tags.man_made === 'water_works' || tags.landuse === 'reservoir') {
                    if (dist < waterDist) waterDist = dist;
                }

                // Warehouses
                if (tags.building === 'warehouse') {
                    if (dist < warehouseDist) warehouseDist = dist;
                }

                // Quarries/mines
                if (tags.landuse === 'quarry' || tags.resource === 'volcanic_stone' || tags.resource === 'clay_bricks') {
                    if (dist < quarryDist) quarryDist = dist;
                }

                // SEZs and industrial areas
                if (tags.landuse === 'industrial' || tags.industrial === 'special_economic_zone') {
                    if (dist < sezDist) sezDist = dist;
                }

                // Hardware stores
                if (tags.shop === 'hardware' || tags.shop === 'doityourself') {
                    if (dist <= 10) hardwareCount10k++;
                }

                // Ongoing construction
                if (tags.landuse === 'construction' || tags.building === 'construction') {
                    if (dist <= 15) constructionCount15k++;
                }

                // Banks and financial services
                if (tags.amenity === 'bank' || tags.amenity === 'atm') {
                    if (dist <= 5) bankCount5k++;
                }
            });

            // Process user crowdsourced reports for this district
            const districtReports = this.crowdsourcedData.filter(rep => {
                const dist = getDistanceKm(lat, lng, rep.lat, rep.lng);
                return dist <= 15;
            });

            const activeBottlenecks = districtReports.filter(rep => rep.type === 'bottleneck').length;
            const activeProjects = districtReports.filter(rep => rep.type === 'project_report').length;
            
            // ----------------------------------------------------
            // 1. Development Readiness Score (0-100)
            // ----------------------------------------------------
            let utilityScore = 100;
            if (powerDist < 999) utilityScore -= Math.min(powerDist, 15) * 3;
            else utilityScore -= 45;
            
            if (waterDist < 999) utilityScore -= Math.min(waterDist, 15) * 2;
            else utilityScore -= 30;
            
            utilityScore = Math.max(20, Math.min(100, utilityScore));
            
            // Combine with baseline land safety and zoning scores
            const readinessScore = Math.round((baseline.land * 0.6) + (utilityScore * 0.4));

            // ----------------------------------------------------
            // 2. Supply Chain Efficiency Score (0-100)
            // ----------------------------------------------------
            let supplyScore = 0;
            // 8 pts per hardware shop within 10km (max 40 pts)
            supplyScore += Math.min(hardwareCount10k * 8, 40);
            
            // Proximity to warehouse
            if (warehouseDist <= 5) supplyScore += 20;
            else if (warehouseDist <= 15) supplyScore += 10;
            
            // Proximity to quarries/raw materials
            if (quarryDist <= 10) supplyScore += 20;
            else if (quarryDist <= 25) supplyScore += 10;
            
            // Base accessibility modifier from baseline capital
            supplyScore += (baseline.capital * 0.2);
            
            // Penalty for active supply chain bottlenecks
            supplyScore -= (activeBottlenecks * 15);
            
            supplyScore = Math.max(10, Math.min(100, Math.round(supplyScore)));

            // ----------------------------------------------------
            // 3. Labor Availability Score (0-100)
            // ----------------------------------------------------
            let schoolsScore = 100;
            if (tvetDist < 999) schoolsScore -= Math.min(tvetDist, 20) * 3.5;
            else schoolsScore -= 50;

            const laborScore = Math.max(15, Math.min(100, Math.round((baseline.labor * 0.6) + (schoolsScore * 0.4))));

            // ----------------------------------------------------
            // 4. Investment Attractiveness Score (0-100)
            // ----------------------------------------------------
            let investScore = 0;
            // Density of ongoing construction
            investScore += Math.min(constructionCount15k * 8, 35);
            
            // Industrial / economic zone proximity
            if (sezDist <= 8) investScore += 25;
            else if (sezDist <= 20) investScore += 15;
            
            // Financial centers
            investScore += Math.min(bankCount5k * 5, 20);
            
            // Entrepreneurship baseline
            investScore += (baseline.entrepreneurship * 0.2);
            
            // Bonus for crowdsourced new project reports
            investScore += (activeProjects * 5);

            investScore = Math.max(15, Math.min(100, Math.round(investScore)));

            // ----------------------------------------------------
            // 5. Opportunity Gap Score (0-100)
            // ----------------------------------------------------
            // Measures high development/invest potential (demand) combined with poor supply chains/labor (supply deficit)
            const demandLevel = (investScore + readinessScore) / 2;
            const supplyLevel = (supplyScore + laborScore) / 2;
            const gapScore = Math.max(5, Math.min(100, Math.round(50 + (demandLevel - supplyLevel) * 1.6)));

            this.calculatedScores[distName] = {
                developmentReadiness: readinessScore,
                supplyChainEfficiency: supplyScore,
                laborAvailability: laborScore,
                investmentAttractiveness: investScore,
                opportunityGap: gapScore,
                
                // Keep these for radar compatibility
                land: readinessScore,
                labor: laborScore,
                capital: supplyScore,
                entrepreneurship: investScore
            };
        }

        // Apply weights based on active persona to generate composite
        this.updateCompositeScores();
    },

    // Recalculates composite scores based on selected persona weights
    updateCompositeScores() {
        const weights = PERSONA_WEIGHTS[this.activePersona];
        
        for (const distName in this.calculatedScores) {
            const sc = this.calculatedScores[distName];
            
            const rawComposite = (
                sc.developmentReadiness * weights.readiness +
                sc.supplyChainEfficiency * weights.supply +
                sc.laborAvailability * weights.labor +
                sc.investmentAttractiveness * weights.invest +
                sc.opportunityGap * weights.gap
            );
            
            sc.composite = Math.round(rawComposite);
        }
    },

    // Sets active persona and updates composite scores
    setPersona(persona) {
        if (PERSONA_WEIGHTS[persona]) {
            this.activePersona = persona;
            this.updateCompositeScores();
            return true;
        }
        return false;
    },

    // Submits new crowdsourced report to python server API
    async submitCrowdsourcedReport(report) {
        try {
            const response = await fetch('/api/crowdsourced', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(report)
            });
            const data = await response.json();
            if (data.status === 'success') {
                // Update local memory
                this.crowdsourcedData.push(data.data);
                // Recalculate
                this.calculateAllScores();
                return { success: true, data: data.data };
            }
            return { success: false, message: data.message };
        } catch (e) {
            console.error("Failed to submit report:", e);
            return { success: false, message: e.message };
        }
    },

    // Refresh OSM cache from overpass API
    async refreshOsmData() {
        try {
            const response = await fetch('/api/osm/refresh', { method: 'POST' });
            const data = await response.json();
            if (data.status === 'success') {
                // Re-fetch local cache
                const osmRes = await fetch('/api/osm');
                this.osmData = await osmRes.json();
                
                this.calculateAllScores();
                return { success: true, count: data.elements_count };
            }
            return { success: false, message: data.message };
        } catch (e) {
            console.error("Failed to refresh OSM:", e);
            return { success: false, message: e.message };
        }
    }
};
