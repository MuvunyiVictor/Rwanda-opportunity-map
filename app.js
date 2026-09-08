// ==========================================================================
// Rwanda Opportunity Map - Investment Intelligence Platform
// UNIFIED METHODOLOGY FOR ALL 5 SECTORS
// ==========================================================================
// HOUSING: Total Need (Population / HH Size) - DDS Planned Units (Land ha × 50)
// JOBS: Total Need (Population × Employment Rate) - DDS Planned Jobs
// INVESTMENT: Total Need (Score-based) - DDS Planned Investment
// INDUSTRY: Total Need (Score-based) - DDS Planned Zones
// AGRICULTURE: Land Utilization Gap (85% Target - Current Intensity)
// ==========================================================================

// ==========================================================================
// DOM REFS
// ==========================================================================
const $ = (id) => document.getElementById(id);

const districtDropdown = $('district-dropdown');
const analyticsDistrictDropdown = $('analytics-district-dropdown');
const btnViewDetails = $('btn-view-details');
const btnBackToOverview = $('btn-back-to-overview');
const btnAdminPanel = $('btn-admin-panel');
const btnAdminBack = $('btn-admin-back');
const btnLogin = $('btn-login');
const loginModal = $('login-modal');
const loginClose = $('login-close');
const loginBtn = $('login-btn');
const loginUsername = $('login-username');
const loginPassword = $('login-password');
const loginError = $('login-error');
const appWrapper = $('app-wrapper');
const detailsRegionName = $('details-region-name');
const detailsBreadcrumbRegion = $('details-breadcrumb-region');
const detailsRegionScore = $('details-region-score');
const detailsAgriIntensity = $('details-agri-intensity');
const detailsAgriCrops = $('details-agri-crops');
const detailsAgriYield = $('details-agri-yield');
const detailsAgriIrrigation = $('details-agri-irrigation');
const detailsProjectsList = $('details-projects-list');

// ==========================================================================
// GLOBAL STATE
// ==========================================================================
const state = {
    districts: [],
    districtData: {},
    calculatedDistrictData: {},
    curatedInfra: {},
    districtNeighbors: {},
    osmData: { elements: [] },
    agricultureData: { districts: {} },
    majorProjects: { projects: [] },
    curatedNews: [],
    schoolsDirectory: { schools: [] },
    landCenterData: { districts: {} },
    currentDistrict: 'Gasabo',
    activeStrategicFilter: null,
    map: null,
    geoJsonLayer: null,
    labelLayer: null,
    anchorLayer: null,
    districtGeoJson: null,
    isLoggedIn: false,
    assets: [],
    currentTileLayer: null,
    strategicDocuments: [],
    gapAnalysis: null,
    lastUpdated: null,
    fallbackData: {}
};

// ==========================================================================
// STRATEGIC LABELS - 5 sectors
// ==========================================================================
const STRATEGIC_LABELS = {
    housing: { label: 'Housing', icon: '🏠', color: '#4C6EF5', unit: 'units' },
    jobs: { label: 'Jobs', icon: '💼', color: '#10b981', unit: 'jobs' },
    investment: { label: 'Investment', icon: '💰', color: '#f59e0b', unit: 'USD' },
    industry: { label: 'Industry', icon: '🏭', color: '#8b5cf6', unit: 'zones' },
    agriculture: { label: 'Agriculture', icon: '🌾', color: '#ec4899', unit: '%' }
};

// ==========================================================================
// PROGRAM WEIGHTS
// ==========================================================================
const PROGRAM_WEIGHTS = {
    'Agriculture': { land: 8, labor: 2, capital: 0, entrepreneurship: 1 },
    'Construction': { land: 6, labor: 4, capital: 0, entrepreneurship: 1 },
    'ICT & Tech': { land: 1, labor: 3, capital: 2, entrepreneurship: 5 },
    'Business & Commerce': { land: 0, labor: 2, capital: 4, entrepreneurship: 5 },
    'Health Sciences': { land: 1, labor: 6, capital: 1, entrepreneurship: 2 },
    'Hospitality & Tourism': { land: 2, labor: 4, capital: 2, entrepreneurship: 3 },
    'Teacher Training': { land: 0, labor: 8, capital: 0, entrepreneurship: 2 },
    'General Secondary': { land: 2, labor: 5, capital: 1, entrepreneurship: 2 }
};

// ==========================================================================
// COLOR HELPERS
// ==========================================================================
function getColorForDistrict(name) {
    if (['Nyarugenge', 'Gasabo', 'Kicukiro'].includes(name)) return '#4C6EF5';
    if (['Musanze', 'Burera', 'Gicumbi', 'Rulindo', 'Gakenke'].includes(name)) return '#37B24D';
    if (['Nyanza', 'Gisagara', 'Nyaruguru', 'Huye', 'Nyamagabe', 'Ruhango', 'Muhanga', 'Kamonyi'].includes(name)) return '#F59F00';
    if (['Rwamagana', 'Nyagatare', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Bugesera'].includes(name)) return '#E64980';
    if (['Karongi', 'Rutsiro', 'Rubavu', 'Nyabihu', 'Ngororero', 'Rusizi', 'Nyamasheke'].includes(name)) return '#7048E8';
    return '#6B7280';
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

// ==========================================================================
// FALLBACK DATA GENERATOR
// ==========================================================================
function generateFallbackData() {
    console.log('🔄 Generating fallback data...');
    const districts = [
        'Gasabo', 'Kicukiro', 'Nyarugenge', 'Musanze', 'Burera', 'Gicumbi',
        'Rulindo', 'Gakenke', 'Nyanza', 'Gisagara', 'Nyaruguru', 'Huye',
        'Nyamagabe', 'Ruhango', 'Muhanga', 'Kamonyi', 'Rwamagana', 'Nyagatare',
        'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Bugesera', 'Karongi',
        'Rutsiro', 'Rubavu', 'Nyabihu', 'Ngororero', 'Rusizi', 'Nyamasheke'
    ];
    state.fallbackData = {};
    districts.forEach(d => {
        state.fallbackData[d] = {
            housing: { current: 50000, target: 80000, gap: 30000, gapPercentage: 37.5 },
            jobs: { current: 25000, target: 40000, gap: 15000, gapPercentage: 37.5 },
            investment: { current: 100000000, target: 200000000, gap: 100000000, gapPercentage: 50 },
            industry: { current: 2, target: 4, gap: 2, gapPercentage: 50 },
            agriculture: { current: 45, target: 80, gap: 35, gapPercentage: 43.75 }
        };
    });
    return state.fallbackData;
}

// ==========================================================================
// INIT
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Rwanda Opportunity Map initializing...');
    generateFallbackData();
    setupEventListeners();
    setupMap();
    setupTileToggle();
    setupAnalyticsTabs();
    setupStrategicListeners();
    setupDocFilters();
    setupMethodologyToggle();
    setupIngestionStatus();
    loadData();
});

// ==========================================================================
// INGESTION STATUS
// ==========================================================================
function setupIngestionStatus() {
    setInterval(updateIngestionStatus, 10000);
    updateIngestionStatus();
}

function updateIngestionStatus() {
    const dot = $('ingestion-dot');
    const text = $('ingestion-status-text');
    const count = $('ingestion-count');
    if (!dot || !text || !count) return;
    const status = typeof AutoIngestion !== 'undefined' ? AutoIngestion.getStatus() : null;
    if (status && status.isRunning) {
        dot.className = '';
        dot.style.background = '#10b981';
        text.textContent = 'Auto-Ingestion: Active';
        count.textContent = status.totalIngested || 0;
    } else if (status && !status.isRunning) {
        dot.className = 'inactive';
        dot.style.background = '#ef4444';
        text.textContent = 'Auto-Ingestion: Idle';
        count.textContent = status.totalIngested || 0;
    } else {
        dot.className = 'inactive';
        dot.style.background = '#6b7280';
        text.textContent = 'Auto-Ingestion: Loading...';
        count.textContent = '--';
    }
}

// ==========================================================================
// METHODOLOGY TOGGLE
// ==========================================================================
function setupMethodologyToggle() {
    const toggle = $('methodology-toggle');
    const content = $('methodology-content');
    const icon = $('methodology-icon');
    if (toggle && content && icon) {
        toggle.addEventListener('click', () => {
            if (content.style.display === 'none' || content.style.display === '') {
                content.style.display = 'block';
                icon.textContent = '▲';
            } else {
                content.style.display = 'none';
                icon.textContent = '▼';
            }
        });
    }
    const scoringToggle = $('scoring-toggle');
    const scoringContent = $('scoring-content');
    const scoringIcon = $('scoring-icon');
    if (scoringToggle && scoringContent && scoringIcon) {
        scoringToggle.addEventListener('click', () => {
            if (scoringContent.style.display === 'none' || scoringContent.style.display === '') {
                scoringContent.style.display = 'block';
                scoringIcon.textContent = '▲';
            } else {
                scoringContent.style.display = 'none';
                scoringIcon.textContent = '▼';
            }
        });
    }
}

// ==========================================================================
// DATA LOADING
// ==========================================================================
async function loadData() {
    try {
        console.log('Loading base dataset...');
        const distRes = await fetch('data.json');
        if (distRes.ok) {
            state.districtData = await distRes.json();
            state.districts = Object.keys(state.districtData);
        } else {
            state.districts = Object.keys(state.fallbackData);
            state.districtData = {};
            state.districts.forEach(d => {
                state.districtData[d] = { land: 50, labor: 50, capital: 50, entrepreneurship: 50, composite_score: 50 };
            });
        }
        populateDistrictDropdowns();
        recalculateDynamicDistrictScores();
        if (state.districts.length > 0) {
            selectDistrict(state.districts[0]);
        }
        loadSecondaryDatasets();
    } catch (err) {
        console.error('Failed to load base dataset:', err);
        state.districts = Object.keys(state.fallbackData);
        state.districtData = {};
        state.districts.forEach(d => {
            state.districtData[d] = { land: 50, labor: 50, capital: 50, entrepreneurship: 50, composite_score: 50 };
        });
        populateDistrictDropdowns();
        recalculateDynamicDistrictScores();
        if (state.districts.length > 0) selectDistrict(state.districts[0]);
    }
}

async function loadSecondaryDatasets() {
    try {
        const [infraRes, neighRes, agRes, projRes, osmRes, schRes, lcRes, docRes, gapRes] = await Promise.allSettled([
            fetch('data/district_infra_curated.json').then(r => r.json()).catch(() => ({})),
            fetch('data/district_neighbors.json').then(r => r.json()).catch(() => ({})),
            fetch('data/agriculture_data.json').then(r => r.json()).catch(() => ({ districts: {} })),
            fetch('major_projects.json').then(r => r.json()).catch(() => ({ projects: [] })),
            fetch('data/osm_cache.json').then(r => r.json()).catch(() => ({ elements: [] })),
            fetch('data/schools_directory.json').then(r => r.json()).catch(() => ({ schools: [] })),
            fetch('data/land_center_data.json').then(r => r.json()).catch(() => ({ districts: {} })),
            fetch('strategic_documents.json').then(r => r.json()).catch(() => ({ documents: [] })),
            fetch('district_gap_analysis.json').then(r => r.json()).catch(() => ({ districts: {} }))
        ]);

        if (infraRes.status === 'fulfilled') state.curatedInfra = infraRes.value || {};
        if (neighRes.status === 'fulfilled') state.districtNeighbors = neighRes.value || {};
        if (agRes.status === 'fulfilled') state.agricultureData = agRes.value || { districts: {} };
        if (projRes.status === 'fulfilled') state.majorProjects = projRes.value || { projects: [] };
        if (osmRes.status === 'fulfilled') state.osmData = osmRes.value || { elements: [] };
        if (schRes.status === 'fulfilled') state.schoolsDirectory = schRes.value || { schools: [] };
        if (lcRes.status === 'fulfilled') state.landCenterData = lcRes.value || { districts: {} };
        if (docRes.status === 'fulfilled') {
            state.strategicDocuments = docRes.value.documents || [];
            renderStrategicDocuments();
        }
        if (gapRes.status === 'fulfilled') {
            state.gapAnalysis = gapRes.value || { districts: {} };
            console.log('✅ Gap analysis loaded');
        }

        await loadAssets();
        await loadCuratedNews();

        recalculateDynamicDistrictScores();
        addStrategicAnchorMarkers();
        updateStrategicCounts();

        if (state.currentDistrict) selectDistrict(state.currentDistrict);
    } catch (err) {
        console.error('Error loading secondary datasets:', err);
    }
}

async function loadAssets() {
    try {
        const res = await fetch('data/assets.json');
        state.assets = (res.ok) ? (await res.json()).assets || [] : [];
    } catch { state.assets = []; }
    renderAdminAssetLists();
}

async function loadCuratedNews() {
    try {
        const res = await fetch('data/curated_news.json');
        state.curatedNews = (res.ok) ? (await res.json()).curated_news || [] : [];
    } catch { state.curatedNews = []; }
}

// ==========================================================================
// STRATEGIC DOCUMENTS
// ==========================================================================
let currentDocFilter = 'all';

function renderStrategicDocuments() {
    const container = $('strategic-documents-list');
    if (!container) return;
    let filtered = state.strategicDocuments || [];
    if (currentDocFilter !== 'all') filtered = filtered.filter(doc => doc.level === currentDocFilter);
    if (filtered.length === 0) {
        container.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">No documents found.</span>';
        return;
    }
    container.innerHTML = filtered.map(doc => `
        <div class="doc-item" onclick="showDocumentDetail('${doc.id}')">
            <div>
                <div style="font-weight:600; color:#e2e8f0; font-size:0.8rem;">${doc.title}</div>
                <div style="font-size:0.65rem; color:#94a3b8;">${doc.level} • ${doc.type} • ${doc.districts ? doc.districts.join(', ') : 'All'}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.6rem; background:${doc.confidence === 'High' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}; color:${doc.confidence === 'High' ? '#10b981' : '#f59e0b'}; padding:1px 8px; border-radius:10px;">${doc.confidence}</span>
                <span style="font-size:0.6rem; color:#64748b;">${(doc.targets || []).length} targets</span>
                <span style="font-size:0.7rem; color:#4C6EF5;">→</span>
            </div>
        </div>
    `).join('');
}

function showDocumentDetail(docId) {
    const doc = state.strategicDocuments.find(d => d.id === docId);
    if (!doc) return;
    const detailView = $('document-detail-view');
    if (!detailView) return;
    detailView.style.display = 'block';
    $('doc-detail-title').textContent = doc.title;
    $('doc-detail-level').textContent = doc.level;
    $('doc-detail-type').textContent = doc.type;
    $('doc-detail-districts').textContent = doc.districts ? doc.districts.join(', ') : 'All';
    $('doc-detail-source').textContent = doc.source;
    $('doc-detail-published').textContent = doc.published_at || '--';
    $('doc-detail-verified').textContent = doc.last_verified || '--';
    $('doc-detail-notes-text').textContent = doc.notes || '--';
    
    const urlEl = $('doc-detail-url');
    if (doc.url && doc.url !== '') {
        urlEl.innerHTML = `<a href="${doc.url}" target="_blank" style="color:#4C6EF5; text-decoration:underline;">🔗 View Source</a>`;
    } else { urlEl.innerHTML = ''; }
    
    const targetsContainer = $('doc-detail-targets');
    const targets = doc.targets || [];
    if (targets.length === 0) {
        targetsContainer.innerHTML = '<span style="color:#94a3b8; font-size:0.75rem;">No targets defined.</span>';
    } else {
        targetsContainer.innerHTML = `
            <div style="font-size:0.7rem; font-weight:600; color:#e2e8f0; margin-bottom:6px;">🎯 Targets (${targets.length})</div>
            ${targets.map(t => `
                <div style="background:rgba(255,255,255,0.03); border-radius:6px; padding:6px 8px; margin-bottom:4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; color:#e2e8f0;">${t.description}</span>
                        <span style="font-size:0.7rem; font-weight:700; color:#4C6EF5;">${t.target_value} ${t.unit || ''}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:#94a3b8;">
                        <span>Baseline: ${t.baseline || '--'}</span>
                        <span>Target: ${t.target_year || '--'}</span>
                        <span>Progress: ${t.progress || '0%'}</span>
                    </div>
                </div>
            `).join('')}
        `;
    }
    detailView.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeDocumentDetail() {
    const detailView = $('document-detail-view');
    if (detailView) detailView.style.display = 'none';
}

function setupDocFilters() {
    document.querySelectorAll('.doc-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.doc-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDocFilter = this.getAttribute('data-filter');
            renderStrategicDocuments();
        });
    });
    const closeBtn = $('doc-detail-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDocumentDetail);
}

