// ==========================================================================
// Rwanda Opportunity Map - Knowledge-Based Chatbot (with Live District Data)
// ==========================================================================

(function() {
    'use strict';

    const CHATBOT_STATE = {
        isOpen: false,
        knowledge: null,
        conversationHistory: [],
        lastIntent: null,
        lastAnswerCategory: null,
        lastDistrict: null
    };

    // -----------------------------------------------------------------------
    // LOAD KNOWLEDGE
    // -----------------------------------------------------------------------
    async function loadKnowledge() {
        try {
            const res = await fetch('chatbot_knowledge.json');
            if (!res.ok) throw new Error('Knowledge file not found');
            CHATBOT_STATE.knowledge = await res.json();
            console.log('✅ Chatbot knowledge loaded');
        } catch (err) {
            console.warn('⚠️ Chatbot knowledge not loaded:', err);
            CHATBOT_STATE.knowledge = {
                greeting: 'Welcome. I am currently unable to load the knowledge base.',
                fallback: 'Please try again later.',
                suggestions: [],
                knowledge: [],
                conversational: {}
            };
        }
    }

    // -----------------------------------------------------------------------
    // TEXT NORMALIZATION
    // -----------------------------------------------------------------------
    function normalize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s']/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // -----------------------------------------------------------------------
    // SIMILARITY (Jaccard on word sets)
    // -----------------------------------------------------------------------
    function similarity(a, b) {
        const setA = new Set(a.split(' ').filter(w => w.length > 1));
        const setB = new Set(b.split(' ').filter(w => w.length > 1));
        if (setA.size === 0 || setB.size === 0) return 0;
        let intersection = 0;
        setA.forEach(w => { if (setB.has(w)) intersection++; });
        const union = setA.size + setB.size - intersection;
        return intersection / union;
    }

    // -----------------------------------------------------------------------
    // DISTRICT DETECTION — scans user text for a known district name
    // -----------------------------------------------------------------------
    function detectDistrict(userQuestion) {
        // Try to access the live app state
        const appState = window.__state;
        if (!appState || !appState.districts || appState.districts.length === 0) return null;

        const q = normalize(userQuestion);
        const districts = appState.districts;

        // Check for exact district name match
        for (const d of districts) {
            if (q.includes(normalize(d))) return d;
        }

        // Fuzzy fallback
        let bestMatch = null;
        let bestScore = 0;
        const words = q.split(' ');
        for (const d of districts) {
            const dNorm = normalize(d);
            for (const w of words) {
                if (w.length < 4) continue;
                const score = similarity(w, dNorm);
                if (score > bestScore && score >= 0.65) {
                    bestScore = score;
                    bestMatch = d;
                }
            }
        }
        return bestMatch;
    }

    // -----------------------------------------------------------------------
    // SECTOR DETECTION — scans user text for a sector name
    // -----------------------------------------------------------------------
    function detectSector(userQuestion) {
        const q = normalize(userQuestion);
        const map = {
            housing: ['housing', 'house', 'home', 'homes', 'units'],
            jobs: ['jobs', 'job', 'employment', 'worker', 'workers'],
            investment: ['investment', 'invest', 'capital', 'money', 'funding'],
            industry: ['industry', 'industrial', 'factory', 'factories', 'zone', 'zones'],
            agriculture: ['agriculture', 'agri', 'crop', 'crops', 'farming', 'farm']
        };
        for (const [sector, keywords] of Object.entries(map)) {
            for (const kw of keywords) {
                if (q.includes(kw)) return sector;
            }
        }
        return null;
    }

    // -----------------------------------------------------------------------
    // DETECT QUESTION INTENT
    // -----------------------------------------------------------------------
    function detectIntent(userQuestion) {
        const q = normalize(userQuestion);
        const district = detectDistrict(userQuestion);
        const sector = detectSector(userQuestion);

        // Data quality / why missing
        if (
            q.includes('why') && (q.includes('no data') || q.includes('missing') || q.includes('fallback') || q.includes('warning')) ||
            q.includes('data quality') ||
            q.includes('why fallback') ||
            q.includes('why no dds') ||
            q.includes('why inconsistent')
        ) {
            return { type: 'data_quality', district, sector };
        }

        // Comparison
        if (q.includes('compare') || q.includes('versus') || q.includes(' vs ')) {
            return { type: 'comparison', district, sector, raw: userQuestion };
        }

        // National rankings
        if (
            (q.includes('top') || q.includes('rank') || q.includes('best') || q.includes('worst') || q.includes('largest') || q.includes('biggest')) &&
            (sector || q.includes('district'))
        ) {
            return { type: 'ranking', district, sector };
        }

        // District-specific question
        if (district) {
            if (sector) return { type: 'district_sector', district, sector };
            return { type: 'district_summary', district };
        }

        return null;
    }

    // -----------------------------------------------------------------------
    // GENERATE LIVE ANSWERS FROM APP DATA
    // -----------------------------------------------------------------------
    function answerDistrictSummary(districtName) {
        const appState = window.__state;
        const calcData = appState?.calculatedDistrictData?.[districtName];
        if (!calcData) return null;

        const score = calcData.composite_score || 0;
        const land = calcData.land || 0;
        const labor = calcData.labor || 0;
        const capital = calcData.capital || 0;
        const entrepreneurship = calcData.entrepreneurship || 0;

        // Determine strengths and weaknesses
        const dims = [
            { name: 'Land', value: land },
            { name: 'Labor', value: labor },
            { name: 'Capital', value: capital },
            { name: 'Entrepreneurship', value: entrepreneurship }
        ].sort((a, b) => b.value - a.value);

        const strongest = dims[0];
        const weakest = dims[dims.length - 1];

        // Get all 5 sector gaps if calculate function is available
        let sectorLines = '';
        if (typeof window.__calculateStrategicData === 'function') {
            const sectors = ['housing', 'jobs', 'investment', 'industry', 'agriculture'];
            const sectorData = sectors.map(s => {
                const d = window.__calculateStrategicData(districtName, s);
                return { sector: s, gap: d.gapPercentage, source: d.source, confidence: d.confidence };
            });
            sectorLines = sectorData.map(s =>
                `  • ${capitalize(s.sector)}: ${s.gap}% gap (${s.confidence} confidence, ${s.source})`
            ).join('\n');
        }

        // Data availability
        const docs = appState?.strategicDocuments?.filter(d => d.districts?.includes(districtName)) || [];
        const ddsStatus = docs.length > 0
            ? `${docs.length} DDS document${docs.length > 1 ? 's' : ''} found`
            : 'No DDS document found — using fallback estimates';

        return `📍 **${districtName} — District Summary**\n\n` +
               `Composite Score: ${score}/100\n\n` +
               `Opportunity Dimensions:\n` +
               `  • Land: ${land}\n` +
               `  • Labor: ${labor}\n` +
               `  • Capital: ${capital}\n` +
               `  • Entrepreneurship: ${entrepreneurship}\n\n` +
               `Strengths: ${strongest.name} (${strongest.value})\n` +
               `Weaknesses: ${weakest.name} (${weakest.value})\n\n` +
               `Strategic Gaps:\n${sectorLines || '  (Sector data not available)'}\n\n` +
               `Data Quality: ${ddsStatus}`;
    }

    function answerDistrictSector(districtName, sector) {
        if (typeof window.__calculateStrategicData !== 'function') return null;
        const data = window.__calculateStrategicData(districtName, sector);
        if (!data) return null;

        const sectorLabel = capitalize(sector);
        const emoji = {
            housing: '🏠', jobs: '💼', investment: '💰', industry: '🏭', agriculture: '🌾'
        }[sector] || '📊';

        const formatValue = (val) => {
            if (sector === 'investment') {
                if (val >= 1e9) return '$' + (val / 1e9).toFixed(1) + 'B';
                if (val >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
                if (val >= 1e3) return '$' + (val / 1e3).toFixed(1) + 'K';
                return '$' + Math.round(val);
            }
            if (sector === 'agriculture') return val + '%';
            if (sector === 'industry') return val + ' zones';
            if (sector === 'housing') return val.toLocaleString() + ' units';
            if (sector === 'jobs') return val.toLocaleString() + ' jobs';
            return val.toLocaleString();
        };

        const warning = data.isWarning ? `\n\n⚠️ Note: ${data.warningMessage}` : '';

        return `${emoji} **${districtName} — ${sectorLabel} Gap**\n\n` +
               `Target (Total Need): ${formatValue(data.target)}\n` +
               `Planned: ${formatValue(data.current)}\n` +
               `Gap: ${formatValue(data.gap)} (${data.gapPercentage}%)\n\n` +
               `Source: ${data.source} (${data.sourceDoc})\n` +
               `Confidence: ${data.confidence}\n` +
               `Formula: ${data.formula}` +
               warning;
    }

    function answerDataQuality(districtName) {
        const appState = window.__state;
        if (!districtName) {
            // General data quality answer
            const totalDistricts = appState?.districts?.length || 0;
            const docs = appState?.strategicDocuments || [];
            const districtsWithDocs = new Set();
            docs.forEach(d => { if (d.districts) d.districts.forEach(x => districtsWithDocs.add(x)); });
            const withDocs = districtsWithDocs.size;
            const withoutDocs = totalDistricts - withDocs;

            return `📊 **Data Quality Overview**\n\n` +
                   `Districts total: ${totalDistricts}\n` +
                   `With DDS documents: ${withDocs}\n` +
                   `Without DDS (using fallback): ${withoutDocs}\n\n` +
                   `When a district has no DDS document or Gap Analysis data, the platform uses fallback estimates based on population and composite score. These are labeled "Low Confidence" and show a warning on the map.`;
        }

        // District-specific
        const docs = appState?.strategicDocuments?.filter(d => d.districts?.includes(districtName)) || [];
        const calcData = appState?.calculatedDistrictData?.[districtName] || {};
        const hasPopulation = calcData.infra?.population ? true : false;

        let lines = [];
        lines.push(`🔍 **Data Quality — ${districtName}**`);
        lines.push('');
        lines.push(`DDS Documents: ${docs.length > 0 ? `${docs.length} found` : 'None found'}`);
        if (docs.length > 0) {
            docs.forEach(d => lines.push(`  • ${d.title}`));
        }
        lines.push(`Population Data: ${hasPopulation ? 'Available' : 'Missing'}`);

        // Sector-by-sector source breakdown
        if (typeof window.__calculateStrategicData === 'function') {
            const sectors = ['housing', 'jobs', 'investment', 'industry', 'agriculture'];
            lines.push('');
            lines.push('Data sources by sector:');
            sectors.forEach(s => {
                const d = window.__calculateStrategicData(districtName, s);
                lines.push(`  • ${capitalize(s)}: ${d.source} (${d.confidence})`);
            });
        }

        if (docs.length === 0) {
            lines.push('');
            lines.push('⚠️ This district is using fallback estimates. To improve accuracy, add its DDS document with numeric targets.');
        }

        return lines.join('\n');
    }

    function answerRanking(sector) {
        if (typeof window.__calculateStrategicData !== 'function') return null;
        const appState = window.__state;
        const districts = appState?.districts || [];
        if (districts.length === 0) return null;

        const sectorToUse = sector || 'housing';

        const ranked = districts.map(name => {
            const data = window.__calculateStrategicData(name, sectorToUse);
            return { name, gap: data.gapPercentage, gapValue: data.gap, confidence: data.confidence };
        }).sort((a, b) => b.gap - a.gap);

        const top5 = ranked.slice(0, 5);
        const sectorLabel = capitalize(sectorToUse);

        const formatValue = (val) => {
            if (sectorToUse === 'investment') {
                if (val >= 1e9) return '$' + (val / 1e9).toFixed(1) + 'B';
                if (val >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
                return '$' + Math.round(val);
            }
            if (sectorToUse === 'agriculture') return val + '%';
            if (sectorToUse === 'industry') return val + ' zones';
            return val.toLocaleString();
        };

        const list = top5.map((d, i) =>
            `  ${i + 1}. ${d.name} — ${d.gap}% gap (${formatValue(d.gapValue)})`
        ).join('\n');

        return `🏆 **Top 5 Districts — ${sectorLabel} Gap**\n\n` +
               `Districts with the largest need:\n${list}\n\n` +
               `Note: A larger gap means more investment is needed, which signals opportunity for investors.`;
    }

    function answerComparison(rawQuestion) {
        if (typeof window.__calculateStrategicData !== 'function') return null;
        const appState = window.__state;
        const districts = appState?.districts || [];

        // Find two district names in the question
        const q = normalize(rawQuestion);
        const found = [];
        for (const d of districts) {
            if (q.includes(normalize(d))) found.push(d);
        }
        if (found.length < 2) {
            return `To compare two districts, please mention both by name. Example: "Compare Gasabo and Kicukiro".`;
        }

        const [a, b] = found;
        const sector = detectSector(rawQuestion);

        if (sector) {
            const da = window.__calculateStrategicData(a, sector);
            const db = window.__calculateStrategicData(b, sector);
            const sectorLabel = capitalize(sector);
            return `📊 **${a} vs ${b} — ${sectorLabel} Gap**\n\n` +
                   `${a}: ${da.gapPercentage}% gap (${da.source}, ${da.confidence})\n` +
                   `${b}: ${db.gapPercentage}% gap (${db.source}, ${db.confidence})\n\n` +
                   `Higher gap: ${da.gapPercentage > db.gapPercentage ? a : b}`;
        }

        // Compare composite scores
        const dataA = appState?.calculatedDistrictData?.[a] || {};
        const dataB = appState?.calculatedDistrictData?.[b] || {};
        return `📊 **${a} vs ${b} — Composite Overview**\n\n` +
               `                     ${a}      ${b}\n` +
               `Composite Score:     ${(dataA.composite_score || 0).toString().padEnd(6)}  ${dataB.composite_score || 0}\n` +
               `Land:                ${(dataA.land || 0).toString().padEnd(6)}  ${dataB.land || 0}\n` +
               `Labor:               ${(dataA.labor || 0).toString().padEnd(6)}  ${dataB.labor || 0}\n` +
               `Capital:             ${(dataA.capital || 0).toString().padEnd(6)}  ${dataB.capital || 0}\n` +
               `Entrepreneurship:    ${(dataA.entrepreneurship || 0).toString().padEnd(6)}  ${dataB.entrepreneurship || 0}`;
    }

    // -----------------------------------------------------------------------
    // HELPER
    // -----------------------------------------------------------------------
    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // -----------------------------------------------------------------------
    // EXACT CONVERSATIONAL MATCH
    // -----------------------------------------------------------------------
    function checkConversational(userQuestion) {
        if (!CHATBOT_STATE.knowledge?.conversational) return null;
        const q = normalize(userQuestion);
        const wordCount = q.split(' ').length;
        if (wordCount > 5) return null;

        const conv = CHATBOT_STATE.knowledge.conversational;
        for (const key of Object.keys(conv)) {
            const category = conv[key];
            if (!category.patterns || !category.responses) continue;
            for (const pattern of category.patterns) {
                const p = normalize(pattern);
                if (q === p || q.includes(p) || similarity(q, p) >= 0.75) {
                    return {
                        type: key,
                        response: pickRandom(category.responses)
                    };
                }
            }
        }
        return null;
    }

    function pickRandom(arr) {
        if (!arr || arr.length === 0) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // -----------------------------------------------------------------------
    // MAIN KNOWLEDGE BASE LOOKUP
    // -----------------------------------------------------------------------
    function findAnswer(userQuestion) {
        if (!CHATBOT_STATE.knowledge) return null;
        const normalizedQuestion = normalize(userQuestion);
        let bestMatch = null;
        let bestScore = 0;

        CHATBOT_STATE.knowledge.knowledge.forEach(entry => {
            entry.questions.forEach(q => {
                const score = similarity(normalizedQuestion, normalize(q));
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = entry;
                }
            });
        });

        if (bestScore < 0.3) return null;
        return bestMatch;
    }

    // -----------------------------------------------------------------------
    // RENDER HELPERS
    // -----------------------------------------------------------------------
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatMessage(text) {
        return escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
    }

    function addMessage(role, text) {
        const container = document.getElementById('chatbot-messages');
        if (!container) return;
        const msg = document.createElement('div');
        msg.className = `chatbot-msg chatbot-msg-${role}`;
        if (role === 'bot') {
            msg.innerHTML = `
                <div class="chatbot-msg-avatar">🤖</div>
                <div class="chatbot-msg-bubble">${formatMessage(text)}</div>
            `;
        } else {
            msg.innerHTML = `
                <div class="chatbot-msg-bubble">${formatMessage(text)}</div>
            `;
        }
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
        CHATBOT_STATE.conversationHistory.push({ role, text });
    }

    function addTypingIndicator() {
        const container = document.getElementById('chatbot-messages');
        if (!container) return;
        const typing = document.createElement('div');
        typing.className = 'chatbot-msg chatbot-msg-bot';
        typing.id = 'chatbot-typing';
        typing.innerHTML = `
            <div class="chatbot-msg-avatar">🤖</div>
            <div class="chatbot-msg-bubble chatbot-typing">
                <span></span><span></span><span></span>
            </div>
        `;
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
    }

    function removeTypingIndicator() {
        const typing = document.getElementById('chatbot-typing');
        if (typing) typing.remove();
    }

    function renderSuggestions(suggestions) {
        const container = document.getElementById('chatbot-suggestions');
        if (!container) return;
        if (!suggestions || suggestions.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = suggestions.map(s => `
            <button class="chatbot-suggestion" data-question="${escapeHtml(s)}">${escapeHtml(s)}</button>
        `).join('');
        container.querySelectorAll('.chatbot-suggestion').forEach(btn => {
            btn.addEventListener('click', () => handleUserInput(btn.dataset.question));
        });
    }

    // -----------------------------------------------------------------------
    // MESSAGE HANDLING — orchestrator
    // -----------------------------------------------------------------------
    function handleUserInput(text) {
        if (!text || !text.trim()) return;
        addMessage('user', text);
        renderSuggestions([]);

        setTimeout(() => {
            addTypingIndicator();
            setTimeout(() => {
                removeTypingIndicator();

                // 1. Conversational first (short inputs)
                const conversational = checkConversational(text);
                if (conversational) {
                    addMessage('bot', conversational.response);
                    const suggestions = CHATBOT_STATE.knowledge.suggestions || [];
                    renderSuggestions(suggestions.slice(0, 3));
                    CHATBOT_STATE.lastIntent = conversational.type;
                    return;
                }

                // 2. Live district intelligence
                const intent = detectIntent(text);
                if (intent) {
                    let answer = null;
                    try {
                        if (intent.type === 'district_summary') {
                            answer = answerDistrictSummary(intent.district);
                        } else if (intent.type === 'district_sector') {
                            answer = answerDistrictSector(intent.district, intent.sector);
                        } else if (intent.type === 'data_quality') {
                            answer = answerDataQuality(intent.district);
                        } else if (intent.type === 'ranking') {
                            answer = answerRanking(intent.sector);
                        } else if (intent.type === 'comparison') {
                            answer = answerComparison(intent.raw);
                        }
                    } catch (err) {
                        console.warn('Live answer error:', err);
                    }
                    if (answer) {
                        addMessage('bot', answer);
                        const followUps = [];
                        if (intent.district && intent.type !== 'district_summary') {
                            followUps.push(`Tell me about ${intent.district}`);
                        }
                        followUps.push('Show top districts by gap');
                        followUps.push('Why is data missing for some districts?');
                        renderSuggestions(followUps.slice(0, 3));
                        CHATBOT_STATE.lastIntent = intent.type;
                        CHATBOT_STATE.lastDistrict = intent.district;
                        return;
                    }
                }

                // 3. Static knowledge base
                const match = findAnswer(text);
                if (match) {
                    addMessage('bot', match.answer);
                    CHATBOT_STATE.lastIntent = match.category;
                    CHATBOT_STATE.lastAnswerCategory = match.category;
                    return;
                }

                // 4. Fallback
                addMessage('bot', CHATBOT_STATE.knowledge.fallback);
                const suggestions = CHATBOT_STATE.knowledge.suggestions || [];
                renderSuggestions(suggestions);
            }, 500);
        }, 200);
    }

    // -----------------------------------------------------------------------
    // OPEN / CLOSE
    // -----------------------------------------------------------------------
    function openChat() {
        const panel = document.getElementById('chatbot-panel');
        const fab = document.getElementById('chatbot-fab');
        if (!panel || !fab) return;
        panel.classList.add('open');
        fab.classList.add('hidden');
        CHATBOT_STATE.isOpen = true;
        const messages = document.getElementById('chatbot-messages');
        if (messages && messages.children.length === 0) {
            setTimeout(() => {
                addMessage('bot', CHATBOT_STATE.knowledge?.greeting || 'Welcome.');
                const suggestions = CHATBOT_STATE.knowledge?.suggestions || [];
                renderSuggestions(suggestions);
            }, 300);
        }
    }

    function closeChat() {
        const panel = document.getElementById('chatbot-panel');
        const fab = document.getElementById('chatbot-fab');
        if (!panel || !fab) return;
        panel.classList.remove('open');
        fab.classList.remove('hidden');
        CHATBOT_STATE.isOpen = false;
    }

    // -----------------------------------------------------------------------
    // SETUP UI
    // -----------------------------------------------------------------------
    function setupUI() {
        const fab = document.getElementById('chatbot-fab');
        const closeBtn = document.getElementById('chatbot-close');
        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');

        if (fab) fab.addEventListener('click', openChat);
        if (closeBtn) closeBtn.addEventListener('click', closeChat);

        if (sendBtn && input) {
            sendBtn.addEventListener('click', () => {
                const text = input.value.trim();
                if (text) {
                    handleUserInput(text);
                    input.value = '';
                }
            });
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendBtn.click();
                }
            });
        }
    }

    // -----------------------------------------------------------------------
    // INIT
    // -----------------------------------------------------------------------
    async function init() {
        await loadKnowledge();
        setupUI();
        console.log('💬 Chatbot ready (with live district intelligence)');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();