// Hypoteky Ai - v15.0 - Final Build
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/api/chat',
        API_RATES_ENDPOINT: '/api/rates',
        DEBOUNCE_DELAY: 400,
        SLIDER_STEPS: {
            propertyValue: 100000,
            ownResources: 50000,
            income: 1000,
            liabilities: 500,
            loanTerm: 1,
            age: 1,
            constructionBudget: 100000,
            landValue: 50000,
            loanBalance: 100000
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
        mode: 'guided',
        currentStep: 1,
        formData: {
            purpose: 'koupě',
            propertyType: 'byt',
            applicants: 1,
            age: 35,
            education: 'středoškolské s maturitou',
            employment: 'zaměstnanec',
            income: 60000,
            liabilities: 0,
            propertyValue: 5000000,
            ownResources: 1000000,
            loanTerm: 25,
            fixation: 5,
            landValue: 1500000,
            constructionBudget: 3500000,
            loanBalance: 3000000,
        },
        calculation: {
            offers: [],
            selectedOffer: null,
            approvability: { total: 0 },
            dsti: 0,
            loanAmount: 0,
            ltv: 0
        },
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
            if (card && card.dataset.mode) {
                switchMode(card.dataset.mode);
            }
        });

        DOMElements.navLinks.forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                scrollToAndShow(targetId);
            });
        });

        DOMElements.leadForm.addEventListener('submit', handleFormSubmit);

        // Centralized event handlers for dynamic content
        DOMElements.contentContainer.addEventListener('click', handleContainerClick);
        DOMElements.contentContainer.addEventListener('input', debounce(handleContainerInput, CONFIG.DEBOUNCE_DELAY));
        DOMElements.contentContainer.addEventListener('change', handleContainerChange);
    };

    const setupModeSpecificListeners = () => {
        if (state.mode === 'guided') {
            updateGuidedUI();
        } else if (state.mode === 'ai') {
            addChatMessage('Dobrý den! Jsem Hypoteky Ai stratég. Ptejte se na cokoliv, nebo si vyberte z témat níže.', 'ai');
            generateAISuggestions();
        } else if (state.mode === 'express') {
            updateExpressUI();
        }
    };

    // --- MODE SWITCHING ---
    const switchMode = (mode, isInitial = false) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        DOMElements.contentContainer.innerHTML = getModeHTML(mode);
        setupModeSpecificListeners();

        if (!isInitial) {
            const targetElement = document.getElementById('content-container');
            if (targetElement) {
                setTimeout(() => targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }
        }
    };
    
    // --- HTML TEMPLATES ---
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
                <div class="step-circle">${index + 1}</div>
                <p>${step}</p>
            </div>
        `).join('');

        return `
            <div class="timeline">
                <div class="timeline-line"><div id="timeline-progress"></div></div>
                ${timelineHTML}
            </div>
            <div id="guided-form-container">
                ${getGuidedStepHTML(1)}
            </div>
            <div id="results-container" class="hidden"></div>
        `;
    };
    
    const getGuidedStepHTML = (step) => {
        const { formData } = state;
        let content = '';
        switch (step) {
            case 1: // Účel
                content = `
                    <h3 class="text-2xl font-bold mb-6">Jaký je hlavní účel vaší hypotéky?</h3>
                    <div class="radio-group">
                        ${createRadio('purpose', 'koupě', 'Koupě', formData.purpose)}
                        ${createRadio('purpose', 'výstavba', 'Výstavba', formData.purpose)}
                        ${createRadio('purpose', 'rekonstrukce', 'Rekonstrukce', formData.purpose)}
                        ${createRadio('purpose', 'refinancování', 'Refinancování', formData.purpose)}
                    </div>`;
                break;
            case 2: // Nemovitost
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
                } else { // refinancování
                     content += createSlider('propertyValue', 'Aktuální hodnota nemovitosti', formData.propertyValue, 500000, 20000000);
                     content += createSlider('loanBalance', 'Zbývá doplatit na úvěru', formData.loanBalance, 100000, 15000000);
                }
                break;
            case 3: // Příjmy
                 content = `
                    <h3 class="text-2xl font-bold mb-6">Vaše finanční situace</h3>
                    ${createSlider('income', 'Měsíční čistý příjem', formData.income, 15000, 250000)}
                    ${createSlider('liabilities', 'Měsíční splátky jiných úvěrů', formData.liabilities, 0, 100000)}`;
                break;
            case 4: // O vás
                content = `
                    <h3 class="text-2xl font-bold mb-6">Několik detailů o vás</h3>
                    ${createSlider('age', 'Věk hlavního žadatele', formData.age, 18, 70)}
                    ${createSlider('loanTerm', 'Doba splatnosti (roky)', formData.loanTerm, 5, 30)}
                    <div class="mt-6">
                        <label class="form-label">Preferovaná délka fixace</label>
                        <div class="radio-group">
                            ${createRadio('fixation', '3', '3 roky', formData.fixation)}
                            ${createRadio('fixation', '5', '5 let', formData.fixation)}
                            ${createRadio('fixation', '7', '7 let', formData.fixation)}
                            ${createRadio('fixation', '10', '10 let', formData.fixation)}
                        </div>
                    </div>`;
                break;
        }

        const navButtons = `
            <div class="flex justify-between mt-10">
                <button class="nav-btn bg-gray-600 hover:bg-gray-700" data-action="prev-step" ${step === 1 ? 'disabled' : ''}>Zpět</button>
                <button class="nav-btn" data-action="next-step">${step === CONFIG.GUIDED_MODE_STEPS.length - 1 ? 'Zobrazit výsledky' : 'Další krok'}</button>
            </div>
        `;

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
                    <span class="mr-2"> spočítat </span>
                    <div class="loading-spinner-white hidden"></div>
                </button>
            </div>
        </div>
        <div id="results-container" class="hidden mt-10"></div>
    `;

    const getAiModeHTML = () => `
        <div class="flex flex-col h-[600px]">
            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4"></div>
            <div id="ai-suggestions" class="p-4 border-t"></div>
            <div class="p-4 border-t flex items-center space-x-2">
                <input type="text" id="chat-input" class="modern-input" placeholder="Zadejte svůj dotaz...">
                <button id="chat-send" class="nav-btn">Odeslat</button>
            </div>
        </div>
    `;
    
    // --- UI & RENDER ---
    
    const updateGuidedUI = () => {
        const { currentStep } = state;
        const totalSteps = CONFIG.GUIDED_MODE_STEPS.length;
        
        // Update timeline
        document.querySelectorAll('.timeline-step').forEach((el, index) => {
            el.classList.toggle('active', index + 1 === currentStep);
            el.classList.toggle('completed', index + 1 < currentStep);
        });

        const progressPercent = (currentStep - 1) / (totalSteps - 1) * 100;
        document.getElementById('timeline-progress').style.width = `${progressPercent}%`;

        // Show current step form
        const container = document.getElementById('guided-form-container');
        if (currentStep <= totalSteps -1) {
            container.innerHTML = getGuidedStepHTML(currentStep);
        } else {
            container.innerHTML = ''; // Hide form on results page
        }
    };
    
    const updateExpressUI = () => {
        // Re-render sliders to attach listeners correctly
        DOMElements.contentContainer.querySelector('#express-form').innerHTML = `
            <h3 class="text-2xl font-bold mb-6 text-center">Expresní scoring</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                ${createSlider('propertyValue', 'Hodnota nemovitosti', state.formData.propertyValue, 500000, 20000000)}
                ${createSlider('ownResources', 'Vlastní zdroje', state.formData.ownResources, 0, state.formData.propertyValue)}
                ${createSlider('income', 'Měsíční čistý příjem', state.formData.income, 15000, 250000)}
                ${createSlider('liabilities', 'Měsíční splátky jiných úvěrů', state.formData.liabilities, 0, 100000)}
            </div>
            <div class="flex justify-center mt-8">
                <button class="nav-btn text-lg" data-action="calculate-express">Spočítat</button>
            </div>
        `;
    }

    const renderResults = () => {
        const { offers, approvability, dsti, loanAmount, ltv } = state.calculation;
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.classList.remove('hidden');

        if (offers.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center bg-red-50 p-8 rounded-lg">
                    <h3 class="text-2xl font-bold text-red-800 mb-2">Bohužel, dle zadaných parametrů to nevychází</h3>
                    <p class="text-red-700">Zkuste upravit výši úvěru, nebo přidejte dalšího žadatele. Pro individuální posouzení se <a href="#kontakt" class="font-bold underline nav-link">spojte s naším specialistou</a>.</p>
                </div>
            `;
            scrollToAndShow('#content-container');
            return;
        }

        const offersHTML = offers.map(offer => `
            <div class="offer-card p-6 rounded-xl" data-offer-id="${offer.id}">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="text-lg font-bold text-blue-700">${offer.title}</h4>
                        <p class="text-sm text-gray-600">${offer.description}</p>
                    </div>
                    <div class="text-right ml-4">
                        <div class="text-2xl font-extrabold">${formatNumber(offer.monthlyPayment)}</div>
                        <div class="text-sm font-semibold text-gray-500">${offer.rate.toFixed(2)} %</div>
                    </div>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 space-y-4">
                    <h3 class="text-2xl font-bold">Našli jsme pro vás tyto nabídky:</h3>
                    ${offersHTML}
                </div>
                <div class="bg-gray-50 p-6 rounded-xl">
                    <h4 class="text-lg font-bold mb-4">Přehled vaší hypotéky</h4>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between"><span>Výše úvěru:</span> <strong class="text-base">${formatNumber(loanAmount)}</strong></div>
                        <div class="flex justify-between"><span>LTV:</span> <strong class="text-base">${ltv.toFixed(0)} %</strong></div>
                        <div class="flex justify-between"><span>DSTI:</span> <strong class="text-base">${dsti.toFixed(0)} %</strong></div>
                    </div>
                    <h4 class="text-lg font-bold mt-6 mb-2">Šance na schválení</h4>
                    ${renderApprovability(approvability)}
                     <button class="nav-btn w-full mt-6" data-action="show-lead-form">Chci nejlepší nabídku</button>
                </div>
            </div>
        `;

        if (state.mode === 'guided') {
            document.getElementById('guided-form-container').classList.add('hidden');
        }

        // Auto-select first offer
        const firstCard = resultsContainer.querySelector('.offer-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            state.calculation.selectedOffer = offers.find(o => o.id === firstCard.dataset.offerId);
        }
        
        scrollToAndShow('#content-container');
    };
    
    const renderApprovability = (approvability) => {
        const { total, ltv, dsti, age } = approvability;
        const getColor = (score) => score > 65 ? 'bg-green-500' : (score > 35 ? 'bg-yellow-500' : 'bg-red-500');
        
        return `
            <div>
                <div class="flex justify-between items-center mb-1">
                    <span class="text-2xl font-bold">${total}%</span>
                    <span class="font-semibold text-gray-600">Velmi dobrá</span>
                </div>
                <div class="approvability-bar-bg">
                    <div class="approvability-bar ${getColor(total)}" style="width: ${total}%"></div>
                </div>
            </div>
        `;
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
             // Basic Markdown support
             let formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
             bubble.innerHTML = formattedMessage;
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

        // Guided mode navigation
        if (target.dataset.action === 'next-step') {
            if (state.currentStep < CONFIG.GUIDED_MODE_STEPS.length) {
                state.currentStep++;
                if (state.currentStep === CONFIG.GUIDED_MODE_STEPS.length) {
                    calculateRates(); // Calculate on the last step
                } else {
                    updateGuidedUI();
                }
            }
        }
        if (target.dataset.action === 'prev-step') {
            if (state.currentStep > 1) {
                state.currentStep--;
                updateGuidedUI();
            }
        }
        
        // Express mode calculation
        if (target.dataset.action === 'calculate-express') {
            calculateRates(target);
        }

        // AI Chat
        if (target.id === 'chat-send') {
            handleChatMessageSend();
        }
        if (target.matches('.suggestion-btn')) {
            const input = document.getElementById('chat-input');
            input.value = target.dataset.suggestion;
            handleChatMessageSend();
        }

        // Results
        if (target.matches('.offer-card')) {
            document.querySelectorAll('.offer-card').forEach(card => card.classList.remove('selected'));
            target.classList.add('selected');
            state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === target.dataset.offerId);
        }
        if (target.dataset.action === 'show-lead-form') {
            scrollToAndShow('#kontakt');
        }
    };

    const handleContainerInput = (e) => {
        const { id, value, type } = e.target;
        if (id in state.formData) {
            const parsedValue = parseNumber(value);
            state.formData[id] = parsedValue;
            
            // Update slider value display
            const display = document.querySelector(`[data-value-for="${id}"]`);
            if (display) {
                const isCurrency = ['propertyValue', 'ownResources', 'income', 'liabilities', 'landValue', 'constructionBudget', 'loanBalance'].includes(id);
                display.textContent = isCurrency ? formatNumber(parsedValue) : `${formatNumber(parsedValue, false)} ${id === 'loanTerm' ? 'let' : ''}`;
            }

            // If a calculation exists, recalculate
            if (state.calculation.offers.length > 0) {
                 calculateRates();
            }
        }
    };

    const handleContainerChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'radio' && name in state.formData) {
            state.formData[name] = isNaN(value) ? value : Number(value);
            // If results are already shown, recalculate
            if (state.calculation.offers.length > 0) {
                calculateRates();
            }
        }
    };
    
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Odesílám...';

        const formData = new FormData(form);
        try {
            await fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(formData).toString(),
            });
            form.style.display = 'none';
            document.getElementById('form-success').style.display = 'block';
        } catch (error) {
            console.error('Form submission error:', error);
            alert('Odeslání se nezdařilo. Zkuste to prosím znovu.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Odeslat nezávazně';
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
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context: state }),
            });
            
            document.getElementById('typing-indicator')?.remove();

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }
            
            const data = await response.json();
            addChatMessage(data.response, 'ai');

        } catch (error) {
            console.error("AI Chat Error:", error);
            document.getElementById('typing-indicator')?.remove();
            addChatMessage(`Omlouvám se, došlo k chybě. Zkuste to prosím znovu. (${error.message})`, 'ai');
        }
    };

    // --- API & CALCULATIONS ---
    const calculateRates = async (button = null) => {
        const spinner = button ? button.querySelector('.loading-spinner-white') : null;
        if (button) {
            button.disabled = true;
            if(spinner) spinner.classList.remove('hidden');
        }
        
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = `<div class="text-center p-8"><div class="loading-spinner-blue"></div><p>Počítám nejlepší nabídky...</p></div>`;
        resultsContainer.classList.remove('hidden');
        
        const params = new URLSearchParams(state.formData);

        try {
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${params.toString()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            state.calculation = { ...state.calculation, ...data };
            renderResults();

        } catch (error) {
            console.error('Error fetching rates:', error);
            resultsContainer.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg">
                <h3 class="text-2xl font-bold text-red-800 mb-2">Chyba při výpočtu</h3>
                <p class="text-red-700">Nepodařilo se načíst aktuální sazby. Zkuste to prosím znovu za chvíli.</p>
            </div>`;
        } finally {
            if (button) {
                button.disabled = false;
                if(spinner) spinner.classList.add('hidden');
            }
        }
    };

    // --- UTILITIES ---
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
        const cleaned = s.toLowerCase().replace(/,/g, '.').replace(/\s/g, '').replace('kč', '');
        if (cleaned.endsWith('m')) return parseFloat(cleaned) * 1000000;
        if (cleaned.endsWith('k')) return parseFloat(cleaned) * 1000;
        return parseFloat(cleaned) || 0;
    };

    const formatNumber = (n, currency = true) => {
        const num = Number(n);
        if (isNaN(num)) return n;
        return currency ?
            num.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }) :
            num.toLocaleString('cs-CZ', { maximumFractionDigits: 0 });
    };

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    const scrollToAndShow = (targetId) => {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            if(targetId === '#kontakt'){
                targetElement.classList.remove('hidden');
            }
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    // --- COMPONENT FACTORIES ---
    const createSlider = (id, label, value, min, max) => {
        const step = CONFIG.SLIDER_STEPS[id] || 1;
         const isCurrency = ['propertyValue', 'ownResources', 'income', 'liabilities', 'landValue', 'constructionBudget', 'loanBalance'].includes(id);
        return `
            <div class="slider-group">
                <div class="flex justify-between items-center mb-1">
                    <label for="${id}" class="form-label mb-0">${label}</label>
                    <span class="font-bold text-lg" data-value-for="${id}">
                        ${isCurrency ? formatNumber(value) : `${formatNumber(value, false)} ${id === 'loanTerm' ? 'let' : ''}`}
                    </span>
                </div>
                <div class="slider-container">
                    <input type="range" id="${id}" name="${id}" min="${min}" max="${max}" value="${value}" step="${step}" class="slider-input">
                </div>
            </div>`;
    };
    
    const createRadio = (name, value, label, currentValue) => `
        <label class="radio-label">
            <input type="radio" name="${name}" value="${value}" ${String(currentValue) === String(value) ? 'checked' : ''}>
            <span>${label}</span>
        </label>
    `;

    // --- START THE APP ---
    init();
});