window.showDocumentDetail = showDocumentDetail;
window.closeDocumentDetail = closeDocumentDetail;

// ==========================================================================
// ==========================================================================
// UNIFIED STRATEGIC INTELLIGENCE SYSTEM
// ==========================================================================
// ==========================================================================

let activeStrategicFilter = null;

// ==========================================================================
// HELPER: Get District Documents
// ==========================================================================
function getDistrictDocuments(districtName) {
    return state.strategicDocuments.filter(doc => 
        doc.districts && doc.districts.includes(districtName)
    );
}

// ==========================================================================
// HELPER: Parse Numeric Value
// ==========================================================================
function parseNumericValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    const str = value.toLowerCase().replace(/,/g, '');
    if (str === 'tbd' || str === '') return 0;
    if (str.includes('million') || str.includes('m')) {
        const num = parseFloat(str.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) return num * 1000000;
    }
    if (str.includes('billion') || str.includes('b')) {
        const num = parseFloat(str.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) return num * 1000000000;
    }
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
}

// ==========================================================================
// HELPER: Get DDS Target from Documents
// ==========================================================================
function getDDSTarget(districtName, sector) {
    const docs = getDistrictDocuments(districtName);
    const keywords = {
        housing: ['housing', 'home', 'unit', 'house'],
        jobs: ['job', 'employment', 'worker', 'employee'],
        investment: ['investment', 'capital', 'fund', 'finance'],
        industry: ['industrial', 'zone', 'factory', 'plant'],
        agriculture: ['agriculture', 'crop', 'farm', 'irrigation']
    };
    
    for (const doc of docs) {
        if (!doc.targets) continue;
        for (const target of doc.targets) {
            const desc = (target.description || '').toLowerCase();
            const sectorKeywords = keywords[sector] || [];
            if (sectorKeywords.some(k => desc.includes(k))) {
                const num = parseNumericValue(target.target_value);
                if (num > 0) {
                    return { value: num, source: doc.title, confidence: 'High' };
                }
            }
        }
    }
    return null;
}

// ==========================================================================
// HELPER: Get Gap Analysis Data
// ==========================================================================
function getGapAnalysisData(districtName, sector) {
    const gapData = state.gapAnalysis?.districts?.[districtName];
    if (!gapData || !gapData.sectoral_breakdown) return null;
    
    const breakdown = gapData.sectoral_breakdown;
    const sectorMap = {
        housing: { factor: 'land', sector: 'Housing' },
        jobs: { factor: 'labor', sector: 'Jobs' },
        investment: { factor: 'capital', sector: 'Investment' },
        industry: { factor: 'land', sector: 'Industry' },
        agriculture: { factor: 'land', sector: 'Agriculture' }
    };
    
    const mapping = sectorMap[sector];
    if (!mapping) return null;
    
    const factorData = breakdown[mapping.factor];
    if (!factorData || !factorData.sectors) return null;
    
    const sectorData = factorData.sectors[mapping.sector];
    if (!sectorData) return null;
    
    return {
        required: sectorData.required || 0,
        existing: sectorData.existing || 0,
        gap: sectorData.gap || 0,
        confidence: sectorData.confidence || 0,
        source: 'Gap Analysis',
        provenance: sectorData.provenance_note || ''
    };
}

// ==========================================================================
// HELPER: Get Current Value for a Sector (Total Need)
// ==========================================================================
function getCurrentValue(districtName, sector) {
    const data = state.calculatedDistrictData[districtName] || {};
    const pop = data.infra?.population || 400000;
    const score = data.composite_score || 50;
    const cityDistricts = ['Gasabo', 'Kicukiro', 'Nyarugenge'];
    const isCity = cityDistricts.includes(districtName);
    
    switch(sector) {
        case 'housing':
            const hhSize = isCity ? 4.0 : 4.5;
            return Math.round(pop / hhSize);
        case 'jobs':
            const empRate = isCity ? 0.45 : 0.35;
            return Math.round(pop * empRate);
        case 'investment':
            return Math.round((score / 100) * 300000000);
        case 'industry':
            return Math.max(1, Math.round(1 + (score / 20)));
        case 'agriculture':
            const agData = state.agricultureData?.districts?.[districtName] || {};
            return agData.crop_production_intensity || agData.crop_intensity || 0;
        default:
            return 0;
    }
}

// ==========================================================================
// HELPER: Get Planned/DDS Value for a Sector
// ==========================================================================
function getPlannedValue(districtName, sector, gapData) {
    const unitsPerHa = 50;
    
    switch(sector) {
        case 'housing':
            // DDS land allocation: hectares × 50 units/ha
            if (gapData && gapData.required > 0) {
                return gapData.required * unitsPerHa;
            }
            // Check if there's a DDS numeric target
            const ddsTarget = getDDSTarget(districtName, sector);
            if (ddsTarget && ddsTarget.value > 0) {
                return ddsTarget.value;
            }
            return 0;
        case 'jobs':
            if (gapData && gapData.required > 0) {
                return gapData.required;
            }
            const ddsJobs = getDDSTarget(districtName, sector);
            if (ddsJobs && ddsJobs.value > 0) {
                return ddsJobs.value;
            }
            return 0;
        case 'investment':
            if (gapData && gapData.required > 0) {
                return gapData.required;
            }
            const ddsInvestment = getDDSTarget(districtName, sector);
            if (ddsInvestment && ddsInvestment.value > 0) {
                return ddsInvestment.value;
            }
            return 0;
        case 'industry':
            if (gapData && gapData.required > 0) {
                return gapData.required;
            }
            const ddsIndustry = getDDSTarget(districtName, sector);
            if (ddsIndustry && ddsIndustry.value > 0) {
                return ddsIndustry.value;
            }
            return 0;
        case 'agriculture':
            // Agriculture uses target intensity (85%)
            return 85; // Realistic target
        default:
            return 0;
    }
}

// ==========================================================================
// CALCULATE STRATEGIC DATA - UNIFIED FOR ALL 5 SECTORS
// ==========================================================================
function calculateStrategicData(districtName, sector) {
    const data = state.calculatedDistrictData[districtName] || {};
    const pop = data.infra?.population || 400000;
    const score = data.composite_score || 50;
    
    // STEP 1: Get Total Need (Current Value)
    const totalNeed = getCurrentValue(districtName, sector);
    
    // STEP 2: Get Gap Analysis Data
    const gapData = getGapAnalysisData(districtName, sector);
    
    // STEP 3: Get Planned/DDS Value
    let plannedValue = getPlannedValue(districtName, sector, gapData);
    
    // STEP 4: Check if there's a DDS numeric target (overrides gap analysis)
    const ddsTarget = getDDSTarget(districtName, sector);
    if (ddsTarget && ddsTarget.value > 0) {
        plannedValue = ddsTarget.value;
    }
    
    // STEP 5: Calculate Gap
    let target = totalNeed;
    let gap = Math.max(0, totalNeed - plannedValue);
    let gapPct = totalNeed > 0 ? Math.round((gap / totalNeed) * 100) : 0;
    let source = 'Population Projection';
    let sourceDoc = 'NISR Data';
    let confidence = 'Medium';
    let hasDDS = false;
    let isWarning = false;
    let warningMessage = '';
    let formula = '';
    
    // For agriculture, the logic is different (target is fixed at 85%)
    if (sector === 'agriculture') {
        const currentIntensity = totalNeed;
        const targetIntensity = 85;
        gap = Math.max(0, targetIntensity - currentIntensity);
        gapPct = targetIntensity > 0 ? Math.round((gap / targetIntensity) * 100) : 0;
        target = targetIntensity;
        source = currentIntensity > 0 ? 'Agriculture Data' : 'Fallback Estimate';
        sourceDoc = currentIntensity > 0 ? 'NISR Data' : 'No data available';
        confidence = currentIntensity > 0 ? 'Medium' : 'Low';
        formula = currentIntensity > 0 ? `Current Intensity: ${currentIntensity}%, Target: ${targetIntensity}%` : 'No agriculture data available';
        if (currentIntensity === 0) {
            isWarning = true;
            warningMessage = '⚠️ No agriculture data found - using fallback estimate';
        }
        hasDDS = false;
        
        return {
            district: districtName,
            sector: sector,
            current: currentIntensity,
            target: targetIntensity,
            gap: gap,
            gapPercentage: gapPct,
            source: source,
            sourceDoc: sourceDoc,
            confidence: confidence,
            hasDDS: hasDDS,
            isWarning: isWarning,
            warningMessage: warningMessage,
            formula: formula,
            details: {
                '🌾 Current Intensity': `${currentIntensity}%`,
                '🎯 Target Intensity': `${targetIntensity}%`,
                '📈 Gap': `${gap}% (${gapPct}%)`,
                '📄 Source': sourceDoc
            },
            recommendation: currentIntensity > 0 ? 'Data is from NISR. Reasonably reliable.' : 'Add agriculture data for accurate assessment.'
        };
    }
    
    // Determine source and confidence for other sectors
    if (plannedValue > 0) {
        if (ddsTarget && ddsTarget.value > 0) {
            source = 'DDS Document';
            sourceDoc = ddsTarget.source;
            confidence = 'High';
            hasDDS = true;
            formula = `Target: ${formatValue(plannedValue, sector)} (from ${ddsTarget.source})`;
        } else if (gapData && gapData.required > 0) {
            source = 'Gap Analysis';
            sourceDoc = 'District Gap Analysis';
            confidence = 'Medium';
            hasDDS = true;
            formula = `Planned: ${formatValue(plannedValue, sector)} (from gap analysis)`;
        } else {
            source = 'Fallback Estimate';
            sourceDoc = 'No DDS or Gap Analysis';
            confidence = 'Low';
            hasDDS = false;
            isWarning = true;
            warningMessage = `⚠️ No DDS or gap analysis data - using fallback estimate`;
            formula = getFallbackFormula(districtName, sector, pop, score);
        }
    } else {
        source = 'Fallback Estimate';
        sourceDoc = 'No DDS or Gap Analysis';
        confidence = 'Low';
        hasDDS = false;
        isWarning = true;
        warningMessage = `⚠️ No DDS or gap analysis data - using fallback estimate`;
        formula = getFallbackFormula(districtName, sector, pop, score);
    }
    
    return {
        district: districtName,
        sector: sector,
        current: totalNeed,
        target: target,
        gap: gap,
        gapPercentage: gapPct,
        source: source,
        sourceDoc: sourceDoc,
        confidence: confidence,
        hasDDS: hasDDS,
        isWarning: isWarning,
        warningMessage: warningMessage,
        formula: formula,
        details: {
            '🎯 Total Need': `${formatValue(totalNeed, sector)}`,
            '📋 Planned': `${formatValue(plannedValue, sector)}`,
            '📈 Gap': `${formatValue(gap, sector)} (${gapPct}%)`,
            '📄 Source': sourceDoc
        },
        plannedValue: plannedValue,
        recommendation: hasDDS ? '✅ Data is reliable.' : '📌 Add DDS document for accurate targets.'
    };
}

