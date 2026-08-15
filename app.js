// ==========================================================================
// Rwanda Opportunity Map - Investment Intelligence Platform ($5M USD Prototype)
// ==========================================================================

// ==========================================================================
// DOM REFS - All elements from HTML
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
    activeInfraFilter: null,
    map: null,
    geoJsonLayer: null,
    labelLayer: null,
    anchorLayer: null,
    districtGeoJson: null,
    isLoggedIn: false,
    assets: [],
    currentTileLayer: null,
    strategicDocuments: []
};

// ==========================================================================
// PROGRAM ECONOMIC WEIGHTS MAPPING (1-10 Scale)
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

const INFRA_LABELS = {
    construction: { label: 'Construction Sites', icon: '🏗️', color: '#f59e0b' },
    hardware: { label: 'Hardware Stores', icon: '🏪', color: '#10b981' },
    commercial: { label: 'Commercial Buildings', icon: '🏢', color: '#3b82f6' },
    industrial: { label: 'Industrial Facilities', icon: '🏭', color: '#8b5cf6' },
    education: { label: 'Educational Institutions', icon: '🏫', color: '#ec4899' },
    health: { label: 'Health Facilities', icon: '🏥', color: '#ef4444' },
    hospitality: { label: 'Hotels & Tourism Lodges', icon: '🏨', color: '#06b6d4' },
    banking: { label: 'Bank Branches & SACCOs', icon: '🏦', color: '#84cc16' }
};

