// Hypoteky Ai - v15.0 - Final Build
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/api/chat',
        API_RATES_ENDPOINT: '/api/rates',
        DEBOUNCE_DELAY: 400,
        SLIDER_STEPS: {
            propertyValue: 100000, ownResources: 50000, income: 1000, liabilities: 500,
            loanTerm: 1, age: 1, constructionBudget: 100000, landValue: 50000, loanBalance: 100000
        },
        AI_SUGGESTIONS: {
            "Začínáme": ["Jak celý proces funguje?", "Co je to LTV?", "Jaké dokumenty budu potřebovat?"],
            "Moje situace": ["Co když jsem OSVČ?", "Mám záznam v registru, vadí to?", "Chceme si půjčit s partnerem?"],
            "Detaily produktu": ["Jaký je rozdíl mezi fixacemi?", "Můžu hypotéku splatit dříve?", "Co se stane, když nebudu moct splácet?"]
        },
        GUIDED_MODE_STEPS: ["Účel", "Nemovitost", "Příjmy", "O vás", "Výsledky"]
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'guided', currentStep: 1,
        formData: {
            purpose: 'koupě', propertyType: 'byt', applicants: 1, age: 35,
            education: 'středoškolské s maturitou', employment: 'zaměstnanec',
            income: 60000, liabilities: 0, propertyValue: 5000000, ownResources: 1000000,
            loanTerm: 25, fixation: 5, landValue: 1500000, constructionBudget: 3500000, loanBalance: 3000000,
        },
        calculation: { offers: [], selectedOffer: null, approvability: { total: 0 }, dsti: 0, loanAmount: 0, ltv: 0 },
        chart: null,
    };

    // --- DOM ELEMENTS ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        liveUsersCounter: document.getElementById('live-users-counter'),
        navLinks: document.querySelectorAll('header a[href^="#"], a.nav-btn[href^="#"]'),
        leadForm: document.getElementById('lead-form'),
        leadFormContainer: document.getElementById('kontakt'),
    };

    // --- INITIALIZATION ---
    const init = () => {
        setupEventListeners();
        switchMode(state.mode, true);
        startLiveCounter();
    };

    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        const modeSelectionContainer = document.getElementById('kalkulacka');
        modeSelectionContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.mode-card');
            if (card && card.dataset.mode) switchMode(card.dataset.mode);
        });

        DOMElements.navLinks.forEach(anchor => anchor.addEventListener('click', function(e) {
            e.preventDefault();
            scrollToAndShow(this.getAttribute('href'));
        }));
        DOMElements.leadForm.addEventListener('submit', handleFormSubmit);

        // Delegated event listeners for dynamic content
        DOMElements.contentContainer.addEventListener('click', handleContainerClick);
        DOMElements.contentContainer.addEventListener('input', handleContainerInput); // Debouncing is handled inside
        DOMElements.contentContainer.addEventListener('change', handleContainerChange);
    };

    const setupModeSpecificListeners = () => {
        if (state.mode === 'guided') updateGuidedUI();
        else if (state.mode === 'ai') {
            addChatMessage('Dobrý den! Jsem Hypoteky Ai stratég. Ptejte se na cokoliv, nebo mi napište, co řešíte, a já vám pomohu s výpočtem.', 'ai');
            generateAISuggestions();
        } else if (state.mode === 'express') updateExpressUI();
    };

    // --- MODE SWITCHING ---
    const switchMode = (mode, isInitial = false) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        DOMElements.contentContainer.innerHTML = getModeHTML(mode);
        setupModeSpecificListeners();
        if (!isInitial) {
            const targetElement = document.getElementById('content-container');
            if (targetElement) setTimeout(() => targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    };
    
    // --- HTML TEMPLATES & UI RENDERING ---
    // This section remains identical to the previous correct version, so it's omitted for brevity.
    // Functions: getModeHTML, getGuidedModeHTML, getGuidedStepHTML, getExpressModeHTML, getAiModeHTML, 
    // updateGuidedUI, updateExpressUI, renderResults, renderRepaymentChart, addChatMessage, generateAISuggestions
    const getModeHTML = (mode) => {
        switch (mode) {
            case 'guided': return getGuidedModeHTML();
            case 'express': return getExpressModeHTML();
            case 'ai': return getAiModeHTML();
        }
        return '';
    };

    const getGuidedModeHTML = () => {
        const steps = CONFIG.GUIDED_MODE_STEPS;
        const timelineHTML = steps.map((step, index) => `
            <div class="timeline-step" data-step="${index + 1}">
                <div class="step-circle">${index + 1}</div><p>${step}</p>
            </div>`).join('');
        return `<div class="timeline"><div class="timeline-line"><div id="timeline-progress"></div></div>${timelineHTML}</div>
                <div id="guided-form-container">${getGuidedStepHTML(1)}</div>
                <div id="results-container" class="hidden"></div>`;
    };
    
    const getGuidedStepHTML = (step) => {
        const { formData } = state;
        let content = '';
        switch (step) {
            case 1:
                content = `<h3 class="text-2xl font-bold mb-6">Jaký je hlavní účel vaší hypotéky?</h3><div class="radio-group">
                    ${createRadio('purpose', 'koupě', 'Koupě', formData.purpose)}
                    ${createRadio('purpose', 'výstavba', 'Výstavba', formData.purpose)}
                    ${createRadio('purpose', 'rekonstrukce', 'Rekonstrukce', formData.purpose)}
                    ${createRadio('purpose', 'refinancování', 'Refinancování', formData.purpose)}</div>`;
                break;
            case 2:
                content = `<h3 class="text-2xl font-bold mb-6">Parametry nemovitosti</h3>`;
                if (formData.purpose === 'koupě') {
                    content += createSlider('propertyValue', 'Hodnota nemovitosti', formData.propertyValue, 500000, 20000000);
                    content += createSlider('ownResources', 'Vlastní zdroje', formData.ownResources, 0, formData.propertyValue);
                } else if (formData.purpose === 'výstavba') {
                    content += createSlider('landValue', 'Hodnota pozemku', formData.landValue, 0, 10000000);
                    content += createSlider('constructionBudget', 'Rozpočet na výstavbu', formData.constructionBudget, 500000, 20000000);
                } else if (formData.purpose === 'rekonstrukce') {
                     content += createSlider('propertyValue', 'Hodnota nemovitosti (před rekonstrukcí)', formData.propertyValue, 500000, 20000000);
                     content += createSlider('constructionBudget', 'Rozpočet na rekonstrukci', formData.constructionBudget, 100000, 5000000);
                } else {
                     content += createSlider('propertyValue', 'Aktuální hodnota nemovitosti', formData.propertyValue, 500000, 20000000);
                     content += createSlider('loanBalance', 'Zbývá doplatit na úvěru', formData.loanBalance, 100000, 15000000);
                }
                break;
            case 3:
                 content = `<h3 class="text-2xl font-bold mb-6">Vaše finanční situace</h3>
                    ${createSlider('income', 'Měsíční čistý příjem', formData.income, 15000, 250000)}
                    ${createSlider('liabilities', 'Měsíční splátky jiných úvěrů', formData.liabilities, 0, 100000)}`;
                break;
            case 4:
                content = `<h3 class="text-2xl font-bold mb-6">Několik detailů o vás</h3>
                    ${createSlider('age', 'Věk hlavního žadatele', formData.age, 18, 70)}
                    ${createSlider('loanTerm', 'Doba splatnosti (roky)', formData.loanTerm, 5, 30)}
                    <div class="mt-6"><label class="form-label">Preferovaná délka fixace</label><div class="radio-group">
                        ${createRadio('fixation', '3', '3 roky', formData.fixation)} ${createRadio('fixation', '5', '5 let', formData.fixation)}
                        ${createRadio('fixation', '7', '7 let', formData.fixation)} ${createRadio('fixation', '10', '10 let', formData.fixation)}
                    </div></div>`;
                break;
        }
        const navButtons = `<div class="flex justify-between mt-10">
                <button class="nav-btn bg-gray-600 hover:bg-gray-700" data-action="prev-step" ${step === 1 ? 'disabled' : ''}>Zpět</button>
                <button class="nav-btn" data-action="next-step">${step === CONFIG.GUIDED_MODE_STEPS.length - 1 ? 'Zobrazit výsledky' : 'Další krok'}</button>
            </div>`;
        return `<div class="form-section active" data-step="${step}">${content}${navButtons}</div>`;
    };

    const getExpressModeHTML = () => `
        <div id="express-form">
            <h3 class="text-2xl font-bold mb-6 text-center">Expresní scoring</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                ${createSlider('propertyValue', 'Hodnota nemovitosti', state.formData.propertyValue, 500000, 20000000)}
                ${createSlider('ownResources', 'Vlastní zdroje', state.formData.ownResources, 0, state.formData.propertyValue)}
                ${createSlider('income', 'Měsíční čistý příjem', state.formData.income, 15000, 250000)}
                ${createSlider('liabilities', 'Měsíční splátky jiných úvěrů', state.formData.liabilities, 0, 100000)}
            </div>
            <div class="flex justify-center mt-8">
                <button class="nav-btn text-lg" data-action="calculate-express">
                    <span class="mr-2">Spočítat</span><div class="loading-spinner-white hidden"></div>
                </button>
            </div>
        </div>
        <div id="results-container" class="hidden mt-10"></div>`;

    const getAiModeHTML = () => `
        <div class="flex flex-col h-[600px]">
            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4"></div>
            <div id="ai-suggestions" class="p-4 border-t"></div>
            <div class="p-4 border-t flex items-center space-x-2">
                <input type="text" id="chat-input" class="modern-input" placeholder="Zadejte svůj dotaz...">
                <button id="chat-send" class="nav-btn">Odeslat</button>
            </div>
        </div>`;
    
    const updateGuidedUI = () => {
        const { currentStep } = state;
        const totalSteps = CONFIG.GUIDED_MODE_STEPS.length;
        document.querySelectorAll('.timeline-step').forEach((el, index) => {
            el.classList.toggle('active', index + 1 === currentStep);
            el.classList.toggle('completed', index + 1 < currentStep);
        });
        document.getElementById('timeline-progress').style.width = `${(currentStep - 1) / (totalSteps - 1) * 100}%`;
        const container = document.getElementById('guided-form-container');
        if (currentStep <= totalSteps -1) container.innerHTML = getGuidedStepHTML(currentStep);
        else container.innerHTML = '';
    };
    
    const updateExpressUI = () => {
        DOMElements.contentContainer.querySelector('#express-form').innerHTML = getExpressModeHTML(); // Re-render to attach listeners
    }

    const renderResults = () => {
        const { offers, approvability, dsti, loanAmount, ltv } = state.calculation;
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.classList.remove('hidden');

        if (offers.length === 0) {
            resultsContainer.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg">
                <h3 class="text-2xl font-bold text-red-800 mb-2">Bohužel, dle zadaných parametrů to nevychází</h3>
                <p class="text-red-700">Zkuste upravit parametry, nebo se <a href="#kontakt" class="font-bold underline nav-link">spojte s naším specialistou</a> pro individuální posouzení.</p>
            </div>`;
            scrollToAndShow('#content-container');
            return;
        }

        const offersHTML = offers.map(offer => `
            <div class="offer-card p-6 rounded-xl" data-offer-id="${offer.id}">
                <div class="flex-grow">
                    <h4 class="text-lg font-bold text-blue-700">${offer.title}</h4>
                    <p class="text-sm text-gray-600 mt-1">${offer.description}</p>
                </div>
                <div class="text-right mt-4">
                    <div class="text-2xl font-extrabold">${formatNumber(offer.monthlyPayment)}</div>
                    <div class="text-sm font-semibold text-gray-500">Úrok ${offer.rate.toFixed(2)} %</div>
                </div>
            </div>`).join('');

        resultsContainer.innerHTML = `
            <div>
                <h3 class="text-3xl font-bold mb-6">Našli jsme pro vás tyto nabídky:</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${offersHTML}
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                <div class="lg:col-span-2 bg-gray-50 p-6 rounded-xl">
                    <h4 class="text-xl font-bold mb-4">Vývoj splácení v čase</h4>
                    <canvas id="repaymentChart"></canvas>
                </div>
                <div class="bg-blue-50 p-6 rounded-xl">
                    <h4 class="text-xl font-bold mb-4">Přehled vaší hypotéky</h4>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between"><span>Výše úvěru:</span> <strong class="text-base">${formatNumber(loanAmount)}</strong></div>
                        <div class="flex justify-between"><span>LTV (poměr k ceně):</span> <strong class="text-base">${ltv.toFixed(0)} %</strong></div>
                        <div class="flex justify-between"><span>DSTI (zatížení příjmu):</span> <strong class="text-base">${dsti.toFixed(0)} %</strong></div>
                    </div>
                    <h4 class="text-lg font-bold mt-6 mb-2">Šance na schválení: <span class="text-2xl font-bold text-green-600">${approvability.total}%</span></h4>
                    <div class="approvability-bar-bg"><div class="approvability-bar bg-green-500" style="width: ${approvability.total}%"></div></div>
                    <p class="text-xs text-gray-600 mt-2">Na základě zadaných dat máte velmi dobrou šanci na získání hypotéky.</p>
                </div>
            </div>
            <div class="text-center mt-12 bg-white p-8 rounded-2xl shadow-lg border">
                 <h3 class="text-2xl font-bold mb-2">Co dál?</h3>
                 <p class="text-gray-600 mb-6 max-w-2xl mx-auto">Náš specialista s vámi probere detaily, porovná skryté poplatky a vyjedná finální podmínky. Nechte si zdarma a nezávazně poradit.</p>
                 <div class="flex justify-center items-center gap-4">
                    <button class="nav-btn bg-green-600 hover:bg-green-700 text-lg" data-action="show-lead-form">Kontaktovat specialistu</button>
                    <button class="nav-btn bg-gray-600 hover:bg-gray-700" data-action="discuss-with-ai">Probrat s AI stratégem</button>
                 </div>
            </div>`;

        if (state.mode === 'guided') document.getElementById('guided-form-container').classList.add('hidden');
        
        const firstCard = resultsContainer.querySelector('.offer-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            state.calculation.selectedOffer = offers.find(o => o.id === firstCard.dataset.offerId);
        }
        
        renderRepaymentChart();
        scrollToAndShow('#content-container');
    };
    
    const renderRepaymentChart = () => {
        if (state.chart) state.chart.destroy();
        const ctx = document.getElementById('repaymentChart')?.getContext('2d');
        if (!ctx || !state.calculation.selectedOffer) return;

        const { loanAmount, loanTerm } = state.formData;
        const { rate } = state.calculation.selectedOffer;
        const schedule = calculateAmortization(loanAmount, rate, loanTerm);
        
        state.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: schedule.map(item => `Rok ${item.year}`),
                datasets: [
                    { label: 'Zaplacené úroky', data: schedule.map(item => item.interest), backgroundColor: '#fca5a5' },
                    { label: 'Splacená jistina', data: schedule.map(item => item.principal), backgroundColor: '#60a5fa' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: value => formatNumber(value) } } } }
        });
    };

    const addChatMessage = (message, sender) => {
        const messagesContainer = document.getElementById('chat-messages');
        const bubble = document.createElement('div');
        if (sender === 'ai-typing') {
            bubble.className = 'chat-bubble-ai-typing';
            bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
            bubble.id = 'typing-indicator';
        } else {
             bubble.className = sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user';
             bubble.innerHTML = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }
        messagesContainer.appendChild(bubble);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };
    
    const generateAISuggestions = () => {
        const container = document.getElementById('ai-suggestions');
        if (!container) return;
        let html = '<div class="flex flex-wrap gap-2">';
        for (const category in CONFIG.AI_SUGGESTIONS) {
            CONFIG.AI_SUGGESTIONS[category].forEach(suggestion => {
                html += `<button class="suggestion-btn" data-suggestion="${suggestion}">${suggestion}</button>`;
            });
        }
        html += '</div>';
        container.innerHTML = html;
    };


    // --- EVENT HANDLERS ---
    const handleContainerClick = (e) => {
        const target = e.target.closest('[data-action], .offer-card, .suggestion-btn, #chat-send');
        if (!target) return;

        const action = target.dataset.action;
        if (action === 'next-step') {
            if (state.currentStep < CONFIG.GUIDED_MODE_STEPS.length) {
                state.currentStep++;
                if (state.currentStep === CONFIG.GUIDED_MODE_STEPS.length) calculateRates();
                else updateGuidedUI();
            }
        }
        if (action === 'prev-step') if (state.currentStep > 1) { state.currentStep--; updateGuidedUI(); }
        if (action === 'calculate-express') calculateRates(target);
        if (action === 'show-lead-form') scrollToAndShow('#kontakt');
        if (action === 'discuss-with-ai') switchMode('ai');
        if (target.id === 'chat-send') handleChatMessageSend();
        if (target.matches('.suggestion-btn')) {
            document.getElementById('chat-input').value = target.dataset.suggestion;
            handleChatMessageSend();
        }
        if (target.matches('.offer-card')) {
            document.querySelectorAll('.offer-card').forEach(card => card.classList.remove('selected'));
            target.classList.add('selected');
            state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === target.dataset.offerId);
            renderRepaymentChart();
        }
    };
    
    // Debounced function for recalculation
    const debouncedCalculation = debounce(() => {
        if (state.calculation.offers.length > 0 || state.mode === 'express') {
            calculateRates();
        }
    }, CONFIG.DEBOUNCE_DELAY);

    // --- CRITICAL FIX: The Main Handler for Inputs ---
    const handleContainerInput = (e) => {
        const { id, value } = e.target;
        const baseId = id.replace('-input', '');

        if (state.formData.hasOwnProperty(baseId)) {
            const parsedValue = parseNumber(value);

            // Update state
            state.formData[baseId] = parsedValue;

            // Update the other corresponding element (two-way binding)
            const isTextInput = id.endsWith('-input');
            if (isTextInput) {
                const slider = document.getElementById(baseId);
                if (slider) slider.value = parsedValue;
            } else { // It's a slider
                const textInput = document.getElementById(`${baseId}-input`);
                if (textInput) textInput.value = formatNumber(parsedValue, false);
            }

            // If we are on a page with results, or in express mode, trigger recalculation
            debouncedCalculation();
        }
    };

    const handleContainerChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'radio' && name in state.formData) {
            state.formData[name] = isNaN(value) ? value : Number(value);
            if (state.calculation.offers.length > 0) calculateRates();
        }
    };
    
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target, submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true; submitBtn.textContent = 'Odesílám...';
        try {
            await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() });
            form.style.display = 'none';
            document.getElementById('form-success').style.display = 'block';
        } catch (error) {
            console.error('Form submission error:', error);
            alert('Odeslání se nezdařilo.');
            submitBtn.disabled = false; submitBtn.textContent = 'Odeslat nezávazně';
        }
    };

    const handleChatMessageSend = async () => {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;
        addChatMessage(message, 'user');
        input.value = '';
        addChatMessage('', 'ai-typing');
        try {
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, context: state }) });
            document.getElementById('typing-indicator')?.remove();
            if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            
            const data = await response.json();
            if (data.tool === 'calculateMortgage') {
                Object.assign(state.formData, data.params);
                switchMode('express');
                setTimeout(() => calculateRates(document.querySelector('[data-action="calculate-express"]')), 200);
            } else if (data.tool === 'redirectToContact') {
                 addChatMessage(data.response, 'ai');
                 scrollToAndShow('#kontakt');
            } else {
                addChatMessage(data.response, 'ai');
            }
        } catch (error) {
            console.error("AI Chat Error:", error);
            document.getElementById('typing-indicator')?.remove();
            addChatMessage(`Omlouvám se, došlo k chybě: ${error.message}`, 'ai');
        }
    };

    // --- API & CALCULATIONS ---
    const calculateRates = async (button = null) => {
        const spinner = button ? button.querySelector('.loading-spinner-white') : null;
        if (button) { button.disabled = true; if(spinner) spinner.classList.remove('hidden'); }
        
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.innerHTML = `<div class="text-center p-8"><div class="loading-spinner-blue"></div><p>Počítám nejlepší nabídky...</p></div>`;
            resultsContainer.classList.remove('hidden');
        }
        
        try {
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${new URLSearchParams(state.formData).toString()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            state.calculation = { ...state.calculation, ...data };
            renderResults();
        } catch (error) {
            console.error('Error fetching rates:', error);
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg"><h3 class="text-2xl font-bold text-red-800 mb-2">Chyba při výpočtu</h3><p class="text-red-700">Nepodařilo se načíst sazby. Zkuste to znovu.</p></div>`;
            }
        } finally {
            if (button) { button.disabled = false; if(spinner) spinner.classList.add('hidden'); }
        }
    };

    const calculateAmortization = (principal, annualRate, years) => {
        const monthlyRate = annualRate / 100 / 12;
        const numberOfPayments = years * 12;
        const monthlyPayment = principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
        let balance = principal;
        const schedule = [];

        for (let year = 1; year <= years; year++) {
            let yearlyInterest = 0;
            let yearlyPrincipal = 0;
            for (let month = 1; month <= 12; month++) {
                if (balance <= 0) break;
                const interest = balance * monthlyRate;
                const principalPayment = monthlyPayment - interest;
                balance -= principalPayment;
                yearlyInterest += interest;
                yearlyPrincipal += principalPayment;
            }
            schedule.push({ year, interest: Math.round(yearlyInterest), principal: Math.round(yearlyPrincipal), remainingBalance: Math.round(balance) });
        }
        return schedule;
    };

    // --- UTILITIES ---
    const startLiveCounter = () => {
        let count = 147;
        const counterElement = DOMElements.liveUsersCounter;
        if (!counterElement) return;
        setInterval(() => {
            count = Math.max(130, Math.min(160, count + (Math.floor(Math.random() * 3) - 1)));
            counterElement.textContent = `${count} lidí právě počítá hypotéku`;
        }, 3500);
    };

    const parseNumber = (s) => parseFloat(String(s).replace(/[^0-9]/g, '')) || 0;
    const formatNumber = (n, currency = true) => n.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
    };
    const scrollToAndShow = (targetId) => {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            if(targetId === '#kontakt') targetElement.classList.remove('hidden');
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    // --- COMPONENT FACTORIES ---
    const createSlider = (id, label, value, min, max) => {
        const step = CONFIG.SLIDER_STEPS[id] || 1;
        const isCurrency = ['propertyValue', 'ownResources', 'income', 'liabilities', 'landValue', 'constructionBudget', 'loanBalance'].includes(id);
        const suffix = id === 'loanTerm' || id === 'age' ? ' let' : (isCurrency ? ' Kč' : '');
        
        return `<div class="slider-group">
                <div class="flex justify-between items-center mb-1">
                    <label for="${id}" class="form-label mb-0">${label}</label>
                    <div class="flex items-center">
                        <input type="text" id="${id}-input" value="${formatNumber(value, false)}" class="slider-value-input">
                        <span class="font-semibold">${suffix}</span>
                    </div>
                </div>
                <div class="slider-container">
                    <input type="range" id="${id}" name="${id}" min="${min}" max="${max}" value="${value}" step="${step}" class="slider-input">
                </div>
            </div>`;
    };
    
    const createRadio = (name, value, label, currentValue) => `<label class="radio-label"><input type="radio" name="${name}" value="${value}" ${String(currentValue) === String(value) ? 'checked' : ''}><span>${label}</span></label>`;

    init();
});