// ==========================================================================
// HELPER: Get Fallback Formula
// ==========================================================================
function getFallbackFormula(districtName, sector, pop, score) {
    const cityDistricts = ['Gasabo', 'Kicukiro', 'Nyarugenge'];
    const isCity = cityDistricts.includes(districtName);
    const hhSize = isCity ? 4.0 : 4.5;
    const empRate = isCity ? 0.45 : 0.35;
    
    switch(sector) {
        case 'housing':
            return `Population: ${pop.toLocaleString()} ÷ ${hhSize} = ${getCurrentValue(districtName, sector).toLocaleString()} units needed`;
        case 'jobs':
            return `Population: ${pop.toLocaleString()} × ${(empRate*100).toFixed(0)}% = ${getCurrentValue(districtName, sector).toLocaleString()} jobs needed`;
        case 'investment':
            return `(${score} ÷ 100) × $300M = $${(getCurrentValue(districtName, sector)/1000000).toFixed(0)}M needed`;
        case 'industry':
            return `1 + (${score} ÷ 20) = ${getCurrentValue(districtName, sector)} zones needed`;
        case 'agriculture':
            return `Target: 85% (realistic goal)`;
        default:
            return 'No formula available';
    }
}

// ==========================================================================
// HELPER: Format Value Based on Sector
// ==========================================================================
function formatValue(value, sector) {
    if (sector === 'investment') {
        if (value >= 1000000000) return '$' + (value / 1000000000).toFixed(1) + 'B';
        if (value >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
        if (value >= 1000) return '$' + (value / 1000).toFixed(1) + 'K';
        return '$' + Math.round(value);
    }
    if (sector === 'agriculture') return value + '%';
    if (sector === 'industry') return value + ' zones';
    if (sector === 'housing') return value.toLocaleString() + ' units';
    if (sector === 'jobs') return value.toLocaleString() + ' jobs';
    return value.toLocaleString();
}

// ==========================================================================
// STRATEGIC UI FUNCTIONS
// ==========================================================================
function setupStrategicListeners() {
    document.querySelectorAll('.strategic-item[data-strategic]').forEach(item => {
        item.addEventListener('click', function() {
            const key = this.getAttribute('data-strategic');
            if (activeStrategicFilter === key) {
                clearStrategicFilter();
            } else {
                setStrategicFilter(key);
            }
        });
    });
    const resetBtn = $('btn-reset-strategic');
    if (resetBtn) resetBtn.addEventListener('click', clearStrategicFilter);
}

function setStrategicFilter(key) {
    console.log('🎯 Activating Strategic Filter:', key);
    activeStrategicFilter = key;
    
    document.querySelectorAll('.strategic-item[data-strategic]').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-strategic') === key);
    });
    
    const resetBtn = $('btn-reset-strategic');
    if (resetBtn) resetBtn.style.display = 'block';
    
    const badge = $('analytics-active-filter-badge');
    if (badge) {
        const info = STRATEGIC_LABELS[key];
        badge.textContent = `${info.icon} ${info.label}`;
        badge.style.background = info.color;
    }
    
    updateStrategicAnalytics(key);
    updateStrategicMap(key);
    
    if (state.currentDistrict) {
        updateSectorDetails(state.currentDistrict, key);
    }
}

function clearStrategicFilter() {
    console.log('🔴 Clearing Strategic Filter');
    activeStrategicFilter = null;
    document.querySelectorAll('.strategic-item[data-strategic]').forEach(el => el.classList.remove('active'));
    
    const resetBtn = $('btn-reset-strategic');
    if (resetBtn) resetBtn.style.display = 'none';
    
    const badge = $('analytics-active-filter-badge');
    if (badge) {
        badge.textContent = 'Composite Score View';
        badge.style.background = '#4C6EF5';
    }
    
    const sectorContainer = $('sector-details-container');
    if (sectorContainer) sectorContainer.style.display = 'none';
    
    if (state.districtGeoJson) {
        if (state.geoJsonLayer) state.geoJsonLayer.remove();
        if (state.labelLayer) { state.map.removeLayer(state.labelLayer); state.labelLayer = null; }
        addDistrictLayer(state.districtGeoJson);
    }
    renderAnalytics();
}

// ==========================================================================
// UPDATE SECTOR DETAILS
// ==========================================================================
function updateSectorDetails(districtName, sectorKey) {
    const container = $('sector-details-container');
    if (!container) return;
    
    if (!sectorKey) {
        container.style.display = 'none';
        return;
    }
    
    const data = calculateStrategicData(districtName, sectorKey);
    const info = STRATEGIC_LABELS[sectorKey];
    
    if (!data || !info) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    const iconEl = $('sector-details-icon');
    const titleEl = $('sector-details-title');
    const confidenceEl = $('sector-details-confidence');
    if (iconEl) iconEl.textContent = info.icon;
    if (titleEl) titleEl.textContent = info.label + ' Gap Analysis';
    if (confidenceEl) {
        confidenceEl.textContent = data.confidence + ' Confidence';
        confidenceEl.style.background = data.confidence === 'High' ? 'rgba(16,185,129,0.2)' : 
                                        data.confidence === 'Medium' ? 'rgba(245,158,11,0.2)' : 
                                        'rgba(239,68,68,0.2)';
        confidenceEl.style.color = data.confidence === 'High' ? '#10b981' : 
                                    data.confidence === 'Medium' ? '#f59e0b' : 
                                    '#ef4444';
    }
    
    const targetEl = $('sector-details-target');
    const currentEl = $('sector-details-current');
    const gapEl = $('sector-details-gap');
    
    if (targetEl) targetEl.textContent = formatValue(data.target, sectorKey);
    if (currentEl) currentEl.textContent = formatValue(data.current, sectorKey);
    if (gapEl) {
        gapEl.textContent = formatValue(data.gap, sectorKey) + ' (' + data.gapPercentage + '%)';
        gapEl.className = 'value';
        if (data.gap === 0) {
            gapEl.classList.add('gap-none');
        } else if (data.gapPercentage < 30) {
            gapEl.classList.add('gap-small');
        } else {
            gapEl.classList.add('gap');
        }
    }
    
    const formulaEl = $('sector-details-formula-text');
    if (formulaEl) formulaEl.textContent = data.formula || 'No formula available';
    
    const sourceEl = $('sector-details-source-text');
    if (sourceEl) sourceEl.textContent = data.source + ' (' + data.sourceDoc + ')';
    
    const warningEl = $('sector-details-warning');
    if (warningEl) {
        if (data.isWarning && data.warningMessage) {
            warningEl.style.display = 'block';
            warningEl.textContent = data.warningMessage;
        } else {
            warningEl.style.display = 'none';
        }
    }
    
    // Extra details for housing
    if (sectorKey === 'housing' && data.plannedValue !== undefined) {
        const extraEl = document.createElement('div');
        extraEl.style.cssText = 'margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); font-size:0.65rem; color:#94a3b8; line-height:1.5;';
        extraEl.innerHTML = `📋 DDS Planned Units: ${formatValue(data.plannedValue, sectorKey)}`;
        const oldExtra = container.querySelector('.extra-details');
        if (oldExtra) oldExtra.remove();
        extraEl.className = 'extra-details';
        container.appendChild(extraEl);
    }
}

