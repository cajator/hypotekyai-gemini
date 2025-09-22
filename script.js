// Hypoteky Ai - v15.0 - Final Build
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    
    const CONFIG = {
        API_CHAT_ENDPOINT: '/.netlify/functions/chat',
        API_RATES_ENDPOINT: '/.netlify/functions/rates',
        DEBOUNCE_DELAY: 300,
        SLIDER_STEPS: { propertyValue: 100000, ownResources: 50000, income: 1000 },
        AI_SUGGESTIONS: {
            "Začínáme": ["Jak celý proces funguje?", "Co je to LTV?", "Jaké dokumenty budu potřebovat?"],
            "Moje situace": ["Co když jsem OSVČ?", "Mám záznam v registru, vadí to?", "Chceme si půjčit s partnerem?"],
            "Detaily produktu": ["Jaký je rozdíl mezi fixacemi?", "Můžu hypotéku splatit dříve?", "Co se stane, když nebudu moct splácet?"],
        }
    };

    const state = {
        mode: 'guided',
        currentStep: 1,
        formData: {
            purpose: 'koupě', propertyType: 'byt', applicants: 1, age: 35,
            education: 'středoškolské s maturitou', employment: 'zaměstnanec',
            income: 60000, liabilities: 0,
            propertyValue: 5000000, ownResources: 1000000,
            loanTerm: 25, fixation: 5,
            landValue: 1500000, constructionBudget: 3500000, loanBalance: 3000000,
        },
        calculation: { offers: [], selectedOffer: null, approvability: { total: 0 }, dsti: 0, loanAmount: 0, ltv: 0 },
        chart: null,
    };

    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        liveUsersCounter: document.getElementById('live-users-counter'),
        navLinks: document.querySelectorAll('header a[href^="#"], a.nav-btn[href^="#"]'),
        leadForm: document.getElementById('lead-form'),
        leadFormContainer: document.getElementById('kontakt'),
    };

    const init = () => {
        setupEventListeners();
        switchMode(state.mode);
        startLiveCounter();
    };

    const setupEventListeners = () => {
        const modeSelectionContainer = document.getElementById('kalkulacka');
        modeSelectionContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.mode-card');
            if (card && card.dataset.mode) {
                switchMode(card.dataset.mode);
            }
        });
        
        DOMElements.navLinks.forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                scrollToAndShow(targetId);
            });
        });

        DOMElements.leadForm.addEventListener('submit', handleFormSubmit);
    };
    
    const switchMode = (mode) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        DOMElements.contentContainer.innerHTML = getModeHTML(mode);
        setupModeSpecificListeners();
        
        const targetElement = document.getElementById('content-container');
        if (targetElement) {
             setTimeout(() => targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    };

    const setupModeSpecificListeners = () => {
        const container = DOMElements.contentContainer;
        container.addEventListener('click', handleContainerClick);
        container.addEventListener('input', handleContainerInput);
        container.addEventListener('change', handleContainerChange);
        
        if (state.mode === 'guided') {
            updateGuidedUI();
        } else if (state.mode === 'ai') {
            addChatMessage('Dobrý den! Jsem Hypoteky Ai stratég. Ptejte se na cokoliv, nebo si vyberte z témat níže.', 'ai');
            generateAISuggestions();
        }
    };
    
    const getModeHTML = (mode) => {
        switch(mode) {
            case 'guided': return getGuidedModeHTML();
            case 'express': return getExpressModeHTML();
            case 'ai': return getAiModeHTML();
        }
        return '';
    };

    const startLiveCounter = () => {
        let count = 147;
        const counterElement = DOMElements.liveUsersCounter;
        if (!counterElement) return;
        setInterval(() => {
            const change = Math.floor(Math.random() * 3) - 1;
            count = Math.max(130, Math.min(160, count + change));
            counterElement.textContent = `${count} lidí právě počítá hypotéku`;
        }, 3500);
    };

    const parseNumber = (s) => {
        if (typeof s !== 'string') s = String(s);
        const cleaned = s.toLowerCase().replace(/,/g, '.').replace(/\s/g, '').replace('kč','');
        if (cleaned.endsWith('m')) return parseFloat(cleaned) * 1000000;
        if (cleaned.endsWith('k')) return parseFloat(cleaned) * 1000;
        return parseFloat(cleaned) || 0;
    };

    const formatNumber = (n, currency = true) => {
        const num = Number(n);
        if(isNaN(num)) return n;
        return currency 
            ? num.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
            : num.toLocaleString('cs-CZ', { maximumFractionDigits: 0 });
    };

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };
    
    init();
});

