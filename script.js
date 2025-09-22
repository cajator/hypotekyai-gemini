// Hypotéka AI - v13.0 - Final Build
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/.netlify/functions/chat',
        API_RATES_ENDPOINT: '/.netlify/functions/rates',
        DEBOUNCE_DELAY: 300,
        SLIDER_STEPS: { propertyValue: 100000, ownResources: 50000, income: 1000 },
        PARTNER_LOGOS: [
            "https://www.penize.cz/images/f/5/22532-cs-logo.svg", "https://www.penize.cz/images/f/5/22533-csob-logo.svg",
            "https://www.penize.cz/images/f/5/22535-kb-logo.svg", "https://www.penize.cz/images/f/5/22543-rb-logo.svg",
            "https://www.penize.cz/images/f/5/22547-unicredit-logo.svg", "https://www.penize.cz/images/f/5/22539-moneta-logo.svg",
            "https://www.penize.cz/images/f/5/22538-mbank-logo.svg", "https://www.penize.cz/images/f/5/22534-fio-logo.svg",
            "https://www.penize.cz/images/f/5/22531-airbank-logo.svg", "https://www.penize.cz/images/f/5/22537-maxbanka-logo.svg",
            "https://www.penize.cz/images/f/5/22546-trinity-logo.svg", "https://www.penize.cz/images/f/5/22536-creditas-logo.svg",
            "https://www.penize.cz/images/f/5/22548-cmss-logo.svg", "https://www.penize.cz/images/f/5/22550-rsts-logo.svg",
            "https://www.penize.cz/images/f/5/22549-sscs-logo.svg", "https://www.penize.cz/images/f/5/22551-moneta-ss-logo.svg",
            "https://www.penize.cz/images/f/5/22540-oberbank-logo.svg"
        ],
        AI_SUGGESTIONS: {
            "Začínáme": ["Jak celý proces funguje?", "Co je to LTV?", "Jaké dokumenty budu potřebovat?"],
            "Moje situace": ["Co když jsem OSVČ?", "Mám záznam v registru, vadí to?", "Chceme si půjčit s partnerem?"],
            "Detaily produktu": ["Jaký je rozdíl mezi fixacemi?", "Můžu hypotéku splatit dříve?", "Co se stane, když nebudu moct splácet?"],
        }
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'guided', currentStep: 1,
        formData: {
            purpose: 'koupě', propertyType: 'byt', applicants: 1, age: 35,
            education: 'středoškolské s maturitou', employment: 'zaměstnanec', income: 60000, liabilities: 0,
            propertyValue: 5000000, ownResources: 1000000, loanTerm: 25, fixation: 5,
            landValue: 0, constructionBudget: 0, loanBalance: 0,
        },
        calculation: { offers: [], selectedOffer: null, approvability: 0, dsti: 0, loanAmount: 0, ltv: 0 },
        chart: null,
    };

    // --- DOM ELEMENTS ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        liveUsersCounter: document.getElementById('live-users-counter'),
        navLinks: document.querySelectorAll('header a[href^="#"], footer a[href^="#"]'),
        leadFormContainer: document.getElementById('kontakt'),
        partnerLogosContainer: document.getElementById('partner-logos')
    };

    // --- INITIALIZATION ---
    const init = () => {
        setupEventListeners();
        switchMode(state.mode);
        startLiveCounter();
        renderPartnerLogos();
    };

    // --- SETUP ---
    const setupEventListeners = () => {
        DOMElements.modeCards.forEach(card => card.addEventListener('click', () => switchMode(card.dataset.mode)));
        DOMElements.navLinks.forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetElement = document.querySelector(this.getAttribute('href'));
                if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
            });
        });
    };
    
    // --- MODE SWITCHING & RENDERING ---
    const switchMode = (mode) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.classList.contains('lg:scale-105') ? false : card.dataset.mode === mode));
        DOMElements.contentContainer.innerHTML = '';
        
        switch (mode) {
            case 'guided': initGuidedMode(); break;
            case 'express': DOMElements.contentContainer.innerHTML = getExpressModeHTML(); initExpressMode(); break;
            case 'ai': DOMElements.contentContainer.innerHTML = getAiModeHTML(); initAiMode(); break;
        }
    };
    
    // =================================================================================
    // ALL MODES HTML & INIT FUNCTIONS
    // =================================================================================

    const initGuidedMode = () => {
        state.currentStep = 1;
        renderGuidedView();
    };

    const initExpressMode = () => {
        const calculateBtn = DOMElements.contentContainer.querySelector('#express-calculate-btn');
        calculateBtn.addEventListener('click', async () => {
            syncExpressFormData();
            await generateAnalysis(DOMElements.contentContainer.querySelector('#express-analysis-container'));
        });
    };

    const initAiMode = () => {
        const ui = {
            window: DOMElements.contentContainer.querySelector('#chat-window'),
            input: DOMElements.contentContainer.querySelector('#chat-input'),
            sendBtn: DOMElements.contentContainer.querySelector('#chat-send'),
            suggestions: DOMElements.contentContainer.querySelector('#ai-suggestions'),
        };
        ui.sendBtn.addEventListener('click', () => sendChatMessage(ui));
        ui.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(ui); });
        addChatMessage('Dobrý den! Jsem Hypotéka AI. Ptejte se na cokoliv, nebo si vyberte z témat níže.', 'ai', ui.window);
        generateAISuggestions(ui);
    };

    // =================================================================================
    // SHARED LOGIC - ANALYSIS, FORMS, UTILITIES
    // =================================================================================
    
    const generateAnalysis = async (container) => {
        // ... (full function in the provided code)
    };

    const renderAnalysis = (container) => {
        // ... (full function in the provided code)
    };
    
    const handleFormSubmit = (e) => {
        // ... (full function in the provided code)
    };

    // --- UTILITY & HELPER FUNCTIONS ---
    const renderPartnerLogos = () => {
        DOMElements.partnerLogosContainer.innerHTML = CONFIG.PARTNER_LOGOS
            .map(url => `<img src="${url}" alt="Partnerské logo" class="partner-logo">`).join('');
    };
    // ... all other helper functions (formatNumber, parseNumber, etc.)

    // --- START THE APP ---
    init();
});