// ==========================================================================
// PROVINCE COLOR SCHEME
// ==========================================================================
function getColorForDistrict(districtName) {
    if (['Nyarugenge', 'Gasabo', 'Kicukiro'].includes(districtName)) return '#4C6EF5';
    if (['Musanze', 'Burera', 'Gicumbi', 'Rulindo', 'Gakenke'].includes(districtName)) return '#37B24D';
    if (['Nyanza', 'Gisagara', 'Nyaruguru', 'Huye', 'Nyamagabe', 'Ruhango', 'Muhanga', 'Kamonyi'].includes(districtName)) return '#F59F00';
    if (['Rwamagana', 'Nyagatare', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Bugesera'].includes(districtName)) return '#E64980';
    if (['Karongi', 'Rutsiro', 'Rubavu', 'Nyabihu', 'Ngororero', 'Rusizi', 'Nyamasheke'].includes(districtName)) return '#7048E8';
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
// INIT
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Rwanda Opportunity Map initializing ($5M Prototype)...');
    setupEventListeners();
    setupMap();
    setupTileToggle();
    setupAnalyticsTabs();
    setupInfraPillListeners();
    setupDocFilters();
    loadData();
});

// ==========================================================================
// DATA LOADING WITH PROGRESSIVE INSTANT RENDERING
// ==========================================================================
async function loadData() {
    try {
        console.log('Loading base dataset...');
        const distRes = await fetch('data.json');
        state.districtData = await distRes.json();
        state.districts = Object.keys(state.districtData);
        populateDistrictDropdowns();

        recalculateDynamicDistrictScores();
        if (state.districts.length > 0) {
            selectDistrict(state.districts[0]);
        }
        console.log('Baseline scores rendered on page landing');

        loadSecondaryDatasets();
    } catch (err) {
        console.error('Failed to load base dataset:', err);
        try {
            const agRes = await fetch('data/agriculture_data.json');
            const agData = await agRes.json();
            const distKeys = Object.keys(agData.districts || {});
            if (distKeys.length > 0) {
                state.districts = distKeys;
                state.districts.forEach(d => {
                    if (!state.districtData[d]) {
                        state.districtData[d] = { land: 50, labor: 50, capital: 50, entrepreneurship: 50, composite_score: 50 };
                    }
                });
                populateDistrictDropdowns();
                recalculateDynamicDistrictScores();
                if (state.districts.length > 0) {
                    selectDistrict(state.districts[0]);
                }
            }
        } catch (e) {
            console.error('Fallback failed:', e);
        }
    }
}

async function loadSecondaryDatasets() {
    try {
        const [infraRes, neighRes, agRes, projRes, osmRes, schRes, lcRes, docRes] = await Promise.allSettled([
            fetch('data/district_infra_curated.json').then(r => r.json()),
            fetch('data/district_neighbors.json').then(r => r.json()),
            fetch('data/agriculture_data.json').then(r => r.json()),
            fetch('major_projects.json').then(r => r.json()).catch(() => ({ projects: [] })),
            fetch('data/osm_cache.json').then(r => r.json()).catch(() => ({ elements: [] })),
            fetch('data/schools_directory.json').then(r => r.json()),
            fetch('data/land_center_data.json').then(r => r.json()),
            fetch('strategic_documents.json').then(r => r.json()).catch(() => ({ documents: [] }))
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
            updateDocumentStatus();
            renderStrategicDocuments();
        }

        await loadAssets();
        await loadCuratedNews();

        recalculateDynamicDistrictScores();
        addStrategicAnchorMarkers();

        if (state.currentDistrict) {
            selectDistrict(state.currentDistrict);
        }
        console.log('Full intelligence pipeline updated dynamically!');
    } catch (err) {
        console.error('Error loading secondary datasets:', err);
    }
}

async function loadAssets() {
    try {
        const res = await fetch('data/assets.json');
        if (res.ok) state.assets = (await res.json()).assets || [];
        else state.assets = [];
    } catch {
        state.assets = [];
    }
    renderAssetsList();
    renderAdminAssetLists();
}

async function loadCuratedNews() {
    try {
        const res = await fetch('data/curated_news.json');
        if (res.ok) state.curatedNews = (await res.json()).curated_news || [];
        else state.curatedNews = [];
    } catch {
        state.curatedNews = [];
    }
}

// ==========================================================================
// STRATEGIC DOCUMENTS FUNCTIONS
// ==========================================================================

let currentDocFilter = 'all';
let selectedDocId = null;

function updateDocumentStatus() {
    const docs = state.strategicDocuments || [];
    const foundEl = $('doc-status-found');
    const pendingEl = $('doc-status-pending');
    const targetsEl = $('doc-status-total-targets');

    if (foundEl) foundEl.textContent = docs.length;

    const districtsWithDocs = new Set();
    docs.forEach(doc => {
        if (doc.districts) {
            doc.districts.forEach(d => districtsWithDocs.add(d));
        }
    });
    const pendingCount = 30 - districtsWithDocs.size;
    if (pendingEl) pendingEl.textContent = pendingCount;

    let totalTargets = 0;
    docs.forEach(doc => {
        totalTargets += (doc.targets || []).length;
    });
    if (targetsEl) targetsEl.textContent = totalTargets;
}

function renderStrategicDocuments() {
    const container = $('strategic-documents-list');
    if (!container) return;

    let filtered = state.strategicDocuments || [];
    if (currentDocFilter !== 'all') {
        filtered = filtered.filter(doc => doc.level === currentDocFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">No documents found for this filter.</span>';
        return;
    }

    container.innerHTML = filtered.map(doc => `
        <div class="doc-item" data-id="${doc.id}" onclick="showDocumentDetail('${doc.id}')">
            <div>
                <div style="font-weight:600; color:#e2e8f0; font-size:0.8rem;">${doc.title}</div>
                <div style="font-size:0.65rem; color:#94a3b8;">
                    ${doc.level} • ${doc.type} • ${doc.districts ? doc.districts.join(', ') : 'All'}
                </div>
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

    selectedDocId = docId;

    const detailView = $('document-detail-view');
    if (!detailView) return;
    detailView.style.display = 'block';

    const titleEl = $('doc-detail-title');
    const levelEl = $('doc-detail-level');
    const typeEl = $('doc-detail-type');
    const districtsEl = $('doc-detail-districts');
    const sourceEl = $('doc-detail-source');
    const urlEl = $('doc-detail-url');
    const publishedEl = $('doc-detail-published');
    const verifiedEl = $('doc-detail-verified');
    const targetsContainer = $('doc-detail-targets');
    const notesEl = $('doc-detail-notes-text');

    if (titleEl) titleEl.textContent = doc.title;
    if (levelEl) levelEl.textContent = doc.level;
    if (typeEl) typeEl.textContent = doc.type;
    if (districtsEl) districtsEl.textContent = doc.districts ? doc.districts.join(', ') : 'All';
    if (sourceEl) sourceEl.textContent = doc.source;
    if (urlEl) {
        if (doc.url && doc.url !== '') {
            urlEl.innerHTML = `<a href="${doc.url}" target="_blank" style="color:#4C6EF5; text-decoration:underline;">🔗 View Source</a>`;
        } else {
            urlEl.innerHTML = '';
        }
    }
    if (publishedEl) publishedEl.textContent = doc.published_at || '--';
    if (verifiedEl) verifiedEl.textContent = doc.last_verified || '--';
    if (notesEl) notesEl.textContent = doc.notes || '--';

    if (targetsContainer) {
        const targets = doc.targets || [];
        if (targets.length === 0) {
            targetsContainer.innerHTML = '<span style="color:#94a3b8; font-size:0.75rem;">No targets defined for this document.</span>';
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
    }

    detailView.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeDocumentDetail() {
    const detailView = $('document-detail-view');
    if (detailView) detailView.style.display = 'none';
    selectedDocId = null;
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
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDocumentDetail);
    }
}

// Make functions globally accessible
window.showDocumentDetail = showDocumentDetail;
window.closeDocumentDetail = closeDocumentDetail;

// ==========================================================================
// SKILLS PIPELINE & LAND CENTER SCORING FUNCTIONS
// ==========================================================================
function calculateSchoolsContribution(districtName) {
    let landBoost = 0;
    let laborBoost = 0;
    let capitalBoost = 0;
    let entrepreneurshipBoost = 0;
    let totalEnrollment = 0;
    
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

            if (!programStats[matchedCategory]) {
                programStats[matchedCategory] = { name: matchedCategory, count: 0, enrollment: 0 };
            }
            programStats[matchedCategory].count += 1;
            programStats[matchedCategory].enrollment += enrollment;

            const w = PROGRAM_WEIGHTS[matchedCategory];
            landBoost += (w.land * 0.15 * sizeFactor);
            laborBoost += (w.labor * 0.15 * sizeFactor);
            capitalBoost += (w.capital * 0.15 * sizeFactor);
            entrepreneurshipBoost += (w.entrepreneurship * 0.15 * sizeFactor);
        });
    });

    const topPrograms = Object.values(programStats)
        .sort((a, b) => b.enrollment - a.enrollment)
        .slice(0, 4);

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
    const districtData = (state.landCenterData?.districts || {})[districtName] || {
        land_use_score: 65,
        infrastructure_density: 55,
        zoning_flexibility: 60,
        urbanization_pattern: 55,
        environmental_suitability: 70
    };

    const landUse = districtData.land_use_score || 60;
    const infraDensity = districtData.infrastructure_density || 50;
    const zoningFlex = districtData.zoning_flexibility || 60;
    const urbanization = districtData.urbanization_pattern || 50;
    const envSuitability = districtData.environmental_suitability || 70;

    const compositeScore = Math.round(
        (landUse * 0.30) +
        (infraDensity * 0.25) +
        (zoningFlex * 0.20) +
        (urbanization * 0.15) +
        (envSuitability * 0.10)
    );

    return {
        landUseScore: landUse,
        infrastructureDensityScore: infraDensity,
        zoningFlexibilityScore: zoningFlex,
        urbanizationPatternScore: urbanization,
        environmentalSuitabilityScore: envSuitability,
        compositeScore: compositeScore
    };
}

// ==========================================================================
// DYNAMIC INTELLIGENT SCORING ENGINE
// ==========================================================================
function recalculateDynamicDistrictScores() {
    state.calculatedDistrictData = {};

    state.districts.forEach(districtName => {
        const base = state.districtData[districtName] || {};
        let land = base.land || 50;
        let labor = base.labor || 50;
        let capital = base.capital || 50;
        let entrepreneurship = base.entrepreneurship || 50;

        const districtAssets = state.assets.filter(a => 
            (a.district || '').toLowerCase() === districtName.toLowerCase() ||
            (a.description || '').toLowerCase().includes(districtName.toLowerCase()) ||
            (a.name || '').toLowerCase().includes(districtName.toLowerCase())
        );

        districtAssets.forEach(asset => {
            const type = (asset.type || '').toLowerCase();
            if (type === 'hospital' || type === 'school') labor += 2.5;
            else if (type === 'farm') land += 3.0;
            else if (['factory', 'market', 'bank', 'hotel'].includes(type)) { entrepreneurship += 2.5; capital += 1.5; }
            else if (type === 'construction') land += 1.5;
            else if (type === 'major-project') { land += 3.0; labor += 3.0; capital += 3.0; entrepreneurship += 3.0; }
        });

        const districtNews = state.curatedNews.filter(n => (n.district || '').toLowerCase() === districtName.toLowerCase());
        districtNews.forEach(news => {
            const boost = parseFloat(news.impact_score) || 3.0;
            const target = (news.target_dimension || '').toLowerCase();
            if (target === 'land') land += boost;
            else if (target === 'labor') labor += boost;
            else if (target === 'capital') capital += boost;
            else if (target === 'entrepreneurship') entrepreneurship += boost;
            else { capital += boost * 0.5; entrepreneurship += boost * 0.5; }
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
        const composite_score = Math.min(100, Math.round(((land + labor + capital + entrepreneurship) / 4) * 10) / 10);

        const infra = getDistrictInfraCounts(districtName);

        state.calculatedDistrictData[districtName] = {
            ...base,
            land,
            labor,
            capital,
            entrepreneurship,
            composite_score,
            infra,
            assetCount: districtAssets.length,
            newsCount: districtNews.length,
            schoolBoosts,
            landCenter
        };
    });
}

function getDistrictInfraCounts(districtName) {
    const curated = state.curatedInfra[districtName] || {};
    const osm = countOsmForDistrict(districtName);
    
    return {
        construction: Math.max(curated.construction || 0, osm.construction || 0),
        hardware: Math.max(curated.hardware || 0, osm.hardware || 0),
        commercial: Math.max(curated.commercial || 0, osm.commercial || 0),
        industrial: Math.max(curated.industrial || 0, osm.industrial || 0),
        education: Math.max(curated.education || 0, osm.education || 0),
        health: Math.max(curated.health || 0, osm.health || 0),
        hospitality: Math.max(curated.hospitality || 0, osm.hospitality || 0),
        banking: Math.max(curated.banking || 0, osm.banking || 0),
        population: curated.population || 400000,
        anchor: curated.anchor || 'District Economic Hub'
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

function selectDistrict(districtName) {
    console.log('Selecting district:', districtName);
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

    const osmDistEl = $('osm-district-name');
    if (osmDistEl) osmDistEl.textContent = districtName;

    const infra = data.infra || getDistrictInfraCounts(districtName);
    
    Object.keys(INFRA_LABELS).forEach(key => {
        const el = document.getElementById(`osm-${key}`);
        if (el) el.textContent = (infra[key] || 0).toLocaleString();
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
            skillsContent.innerHTML = '<span style="color:#94a3b8;">No registered curriculum schools found for this district.</span>';
        }
    }

    const landBadge = $('land-readiness-score-badge');
    const landBars = $('land-readiness-bars');
    if (landBadge && landBars) {
        const landCenter = data.landCenter || calculateLandCenterScore(districtName);
        landBadge.textContent = `${landCenter.compositeScore} / 100`;
        landBars.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:6px; font-size:0.72rem;">
                <div>
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:2px;">
                        <span>Land Use (30%)</span>
                        <strong style="color:#e2e8f0;">${landCenter.landUseScore}</strong>
                    </div>
                    <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;"><div style="width:${landCenter.landUseScore}%; height:100%; background:#10b981;"></div></div>
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:2px;">
                        <span>Infra Density (25%)</span>
                        <strong style="color:#e2e8f0;">${landCenter.infrastructureDensityScore}</strong>
                    </div>
                    <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;"><div style="width:${landCenter.infrastructureDensityScore}%; height:100%; background:#3b82f6;"></div></div>
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:2px;">
                        <span>Zoning Flexibility (20%)</span>
                        <strong style="color:#e2e8f0;">${landCenter.zoningFlexibilityScore}</strong>
                    </div>
                    <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;"><div style="width:${landCenter.zoningFlexibilityScore}%; height:100%; background:#f59e0b;"></div></div>
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:2px;">
                        <span>Urbanization Pattern (15%)</span>
                        <strong style="color:#e2e8f0;">${landCenter.urbanizationPatternScore}</strong>
                    </div>
                    <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;"><div style="width:${landCenter.urbanizationPatternScore}%; height:100%; background:#8b5cf6;"></div></div>
                </div>
                <div>
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; margin-bottom:2px;">
                        <span>Environmental Suitability (10%)</span>
                        <strong style="color:#e2e8f0;">${landCenter.environmentalSuitabilityScore}</strong>
                    </div>
                    <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;"><div style="width:${landCenter.environmentalSuitabilityScore}%; height:100%; background:#06b6d4;"></div></div>
                </div>
            </div>
        `;
    }

    updateDetailsView(districtName);
    updateMapHighlight(districtName);
    renderAnalytics();
}

function countOsmForDistrict(districtName) {
    const counts = { construction: 0, hardware: 0, commercial: 0, industrial: 0, education: 0, health: 0, hospitality: 0, banking: 0 };
    if (!state.districtGeoJson || !state.osmData.elements) return counts;
    const districtGeo = state.districtGeoJson.features?.find(
        f => (f.properties?.shapeName || f.properties?.name || '').toLowerCase() === districtName.toLowerCase()
    );
    if (!districtGeo || typeof turf === 'undefined') return counts;
    try {
        const polygon = turf.polygon(districtGeo.geometry.coordinates);
        state.osmData.elements.forEach(el => {
            if (!el.lat || !el.lon) return;
            const pt = turf.point([el.lon, el.lat]);
            if (!turf.booleanPointInPolygon(pt, polygon)) return;
            const tags = el.tags || {};
            if (tags.landuse === 'construction' || tags.building === 'construction') counts.construction++;
            if (tags.shop === 'hardware' || tags.shop === 'doityourself') counts.hardware++;
            if (tags.building === 'commercial' || tags.building === 'retail') counts.commercial++;
            if (tags.landuse === 'industrial' || tags.building === 'industrial' || tags.building === 'warehouse') counts.industrial++;
            if (tags.amenity === 'school' || tags.amenity === 'college' || tags.amenity === 'university') counts.education++;
            if (tags.amenity === 'hospital' || tags.amenity === 'clinic') counts.health++;
            if (tags.tourism === 'hotel' || tags.building === 'hotel') counts.hospitality++;
            if (tags.amenity === 'bank' || tags.amenity === 'atm') counts.banking++;
        });
    } catch (e) {}
    return counts;
}

// ============================================================
// INFRASTRUCTURE PILL SELECTION & CHOROPLETH HEATMAP MODE
// ============================================================
function setupInfraPillListeners() {
    document.querySelectorAll('.osm-item').forEach(item => {
        item.addEventListener('click', function() {
            const infraKey = this.getAttribute('data-infra');
            if (state.activeInfraFilter === infraKey) {
                clearInfraFilter();
            } else {
                setInfraFilter(infraKey);
            }
        });
    });

    const resetBtn = $('btn-reset-infra');
    if (resetBtn) resetBtn.addEventListener('click', clearInfraFilter);
    const analyticsReset = $('analytics-btn-reset-filter');
    if (analyticsReset) analyticsReset.addEventListener('click', clearInfraFilter);
}

function setInfraFilter(infraKey) {
    console.log('Activating Infrastructure Heatmap Filter for:', infraKey);
    state.activeInfraFilter = infraKey;

    document.querySelectorAll('.osm-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-infra') === infraKey);
    });

    const resetBtn = $('btn-reset-infra');
    if (resetBtn) resetBtn.style.display = 'block';
    
    const badge = $('analytics-active-filter-badge');
    if (badge) {
        badge.textContent = `Sector: ${INFRA_LABELS[infraKey]?.label || infraKey}`;
        badge.style.background = INFRA_LABELS[infraKey]?.color || '#4C6EF5';
    }

    updateMapHighlight(state.currentDistrict);
    renderAnalytics();
}