// ==========================================================================
// UPDATE STRATEGIC ANALYTICS
// ==========================================================================
function updateStrategicAnalytics(key) {
    const content = $('analytics-site-selection-content');
    const tag = $('analytics-strategic-tag');
    if (!content) return;
    
    const info = STRATEGIC_LABELS[key];
    if (tag) tag.textContent = `${info.icon} ${info.label}`;
    
    const districtData = state.districts.map(name => {
        const data = calculateStrategicData(name, key);
        return { name, ...data };
    }).sort((a, b) => b.gapPercentage - a.gapPercentage);
    
    const top3 = districtData.slice(0, 3);
    const withDDS = districtData.filter(d => d.hasDDS);
    const withoutDDS = districtData.filter(d => !d.hasDDS);
    const warnings = districtData.filter(d => d.isWarning);
    
    const totalTarget = districtData.reduce((sum, d) => sum + d.target, 0);
    const totalCurrent = districtData.reduce((sum, d) => sum + d.current, 0);
    const totalGap = districtData.reduce((sum, d) => sum + d.gap, 0);
    const overallPct = totalTarget > 0 ? Math.round((totalGap / totalTarget) * 100) : 0;
    
    content.innerHTML = `
        <div style="margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-weight:700; color:#e2e8f0; font-size:0.85rem;">${info.icon} ${info.label} - National Overview</span>
                <span style="font-size:0.7rem; color:${overallPct < 30 ? '#10b981' : (overallPct < 60 ? '#f59e0b' : '#ef4444')}; font-weight:700;">
                    ${overallPct}% Gap
                </span>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:8px;">
                <div style="background:rgba(255,255,255,0.03); padding:6px; border-radius:4px; text-align:center;">
                    <div style="font-size:0.6rem; color:#94a3b8;">Total Need</div>
                    <div style="font-weight:700; color:#e2e8f0;">${formatValue(totalTarget, key)}</div>
                </div>
                <div style="background:rgba(16,185,129,0.08); padding:6px; border-radius:4px; text-align:center;">
                    <div style="font-size:0.6rem; color:#94a3b8;">Planned</div>
                    <div style="font-weight:700; color:#10b981;">${formatValue(totalCurrent, key)}</div>
                </div>
                <div style="background:rgba(239,68,68,0.08); padding:6px; border-radius:4px; text-align:center;">
                    <div style="font-size:0.6rem; color:#94a3b8;">Gap</div>
                    <div style="font-weight:700; color:#ef4444;">${formatValue(totalGap, key)} (${overallPct}%)</div>
                </div>
            </div>
            
            <div style="display:flex; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                <span style="font-size:0.6rem; background:rgba(16,185,129,0.15); color:#10b981; padding:2px 8px; border-radius:10px;">${withDDS.length} districts with DDS ✅</span>
                <span style="font-size:0.6rem; background:rgba(239,68,68,0.15); color:#ef4444; padding:2px 8px; border-radius:10px;">${withoutDDS.length} districts using fallback ⚠️</span>
                ${warnings.length > 0 ? `<span style="font-size:0.6rem; background:rgba(245,158,11,0.15); color:#f59e0b; padding:2px 8px; border-radius:10px;">${warnings.length} data warnings ⚠️</span>` : ''}
            </div>
        </div>

        <div style="margin-bottom:8px;">
            <div style="font-weight:600; color:#e2e8f0; font-size:0.75rem; margin-bottom:4px;">🔥 Districts with Largest Gap:</div>
            ${top3.map((d, i) => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 8px; background:rgba(255,255,255,0.03); border-radius:4px; margin-bottom:3px; cursor:pointer;" onclick="selectDistrict('${d.name}')">
                    <span style="font-size:0.75rem; color:#e2e8f0;">${i+1}. ${d.name} ${d.hasDDS ? '📄' : '⚠️'}</span>
                    <span style="font-size:0.7rem; color:${d.gapPercentage < 30 ? '#10b981' : (d.gapPercentage < 60 ? '#f59e0b' : '#ef4444')}; font-weight:700;">
                        ${d.gapPercentage}% gap (${formatValue(d.gap, key)})
                    </span>
                </div>
            `).join('')}
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:8px; border-radius:6px; font-size:0.72rem; line-height:1.4;">
            💡 <strong>Insight:</strong> ${districtData.length} districts analyzed. 
            ${top3[0]?.name} has the largest ${info.label.toLowerCase()} gap at ${top3[0]?.gapPercentage}%.
            <br/><br/>
            <span style="color:#94a3b8; font-size:0.65rem;">📌 ${withDDS.length} districts have DDS data. ${withoutDDS.length} districts need DDS documents.</span>
        </div>
    `;
}

// ==========================================================================
// UPDATE STRATEGIC MAP
// ==========================================================================
function updateStrategicMap(key) {
    if (!state.districtGeoJson) {
        setTimeout(() => updateStrategicMap(key), 500);
        return;
    }
    if (state.geoJsonLayer) state.geoJsonLayer.remove();
    if (state.labelLayer) { state.map.removeLayer(state.labelLayer); state.labelLayer = null; }
    addStrategicDistrictLayer(state.districtGeoJson, key);
}

function addStrategicDistrictLayer(geoJson, key) {
    const map = state.map;
    if (!map) return;
    
    const info = STRATEGIC_LABELS[key];
    let maxGap = 10;
    state.districts.forEach(d => {
        const data = calculateStrategicData(d, key);
        if (data.gapPercentage > maxGap) maxGap = data.gapPercentage;
    });
    
    const layer = L.geoJSON(geoJson, {
        style: (feature) => {
            const name = feature.properties?.shapeName || feature.properties?.name || '';
            const data = calculateStrategicData(name, key);
            const isSelected = name === state.currentDistrict;
            
            let color;
            if (!data.hasDDS) {
                color = '#6b7280';
            } else if (data.isWarning) {
                color = '#f59e0b';
            } else if (data.gapPercentage < 30) {
                color = '#10b981';
            } else if (data.gapPercentage < 60) {
                color = '#f59e0b';
            } else {
                color = '#ef4444';
            }
            
            return {
                fillColor: color,
                fillOpacity: isSelected ? 0.9 : 0.6,
                color: isSelected ? '#ffffff' : color,
                weight: isSelected ? 3.5 : 1.5,
                dashArray: data.hasDDS ? null : '5,5'
            };
        },
        onEachFeature: (feature, layer) => {
            const name = feature.properties?.shapeName || feature.properties?.name || '';
            const data = calculateStrategicData(name, key);
            
            let detailRows = '';
            for (const [label, value] of Object.entries(data.details || {})) {
                detailRows += `
                    <div class="tooltip-row">
                        <span class="tooltip-label">${label}</span>
                        <span class="tooltip-value">${value}</span>
                    </div>
                `;
            }
            
            const tooltipContent = `
                <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:240px; max-width:320px;">
                    <div class="tooltip-title" style="font-weight:700; font-size:0.9rem; color:#e2e8f0; margin-bottom:4px;">${name}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin:4px 0 8px 0;">
                        <span style="font-size:0.75rem; color:#94a3b8;">${info.icon} ${info.label}</span>
                        <span style="font-size:1.1rem; font-weight:800; color:${data.gapPercentage < 30 ? '#10b981' : (data.gapPercentage < 60 ? '#f59e0b' : '#ef4444')};">
                            ${data.gapPercentage}% Gap
                        </span>
                    </div>
                    ${data.isWarning ? `<div style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); padding:6px; border-radius:4px; margin:4px 0; font-size:0.65rem; color:#f59e0b;">${data.warningMessage}</div>` : ''}
                    ${detailRows}
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:0.6rem;">
                        <span style="color:#94a3b8;">${data.source}</span>
                        <span style="color:${data.confidence === 'High' ? '#10b981' : data.confidence === 'Medium' ? '#f59e0b' : '#ef4444'}; font-weight:700;">🔍 ${data.confidence}</span>
                    </div>
                    <div style="margin-top:4px; font-size:0.6rem; color:#94a3b8;">📐 ${data.formula}</div>
                    ${data.recommendation ? `<div style="margin-top:4px; font-size:0.6rem; color:#f59e0b;">💡 ${data.recommendation}</div>` : ''}
                </div>
            `;
            
            layer.bindTooltip(tooltipContent, { className: 'leaflet-tooltip-strategic', sticky: true, direction: 'top' });
            layer.on('click', () => selectDistrict(name));
        }
    });
    
    layer.addTo(map);
    state.geoJsonLayer = layer;
}

function updateStrategicCounts() {
    const sectors = ['housing', 'jobs', 'investment', 'industry', 'agriculture'];
    sectors.forEach(key => {
        const el = $(`strategic-${key}`);
        if (!el) return;
        let totalGap = 0;
        let hasData = false;
        state.districts.forEach(d => {
            const data = calculateStrategicData(d, key);
            if (data.gap > 0) { totalGap += data.gap; hasData = true; }
        });
        if (!hasData) { el.textContent = '--'; return; }
        if (key === 'housing') el.textContent = `${(totalGap / 1000000).toFixed(1)}M gap`;
        else if (key === 'jobs') el.textContent = `${(totalGap / 1000).toFixed(0)}K gap`;
        else if (key === 'investment') el.textContent = `$${(totalGap / 1000000).toFixed(0)}M gap`;
        else if (key === 'industry') el.textContent = `${totalGap} zones gap`;
        else if (key === 'agriculture') el.textContent = `${Math.round(totalGap / state.districts.length)}% avg gap`;
    });
}

// ==========================================================================
// ==========================================================================
// END OF STRATEGIC INTELLIGENCE SYSTEM
// ==========================================================================
// ==========================================================================

// ==========================================================================
// SKILLS & LAND CENTER
// ==========================================================================
function calculateSchoolsContribution(districtName) {
    let landBoost = 0, laborBoost = 0, capitalBoost = 0, entrepreneurshipBoost = 0, totalEnrollment = 0;
    const programStats = {};
    const schools = (state.schoolsDirectory?.schools || []).filter(s =>
        (s.district || '').toLowerCase() === districtName.toLowerCase()
    );
    schools.forEach(school => {
        const enrollment = school.enrollment || 500;
        totalEnrollment += enrollment;
        const sizeFactor = Math.min(3.0, enrollment / 500);
        (school.programs || []).forEach(prog => {
            let matchedCategory = null;
            for (const cat in PROGRAM_WEIGHTS) {
                if (prog.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(prog.toLowerCase())) {
                    matchedCategory = cat;
                    break;
                }
            }
            if (!matchedCategory) matchedCategory = 'General Secondary';
            if (!programStats[matchedCategory]) programStats[matchedCategory] = { name: matchedCategory, count: 0, enrollment: 0 };
            programStats[matchedCategory].count += 1;
            programStats[matchedCategory].enrollment += enrollment;
            const w = PROGRAM_WEIGHTS[matchedCategory];
            landBoost += w.land * 0.15 * sizeFactor;
            laborBoost += w.labor * 0.15 * sizeFactor;
            capitalBoost += w.capital * 0.15 * sizeFactor;
            entrepreneurshipBoost += w.entrepreneurship * 0.15 * sizeFactor;
        });
    });
    const topPrograms = Object.values(programStats).sort((a, b) => b.enrollment - a.enrollment).slice(0, 4);
    return {
        land: parseFloat(Math.min(15, landBoost).toFixed(1)),
        labor: parseFloat(Math.min(15, laborBoost).toFixed(1)),
        capital: parseFloat(Math.min(15, capitalBoost).toFixed(1)),
        entrepreneurship: parseFloat(Math.min(15, entrepreneurshipBoost).toFixed(1)),
        totalSchools: schools.length,
        totalEnrollment: totalEnrollment,
        topPrograms: topPrograms,
        schoolsList: schools
    };
}

function calculateLandCenterScore(districtName) {
    const d = (state.landCenterData?.districts || {})[districtName] || {
        land_use_score: 65,
        infrastructure_density: 55,
        zoning_flexibility: 60,
        urbanization_pattern: 55,
        environmental_suitability: 70
    };
    return {
        landUseScore: d.land_use_score || 60,
        infrastructureDensityScore: d.infrastructure_density || 50,
        zoningFlexibilityScore: d.zoning_flexibility || 60,
        urbanizationPatternScore: d.urbanization_pattern || 50,
        environmentalSuitabilityScore: d.environmental_suitability || 70,
        compositeScore: Math.round(
            (d.land_use_score || 60) * 0.30 +
            (d.infrastructure_density || 50) * 0.25 +
            (d.zoning_flexibility || 60) * 0.20 +
            (d.urbanization_pattern || 50) * 0.15 +
            (d.environmental_suitability || 70) * 0.10
        )
    };
}

// ==========================================================================
// DYNAMIC SCORING ENGINE
// ==========================================================================
function recalculateDynamicDistrictScores() {
    state.calculatedDistrictData = {};
    state.districts.forEach(districtName => {
        const base = state.districtData[districtName] || {};
        let land = base.land || 50;
        let labor = base.labor || 50;
        let capital = base.capital || 50;
        let entrepreneurship = base.entrepreneurship || 50;
        const assets = state.assets.filter(a => (a.district || '').toLowerCase() === districtName.toLowerCase());
        assets.forEach(a => {
            const type = (a.type || '').toLowerCase();
            if (type === 'hospital' || type === 'school') labor += 2.5;
            else if (type === 'farm') land += 3.0;
            else if (['factory', 'market', 'bank', 'hotel'].includes(type)) { entrepreneurship += 2.5; capital += 1.5; }
            else if (type === 'construction') land += 1.5;
            else if (type === 'major-project') { land += 3.0; labor += 3.0; capital += 3.0; entrepreneurship += 3.0; }
        });
        const news = state.curatedNews.filter(n => (n.district || '').toLowerCase() === districtName.toLowerCase());
        news.forEach(n => {
            const boost = parseFloat(n.impact_score) || 3.0;
            const target = (n.target_dimension || '').toLowerCase();
            if (target === 'land') land += boost;
            else if (target === 'labor') labor += boost;
            else if (target === 'capital') capital += boost;
            else if (target === 'entrepreneurship') entrepreneurship += boost;
        });
        const schoolBoosts = calculateSchoolsContribution(districtName);
        land += schoolBoosts.land;
        labor += schoolBoosts.labor;
        capital += schoolBoosts.capital;
        entrepreneurship += schoolBoosts.entrepreneurship;
        const landCenter = calculateLandCenterScore(districtName);
        land = (land * 0.6) + (landCenter.compositeScore * 0.4);
        land = Math.min(100, Math.max(10, Math.round(land * 10) / 10));
        labor = Math.min(100, Math.max(10, Math.round(labor * 10) / 10));
        capital = Math.min(100, Math.max(10, Math.round(capital * 10) / 10));
        entrepreneurship = Math.min(100, Math.max(10, Math.round(entrepreneurship * 10) / 10));
        const composite = Math.min(100, Math.round(((land + labor + capital + entrepreneurship) / 4) * 10) / 10);
        state.calculatedDistrictData[districtName] = {
            ...base,
            land,
            labor,
            capital,
            entrepreneurship,
            composite_score: composite,
            infra: getDistrictInfraCounts(districtName),
            assetCount: assets.length,
            newsCount: news.length,
            schoolBoosts,
            landCenter
        };
    });
}

function getDistrictInfraCounts(districtName) {
    const curated = state.curatedInfra[districtName] || {};
    return {
        construction: curated.construction || 0,
        hardware: curated.hardware || 0,
        commercial: curated.commercial || 0,
        industrial: curated.industrial || 0,
        education: curated.education || 0,
        health: curated.health || 0,
        hospitality: curated.hospitality || 0,
        banking: curated.banking || 0,
        population: curated.population || 400000,
        anchor: curated.anchor || 'District Hub'
    };
}

function populateDistrictDropdowns() {
    [districtDropdown, analyticsDistrictDropdown].forEach(select => {
        if (!select) return;
        select.innerHTML = '';
        state.districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            select.appendChild(opt);
        });
    });
}

// ==========================================================================
// SELECT DISTRICT
// ==========================================================================
function selectDistrict(districtName) {
    console.log('📍 Selecting district:', districtName);
    if (!districtName) return;
    state.currentDistrict = districtName;
    const data = state.calculatedDistrictData[districtName] || state.districtData[districtName];
    if (!data) return;
    
    if (districtDropdown) districtDropdown.value = districtName;
    if (analyticsDistrictDropdown) analyticsDistrictDropdown.value = districtName;
    
    const compEl = $('display-composite');
    const landEl = $('display-land');
    const laborEl = $('display-labor');
    const capEl = $('display-capital');
    const entEl = $('display-entrepreneurship');
    if (compEl) compEl.textContent = data.composite_score !== undefined ? data.composite_score : '--';
    if (landEl) landEl.textContent = data.land !== undefined ? data.land : '--';
    if (laborEl) laborEl.textContent = data.labor !== undefined ? data.labor : '--';
    if (capEl) capEl.textContent = data.capital !== undefined ? data.capital : '--';
    if (entEl) entEl.textContent = data.entrepreneurship !== undefined ? data.entrepreneurship : '--';
    
    if (state.activeStrategicFilter) {
        updateSectorDetails(districtName, state.activeStrategicFilter);
    } else {
        const sectorContainer = $('sector-details-container');
        if (sectorContainer) sectorContainer.style.display = 'none';
    }
    
    Object.keys(STRATEGIC_LABELS).forEach(key => {
        const el = $(`strategic-${key}`);
        if (el) {
            const sd = calculateStrategicData(districtName, key);
            if (sd.gap > 0) {
                if (key === 'housing') el.textContent = `${(sd.gap / 1000000).toFixed(1)}M gap`;
                else if (key === 'jobs') el.textContent = `${(sd.gap / 1000).toFixed(0)}K gap`;
                else if (key === 'investment') el.textContent = `$${(sd.gap / 1000000).toFixed(0)}M gap`;
                else if (key === 'industry') el.textContent = `${sd.gap} zones gap`;
                else if (key === 'agriculture') el.textContent = `${sd.gap}% gap`;
            } else {
                el.textContent = '✅ on track';
            }
        }
    });
    
    const skillsBadge = $('skills-total-schools-badge');
    const skillsContent = $('skills-pipeline-content');
    if (skillsBadge && skillsContent) {
        const schoolBoosts = data.schoolBoosts || calculateSchoolsContribution(districtName);
        skillsBadge.textContent = `${schoolBoosts.totalSchools} School${schoolBoosts.totalSchools === 1 ? '' : 's'} (${schoolBoosts.totalEnrollment.toLocaleString()} students)`;
        if (schoolBoosts.topPrograms && schoolBoosts.topPrograms.length > 0) {
            skillsContent.innerHTML = `
                <div style="margin-bottom:6px; font-weight:600; color:#e2e8f0;">Top Vocational & Academic Focus:</div>
                <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">
                    ${schoolBoosts.topPrograms.map(p => `
                        <span style="background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.25); color:#a78bfa; font-size:0.65rem; padding:2px 8px; border-radius:6px; font-weight:600;">
                            ${p.name}: ${p.enrollment.toLocaleString()} students
                        </span>
                    `).join('')}
                </div>
                <div style="font-size:0.68rem; color:#94a3b8; line-height:1.4; background:rgba(255,255,255,0.03); padding:6px; border-radius:6px;">
                    ⚡ Workforce Impact Boosts: <strong style="color:#10b981;">+${schoolBoosts.land} Land</strong>, <strong style="color:#3b82f6;">+${schoolBoosts.labor} Labor</strong>, <strong style="color:#f59e0b;">+${schoolBoosts.capital} Capital</strong>, <strong style="color:#8b5cf6;">+${schoolBoosts.entrepreneurship} Entrepreneurship</strong>
                </div>
            `;
        } else {
            skillsContent.innerHTML = '<span style="color:#94a3b8;">No registered curriculum schools found.</span>';
        }
    }
    
    const landBadge = $('land-readiness-score-badge');
    const landBars = $('land-readiness-bars');
    if (landBadge && landBars) {
        const landCenter = data.landCenter || calculateLandCenterScore(districtName);
        landBadge.textContent = `${landCenter.compositeScore} / 100`;
        landBars.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:6px; font-size:0.72rem;">
                ${[
                    { label: 'Land Use (30%)', value: landCenter.landUseScore, color: '#10b981' },
                    { label: 'Infra Density (25%)', value: landCenter.infrastructureDensityScore, color: '#3b82f6' },
                    { label: 'Zoning Flexibility (20%)', value: landCenter.zoningFlexibilityScore, color: '#f59e0b' },
                    { label: 'Urbanization Pattern (15%)', value: landCenter.urbanizationPatternScore, color: '#8b5cf6' },
                    { label: 'Environmental Suitability (10%)', value: landCenter.environmentalSuitabilityScore, color: '#06b6d4' }
                ].map(item => `
                    <div>
                        <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:2px;">
                            <span>${item.label}</span>
                            <strong style="color:#e2e8f0;">${item.value}</strong>
                        </div>
                        <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;">
                            <div style="width:${item.value}%; height:100%; background:${item.color};"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    updateDetailsView(districtName);
    updateMapHighlight(districtName);
    renderAnalytics();
}

