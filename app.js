// ============================================================
// RWANDA OPPORTUNITY MAP — COMPLETE APPLICATION LOGIC
// ============================================================

// ============================================================
// MAP INITIALIZATION
// ============================================================

const map = L.map('map', {
    center: [-1.94, 29.87],
    zoom: 8,
    zoomControl: false,
    fadeAnimation: true,
    attributionControl: true
});

// Dark tile layer (default)
const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; CartoDB'
});

const lightTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; CartoDB'
});

darkTile.addTo(map);

// ============================================================
// GLOBAL VARIABLES
// ============================================================

let districtLayer = null;
let districtData = {};
let agricultureData = {};
let projectsData = [];
let osmData = [];
let currentDistrictName = '';
let projectsLayer = null;
let impactLayer = null;
let radarChartInstance = null;
let isLoggedIn = false;

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

window.districtLayer = null;

// ============================================================
// COLOR FUNCTIONS
// ============================================================

function getCompositeColor(score) {
    if (score >= 80) return '#0f3b5e';
    if (score >= 70) return '#1a5a7a';
    if (score >= 60) return '#2d7a9a';
    if (score >= 50) return '#4a9aba';
    if (score >= 40) return '#7ab8d4';
    if (score >= 30) return '#aad4e8';
    return '#d4eaf5';
}

function getAgricultureColor(score) {
    if (score >= 90) return '#00441b';
    if (score >= 80) return '#006837';
    if (score >= 70) return '#31a354';
    if (score >= 60) return '#78c679';
    if (score >= 40) return '#c2e699';
    if (score >= 20) return '#fdcc8a';
    return '#fd8d3c';
}

// ============================================================
// LOAD ALL DATA
// ============================================================