function clearInfraFilter() {
    console.log('Clearing Infrastructure Filter');
    state.activeInfraFilter = null;
    document.querySelectorAll('.osm-item').forEach(el => el.classList.remove('active'));
    const resetBtn = $('btn-reset-infra');
    if (resetBtn) resetBtn.style.display = 'none';

    const badge = $('analytics-active-filter-badge');
    if (badge) {
        badge.textContent = 'Composite Score View';
        badge.style.background = '#4C6EF5';
    }

    updateMapHighlight(state.currentDistrict);
    renderAnalytics();
}

// ============================================================
// OPPORTUNITY SCORING ENGINE & ANALYSIS
// ============================================================
function calculateOpportunityAnalysis(data) {
    const land = data.land || 0;
    const labor = data.labor || 0;
    const capital = data.capital || 0;
    const entrepreneurship = data.entrepreneurship || 0;
    const composite = data.composite_score || 0;
    
    const dimensions = [
        { name: 'Land', value: land, icon: '🌍' },
        { name: 'Labor', value: labor, icon: '👷' },
        { name: 'Capital', value: capital, icon: '💰' },
        { name: 'Entrepreneurship', value: entrepreneurship, icon: '🚀' }
    ];
    dimensions.sort((a, b) => b.value - a.value);
    const highest = dimensions[0];
    const lowest = dimensions[dimensions.length - 1];
    
    const shortTermPotential = Math.round(highest.value - lowest.value);
    const shortTermNewScore = Math.round(lowest.value + shortTermPotential);
    const longTermPotential = Math.round(100 - composite);
    
    let archetype = '', archetypeIcon = '', strategy = '', priority = '';
    
    if (shortTermPotential > 20 && longTermPotential > 25) {
        archetype = 'Rocket'; archetypeIcon = '🚀'; priority = 'HIGHEST';
        strategy = `High priority district — quick wins by elevating ${lowest.name} (${lowest.value} → ${shortTermNewScore}) alongside strategic long-term capital investments.`;
    } else if (shortTermPotential > 20 && longTermPotential <= 25) {
        archetype = 'Quick Win'; archetypeIcon = '⚡'; priority = 'HIGH';
        strategy = `Immediate high returns available. Targeted investment in ${lowest.name} (${lowest.value} → ${shortTermNewScore}) will leverage strong ${highest.name} foundation.`;
    } else if (shortTermPotential <= 20 && longTermPotential > 25) {
        archetype = 'Foundation'; archetypeIcon = '🌱'; priority = 'MEDIUM';
        strategy = `Requires structural foundation building. Invest in core infrastructure, workforce skills, and financial credit access.`;
    } else {
        archetype = 'Saturated'; archetypeIcon = '✅'; priority = 'LOW';
        strategy = `Highly mature district operating near capacity. Focus on operational optimization, high-tech modernization, and maintenance.`;
    }
    
    return { dimensions, highest, lowest, shortTermPotential, shortTermNewScore, longTermPotential, archetype, archetypeIcon, strategy, priority };
}

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
        const intensity = agData.crop_production_intensity ?? agData.crop_intensity;
        const level = agData.crop_intensity_level ? ` (${agData.crop_intensity_level})` : '';
        if (detailsAgriIntensity) detailsAgriIntensity.textContent = intensity !== undefined ? `${intensity}%${level}` : '--';
        if (detailsAgriCrops) detailsAgriCrops.textContent = Array.isArray(agData.major_crops) ? agData.major_crops.join(', ') : (agData.major_crops || '--');
        if (detailsAgriYield) detailsAgriYield.textContent = agData.seasonal_yield_mt ? agData.seasonal_yield_mt.toLocaleString() + ' MT' : '--';
        if (detailsAgriIrrigation) detailsAgriIrrigation.textContent = agData.irrigated_land_ha ? agData.irrigated_land_ha.toLocaleString() + ' ha' : '--';
    } else {
        if (detailsAgriIntensity) detailsAgriIntensity.textContent = '--';
        if (detailsAgriCrops) detailsAgriCrops.textContent = '--';
        if (detailsAgriYield) detailsAgriYield.textContent = '--';
        if (detailsAgriIrrigation) detailsAgriIrrigation.textContent = '--';
    }

    const nearbyProjects = state.majorProjects.projects?.filter(p => 
        (p.location || '').toLowerCase().includes(districtName.toLowerCase()) ||
        (p.district || '').toLowerCase() === districtName.toLowerCase()
    ) || [];

    if (detailsProjectsList) {
        if (nearbyProjects.length === 0) {
            detailsProjectsList.innerHTML = '<span style="color:#94a3b8; font-size:0.75rem;">No strategic anchor projects registered for this district.</span>';
        } else {
            detailsProjectsList.innerHTML = nearbyProjects.map(p => `
                <div class="project-item" style="background:rgba(76,110,245,0.08); border-radius:6px; padding:8px; margin-bottom:6px;">
                    <div class="name" style="font-weight:700; color:#e2e8f0; font-size:0.8rem;">⭐ ${p.name}</div>
                    <div class="detail" style="font-size:0.7rem; color:#94a3b8;">${p.type} • ${p.cost || p.status || ''}</div>
                    ${p.sub_asset_opportunities ? `<div style="font-size:0.65rem; color:#4ade80; margin-top:3px;">💡 Opportunities: ${p.sub_asset_opportunities}</div>` : ''}
                </div>
            `).join('');
        }
    }

    const detailsSchoolsCount = $('details-schools-count');
    const detailsSkillsList = $('details-skills-list');
    if (detailsSkillsList) {
        const schoolBoosts = data.schoolBoosts || calculateSchoolsContribution(districtName);
        if (detailsSchoolsCount) detailsSchoolsCount.textContent = `${schoolBoosts.totalSchools} Institutions (${schoolBoosts.totalEnrollment.toLocaleString()} students)`;
        
        if (schoolBoosts.schoolsList && schoolBoosts.schoolsList.length > 0) {
            detailsSkillsList.innerHTML = schoolBoosts.schoolsList.map(s => `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px; margin-bottom:6px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; color:#e2e8f0; font-size:0.78rem;">🎓 ${s.name}</span>
                        <span style="font-size:0.65rem; color:#a78bfa; background:rgba(139,92,246,0.15); padding:1px 6px; border-radius:4px;">${s.level || 'School'} • ${s.enrollment} students</span>
                    </div>
                    <div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">
                        Programs: ${Array.isArray(s.programs) ? s.programs.join(', ') : s.programs}
                    </div>
                </div>
            `).join('');
        } else {
            detailsSkillsList.innerHTML = '<span style="color:#94a3b8; font-size:0.75rem;">No institutions registered in directory for this district.</span>';
        }
    }

    const detailsLandComposite = $('details-land-composite-score');
    const detailsLandLayersList = $('details-land-layers-list');
    if (detailsLandLayersList) {
        const landCenter = data.landCenter || calculateLandCenterScore(districtName);
        if (detailsLandComposite) detailsLandComposite.textContent = `${landCenter.compositeScore} / 100`;

        detailsLandLayersList.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:0.75rem;">
                <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px;">
                    <span style="color:#94a3b8; font-size:0.65rem; display:block;">LAND USE CLASSIFICATION (30%)</span>
                    <strong style="color:#10b981; font-size:1rem;">${landCenter.landUseScore}</strong>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px;">
                    <span style="color:#94a3b8; font-size:0.65rem; display:block;">INFRASTRUCTURE DENSITY (25%)</span>
                    <strong style="color:#3b82f6; font-size:1rem;">${landCenter.infrastructureDensityScore}</strong>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px;">
                    <span style="color:#94a3b8; font-size:0.65rem; display:block;">ZONING FLEXIBILITY (20%)</span>
                    <strong style="color:#f59e0b; font-size:1rem;">${landCenter.zoningFlexibilityScore}</strong>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:6px;">
                    <span style="color:#94a3b8; font-size:0.65rem; display:block;">URBANIZATION PATTERN (15%)</span>
                    <strong style="color:#8b5cf6; font-size:1rem;">${landCenter.urbanizationPatternScore}</strong>
                </div>
                <div style="grid-column: span 2; background:rgba(255,255,255,0.03); padding:8px; border-radius:6px;">
                    <span style="color:#94a3b8; font-size:0.65rem; display:block;">ENVIRONMENTAL SUITABILITY (10%)</span>
                    <strong style="color:#06b6d4; font-size:1rem;">${landCenter.environmentalSuitabilityScore}</strong>
                </div>
            </div>
        `;
    }

    updateNewsIntelligence(districtName);
    updateRadarChart(data);
    updateGapInsights(data);
}

function updateNewsIntelligence(districtName) {
    const newsContainer = document.getElementById('details-news-list');
    if (!newsContainer) return;

    const districtNews = state.curatedNews.filter(n => (n.district || '').toLowerCase() === districtName.toLowerCase());

    if (districtNews.length === 0) {
        newsContainer.innerHTML = '<span style="color:#94a3b8; font-size:0.75rem;">No recent news signals curated for this district.</span>';
        return;
    }

    newsContainer.innerHTML = districtNews.map(n => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px; margin-bottom:6px;">
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
    const valEl = document.getElementById(`details-bar-val-${id}`);
    const fillEl = document.getElementById(`details-bar-fill-${id}`);
    if (valEl) valEl.textContent = Math.round(value);
    if (fillEl) fillEl.style.width = Math.min(100, Math.max(0, value)) + '%';
}

function updateGapInsights(data) {
    const container = document.getElementById('gap-insights');
    if (!container) return;
    const analysis = calculateOpportunityAnalysis(data);
    
    container.innerHTML = `
        <div style="background: rgba(76,110,245,0.06); border: 1px solid rgba(76,110,245,0.12); border-radius: 10px; padding: 14px; margin-top: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <span style="font-size: 1.5rem;">${analysis.archetypeIcon}</span>
                <div>
                    <strong style="color: #e2e8f0; font-size: 1rem;">${analysis.archetype}</strong>
                    <span style="font-size: 0.65rem; color: #94a3b8; display: block;">Investment Archetype</span>
                </div>
                <span style="margin-left: auto; background: ${analysis.priority === 'HIGHEST' ? '#ef4444' : analysis.priority === 'HIGH' ? '#f59e0b' : analysis.priority === 'MEDIUM' ? '#3b82f6' : '#6B7280'}; color: #fff; padding: 2px 12px; border-radius: 12px; font-size: 0.65rem; font-weight: 700;">${analysis.priority}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div style="background: rgba(16,185,129,0.08); border-radius: 8px; padding: 10px; border-left: 3px solid #10b981;">
                    <div style="font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Short-Term Opportunity</div>
                    <div style="font-size: 1.2rem; font-weight: 800; color: #10b981;">+${analysis.shortTermPotential} pts</div>
                    <div style="font-size: 0.65rem; color: #94a3b8;">Fix ${analysis.lowest.name} (${analysis.lowest.value} → ${analysis.shortTermNewScore})</div>
                </div>
                <div style="background: rgba(59,130,246,0.08); border-radius: 8px; padding: 10px; border-left: 3px solid #3b82f6;">
                    <div style="font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Long-Term Opportunity</div>
                    <div style="font-size: 1.2rem; font-weight: 800; color: #3b82f6;">+${analysis.longTermPotential} pts</div>
                    <div style="font-size: 0.65rem; color: #94a3b8;">Growth to reach 100 ceiling</div>
                </div>
            </div>
            
            <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.5; background: rgba(255,255,255,0.04); padding: 10px; border-radius: 8px;">
                💡 <strong style="color: #e2e8f0;">Strategy:</strong> ${analysis.strategy}
            </div>
        </div>
    `;
}

let radarChartInstance = null;
function updateRadarChart(data) {
    const canvas = document.getElementById('details-factorRadarChart');
    if (!canvas) return;
    
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded');
        return;
    }
    
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth || 380;
    canvas.height = parent.clientHeight || 200;
    
    const ctx = canvas.getContext('2d');
    if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }

    const analysis = calculateOpportunityAnalysis(data);
    const labels = ['Land', 'Labor', 'Capital', 'Entrepreneurship', 'Composite'];
    const currentValues = [data.land || 0, data.labor || 0, data.capital || 0, data.entrepreneurship || 0, data.composite_score || 0];
    
    const landPotential = analysis.lowest.name === 'Land' ? analysis.highest.value : (data.land || 0);
    const laborPotential = analysis.lowest.name === 'Labor' ? analysis.highest.value : (data.labor || 0);
    const capitalPotential = analysis.lowest.name === 'Capital' ? analysis.highest.value : (data.capital || 0);
    const entrepreneurshipPotential = analysis.lowest.name === 'Entrepreneurship' ? analysis.highest.value : (data.entrepreneurship || 0);
    const newComposite = Math.round((landPotential + laborPotential + capitalPotential + entrepreneurshipPotential) / 4);
    
    const potentialValues = [landPotential, laborPotential, capitalPotential, entrepreneurshipPotential, newComposite];

    try {
        radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Current Score', data: currentValues, backgroundColor: 'rgba(76,110,245,0.25)', borderColor: '#4C6EF5', borderWidth: 2.5, pointBackgroundColor: '#4C6EF5' },
                    { label: 'Short-Term Potential', data: potentialValues, backgroundColor: 'rgba(245,158,11,0.1)', borderColor: '#f59e0b', borderWidth: 1.8, borderDash: [6, 4], pointBackgroundColor: '#f59e0b' }
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
    } catch (err) {
        console.warn('Radar chart error:', err);
    }
}

// ============================================================
// MAP SETUP & STRATEGIC ANCHOR MARKERS
// ============================================================
function setupMap() {
    const map = L.map('map', { center: [-1.94, 29.87], zoom: 9, zoomControl: false });
    L.control.zoom({ position: 'topright' }).addTo(map);

    const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
        });
}

function addStrategicAnchorMarkers() {
    if (!state.map || !state.majorProjects?.projects) return;
    if (state.anchorLayer) { state.map.removeLayer(state.anchorLayer); state.anchorLayer = null; }

    const anchorGroup = L.layerGroup();
    state.majorProjects.projects.forEach(project => {
        if (!project.lat || !project.lng) return;
        const iconDiv = document.createElement('div');
        iconDiv.style.cssText = `
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #ffffff;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            border: 2px solid #ffffff;
            box-shadow: 0 0 14px rgba(245, 158, 11, 0.9);
            cursor: pointer;
        `;
        iconDiv.innerHTML = '⭐';

        const icon = L.divIcon({ html: iconDiv.outerHTML, className: 'anchor-marker-icon', iconSize: [28, 28], iconAnchor: [14, 14] });
        const marker = L.marker([project.lat, project.lng], { icon: icon, zIndexOffset: 20000 });

        const popupContent = `
            <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:220px; color:#0f172a;">
                <div style="font-weight:800; font-size:1rem; color:#d97706; margin-bottom:4px;">⭐ ${project.name}</div>
                <div style="font-size:0.75rem; font-weight:600; color:#475569; margin-bottom:6px;">${project.type} • ${project.location}</div>
                <div style="font-size:0.75rem; color:#334155; margin-bottom:6px;">${project.cost ? '<strong>Cost:</strong> ' + project.cost : ''} ${project.status ? '• ' + project.status : ''}</div>
                ${project.sub_asset_opportunities ? `
                    <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:6px; padding:6px; font-size:0.7rem; color:#92400e;">
                        <strong>💡 Sub-Asset Investment Opportunities:</strong><br/>${project.sub_asset_opportunities}
                    </div>
                ` : ''}
            </div>
        `;
        marker.bindPopup(popupContent);
        anchorGroup.addLayer(marker);
    });
    anchorGroup.addTo(state.map);
    state.anchorLayer = anchorGroup;
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

    const activeInfra = state.activeInfraFilter;
    let maxInfraValue = 1;
    if (activeInfra) {
        state.districts.forEach(d => {
            const val = state.calculatedDistrictData[d]?.infra?.[activeInfra] || 0;
            if (val > maxInfraValue) maxInfraValue = val;
        });
    }

    const layer = L.geoJSON(geoJson, {
        style: (feature) => {
            const name = feature.properties?.shapeName || feature.properties?.name || '';
            const isSelected = name === state.currentDistrict;

            if (activeInfra) {
                const count = state.calculatedDistrictData[name]?.infra?.[activeInfra] || 0;
                const ratio = Math.min(1, count / maxInfraValue);
                const infraColor = INFRA_LABELS[activeInfra]?.color || '#4C6EF5';
                return {
                    fillColor: infraColor,
                    fillOpacity: isSelected ? 0.9 : 0.2 + (ratio * 0.65),
                    color: isSelected ? '#ffffff' : infraColor,
                    weight: isSelected ? 3.5 : 1.5
                };
            }

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
            const infra = data.infra || getDistrictInfraCounts(name);
            
            const activeInfraInfo = activeInfra ? `
                <div style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); padding:4px 8px; border-radius:6px; margin-bottom:6px; font-size:0.72rem; color:#f59e0b;">
                    ${INFRA_LABELS[activeInfra]?.icon || '📊'} <strong>${INFRA_LABELS[activeInfra]?.label || activeInfra}:</strong> ${(infra[activeInfra] || 0).toLocaleString()}
                </div>
            ` : '';

            const tooltipContent = `
                <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:200px;">
                    <div style="font-weight:700; font-size:1.1rem; color:#e2e8f0; margin-bottom:4px;">${name}</div>
                    ${activeInfraInfo}
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:1.3rem; font-weight:800; color:#4C6EF5;">${data.composite_score || 0}</span>
                        <span style="font-size:0.7rem; color:#94a3b8;">Composite Score</span>
                    </div>
                    <div style="font-size:0.7rem; color:#94a3b8;">⚓ Anchor: <strong style="color:#e2e8f0;">${infra.anchor || 'Central Hub'}</strong></div>
                </div>
            `;
            layer.bindTooltip(tooltipContent, { className: 'leaflet-tooltip-rwanda', sticky: true, direction: 'top' });
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
        const labelDiv = document.createElement('div');
        labelDiv.style.cssText = `
            font-size: 13px; font-weight: 800; color: #000000; font-family: 'Plus Jakarta Sans', sans-serif;
            letter-spacing: 0.4px; text-align: center; white-space: nowrap; pointer-events: none; padding: 2px 6px;
            transform: translate(-50%, -50%);
            text-shadow: 0 0 10px rgba(255,255,255,1), 0 0 6px rgba(255,255,255,0.95), 0 0 3px rgba(255,255,255,0.9);
        `;
        labelDiv.textContent = name;
        const icon = L.divIcon({ html: labelDiv.outerHTML, className: 'district-label-fixed', iconSize: [0, 0], iconAnchor: [0, 0] });
        labelGroup.addLayer(L.marker([centerLat, centerLng], { icon: icon, interactive: false, zIndexOffset: 10000 }));
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

// ============================================================
// ANALYTICS VIEW OVERHAUL (SITE SELECTION + NEIGHBOR MATRIX)
// ============================================================
function renderAnalytics() {
    const current = state.currentDistrict || 'Gasabo';
    renderSiteSelectionEngine();
    renderNeighborMatrix(current);
    renderNationalRankings();
    renderExecutiveInsights(current);
}

function renderSiteSelectionEngine() {
    const card = $('analytics-site-selection-card');
    const content = $('analytics-site-selection-content');
    const tag = $('analytics-infra-tag');
    if (!content) return;

    const activeInfra = state.activeInfraFilter;
    if (!activeInfra) {
        if (tag) tag.textContent = 'All Infrastructure View';
        content.innerHTML = `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px; border-radius:8px;">
                💡 <strong style="color:#e2e8f0;">Tip:</strong> Click any Infrastructure pill in the Map tab (e.g. 🏪 <strong>Hardware</strong>, 🏥 <strong>Health</strong>, 🏫 <strong>Education</strong>) to activate nationwide heatmap distribution and automated Site Selection Recommendations for new business locations.
            </div>
        `;
        return;
    }

    const info = INFRA_LABELS[activeInfra];
    if (tag) tag.textContent = `${info.icon} ${info.label}`;

    const districtRanks = state.districts.map(name => {
        const data = state.calculatedDistrictData[name] || {};
        const infra = data.infra || {};
        const count = infra[activeInfra] || 0;
        const pop = infra.population || 400000;
        const perCapita = (count / pop) * 100000;

        let gapScore = 0;
        if (activeInfra === 'hardware') {
            const constr = infra.construction || 1;
            gapScore = (constr * 2.0) / (count + 1);
        } else if (activeInfra === 'construction') {
            gapScore = (data.land || 50) + (data.capital || 50);
        } else if (['health', 'education'].includes(activeInfra)) {
            gapScore = pop / (count + 1);
        } else {
            gapScore = ((data.composite_score || 50) * 1.5) / (count + 1);
        }

        return { name, count, pop, perCapita: Math.round(perCapita * 10) / 10, gapScore: Math.round(gapScore * 10) / 10, data };
    }).sort((a, b) => b.gapScore - a.gapScore);

    const top3 = districtRanks.slice(0, 3);

    content.innerHTML = `
        <div style="margin-bottom:10px;">
            <div style="font-weight:700; color:#e2e8f0; margin-bottom:4px;">🎯 Top 3 Recommended Expansion Locations for ${info.label}:</div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
                ${top3.map((d, i) => `
                    <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); border-radius:6px; padding:6px; cursor:pointer;" onclick="selectDistrict('${d.name}')">
                        <div style="font-size:0.6rem; color:#f59e0b; font-weight:700;">#${i + 1} RECOMMENDATION</div>
                        <div style="font-weight:800; color:#e2e8f0; font-size:0.85rem;">${d.name}</div>
                        <div style="font-size:0.65rem; color:#94a3b8;">${d.count} Existing • Gap Score: ${d.gapScore}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:8px; border-radius:6px; font-size:0.72rem; line-height:1.4;">
            📊 <strong>Market Rationale:</strong> ${top3[0]?.name} displays the highest market deficit index for ${info.label.toLowerCase()} relative to population density and ongoing development activity. Opening a new ${info.label.toLowerCase()} facility here captures unserved regional demand with minimal competition saturation.
        </div>
    `;
}

function renderNeighborMatrix(districtName) {
    const container = $('analytics-neighbor-matrix');
    if (!container) return;

    const neighbors = state.districtNeighbors[districtName] || [];
    const targetData = state.calculatedDistrictData[districtName] || {};
    
    if (neighbors.length === 0) {
        container.innerHTML = `<span style="color:#94a3b8; font-size:0.78rem;">No neighbor data recorded for ${districtName}.</span>`;
        return;
    }

    const neighborList = [districtName, ...neighbors];
    const activeInfra = state.activeInfraFilter || 'construction';
    const infraInfo = INFRA_LABELS[activeInfra];

    container.innerHTML = `
        <div style="margin-bottom:8px; font-size:0.78rem; color:#e2e8f0;">
            Comparing <strong style="color:#10b981;">${districtName}</strong> against its <strong>${neighbors.length} direct geographic neighbors</strong>:
        </div>
        <div style="overflow-x:auto; margin-bottom:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:0.72rem; text-align:left;">
                <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:#94a3b8;">
                        <th style="padding:4px;">District</th>
                        <th style="padding:4px;">Score</th>
                        <th style="padding:4px;">Land</th>
                        <th style="padding:4px;">Labor</th>
                        <th style="padding:4px;">Capital</th>
                        <th style="padding:4px;">${infraInfo.icon} ${activeInfra}</th>
                    </tr>
                </thead>
                <tbody>
                    ${neighborList.map(name => {
                        const d = state.calculatedDistrictData[name] || {};
                        const isSelf = name === districtName;
                        const infraCount = d.infra?.[activeInfra] || 0;
                        return `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.04); ${isSelf ? 'background:rgba(16,185,129,0.15); font-weight:700;' : 'cursor:pointer;'}" ${!isSelf ? `onclick="selectDistrict('${name}')"` : ''}>
                                <td style="padding:4px; color:${isSelf ? '#10b981' : '#e2e8f0'};">${name} ${isSelf ? '⭐' : ''}</td>
                                <td style="padding:4px; font-weight:700; color:#4C6EF5;">${d.composite_score || 0}</td>
                                <td style="padding:4px;">${d.land || 0}</td>
                                <td style="padding:4px;">${d.labor || 0}</td>
                                <td style="padding:4px;">${d.capital || 0}</td>
                                <td style="padding:4px; color:#f59e0b; font-weight:700;">${infraCount}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); border-radius:6px; padding:8px; font-size:0.72rem; line-height:1.4;">
            🤝 <strong>Regional Synergy & Market Spillover:</strong> ${districtName} anchors this regional cluster. Nearby districts like ${neighbors.slice(0, 2).join(' and ')} present ideal low-cost satellite locations for manufacturing, warehousing, and raw material supply to feed ${districtName}'s high economic demand.
        </div>
    `;
}

function renderNationalRankings() {
    const districts = state.districts;
    if (!districts || districts.length === 0) return;

    const activeInfra = state.activeInfraFilter;
    const districtData = districts.map(name => {
        const data = state.calculatedDistrictData[name] || state.districtData[name];
        if (!data) return null;
        const composite = data.composite_score || 0;
        const infraCount = data.infra?.[activeInfra] || 0;
        const score = activeInfra ? infraCount : composite;
        return { name, composite, infraCount, score, data };
    }).filter(d => d !== null);

    const sorted = [...districtData].sort((a, b) => b.score - a.score);

    const top5 = sorted.slice(0, 5);
    const topContainer = $('analytics-top-opportunities');
    if (topContainer) {
        topContainer.innerHTML = top5.map((d, i) => `
            <div class="analytics-item" style="cursor:pointer;" onclick="selectDistrict('${d.name}')">
                <span class="rank">#${i + 1}</span>
                <span class="name">${d.name}</span>
                <span class="score">${activeInfra ? d.infraCount.toLocaleString() : d.composite}</span>
                <span class="${i === 0 ? 'badge-high' : i < 3 ? 'badge-medium' : 'badge-low'}">
                    ${i === 0 ? '🔥 Top 1' : i < 3 ? '📈 Top 3' : '⭐ Leader'}
                </span>
            </div>
        `).join('');
    }

    const rankingsContainer = $('analytics-district-rankings');
    if (rankingsContainer) {
        rankingsContainer.innerHTML = sorted.map((d, i) => `
            <div class="analytics-item" style="cursor:pointer; ${d.name === state.currentDistrict ? 'background:rgba(76,110,245,0.15);' : ''}" onclick="selectDistrict('${d.name}')">
                <span class="rank">#${i + 1}</span>
                <span class="name">${d.name}</span>
                <span class="score">${activeInfra ? d.infraCount.toLocaleString() : d.composite}</span>
                <span style="font-size:0.65rem; color:#94a3b8;">${d.data.infra?.anchor || 'Hub'}</span>
            </div>
        `).join('');
    }
}

function renderExecutiveInsights(districtName) {
    const data = state.calculatedDistrictData[districtName] || state.districtData[districtName];
    if (!data) return;
    const analysis = calculateOpportunityAnalysis(data);
    const insightsContainer = $('analytics-insights');
    if (insightsContainer) {
        insightsContainer.innerHTML = `
            <div style="margin-bottom:6px; color:#e2e8f0; font-weight:700;">📌 ${districtName} Executive Briefing</div>
            <div style="margin-bottom:4px;">• Investment Archetype: <strong>${analysis.archetypeIcon} ${analysis.archetype}</strong> (${analysis.priority} Priority)</div>
            <div style="margin-bottom:4px;">• Short-Term Opportunity: <strong style="color:#10b981;">+${analysis.shortTermPotential} pts</strong> (Elevate ${analysis.lowest.name})</div>
            <div style="margin-bottom:4px;">• Strategic Anchor: <strong style="color:#3b82f6;">${data.infra?.anchor || 'Central Economic Hub'}</strong></div>
            <div style="margin-top:6px; background:rgba(255,255,255,0.04); padding:6px 8px; border-radius:6px; font-size:0.75rem;">💡 <strong>Strategic Direction:</strong> ${analysis.strategy}</div>
        `;
    }
}

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
    let tile = L.tileLayer(mode === 'dark' 
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

function setupEventListeners() {
    if (districtDropdown) {
        districtDropdown.addEventListener('change', (e) => selectDistrict(e.target.value));
    }
    if (analyticsDistrictDropdown) {
        analyticsDistrictDropdown.addEventListener('change', (e) => selectDistrict(e.target.value));
    }

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
            const status = $('admin-asset-status')?.value;
            const capacity = $('admin-asset-capacity')?.value.trim();
            const description = $('admin-asset-desc')?.value.trim();
            const msgEl = $('admin-asset-status-msg');

            if (!name || !type || isNaN(lat) || isNaN(lng)) {
                if (msgEl) {
                    msgEl.textContent = '❌ Please fill in all required fields.';
                    msgEl.style.color = '#ef4444';
                }
                return;
            }

            try {
                const newAsset = { name, type, lat, lng, status, capacity, description, id: Date.now(), uploaded_at: new Date().toISOString(), scores: { intrinsic: 0, proximity: 0, demographic: 0, composite: 0 } };
                state.assets.push(newAsset);
                if (msgEl) {
                    msgEl.textContent = `✅ Asset submitted! ID: ${newAsset.id}`;
                    msgEl.style.color = '#4ade80';
                }
                recalculateDynamicDistrictScores();
                if (state.currentDistrict) selectDistrict(state.currentDistrict);
                renderAdminAssetLists();
            } catch (err) {
                if (msgEl) {
                    msgEl.textContent = `❌ Error: ${err.message}`;
                    msgEl.style.color = '#ef4444';
                }
            }
        });
    }

    const submitNews = $('admin-submit-news');
    if (submitNews) {
        submitNews.addEventListener('click', async () => {
            const title = $('admin-news-title')?.value.trim();
            const source = $('admin-news-source')?.value;
            const district = $('admin-news-district')?.value;
            const target_dimension = $('admin-news-dimension')?.value;
            const impact_score = parseFloat($('admin-news-impact')?.value) || 5;
            const summary = $('admin-news-summary')?.value.trim();
            const msgEl = $('admin-news-status-msg');

            if (!title || !district) {
                if (msgEl) {
                    msgEl.textContent = '❌ Title and Target District are required.';
                    msgEl.style.color = '#ef4444';
                }
                return;
            }

            try {
                const newNews = { id: 'news_' + Date.now(), title, source, district, target_dimension, impact_score, summary, published_at: new Date().toISOString() };
                state.curatedNews.push(newNews);
                if (msgEl) {
                    msgEl.textContent = `✅ Curated signal ingested! News ID: ${newNews.id}`;
                    msgEl.style.color = '#4ade80';
                }
                recalculateDynamicDistrictScores();
                if (state.currentDistrict) selectDistrict(state.currentDistrict);
            } catch (err) {
                if (msgEl) {
                    msgEl.textContent = `❌ Error: ${err.message}`;
                    msgEl.style.color = '#ef4444';
                }
            }
        });
    }

    const submitSchool = $('admin-submit-school');
    if (submitSchool) {
        submitSchool.addEventListener('click', async () => {
            const name = $('admin-school-name')?.value.trim();
            const district = $('admin-school-district')?.value;
            const level = $('admin-school-level')?.value;
            const enrollment = parseInt($('admin-school-enrollment')?.value) || 500;
            const rawPrograms = $('admin-school-programs')?.value.trim();
            const msgEl = $('admin-school-status-msg');

            if (!name || !district || !rawPrograms) {
                if (msgEl) {
                    msgEl.textContent = '❌ School Name, District, and Programs are required.';
                    msgEl.style.color = '#ef4444';
                }
                return;
            }

            const programs = rawPrograms.split(',').map(p => p.trim()).filter(Boolean);

            try {
                const newSchool = { name, district, level, programs, enrollment };
                state.schoolsDirectory.schools.push(newSchool);
                if (msgEl) {
                    msgEl.textContent = `✅ School added into Skills Pipeline!`;
                    msgEl.style.color = '#4ade80';
                }
                recalculateDynamicDistrictScores();
                if (state.currentDistrict) selectDistrict(state.currentDistrict);
            } catch (err) {
                if (msgEl) {
                    msgEl.textContent = `❌ Error: ${err.message}`;
                    msgEl.style.color = '#ef4444';
                }
            }
        });
    }

    const submitLand = $('admin-submit-land-center');
    if (submitLand) {
        submitLand.addEventListener('click', async () => {
            const district = $('admin-land-district')?.value;
            const land_use_score = parseInt($('admin-land-use')?.value) || 70;
            const infrastructure_density = parseInt($('admin-land-infra')?.value) || 70;
            const zoning_flexibility = parseInt($('admin-land-zoning')?.value) || 70;
            const urbanization_pattern = parseInt($('admin-land-urban')?.value) || 70;
            const environmental_suitability = parseInt($('admin-land-env')?.value) || 70;
            const msgEl = $('admin-land-status-msg');

            if (!district) {
                if (msgEl) {
                    msgEl.textContent = '❌ Target District is required.';
                    msgEl.style.color = '#ef4444';
                }
                return;
            }

            try {
                if (!state.landCenterData.districts) state.landCenterData.districts = {};
                state.landCenterData.districts[district] = {
                    land_use_score,
                    infrastructure_density,
                    zoning_flexibility,
                    urbanization_pattern,
                    environmental_suitability
                };
                if (msgEl) {
                    msgEl.textContent = `✅ Land Center spatial scores saved for ${district}!`;
                    msgEl.style.color = '#4ade80';
                }
                recalculateDynamicDistrictScores();
                if (state.currentDistrict) selectDistrict(state.currentDistrict);
            } catch (err) {
                if (msgEl) {
                    msgEl.textContent = `❌ Error: ${err.message}`;
                    msgEl.style.color = '#ef4444';
                }
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && appWrapper && appWrapper.classList.contains('mode-details')) {
            if (appWrapper) {
                appWrapper.classList.add('mode-overview');
                appWrapper.classList.remove('mode-details');
            }
        }
    });
}

function renderAssetsList() {}

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
// METHODOLOGY TOGGLE (FIXED - Runs after page loads)
// ==========================================================================
setTimeout(function() {
    const methodologyToggle = document.getElementById('methodology-toggle');
    const methodologyContent = document.getElementById('methodology-content');
    const methodologyIcon = document.getElementById('methodology-icon');

    if (methodologyToggle && methodologyContent && methodologyIcon) {
        methodologyToggle.addEventListener('click', function() {
            if (methodologyContent.style.display === 'none' || methodologyContent.style.display === '') {
                methodologyContent.style.display = 'block';
                methodologyIcon.textContent = '▲';
            } else {
                methodologyContent.style.display = 'none';
                methodologyIcon.textContent = '▼';
            }
        });
        console.log('✅ Methodology toggle initialized');
    } else {
        console.warn('⚠️ Methodology elements not found - check HTML');
    }
}, 500);

window.selectDistrict = selectDistrict;
window.__state = state;

console.log('✅ Rwanda Opportunity Map loaded successfully!');