// ==========================================================================
// OPPORTUNITY ANALYSIS
// ==========================================================================
function calculateOpportunityAnalysis(data) {
    const land = data.land || 0;
    const labor = data.labor || 0;
    const capital = data.capital || 0;
    const entrepreneurship = data.entrepreneurship || 0;
    const composite = data.composite_score || 0;
    const dims = [
        { name: 'Land', value: land, icon: '🌍' },
        { name: 'Labor', value: labor, icon: '👷' },
        { name: 'Capital', value: capital, icon: '💰' },
        { name: 'Entrepreneurship', value: entrepreneurship, icon: '🚀' }
    ];
    dims.sort((a, b) => b.value - a.value);
    const highest = dims[0];
    const lowest = dims[dims.length - 1];
    const shortTermPotential = Math.round(highest.value - lowest.value);
    const shortTermNewScore = Math.round(lowest.value + shortTermPotential);
    const longTermPotential = Math.round(100 - composite);
    let archetype = '', archetypeIcon = '', strategy = '', priority = '';
    if (shortTermPotential > 20 && longTermPotential > 25) {
        archetype = 'Rocket'; archetypeIcon = '🚀'; priority = 'HIGHEST';
        strategy = `Quick wins by elevating ${lowest.name} (${lowest.value} → ${shortTermNewScore}) alongside strategic long-term investments.`;
    } else if (shortTermPotential > 20 && longTermPotential <= 25) {
        archetype = 'Quick Win'; archetypeIcon = '⚡'; priority = 'HIGH';
        strategy = `Targeted investment in ${lowest.name} (${lowest.value} → ${shortTermNewScore}) leverages strong ${highest.name} foundation.`;
    } else if (shortTermPotential <= 20 && longTermPotential > 25) {
        archetype = 'Foundation'; archetypeIcon = '🌱'; priority = 'MEDIUM';
        strategy = 'Requires core infrastructure, workforce skills, and financial credit access.';
    } else {
        archetype = 'Saturated'; archetypeIcon = '✅'; priority = 'LOW';
        strategy = 'Focus on operational optimization, high-tech modernization, and maintenance.';
    }
    return { dimensions: dims, highest, lowest, shortTermPotential, shortTermNewScore, longTermPotential, archetype, archetypeIcon, strategy, priority };
}

