// ==========================================================================
// Rwanda Opportunity Map - Knowledge-Based Chatbot (with Conversational Layer)
// ==========================================================================

(function() {
    'use strict';

    const CHATBOT_STATE = {
        isOpen: false,
        knowledge: null,
        conversationHistory: [],
        lastIntent: null,
        lastAnswerCategory: null
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
    // EXACT CONVERSATIONAL MATCH
    // -----------------------------------------------------------------------
    function checkConversational(userQuestion) {
        if (!CHATBOT_STATE.knowledge?.conversational) return null;
        const q = normalize(userQuestion);

        // Short inputs (<= 5 words) get exact match priority
        const wordCount = q.split(' ').length;
        if (wordCount > 5) return null;

        const conv = CHATBOT_STATE.knowledge.conversational;
        for (const key of Object.keys(conv)) {
            const category = conv[key];
            if (!category.patterns || !category.responses) continue;
            for (const pattern of category.patterns) {
                const p = normalize(pattern);
                // Exact match, substring match, or high similarity
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

    // -----------------------------------------------------------------------
    // PICK RANDOM RESPONSE
    // -----------------------------------------------------------------------
    function pickRandom(arr) {
        if (!arr || arr.length === 0) return '';
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // -----------------------------------------------------------------------
    // FIND BEST MATCH IN KNOWLEDGE BASE
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
        return escapeHtml(text).replace(/\n/g, '<br/>');
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
    // MESSAGE HANDLING
    // -----------------------------------------------------------------------
    function handleUserInput(text) {
        if (!text || !text.trim()) return;
        addMessage('user', text);
        renderSuggestions([]);

        setTimeout(() => {
            addTypingIndicator();
            setTimeout(() => {
                removeTypingIndicator();

                // 1. Check conversational layer first
                const conversational = checkConversational(text);
                if (conversational) {
                    addMessage('bot', conversational.response);
                    const suggestions = CHATBOT_STATE.knowledge.suggestions || [];
                    renderSuggestions(suggestions.slice(0, 3));
                    CHATBOT_STATE.lastIntent = conversational.type;
                    return;
                }

                // 2. Search the main knowledge base
                const match = findAnswer(text);
                if (match) {
                    addMessage('bot', match.answer);
                    CHATBOT_STATE.lastIntent = match.category;
                    CHATBOT_STATE.lastAnswerCategory = match.category;
                    return;
                }

                // 3. Fallback
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
        console.log('💬 Chatbot ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();