async function loadAllData() {
    try {
        // Load district scores from data.json
        const scoreResponse = await fetch('data.json');
        const scores = await scoreResponse.json();
        districtData = scores;
        console.log('District data loaded:', Object.keys(districtData).length, 'districts');

        // Load agriculture data
        const agResponse = await fetch('/api/agriculture');
        const agData = await agResponse.json();
        agricultureData = agData.districts || {};
        console.log('Agriculture data loaded:', Object.keys(agricultureData).length, 'districts');

        // Load major projects
        const projResponse = await fetch('/api/major-projects');
        const projData = await projResponse.json();
        projectsData = projData.projects || [];
        console.log('Projects data loaded:', projectsData.length, 'projects');

        // Load OSM data
        try {
            const osmResponse = await fetch('/api/osm');
            const osmJson = await osmResponse.json();
            osmData = osmJson.elements || [];
            console.log('OSM data loaded:', osmData.length, 'elements');
        } catch (e) {
            console.warn('OSM data not available:', e);
            osmData = [];
        }

        // Populate dropdown
        populateDropdown();

        // Populate admin district dropdown
        populateAdminDropdown();

        // Load default district
        const districtNames = Object.keys(districtData);
        if (districtNames.length > 0) {
            const defaultDistrict = districtNames[0];
            document.getElementById('district-dropdown').value = defaultDistrict;
            updateDashboard(defaultDistrict);
        }

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ============================================================
// POPULATE DROPDOWN
// ============================================================

function populateDropdown() {
    const dropdown = document.getElementById('district-dropdown');
    if (!dropdown) return;

    const districtNames = Object.keys(districtData);
    if (districtNames.length === 0) {
        dropdown.innerHTML = '<option value="">No districts found</option>';
        return;
    }

    districtNames.sort();

    let html = '';
    districtNames.forEach(name => {
        html += `<option value="${name}">${name}</option>`;
    });

    dropdown.innerHTML = html;
    console.log('Dropdown populated with', districtNames.length, 'districts');
}

// ============================================================
// POPULATE ADMIN DROPDOWN
// ============================================================

function populateAdminDropdown() {
    const dropdown = document.getElementById('admin-osm-district');
    if (!dropdown) return;
    const districtNames = Object.keys(districtData);
    districtNames.sort();
    dropdown.innerHTML = districtNames.map(d => `<option value="${d}">${d}</option>`).join('');
}

// ============================================================
// UPDATE DASHBOARD
// ============================================================

function updateDashboard(districtName) {
    if (!districtName || !districtData[districtName]) return;

    currentDistrictName = districtName;
    const data = districtData[districtName] || {};
    const agData = agricultureData[districtName] || {};

    // Update district name in OSM section
    document.getElementById('osm-district-name').textContent = districtName;

    // Update scores
    document.getElementById('display-composite').textContent = data.composite_score || '--';
    document.getElementById('display-land').textContent = data.land || data.development_readiness || '--';
    document.getElementById('display-labor').textContent = data.labor || data.labor_availability || '--';
    document.getElementById('display-capital').textContent = data.capital || data.supply_chain || '--';
    document.getElementById('display-entrepreneurship').textContent = data.entrepreneurship || data.investment_attractiveness || '--';

    // Update OSM data for this district
    updateOsmData(districtName);

    // Update map
    zoomToDistrict(districtName);
}

// ============================================================
// UPDATE OSM DATA FOR DISTRICT (Using turf.js)
// ============================================================

function updateOsmData(districtName) {
    // Get the district polygon from the district layer
    let districtFeature = null;
    
    if (districtLayer) {
        districtLayer.eachLayer(function(layer) {
            if (layer.feature?.properties?.shapeName === districtName) {
                districtFeature = layer.feature;
            }
        });
    }

    // If we don't have a polygon, show zeros and return
    if (!districtFeature) {
        console.warn('No polygon found for district:', districtName);
        document.getElementById('osm-construction').textContent = '0';
        document.getElementById('osm-hardware').textContent = '0';
        document.getElementById('osm-commercial').textContent = '0';
        document.getElementById('osm-industrial').textContent = '0';
        document.getElementById('osm-education').textContent = '0';
        document.getElementById('osm-health').textContent = '0';
        return;
    }

    // turf.js expects the polygon in a specific format
    let polygon;
    try {
        const coords = districtFeature.geometry.coordinates;
        const polygonCoords = districtFeature.geometry.type === 'MultiPolygon' 
            ? coords[0] 
            : coords;
        polygon = turf.polygon(polygonCoords);
    } catch (e) {
        console.warn('Error creating polygon for:', districtName, e);
        return;
    }
    
    // Count OSM elements that fall inside this district
    let construction = 0;
    let hardware = 0;
    let commercial = 0;
    let industrial = 0;
    let education = 0;
    let health = 0;

    // Only process up to 10000 elements to avoid freezing the browser
    const maxElements = Math.min(osmData.length, 10000);
    let processed = 0;
    
    for (let i = 0; i < osmData.length && processed < maxElements; i++) {
        const el = osmData[i];
        if (el.lat === undefined || el.lon === undefined) continue;
        
        try {
            const point = turf.point([el.lon, el.lat]);
            
            if (turf.booleanPointInPolygon(point, polygon)) {
                processed++;
                const tags = el.tags || {};
                
                if (tags.landuse === 'construction' || tags.building === 'construction') {
                    construction++;
                }
                
                if (tags.shop === 'hardware' || tags.shop === 'doityourself') {
                    hardware++;
                }
                
                if (tags.building === 'commercial' || tags.building === 'retail' || 
                    tags.shop || tags.amenity === 'marketplace') {
                    commercial++;
                }
                
                if (tags.landuse === 'industrial' || tags.building === 'industrial' ||
                    tags.landuse === 'quarry' || tags.industrial === 'yes') {
                    industrial++;
                }
                
                if (tags.amenity === 'school' || tags.amenity === 'college' || 
                    tags.amenity === 'university' || tags.amenity === 'kindergarten' ||
                    tags.building === 'school' || tags.building === 'university') {
                    education++;
                }
                
                if (tags.amenity === 'hospital' || tags.amenity === 'clinic' || 
                    tags.amenity === 'healthcare' || tags.amenity === 'pharmacy' ||
                    tags.healthcare === 'yes' || tags.building === 'hospital') {
                    health++;
                }
            }
        } catch (e) {
            continue;
        }
    }

    document.getElementById('osm-construction').textContent = construction || 0;
    document.getElementById('osm-hardware').textContent = hardware || 0;
    document.getElementById('osm-commercial').textContent = commercial || 0;
    document.getElementById('osm-industrial').textContent = industrial || 0;
    document.getElementById('osm-education').textContent = education || 0;
    document.getElementById('osm-health').textContent = health || 0;

    console.log('OSM data for', districtName, ':', {
        construction, hardware, commercial, industrial, education, health, processed
    });
}

// ============================================================
// LOAD GEOJSON BOUNDARIES
// ============================================================

async function loadDistrictBoundaries() {
    try {
        const response = await fetch('data/rwanda-districts.geojson');
        return await response.json();
    } catch (error) {
        console.error('Error loading district boundaries:', error);
        return null;
    }
}

// ============================================================
// RENDER DISTRICT LAYER
// ============================================================

function renderDistricts(geoJsonData, showAgriculture = false) {
    if (districtLayer) {
        map.removeLayer(districtLayer);
    }

    districtLayer = L.geoJSON(geoJsonData, {
        style: function(feature) {
            const districtName = feature.properties.shapeName;
            let score = 50;

            if (showAgriculture && agricultureData && agricultureData[districtName]) {
                score = agricultureData[districtName].crop_production_intensity || 50;
                return {
                    fillColor: getAgricultureColor(score),
                    fillOpacity: 0.8,
                    color: '#333',
                    weight: 1
                };
            }

            if (districtData && districtData[districtName]) {
                score = districtData[districtName].composite_score || 50;
            }

            return {
                fillColor: getCompositeColor(score),
                fillOpacity: 0.7,
                color: '#333',
                weight: 1
            };
        },
        onEachFeature: function(feature, layer) {
            const districtName = feature.properties.shapeName;
            const data = districtData[districtName] || {};
            const agData = agricultureData[districtName] || {};

            let popupContent = `
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 220px;">
                    <h4 style="margin: 0 0 8px 0; color: #1a73e8; font-size: 16px;">${districtName}</h4>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Composite Score:</strong> ${data.composite_score || 'N/A'}</p>
            `;

            if (agData.crop_production_intensity) {
                popupContent += `
                    <hr style="border-color: rgba(255,255,255,0.1); margin: 6px 0;">
                    <p style="margin: 4px 0; font-size: 13px; color: #4ade80;"><strong>🌾 Agriculture Intensity:</strong> ${agData.crop_production_intensity}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>Level:</strong> ${agData.crop_intensity_level || 'N/A'}</p>
                    ${agData.major_crops ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Major Crops:</strong> ${agData.major_crops.join(', ')}</p>` : ''}
                    ${agData.top_crop ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Top Crop:</strong> ${agData.top_crop}</p>` : ''}
                    ${agData.seasonal_yield_mt ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Seasonal Yield:</strong> ${agData.seasonal_yield_mt} MT</p>` : ''}
                `;
            }

            popupContent += `</div>`;
            layer.bindPopup(popupContent);

            layer.on('click', function() {
                currentDistrictName = districtName;
                showDistrictDetails(districtName);
            });
        }
    }).addTo(map);

    window.districtLayer = districtLayer;
    console.log('Districts rendered, agriculture mode:', showAgriculture);
}

// ============================================================
// ZOOM TO DISTRICT
// ============================================================

function zoomToDistrict(districtName) {
    if (!districtLayer) {
        console.warn('District layer not loaded yet');
        return;
    }

    let targetFeature = null;
    districtLayer.eachLayer(function(layer) {
        if (layer.feature?.properties?.shapeName === districtName) {
            targetFeature = layer;
        }
    });

    if (targetFeature) {
        districtLayer.eachLayer(function(layer) {
            const name = layer.feature?.properties?.shapeName;
            const data = districtData[name] || {};
            const score = data.composite_score || 50;
            layer.setStyle({
                weight: 1,
                color: '#333',
                fillColor: getCompositeColor(score),
                fillOpacity: 0.7
            });
        });

        targetFeature.setStyle({
            weight: 4,
            color: '#ffffff',
            fillColor: '#8b5cf6',
            fillOpacity: 0.6
        });

        const bounds = targetFeature.getBounds();
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// ============================================================
// SHOW DISTRICT DETAILS (Page 2)
// ============================================================

function showDistrictDetails(districtName) {
    const data = districtData[districtName] || {};
    const agData = agricultureData[districtName] || {};
    currentDistrictName = districtName;

    document.getElementById('details-region-name').textContent = districtName;
    document.getElementById('details-breadcrumb-region').textContent = districtName;
    document.getElementById('details-region-score').textContent = data.composite_score || '--';

    const readiness = data.development_readiness || data.land || 50;
    const supply = data.supply_chain || data.capital || 50;
    const labor = data.labor_availability || data.labor || 50;
    const investment = data.investment_attractiveness || data.entrepreneurship || 50;
    const gap = data.opportunity_gap || 50;

    document.getElementById('details-bar-val-readiness').textContent = readiness + '%';
    document.getElementById('details-bar-fill-readiness').style.width = readiness + '%';
    document.getElementById('details-bar-val-supply').textContent = supply + '%';
    document.getElementById('details-bar-fill-supply').style.width = supply + '%';
    document.getElementById('details-bar-val-labor').textContent = labor + '%';
    document.getElementById('details-bar-fill-labor').style.width = labor + '%';
    document.getElementById('details-bar-val-investment').textContent = investment + '%';
    document.getElementById('details-bar-fill-investment').style.width = investment + '%';
    document.getElementById('details-bar-val-gap').textContent = gap + '%';
    document.getElementById('details-bar-fill-gap').style.width = gap + '%';

    document.getElementById('details-agri-intensity').textContent = agData.crop_production_intensity || 'No data';
    document.getElementById('details-agri-crops').textContent = agData.major_crops ? agData.major_crops.join(', ') : 'No data';
    document.getElementById('details-agri-yield').textContent = agData.seasonal_yield_mt ? agData.seasonal_yield_mt + ' MT' : 'No data';
    document.getElementById('details-agri-irrigation').textContent = agData.irrigated_land_ha ? agData.irrigated_land_ha + ' ha' : 'No data';

    showProjectsNearDistrict(districtName);

    document.getElementById('app-wrapper').classList.add('mode-details');
    document.getElementById('page-details').style.display = 'flex';

    generateRadarChart(districtName);
}

// ============================================================
// SHOW PROJECTS NEAR DISTRICT
// ============================================================

function showProjectsNearDistrict(districtName) {
    const container = document.getElementById('details-projects-list');
    if (!container) return;

    const nearby = projectsData.filter(p => {
        return p.location && p.location.toLowerCase().includes(districtName.toLowerCase());
    });

    if (nearby.length === 0) {
        container.innerHTML = `<span style="color:#94a3b8; font-size:0.75rem;">No major projects found in ${districtName}.</span>`;
        return;
    }

    container.innerHTML = nearby.map(p => `
        <div style="padding: 8px 10px; margin-bottom: 6px; background: rgba(168, 85, 247, 0.08); border-radius: 8px;">
            <div style="color: #e2e8f0; font-weight: 600; font-size: 0.8rem;">${p.name}</div>
            <div style="color: #94a3b8; font-size: 0.7rem;">${p.type} | ${p.status} | Cost: ${p.cost}</div>
        </div>
    `).join('');
}

// ============================================================
// RADAR CHART
// ============================================================

function generateRadarChart(districtName) {
    const data = districtData[districtName] || {};
    const canvas = document.getElementById('details-factorRadarChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (radarChartInstance) {
        radarChartInstance.destroy();
    }

    const values = [
        data.development_readiness || data.land || 50,
        data.supply_chain || data.capital || 50,
        data.labor_availability || data.labor || 50,
        data.investment_attractiveness || data.entrepreneurship || 50,
        data.opportunity_gap || 50
    ];

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Readiness', 'Supply', 'Labor', 'Investment', 'Opportunity Gap'],
            datasets: [{
                label: districtName,
                data: values,
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderColor: '#8b5cf6',
                borderWidth: 2,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 25, color: '#94a3b8', backdropColor: 'transparent' },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    angleLines: { color: 'rgba(255,255,255,0.06)' },
                    pointLabels: { color: '#e2e8f0', font: { size: 9 } }
                }
            }
        }
    });
}

// ============================================================
// PROJECTS LAYER (on map)
// ============================================================

function createProjectsLayer() {
    if (projectsLayer) {
        map.removeLayer(projectsLayer);
    }

    if (!projectsData || projectsData.length === 0) {
        console.warn('No projects data available');
        return;
    }

    projectsLayer = L.layerGroup();

    projectsData.forEach(project => {
        if (!project.lat || !project.lng) return;

        const marker = L.marker([project.lat, project.lng], {
            icon: L.divIcon({
                className: 'project-marker',
                html: '🚀',
                iconSize: [32, 32]
            })
        });

        const popupContent = `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 200px;">
                <h4 style="margin: 0 0 6px 0; color: #c084fc; font-size: 15px;">${project.name}</h4>
                <p style="margin: 3px 0; font-size: 12px; color: #94a3b8;"><strong>Type:</strong> ${project.type}</p>
                <p style="margin: 3px 0; font-size: 12px; color: #94a3b8;"><strong>Status:</strong> ${project.status}</p>
                <p style="margin: 3px 0; font-size: 12px; color: #94a3b8;"><strong>Cost:</strong> ${project.cost}</p>
                <p style="margin: 3px 0; font-size: 12px; color: #94a3b8;"><strong>Expected:</strong> ${project.expected_completion || 'N/A'}</p>
                <p style="margin: 3px 0; font-size: 12px; color: #94a3b8;"><strong>Location:</strong> ${project.location}</p>
            </div>
        `;
        marker.bindPopup(popupContent);
        projectsLayer.addLayer(marker);
    });

    projectsLayer.addTo(map);
    console.log('Projects layer created with', projectsData.length, 'projects');
}

function createImpactZones() {
    if (impactLayer) {
        map.removeLayer(impactLayer);
    }

    impactLayer = L.layerGroup();

    projectsData.forEach(project => {
        if (!project.lat || !project.lng) return;

        const circle10 = L.circle([project.lat, project.lng], {
            radius: 10000,
            color: '#ff4444',
            fillColor: '#ff4444',
            fillOpacity: 0.08,
            weight: 2
        });
        circle10.bindPopup(`${project.name} — 10km Impact Zone`);
        impactLayer.addLayer(circle10);

        const circle25 = L.circle([project.lat, project.lng], {
            radius: 25000,
            color: '#ff8800',
            fillColor: '#ff8800',
            fillOpacity: 0.05,
            weight: 1.5
        });
        circle25.bindPopup(`${project.name} — 25km Impact Zone`);
        impactLayer.addLayer(circle25);

        const circle50 = L.circle([project.lat, project.lng], {
            radius: 50000,
            color: '#ffcc00',
            fillColor: '#ffcc00',
            fillOpacity: 0.03,
            weight: 1
        });
        circle50.bindPopup(`${project.name} — 50km Impact Zone`);
        impactLayer.addLayer(circle50);
    });

    impactLayer.addTo(map);
    console.log('Impact zones created for', projectsData.length, 'projects');
}

// ============================================================
// NAVIGATION
// ============================================================

function goBackToOverview() {
    document.getElementById('app-wrapper').className = 'app-container';
    document.getElementById('page-details').style.display = 'none';
}

function showDetailsPage() {
    if (!currentDistrictName) {
        const dropdown = document.getElementById('district-dropdown');
        if (dropdown && dropdown.value) {
            currentDistrictName = dropdown.value;
        } else {
            alert('Please select a district first.');
            return;
        }
    }
    showDistrictDetails(currentDistrictName);
}

// ============================================================
// LOGIN / ADMIN FUNCTIONS
// ============================================================

function showLoginModal() {
    document.getElementById('login-modal').classList.add('show');
    document.getElementById('login-error').style.display = 'none';
}

function hideLoginModal() {
    document.getElementById('login-modal').classList.remove('show');
}

function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        isLoggedIn = true;
        hideLoginModal();
        const loginBtn = document.getElementById('btn-login');
        loginBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Admin';
        loginBtn.classList.add('logged-in');
        document.getElementById('btn-admin-panel').classList.add('visible');
        document.getElementById('login-error').style.display = 'none';
        // Clear fields
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function showAdminPanel() {
    document.getElementById('app-wrapper').className = 'app-container mode-admin';
    document.getElementById('page-admin').style.display = 'flex';
    populateAdminDropdown();
}

function hideAdminPanel() {
    document.getElementById('app-wrapper').className = 'app-container';
    document.getElementById('page-admin').style.display = 'none';
}

// ============================================================
// ADMIN: ADD MAJOR PROJECT
// ============================================================

async function addMajorProject() {
    const name = document.getElementById('admin-project-name').value.trim();
    const type = document.getElementById('admin-project-type').value.trim();
    const location = document.getElementById('admin-project-location').value.trim();
    const lat = parseFloat(document.getElementById('admin-project-lat').value);
    const lng = parseFloat(document.getElementById('admin-project-lng').value);
    const cost = document.getElementById('admin-project-cost').value.trim();
    const status = document.getElementById('admin-project-status').value;
    const desc = document.getElementById('admin-project-desc').value.trim();

    if (!name || !type || !location || isNaN(lat) || isNaN(lng)) {
        document.getElementById('admin-project-status-msg').textContent = '❌ Please fill in all required fields.';
        document.getElementById('admin-project-status-msg').style.color = '#f87171';
        return;
    }

    const newProject = {
        name,
        type,
        location,
        lat,
        lng,
        status,
        cost: cost || 'N/A',
        expected_completion: '2027',
        source: 'Admin added'
    };

    try {
        const response = await fetch('/api/major-projects/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProject)
        });
        const result = await response.json();
        if (result.status === 'success') {
            document.getElementById('admin-project-status-msg').textContent = '✅ Project added successfully!';
            document.getElementById('admin-project-status-msg').style.color = '#4ade80';
            document.getElementById('admin-project-name').value = '';
            document.getElementById('admin-project-type').value = '';
            document.getElementById('admin-project-location').value = '';
            document.getElementById('admin-project-lat').value = '';
            document.getElementById('admin-project-lng').value = '';
            document.getElementById('admin-project-cost').value = '';
            document.getElementById('admin-project-desc').value = '';
            // Reload projects
            await loadAllData();
            setTimeout(createProjectsLayer, 500);
        } else {
            document.getElementById('admin-project-status-msg').textContent = '❌ Error: ' + result.message;
            document.getElementById('admin-project-status-msg').style.color = '#f87171';
        }
    } catch (e) {
        document.getElementById('admin-project-status-msg').textContent = '❌ Network error: ' + e.message;
        document.getElementById('admin-project-status-msg').style.color = '#f87171';
    }
}

// ============================================================
// ADMIN: ADD OSM ELEMENT
// ============================================================

async function addOsmElement() {
    const type = document.getElementById('admin-osm-type').value;
    const district = document.getElementById('admin-osm-district').value;

    if (!district) {
        document.getElementById('admin-osm-status-msg').textContent = '❌ Please select a district.';
        document.getElementById('admin-osm-status-msg').style.color = '#f87171';
        return;
    }

    let lat = -1.94, lng = 29.87;
    if (districtLayer) {
        let targetFeature = null;
        districtLayer.eachLayer(function(layer) {
            if (layer.feature?.properties?.shapeName === district) {
                targetFeature = layer;
            }
        });
        if (targetFeature) {
            const bounds = targetFeature.getBounds();
            const center = bounds.getCenter();
            lat = center.lat + (Math.random() - 0.5) * 0.05;
            lng = center.lng + (Math.random() - 0.5) * 0.05;
        }
    }

    const tags = {};
    switch(type) {
        case 'construction': tags.landuse = 'construction'; break;
        case 'hardware': tags.shop = 'hardware'; break;
        case 'school': tags.amenity = 'school'; break;
        case 'hospital': tags.amenity = 'hospital'; break;
        case 'commercial': tags.building = 'commercial'; break;
    }

    const newElement = {
        type: 'node',
        lat,
        lon: lng,
        tags: tags
    };

    try {
        const response = await fetch('/api/osm/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newElement)
        });
        const result = await response.json();
        if (result.status === 'success') {
            document.getElementById('admin-osm-status-msg').textContent = '✅ OSM element added successfully!';
            document.getElementById('admin-osm-status-msg').style.color = '#4ade80';
            const osmResponse = await fetch('/api/osm');
            const osmJson = await osmResponse.json();
            osmData = osmJson.elements || [];
            const currentDistrict = document.getElementById('district-dropdown').value;
            if (currentDistrict) {
                updateDashboard(currentDistrict);
            }
        } else {
            document.getElementById('admin-osm-status-msg').textContent = '❌ Error: ' + result.message;
            document.getElementById('admin-osm-status-msg').style.color = '#f87171';
        }
    } catch (e) {
        document.getElementById('admin-osm-status-msg').textContent = '❌ Network error: ' + e.message;
        document.getElementById('admin-osm-status-msg').style.color = '#f87171';
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

// District dropdown change
document.getElementById('district-dropdown').addEventListener('change', function() {
    const district = this.value;
    if (district && districtData[district]) {
        updateDashboard(district);
        currentDistrictName = district;
    }
});

// View Details button
document.getElementById('btn-view-details').addEventListener('click', showDetailsPage);

// Back button
document.getElementById('btn-back-to-overview').addEventListener('click', goBackToOverview);

// Login
document.getElementById('btn-login').addEventListener('click', showLoginModal);
document.getElementById('login-close').addEventListener('click', hideLoginModal);
document.getElementById('login-btn').addEventListener('click', handleLogin);
document.getElementById('login-password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleLogin();
});
document.getElementById('login-username').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleLogin();
});

// Admin
document.getElementById('btn-admin-panel').addEventListener('click', showAdminPanel);
document.getElementById('btn-admin-back').addEventListener('click', hideAdminPanel);
document.getElementById('admin-submit-project').addEventListener('click', addMajorProject);
document.getElementById('admin-submit-osm').addEventListener('click', addOsmElement);

// Theme toggle
const darkBtn = document.getElementById('tile-dark');
const lightBtn = document.getElementById('tile-light');

if (darkBtn && lightBtn) {
    darkBtn.addEventListener('click', function() {
        this.classList.add('active');
        lightBtn.classList.remove('active');
        map.removeLayer(lightTile);
        darkTile.addTo(map);
    });

    lightBtn.addEventListener('click', function() {
        this.classList.add('active');
        darkBtn.classList.remove('active');
        map.removeLayer(darkTile);
        lightTile.addTo(map);
    });
}

// ============================================================
// INITIALIZE
// ============================================================

async function init() {
    console.log('Initializing Rwanda Opportunity Map...');

    await loadAllData();

    const geoJson = await loadDistrictBoundaries();
    if (geoJson) {
        renderDistricts(geoJson, false);
    }

    createProjectsLayer();
    createImpactZones();

    console.log('Map initialized successfully');
    console.log('Select a district from the dropdown to explore.');
    console.log('Login with admin / admin123 to access the Admin Panel.');
}

// Start the app
init();