// ==========================================================================
// UPDATE DETAILS VIEW
// ==========================================================================
function updateDetailsView(districtName) {
    const data = state.calculatedDistrictData[districtName] || state.districtData[districtName];
    if (!data) return;
    if (detailsRegionName) detailsRegionName.textContent = districtName;
    if (detailsBreadcrumbRegion) detailsBreadcrumbRegion.textContent = districtName;
    if (detailsRegionScore) detailsRegionScore.textContent = data.composite_score || '--';
    
    updateBar('readiness', data.land || 0);
    updateBar('supply', data.capital || 0);
    updateBar('labor', data.labor || 0);
    updateBar('investment', data.entrepreneurship || 0);
    
    const maxScore = Math.max(data.land || 0, data.labor || 0, data.capital || 0, data.entrepreneurship || 0);
    const gap = Math.max(0, maxScore - (data.composite_score || 0));
    updateBar('gap', gap);
    
    const agData = state.agricultureData?.districts?.[districtName] || {};
    if (agData && Object.keys(agData).length > 0) {
        if (detailsAgriIntensity) detailsAgriIntensity.textContent = `${agData.crop_production_intensity || agData.crop_intensity || 0}%`;
        if (detailsAgriCrops) detailsAgriCrops.textContent = Array.isArray(agData.major_crops) ? agData.major_crops.join(', ') : '--';
        if (detailsAgriIrrigation) detailsAgriIrrigation.textContent = `${agData.irrigated_land_ha || 0} ha`;
    }
    
    const nearbyProjects = state.majorProjects.projects?.filter(p => 
        (p.location || '').toLowerCase().includes(districtName.toLowerCase()) ||
        (p.district || '').toLowerCase() === districtName.toLowerCase()
    ) || [];
    if (detailsProjectsList) {
        if (nearbyProjects.length === 0) {
            detailsProjectsList.innerHTML = '<span style="color:#94a3b8; font-size:0.75rem;">No strategic anchor projects registered.</span>';
        } else {
            detailsProjectsList.innerHTML = nearbyProjects.map(p => `
                <div class="project-item" style="background:rgba(76,110,245,0.08); border-radius:6px; padding:8px; margin-bottom:6px;">
                    <div class="name" style="font-weight:700; color:#e2e8f0; font-size:0.8rem;">⭐ ${p.name}</div>
                    <div class="detail" style="font-size:0.7rem; color:#94a3b8;">${p.type} • ${p.cost || p.status || ''}</div>
                    ${p.sub_asset_opportunities ? `<div style="font-size:0.65rem; color:#4ade80; margin-top:3px;">💡 ${p.sub_asset_opportunities}</div>` : ''}
                </div>
            `).join('');
        }
    }
    
    const schoolBoosts = data.schoolBoosts || calculateSchoolsContribution(districtName);
    const detailsSchoolsCount = $('details-schools-count');
    const detailsSkillsList = $('details-skills-list');
    if (detailsSchoolsCount) detailsSchoolsCount.textContent = `${schoolBoosts.totalSchools} Institutions (${schoolBoosts.totalEnrollment.toLocaleString()} students)`;
    if (detailsSkillsList) {
        if (schoolBoosts.schoolsList && schoolBoosts.schoolsList.length > 0) {
            detailsSkillsList.innerHTML = schoolBoosts.schoolsList.map(s => `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px; margin-bottom:6px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; color:#e2e8f0; font-size:0.78rem;">🎓 ${s.name}</span>
                        <span style="font-size:0.65rem; color:#a78bfa; background:rgba(139,92,246,0.15); padding:1px 6px; border-radius:4px;">${s.level || 'School'} • ${s.enrollment} students</span>
                    </div>
                    <div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">Programs: ${Array.isArray(s.programs) ? s.programs.join(', ') : s.programs}</div>
                </div>
            `).join('');
        } else {
            detailsSkillsList.innerHTML = '<span style="color:#94a3b8; font-size:0.75rem;">No institutions registered in directory.</span>';
        }
    }
    
    const detailsLandComposite = $('details-land-composite-score');
    const detailsLandLayersList = $('details-land-layers-list');
    if (detailsLandLayersList) {
        const landCenter = data.landCenter || calculateLandCenterScore(districtName);
        if (detailsLandComposite) detailsLandComposite.textContent = `${landCenter.compositeScore} / 100`;
        detailsLandLayersList.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.75rem;">
                ${[
                    { label: 'LAND USE (30%)', value: landCenter.landUseScore, color: '#10b981' },
                    { label: 'INFRA DENSITY (25%)', value: landCenter.infrastructureDensityScore, color: '#3b82f6' },
                    { label: 'ZONING (20%)', value: landCenter.zoningFlexibilityScore, color: '#f59e0b' },
                    { label: 'URBANIZATION (15%)', value: landCenter.urbanizationPatternScore, color: '#8b5cf6' },
                    { label: 'ENVIRONMENTAL (10%)', value: landCenter.environmentalSuitabilityScore, color: '#06b6d4' }
                ].map(item => `
                    <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; ${item.label.includes('ENVIRONMENTAL') ? 'grid-column: span 2;' : ''}">
                        <span style="color:#94a3b8; font-size:0.65rem; display:block;">${item.label}</span>
                        <strong style="color:${item.color}; font-size:1rem;">${item.value}</strong>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    updateNewsIntelligence(districtName);
    updateRadarChart(data);
    updateGapInsights(data);
}

function updateNewsIntelligence(districtName) {
    const container = $('details-news-list');
    if (!container) return;
    const news = state.curatedNews.filter(n => (n.district || '').toLowerCase() === districtName.toLowerCase());
    if (news.length === 0) {
        container.innerHTML = '<span style="color:#94a3b8; font-size:0.75rem;">No recent news signals curated for this district.</span>';
        return;
    }
    container.innerHTML = news.map(n => `
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px; margin-bottom:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-size:0.65rem; font-weight:700; color:#a78bfa;">${n.source || 'News Source'}</span>
                <span style="font-size:0.6rem; color:#64748b;">${n.published_at ? n.published_at.split('T')[0] : ''}</span>
            </div>
            <div style="font-weight:600; color:#e2e8f0; font-size:0.75rem; margin-bottom:4px;">${n.title}</div>
            <div style="font-size:0.7rem; color:#94a3b8; line-height:1.4;">${n.summary || ''}</div>
        </div>
    `).join('');
}

function updateBar(id, value) {
    const valEl = $(`details-bar-val-${id}`);
    const fillEl = $(`details-bar-fill-${id}`);
    if (valEl) valEl.textContent = Math.round(value);
    if (fillEl) fillEl.style.width = Math.min(100, Math.max(0, value)) + '%';
}

function updateGapInsights(data) {
    const container = $('gap-insights');
    if (!container) return;
    const analysis = calculateOpportunityAnalysis(data);
    container.innerHTML = `
        <div style="background:rgba(76,110,245,0.06); border:1px solid rgba(76,110,245,0.12); border-radius:10px; padding:14px; margin-top:8px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                <span style="font-size:1.5rem;">${analysis.archetypeIcon}</span>
                <div>
                    <strong style="color:#e2e8f0; font-size:1rem;">${analysis.archetype}</strong>
                    <span style="font-size:0.65rem; color:#94a3b8; display:block;">Investment Archetype</span>
                </div>
                <span style="margin-left:auto; background:${analysis.priority === 'HIGHEST' ? '#ef4444' : analysis.priority === 'HIGH' ? '#f59e0b' : analysis.priority === 'MEDIUM' ? '#3b82f6' : '#6B7280'}; color:#fff; padding:2px 12px; border-radius:12px; font-size:0.65rem; font-weight:700;">${analysis.priority}</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                <div style="background:rgba(16,185,129,0.08); border-radius:8px; padding:10px; border-left:3px solid #10b981;">
                    <div style="font-size:0.6rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Short-Term Opportunity</div>
                    <div style="font-size:1.2rem; font-weight:800; color:#10b981;">+${analysis.shortTermPotential} pts</div>
                    <div style="font-size:0.65rem; color:#94a3b8;">Fix ${analysis.lowest.name} (${analysis.lowest.value} → ${analysis.shortTermNewScore})</div>
                </div>
                <div style="background:rgba(59,130,246,0.08); border-radius:8px; padding:10px; border-left:3px solid #3b82f6;">
                    <div style="font-size:0.6rem; color:#94a3b8; text-transform:uppercase; font-weight:700;">Long-Term Opportunity</div>
                    <div style="font-size:1.2rem; font-weight:800; color:#3b82f6;">+${analysis.longTermPotential} pts</div>
                    <div style="font-size:0.65rem; color:#94a3b8;">Growth to reach 100 ceiling</div>
                </div>
            </div>
            <div style="font-size:0.75rem; color:#94a3b8; line-height:1.5; background:rgba(255,255,255,0.04); padding:10px; border-radius:8px;">
                💡 <strong style="color:#e2e8f0;">Strategy:</strong> ${analysis.strategy}
            </div>
        </div>
    `;
}

let radarChartInstance = null;
function updateRadarChart(data) {
    const canvas = $('details-factorRadarChart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') { console.warn('Chart.js not loaded'); return; }
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth || 380;
    canvas.height = parent.clientHeight || 200;
    const ctx = canvas.getContext('2d');
    if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
    const analysis = calculateOpportunityAnalysis(data);
    const labels = ['Land', 'Labor', 'Capital', 'Entrepreneurship', 'Composite'];
    const current = [data.land || 0, data.labor || 0, data.capital || 0, data.entrepreneurship || 0, data.composite_score || 0];
    const landPotential = analysis.lowest.name === 'Land' ? analysis.highest.value : (data.land || 0);
    const laborPotential = analysis.lowest.name === 'Labor' ? analysis.highest.value : (data.labor || 0);
    const capitalPotential = analysis.lowest.name === 'Capital' ? analysis.highest.value : (data.capital || 0);
    const entrepreneurshipPotential = analysis.lowest.name === 'Entrepreneurship' ? analysis.highest.value : (data.entrepreneurship || 0);
    const potential = [landPotential, laborPotential, capitalPotential, entrepreneurshipPotential, Math.round((landPotential + laborPotential + capitalPotential + entrepreneurshipPotential) / 4)];
    try {
        radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Current Score', data: current, backgroundColor: 'rgba(76,110,245,0.25)', borderColor: '#4C6EF5', borderWidth: 2.5, pointBackgroundColor: '#4C6EF5' },
                    { label: 'Short-Term Potential', data: potential, backgroundColor: 'rgba(245,158,11,0.1)', borderColor: '#f59e0b', borderWidth: 1.8, borderDash: [6, 4], pointBackgroundColor: '#f59e0b' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: { min: 0, max: 100, ticks: { color: '#94a3b8', font: { size: 8 }, backdropColor: 'transparent' }, grid: { color: 'rgba(255,255,255,0.08)' }, angleLines: { color: 'rgba(255,255,255,0.08)' }, pointLabels: { color: '#e2e8f0', font: { size: 9, weight: '600' } } }
                },
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 8 }, color: '#94a3b8' } } }
            }
        });
    } catch (err) { console.warn('Radar chart error:', err); }
}

// ==========================================================================
// MAP SETUP
// ==========================================================================
function setupMap() {
    const map = L.map('map', { center: [-1.94, 29.87], zoom: 9, zoomControl: false });
    L.control.zoom({ position: 'topright' }).addTo(map);
    const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap'
    });
    darkTile.addTo(map);
    state.map = map;
    state.currentTileLayer = darkTile;
    
    fetch('data/rwanda-districts.geojson')
        .then(res => res.json())
        .then(geoJson => {
            state.districtGeoJson = geoJson;
            addDistrictLayer(geoJson);
        })
        .catch(err => {
            console.error('Failed to load GeoJSON:', err);
            const container = $('map');
            if (container) {
                container.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:center; height:100%; color:#94a3b8; flex-direction:column; padding:20px; text-align:center;">
                        <div style="font-size:3rem; margin-bottom:12px;">🗺️</div>
                        <div style="font-weight:600; font-size:1.1rem; color:#e2e8f0;">Map data loading...</div>
                        <div style="font-size:0.8rem; margin-top:8px;">Ensure data/rwanda-districts.geojson exists</div>
                    </div>
                `;
            }
        });
}

function addStrategicAnchorMarkers() {
    if (!state.map || !state.majorProjects?.projects) return;
    if (state.anchorLayer) { state.map.removeLayer(state.anchorLayer); state.anchorLayer = null; }
    const group = L.layerGroup();
    state.majorProjects.projects.forEach(p => {
        if (!p.lat || !p.lng) return;
        const div = document.createElement('div');
        div.style.cssText = `background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 0 14px rgba(245,158,11,0.9);cursor:pointer;`;
        div.innerHTML = '⭐';
        const icon = L.divIcon({ html: div.outerHTML, className: 'anchor-marker-icon', iconSize: [28, 28], iconAnchor: [14, 14] });
        const marker = L.marker([p.lat, p.lng], { icon, zIndexOffset: 20000 });
        marker.bindPopup(`
            <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:220px; color:#0f172a;">
                <div style="font-weight:800; font-size:1rem; color:#d97706; margin-bottom:4px;">⭐ ${p.name}</div>
                <div style="font-size:0.75rem; font-weight:600; color:#475569; margin-bottom:6px;">${p.type} • ${p.location}</div>
                <div style="font-size:0.75rem; color:#334155; margin-bottom:6px;">${p.cost ? '<strong>Cost:</strong> ' + p.cost : ''} ${p.status ? '• ' + p.status : ''}</div>
                ${p.sub_asset_opportunities ? `<div style="background:#fef3c7; border:1px solid #fde68a; border-radius:6px; padding:6px; font-size:0.7rem; color:#92400e;"><strong>💡 Opportunities:</strong><br/>${p.sub_asset_opportunities}</div>` : ''}
            </div>
        `);
        group.addLayer(marker);
    });
    group.addTo(state.map);
    state.anchorLayer = group;
}

function getPolygonCenter(feature) {
    try {
        if (typeof turf !== 'undefined' && turf.centerOfMass) {
            const center = turf.centerOfMass(feature);
            if (center && center.geometry && center.geometry.coordinates) {
                return [center.geometry.coordinates[1], center.geometry.coordinates[0]];
            }
        }
    } catch (e) {}
    const coords = feature.geometry?.type === 'MultiPolygon' ? feature.geometry.coordinates.flat(2) : feature.geometry?.coordinates?.[0] || [];
    let latSum = 0, lngSum = 0, count = 0;
    coords.forEach(coord => { if (Array.isArray(coord) && coord.length >= 2) { lngSum += coord[0]; latSum += coord[1]; count++; } });
    return count > 0 ? [latSum / count, lngSum / count] : [-1.94, 29.87];
}

function addDistrictLayer(geoJson) {
    const map = state.map;
    if (!map) return;
    if (state.labelLayer) { map.removeLayer(state.labelLayer); state.labelLayer = null; }
    const layer = L.geoJSON(geoJson, {
        style: (feature) => {
            const name = feature.properties?.shapeName || feature.properties?.name || '';
            const isSelected = name === state.currentDistrict;
            const baseColor = getColorForDistrict(name);
            return {
                fillColor: shadeColor(baseColor, isSelected ? 80 : 60),
                fillOpacity: isSelected ? 0.85 : 0.7,
                color: isSelected ? '#ffffff' : baseColor,
                weight: isSelected ? 3 : 1.5
            };
        },
        onEachFeature: (feature, layer) => {
            const name = feature.properties?.shapeName || feature.properties?.name || '';
            const data = state.calculatedDistrictData[name] || state.districtData[name] || {};
            layer.bindTooltip(`
                <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:200px;">
                    <div style="font-weight:700; font-size:1.1rem; color:#e2e8f0; margin-bottom:4px;">${name}</div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:1.3rem; font-weight:800; color:#4C6EF5;">${data.composite_score || 50}</span>
                        <span style="font-size:0.7rem; color:#94a3b8;">Composite Score</span>
                    </div>
                </div>
            `, { className: 'leaflet-tooltip-rwanda', sticky: true, direction: 'top' });
            layer.on('click', () => selectDistrict(name));
        }
    });
    layer.addTo(map);
    state.geoJsonLayer = layer;
    const labelGroup = L.layerGroup();
    geoJson.features.forEach(feature => {
        const name = feature.properties?.shapeName || feature.properties?.name || '';
        if (!name) return;
        const [centerLat, centerLng] = getPolygonCenter(feature);
        const div = document.createElement('div');
        div.style.cssText = `font-size:13px;font-weight:800;color:#000;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:0.4px;text-align:center;white-space:nowrap;pointer-events:none;padding:2px 6px;transform:translate(-50%,-50%);text-shadow:0 0 10px rgba(255,255,255,1),0 0 6px rgba(255,255,255,0.95),0 0 3px rgba(255,255,255,0.9);`;
        div.textContent = name;
        const icon = L.divIcon({ html: div.outerHTML, className: 'district-label-fixed', iconSize: [0, 0], iconAnchor: [0, 0] });
        labelGroup.addLayer(L.marker([centerLat, centerLng], { icon, interactive: false, zIndexOffset: 10000 }));
    });
    labelGroup.addTo(map);
    state.labelLayer = labelGroup;
}

function updateMapHighlight(districtName) {
    if (state.geoJsonLayer && state.districtGeoJson) {
        state.geoJsonLayer.remove();
        if (state.labelLayer) { state.map.removeLayer(state.labelLayer); state.labelLayer = null; }
        addDistrictLayer(state.districtGeoJson);
    }
}

// ==========================================================================
// ANALYTICS
// ==========================================================================
function renderAnalytics() {
    const current = state.currentDistrict || 'Gasabo';
    renderNeighborMatrix(current);
    renderNationalRankings();
    renderExecutiveInsights(current);
}

function renderNeighborMatrix(districtName) {
    const container = $('analytics-neighbor-matrix');
    if (!container) return;
    const neighbors = state.districtNeighbors[districtName] || [];
    if (neighbors.length === 0) {
        container.innerHTML = `<span style="color:#94a3b8; font-size:0.78rem;">No neighbor data recorded for ${districtName}.</span>`;
        return;
    }
    const list = [districtName, ...neighbors];
    container.innerHTML = `
        <div style="margin-bottom:8px; font-size:0.78rem; color:#e2e8f0;">Comparing <strong style="color:#10b981;">${districtName}</strong> against its <strong>${neighbors.length} neighbors</strong>:</div>
        <div style="overflow-x:auto; margin-bottom:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:0.72rem; text-align:left;">
                <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:#94a3b8;">
                    <th style="padding:4px;">District</th>
                    <th style="padding:4px;">Score</th>
                    <th style="padding:4px;">Land</th>
                    <th style="padding:4px;">Labor</th>
                    <th style="padding:4px;">Capital</th>
                    <th style="padding:4px;">Entrepreneurship</th>
                </tr></thead>
                <tbody>${list.map(name => {
                    const d = state.calculatedDistrictData[name] || {};
                    const isSelf = name === districtName;
                    return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04); ${isSelf ? 'background:rgba(16,185,129,0.15); font-weight:700;' : 'cursor:pointer;'}" ${!isSelf ? `onclick="selectDistrict('${name}')"` : ''}>
                        <td style="padding:4px; color:${isSelf ? '#10b981' : '#e2e8f0'};">${name} ${isSelf ? '⭐' : ''}</td>
                        <td style="padding:4px; font-weight:700; color:#4C6EF5;">${d.composite_score || 0}</td>
                        <td style="padding:4px;">${d.land || 0}</td>
                        <td style="padding:4px;">${d.labor || 0}</td>
                        <td style="padding:4px;">${d.capital || 0}</td>
                        <td style="padding:4px;">${d.entrepreneurship || 0}</td>
                    </tr>`;
                }).join('')}</tbody>
            </table>
        </div>
    `;
}

function renderNationalRankings() {
    const container = $('analytics-top-opportunities');
    const rankingsContainer = $('analytics-district-rankings');
    if (!container || !rankingsContainer) return;
    const data = state.districts.map(name => {
        const d = state.calculatedDistrictData[name] || state.districtData[name];
        return { name, composite: d?.composite_score || 0 };
    }).sort((a, b) => b.composite - a.composite);
    container.innerHTML = data.slice(0, 5).map((d, i) => `
        <div class="analytics-item" style="cursor:pointer;" onclick="selectDistrict('${d.name}')">
            <span class="rank">#${i+1}</span>
            <span class="name">${d.name}</span>
            <span class="score">${d.composite}</span>
            <span class="${i === 0 ? 'badge-high' : i < 3 ? 'badge-medium' : 'badge-low'}">${i === 0 ? '🔥 Top 1' : i < 3 ? '📈 Top 3' : '⭐ Leader'}</span>
        </div>
    `).join('');
    rankingsContainer.innerHTML = data.map((d, i) => `
        <div class="analytics-item" style="cursor:pointer; ${d.name === state.currentDistrict ? 'background:rgba(76,110,245,0.15);' : ''}" onclick="selectDistrict('${d.name}')">
            <span class="rank">#${i+1}</span>
            <span class="name">${d.name}</span>
            <span class="score">${d.composite}</span>
        </div>
    `).join('');
}

function renderExecutiveInsights(districtName) {
    const data = state.calculatedDistrictData[districtName] || state.districtData[districtName];
    const container = $('analytics-insights');
    if (!container || !data) return;
    const analysis = calculateOpportunityAnalysis(data);
    container.innerHTML = `
        <div style="margin-bottom:6px; color:#e2e8f0; font-weight:700;">📌 ${districtName} Executive Briefing</div>
        <div style="margin-bottom:4px;">• Investment Archetype: <strong>${analysis.archetypeIcon} ${analysis.archetype}</strong> (${analysis.priority} Priority)</div>
        <div style="margin-bottom:4px;">• Short-Term Opportunity: <strong style="color:#10b981;">+${analysis.shortTermPotential} pts</strong> (Elevate ${analysis.lowest.name})</div>
        <div style="margin-top:6px; background:rgba(255,255,255,0.04); padding:6px 8px; border-radius:6px; font-size:0.75rem;">💡 <strong>Strategic Direction:</strong> ${analysis.strategy}</div>
    `;
}

// ==========================================================================
// TILE TOGGLE
// ==========================================================================
function setupTileToggle() {
    const darkBtn = $('tile-dark');
    const lightBtn = $('tile-light');
    if (darkBtn) darkBtn.addEventListener('click', () => setTile('dark'));
    if (lightBtn) lightBtn.addEventListener('click', () => setTile('light'));
}

function setTile(mode) {
    const map = state.map;
    if (!map) return;
    if (state.currentTileLayer) map.removeLayer(state.currentTileLayer);
    const tile = L.tileLayer(mode === 'dark' 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', 
        { attribution: '&copy; OpenStreetMap' }
    );
    tile.addTo(map);
    state.currentTileLayer = tile;
    const darkBtn = $('tile-dark');
    const lightBtn = $('tile-light');
    if (darkBtn) darkBtn.classList.toggle('active', mode === 'dark');
    if (lightBtn) lightBtn.classList.toggle('active', mode === 'light');
}

// ==========================================================================
// TABS
// ==========================================================================
function setupAnalyticsTabs() {
    const tabMap = $('tab-map');
    const tabAnalytics = $('tab-analytics');
    const tabStrategic = $('tab-strategic');
    const mapView = $('map-view');
    const analyticsView = $('analytics-view');
    const strategicView = $('strategic-view');
    if (tabMap) {
        tabMap.addEventListener('click', function() {
            this.classList.add('active');
            if (tabAnalytics) tabAnalytics.classList.remove('active');
            if (tabStrategic) tabStrategic.classList.remove('active');
            if (mapView) mapView.style.display = 'block';
            if (analyticsView) analyticsView.classList.remove('visible');
            if (strategicView) strategicView.style.display = 'none';
        });
    }
    if (tabAnalytics) {
        tabAnalytics.addEventListener('click', function() {
            this.classList.add('active');
            if (tabMap) tabMap.classList.remove('active');
            if (tabStrategic) tabStrategic.classList.remove('active');
            if (mapView) mapView.style.display = 'none';
            if (analyticsView) analyticsView.classList.add('visible');
            if (strategicView) strategicView.style.display = 'none';
            renderAnalytics();
        });
    }
    if (tabStrategic) {
        tabStrategic.addEventListener('click', function() {
            this.classList.add('active');
            if (tabMap) tabMap.classList.remove('active');
            if (tabAnalytics) tabAnalytics.classList.remove('active');
            if (mapView) mapView.style.display = 'none';
            if (analyticsView) analyticsView.classList.remove('visible');
            if (strategicView) strategicView.style.display = 'flex';
            renderStrategicDocuments();
        });
    }
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
    if (districtDropdown) districtDropdown.addEventListener('change', (e) => selectDistrict(e.target.value));
    if (analyticsDistrictDropdown) analyticsDistrictDropdown.addEventListener('change', (e) => selectDistrict(e.target.value));
    
    if (btnViewDetails) {
        btnViewDetails.addEventListener('click', () => {
            if (appWrapper) {
                appWrapper.classList.add('mode-details');
                appWrapper.classList.remove('mode-overview');
            }
            setTimeout(() => {
                if (state.currentDistrict) {
                    const data = state.calculatedDistrictData[state.currentDistrict] || state.districtData[state.currentDistrict];
                    updateRadarChart(data);
                    updateGapInsights(data);
                }
            }, 60);
        });
    }
    
    if (btnBackToOverview) {
        btnBackToOverview.addEventListener('click', () => {
            if (appWrapper) {
                appWrapper.classList.add('mode-overview');
                appWrapper.classList.remove('mode-details');
            }
        });
    }
    
    if (btnAdminPanel) {
        btnAdminPanel.addEventListener('click', () => {
            if (appWrapper) {
                appWrapper.classList.toggle('mode-admin');
                appWrapper.classList.remove('mode-details');
                appWrapper.classList.add('mode-overview');
            }
            setTimeout(renderAdminAssetLists, 300);
        });
    }
    
    if (btnAdminBack) {
        btnAdminBack.addEventListener('click', () => {
            if (appWrapper) appWrapper.classList.remove('mode-admin');
        });
    }
    
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            if (loginModal) loginModal.classList.add('show');
        });
    }
    
    if (loginClose) {
        loginClose.addEventListener('click', () => { 
            if (loginModal) loginModal.classList.remove('show'); 
            if (loginError) loginError.style.display = 'none'; 
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (loginUsername.value === 'admin' && loginPassword.value === 'admin123') {
                state.isLoggedIn = true;
                if (btnLogin) {
                    btnLogin.textContent = '👤 Admin';
                    btnLogin.classList.add('logged-in');
                }
                if (btnAdminPanel) btnAdminPanel.classList.add('visible');
                if (loginModal) loginModal.classList.remove('show');
                if (loginError) loginError.style.display = 'none';
            } else {
                if (loginError) loginError.style.display = 'block';
            }
        });
    }
    
    const submitAsset = $('admin-submit-asset');
    if (submitAsset) {
        submitAsset.addEventListener('click', async () => {
            const name = $('admin-asset-name')?.value.trim();
            const type = $('admin-asset-type')?.value;
            const lat = parseFloat($('admin-asset-lat')?.value);
            const lng = parseFloat($('admin-asset-lng')?.value);
            const msg = $('admin-asset-status-msg');
            if (!name || !type || isNaN(lat) || isNaN(lng)) {
                if (msg) { msg.textContent = '❌ Please fill in all required fields.'; msg.style.color = '#ef4444'; }
                return;
            }
            const newAsset = { name, type, lat, lng, status: $('admin-asset-status')?.value || 'operational', capacity: $('admin-asset-capacity')?.value || '', description: $('admin-asset-desc')?.value || '', id: Date.now(), uploaded_at: new Date().toISOString() };
            state.assets.push(newAsset);
            if (msg) { msg.textContent = `✅ Asset submitted! ID: ${newAsset.id}`; msg.style.color = '#4ade80'; }
            recalculateDynamicDistrictScores();
            if (state.currentDistrict) selectDistrict(state.currentDistrict);
            renderAdminAssetLists();
        });
    }
    
    const submitNews = $('admin-submit-news');
    if (submitNews) {
        submitNews.addEventListener('click', async () => {
            const title = $('admin-news-title')?.value.trim();
            const district = $('admin-news-district')?.value;
            const msg = $('admin-news-status-msg');
            if (!title || !district) {
                if (msg) { msg.textContent = '❌ Title and Target District are required.'; msg.style.color = '#ef4444'; }
                return;
            }
            const newNews = {
                id: 'news_' + Date.now(),
                title: title,
                source: $('admin-news-source')?.value || 'Unknown',
                district: district,
                target_dimension: $('admin-news-dimension')?.value || 'capital',
                impact_score: parseFloat($('admin-news-impact')?.value) || 5,
                summary: $('admin-news-summary')?.value || '',
                published_at: new Date().toISOString()
            };
            state.curatedNews.push(newNews);
            if (msg) { msg.textContent = `✅ Signal ingested! ID: ${newNews.id}`; msg.style.color = '#4ade80'; }
            recalculateDynamicDistrictScores();
            if (state.currentDistrict) selectDistrict(state.currentDistrict);
        });
    }
    
    const submitSchool = $('admin-submit-school');
    if (submitSchool) {
        submitSchool.addEventListener('click', async () => {
            const name = $('admin-school-name')?.value.trim();
            const district = $('admin-school-district')?.value;
            const rawPrograms = $('admin-school-programs')?.value.trim();
            const msg = $('admin-school-status-msg');
            if (!name || !district || !rawPrograms) {
                if (msg) { msg.textContent = '❌ Name, District, and Programs are required.'; msg.style.color = '#ef4444'; }
                return;
            }
            const newSchool = {
                name: name,
                district: district,
                level: $('admin-school-level')?.value || 'TVET',
                programs: rawPrograms.split(',').map(p => p.trim()).filter(Boolean),
                enrollment: parseInt($('admin-school-enrollment')?.value) || 500
            };
            state.schoolsDirectory.schools.push(newSchool);
            if (msg) { msg.textContent = `✅ School added into Skills Pipeline!`; msg.style.color = '#4ade80'; }
            recalculateDynamicDistrictScores();
            if (state.currentDistrict) selectDistrict(state.currentDistrict);
        });
    }
    
    const submitLand = $('admin-submit-land-center');
    if (submitLand) {
        submitLand.addEventListener('click', async () => {
            const district = $('admin-land-district')?.value;
            const msg = $('admin-land-status-msg');
            if (!district) {
                if (msg) { msg.textContent = '❌ Target District is required.'; msg.style.color = '#ef4444'; }
                return;
            }
            if (!state.landCenterData.districts) state.landCenterData.districts = {};
            state.landCenterData.districts[district] = {
                land_use_score: parseInt($('admin-land-use')?.value) || 70,
                infrastructure_density: parseInt($('admin-land-infra')?.value) || 70,
                zoning_flexibility: parseInt($('admin-land-zoning')?.value) || 70,
                urbanization_pattern: parseInt($('admin-land-urban')?.value) || 70,
                environmental_suitability: parseInt($('admin-land-env')?.value) || 70
            };
            if (msg) { msg.textContent = `✅ Land Center data saved for ${district}!`; msg.style.color = '#4ade80'; }
            recalculateDynamicDistrictScores();
            if (state.currentDistrict) selectDistrict(state.currentDistrict);
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && appWrapper && appWrapper.classList.contains('mode-details')) {
            appWrapper.classList.add('mode-overview');
            appWrapper.classList.remove('mode-details');
        }
    });
}

function renderAdminAssetLists() {
    const container = $('admin-all-assets-list');
    if (!container) return;
    if (state.assets.length === 0) {
        container.innerHTML = '<span style="color:#94a3b8;">No assets submitted yet.</span>';
        return;
    }
    container.innerHTML = state.assets.map(a => `
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px; margin-bottom:6px;">
            <div style="display:flex; justify-content:space-between;">
                <strong style="color:#e2e8f0;">${a.name}</strong>
                <span style="color:#94a3b8; font-size:0.7rem;">${a.type}</span>
            </div>
            <div style="font-size:0.7rem; color:#64748b;">${a.lat}, ${a.lng} • ${a.status || 'active'}</div>
        </div>
    `).join('');
}

// ==========================================================================
// AUTO-INGESTION
// ==========================================================================
const INGESTION_CONFIG = {
    UPDATE_INTERVAL: 60 * 60 * 1000,
    MIN_IMPACT_SCORE: 3,
    SOURCES: [
        { id: 'new-times', name: 'The New Times (Rwanda)', type: 'rss', url: 'https://www.newtimes.co.rw/rss' },
        { id: 'rba', name: 'Rwanda Broadcasting Agency', type: 'rss', url: 'https://www.rba.co.rw/rss' },
        { id: 'minecofin', name: 'MINECOFIN', type: 'html', url: 'https://www.minecofin.gov.rw/news' },
        { id: 'rdb', name: 'Rwanda Development Board', type: 'html', url: 'https://www.rdb.rw/news' },
        { id: 'minagri', name: 'MINAGRI', type: 'html', url: 'https://www.minagri.gov.rw/news' }
    ],
    DISTRICT_SYNONYMS: {
        'Kigali': ['Gasabo', 'Kicukiro', 'Nyarugenge'],
        'Northern': ['Musanze', 'Burera', 'Gicumbi', 'Rulindo', 'Gakenke'],
        'Southern': ['Nyanza', 'Gisagara', 'Nyaruguru', 'Huye', 'Nyamagabe', 'Ruhango', 'Muhanga', 'Kamonyi'],
        'Eastern': ['Rwamagana', 'Nyagatare', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Bugesera'],
        'Western': ['Karongi', 'Rutsiro', 'Rubavu', 'Nyabihu', 'Ngororero', 'Rusizi', 'Nyamasheke']
    }
};

const ingestionState = {
    processedIds: new Set(),
    lastRun: null,
    totalIngested: 0,
    isRunning: false,
    intervalId: null
};

const IngestionEvents = {
    listeners: {},
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(cb => { try { cb(data); } catch (e) { console.error('Event error:', e); } });
    },
    on(event, cb) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
        return () => { this.listeners[event] = this.listeners[event].filter(fn => fn !== cb); };
    }
};

const AutoIngestion = {
    start() {
        if (ingestionState.isRunning) {
            console.log('⚠️ Auto-ingestion already running');
            return;
        }
        console.log('🚀 Starting Auto-Ingestion Engine...');
        ingestionState.isRunning = true;
        this.run();
        ingestionState.intervalId = setInterval(() => { this.run(); }, INGESTION_CONFIG.UPDATE_INTERVAL);
        console.log(`✅ Auto-Ingestion running (checking every ${INGESTION_CONFIG.UPDATE_INTERVAL / 60000} minutes)`);
    },
    stop() {
        if (ingestionState.intervalId) {
            clearInterval(ingestionState.intervalId);
            ingestionState.intervalId = null;
        }
        ingestionState.isRunning = false;
        console.log('🛑 Auto-Ingestion stopped');
    },
    async run() {
        console.log(`\n🔄 Auto-Ingestion run #${ingestionState.totalIngested + 1} at ${new Date().toISOString()}`);
        let newItems = 0;
        for (const source of INGESTION_CONFIG.SOURCES) {
            try {
                console.log(`  📡 Fetching: ${source.name}...`);
                const articles = await this.fetchSource(source);
                for (const article of articles) {
                    const id = this.generateId(article, source);
                    if (ingestionState.processedIds.has(id)) continue;
                    const analysis = this.analyzeImpact(article);
                    if (analysis.impactScore >= INGESTION_CONFIG.MIN_IMPACT_SCORE) {
                        await this.ingestItem(article, source, analysis);
                        ingestionState.processedIds.add(id);
                        newItems++;
                        console.log(`    ✅ Ingested: ${article.title.substring(0, 60)}... (impact: ${analysis.impactScore}/10)`);
                    } else {
                        console.log(`    ⏭️ Skipped: ${article.title.substring(0, 40)}... (impact: ${analysis.impactScore}/10)`);
                    }
                }
            } catch (err) {
                console.error(`  ❌ Error fetching ${source.name}:`, err.message);
            }
        }
        ingestionState.lastRun = new Date();
        ingestionState.totalIngested += newItems;
        if (newItems > 0) {
            console.log(`📊 Ingested ${newItems} new items this run`);
            IngestionEvents.emit('data-updated', { newItems, timestamp: ingestionState.lastRun });
            updateIngestionStatus();
        } else {
            console.log('📊 No new items to ingest');
        }
        console.log(`✅ Run complete (${ingestionState.totalIngested} total ingested so far)\n`);
    },
    async fetchSource(source) {
        if (source.type === 'rss') return await this.fetchRSS(source.url);
        else if (source.type === 'html') return await this.fetchHTML(source.url);
        return [];
    },
    async fetchRSS(url) {
        try {
            const response = await fetch(url);
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            if (xml.querySelector('parsererror')) throw new Error('Invalid RSS feed');
            const items = xml.querySelectorAll('item');
            return Array.from(items).map(item => ({
                title: item.querySelector('title')?.textContent?.trim() || '',
                summary: item.querySelector('description')?.textContent?.trim() || '',
                link: item.querySelector('link')?.textContent?.trim() || '',
                published_at: item.querySelector('pubDate')?.textContent?.trim() || '',
                guid: item.querySelector('guid')?.textContent?.trim() || item.querySelector('link')?.textContent?.trim() || ''
            }));
        } catch (err) {
            console.error('RSS fetch error:', err);
            return [];
        }
    },
    async fetchHTML(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const selectors = ['article', '.post', '.news-item', '.article', '.news', '.item'];
            let articles = [];
            for (const selector of selectors) {
                const elements = doc.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach(el => {
                        const titleEl = el.querySelector('h2, h3, .title, .headline');
                        const summaryEl = el.querySelector('p, .excerpt, .description, .summary');
                        const linkEl = el.querySelector('a');
                        const title = titleEl?.textContent?.trim() || '';
                        const summary = summaryEl?.textContent?.trim() || '';
                        const link = linkEl?.href || '';
                        if (title) {
                            articles.push({ title, summary, link, published_at: '', guid: `html_${title.substring(0, 50)}` });
                        }
                    });
                    break;
                }
            }
            return articles;
        } catch (err) {
            console.error('HTML fetch error:', err);
            return [];
        }
    },
    generateId(article, source) {
        return `${source.id}_${article.guid || article.link || article.title.substring(0, 50)}`;
    },
    analyzeImpact(article) {
        const text = `${article.title} ${article.summary}`.toLowerCase();
        const districts = this.detectDistricts(text);
        const dimension = this.detectDimension(text);
        const impactScore = this.calculateImpactScore(text);
        return {
            districts: districts.length > 0 ? districts : ['All'],
            dimension: dimension,
            impactScore: Math.min(10, Math.max(1, impactScore)),
            strategicSummary: this.generateSummary(text, districts, dimension, impactScore),
            confidence: impactScore > 6 ? 'High' : (impactScore > 4 ? 'Medium' : 'Low')
        };
    },
    detectDistricts(text) {
        const found = new Set();
        const allDistricts = [
            'Gasabo', 'Kicukiro', 'Nyarugenge', 'Musanze', 'Burera', 'Gicumbi',
            'Rulindo', 'Gakenke', 'Nyanza', 'Gisagara', 'Nyaruguru', 'Huye',
            'Nyamagabe', 'Ruhango', 'Muhanga', 'Kamonyi', 'Rwamagana', 'Nyagatare',
            'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Bugesera', 'Karongi',
            'Rutsiro', 'Rubavu', 'Nyabihu', 'Ngororero', 'Rusizi', 'Nyamasheke'
        ];
        allDistricts.forEach(district => {
            if (text.includes(district.toLowerCase())) found.add(district);
        });
        for (const [region, districts] of Object.entries(INGESTION_CONFIG.DISTRICT_SYNONYMS)) {
            if (text.includes(region.toLowerCase())) {
                districts.forEach(d => found.add(d));
            }
        }
        return Array.from(found);
    },
    detectDimension(text) {
        const keywords = {
            land: ['land', 'construction', 'infrastructure', 'building', 'housing', 'real estate', 'zoning', 'agriculture', 'farm'],
            labor: ['labor', 'employment', 'jobs', 'skills', 'training', 'education', 'workforce', 'workers'],
            capital: ['investment', 'funding', 'capital', 'finance', 'bank', 'loan', 'credit', 'budget', 'money', 'million', 'billion'],
            entrepreneurship: ['business', 'entrepreneur', 'startup', 'trade', 'market', 'commerce', 'small business']
        };
        let scores = { land: 0, labor: 0, capital: 0, entrepreneurship: 0 };
        for (const [dimension, words] of Object.entries(keywords)) {
            for (const word of words) {
                if (text.includes(word)) scores[dimension] += 1;
            }
        }
        let maxScore = 0, maxDimension = 'capital';
        for (const [dimension, score] of Object.entries(scores)) {
            if (score > maxScore) { maxScore = score; maxDimension = dimension; }
        }
        return maxDimension;
    },
    calculateImpactScore(text) {
        let score = 3;
        const highImpact = ['million', 'billion', 'investment', 'deal', 'agreement', 'construction', 
                           'development', 'infrastructure', 'launch', 'new', 'expansion', 'build',
                           'announce', 'sign', 'partnership'];
        const mediumImpact = ['increase', 'growth', 'improve', 'develop', 'plan', 'project', 
                            'program', 'initiative', 'support', 'enhance', 'boost'];
        for (const word of highImpact) { if (text.includes(word)) score += 0.8; }
        for (const word of mediumImpact) { if (text.includes(word)) score += 0.4; }
        if (/\$\d+/.test(text)) score += 1.5;
        if (/\d+%/.test(text)) score += 1.0;
        if (/\d+,?\d+/.test(text)) score += 0.5;
        return Math.min(10, Math.round(score));
    },
    generateSummary(text, districts, dimension, impactScore) {
        const districtStr = districts.length > 0 ? districts.join(', ') : 'Rwanda-wide';
        const dimensionMap = { land: 'Land & Infrastructure', labor: 'Labor & Skills', capital: 'Capital & Finance', entrepreneurship: 'Entrepreneurship & Business' };
        return `Impact on ${districtStr} in ${dimensionMap[dimension] || 'multiple dimensions'}. Impact score: ${impactScore}/10.`;
    },
    async ingestItem(article, source, analysis) {
        const newsItem = {
            id: this.generateId(article, source),
            title: article.title,
            summary: article.summary || article.title,
            source: source.name,
            sourceId: source.id,
            link: article.link || '',
            published_at: article.published_at || new Date().toISOString(),
            ingested_at: new Date().toISOString(),
            district: analysis.districts[0] || 'All',
            target_dimension: analysis.dimension,
            impact_score: analysis.impactScore,
            confidence: analysis.confidence,
            strategic_summary: analysis.strategicSummary
        };
        if (typeof state !== 'undefined' && state) {
            if (!state.curatedNews) state.curatedNews = [];
            state.curatedNews.push(newsItem);
            if (typeof recalculateDynamicDistrictScores === 'function') recalculateDynamicDistrictScores();
            if (typeof selectDistrict === 'function' && state.currentDistrict) selectDistrict(state.currentDistrict);
        }
        IngestionEvents.emit('news-ingested', newsItem);
        updateIngestionStatus();
        return newsItem;
    },
    getStatus() {
        return {
            isRunning: ingestionState.isRunning,
            lastRun: ingestionState.lastRun,
            totalIngested: ingestionState.totalIngested,
            processedCount: ingestionState.processedIds.size
        };
    }
};

window.AutoIngestion = AutoIngestion;
window.IngestionEvents = IngestionEvents;
window.selectDistrict = selectDistrict;
window.__state = state;

console.log('✅ Rwanda Opportunity Map loaded successfully!');
console.log('📖 Usage: AutoIngestion.start() | AutoIngestion.stop() | AutoIngestion.getStatus()');

// ==========================================================================
// END OF APP.JS
// ==========================================================================