'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/.netlify/functions/chat',
        API_RATES_ENDPOINT: '/.netlify/functions/rates',
        API_TIMEOUT: 25000,
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'guided',
        isAiTyping: false,
        chatHistory: [],
        activeUsers: Math.floor(Math.random() * 30) + 120,
        formData: {
            propertyValue: 5000000, loanAmount: 4000000,
            income: 60000, liabilities: 5000, age: 35, children: 0,
            loanTerm: 30, fixation: 5,
            purpose: 'koupě', propertyType: 'byt', landValue: 0, reconstructionValue: 0,
            employment: 'zaměstnanec', education: 'středoškolské'
        },
        calculation: {
            offers: [], selectedOffer: null, approvability: { total: 0 },
            smartTip: null, tips: [], fixationDetails: null, isFromOurCalculator: false
        },
        chart: null,
    };

    // --- DOM ELEMENTS CACHE ---
    const DOM = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        leadFormContainer: document.getElementById('kontakt'),
        leadForm: document.getElementById('lead-form'),
        mobileMenuButton: document.getElementById('mobile-menu-button'),
        mobileMenu: document.getElementById('mobile-menu'),
        cookieBanner: document.getElementById('cookie-banner'),
        cookieAcceptBtn: document.getElementById('cookie-accept'),
        activeUsersCounter: document.getElementById('active-users-counter'),
    };
    
    // --- UTILITIES ---
    const parseNumber = (s) => parseFloat(String(s).replace(/[^0-9]/g, '')) || 0;
    const formatCurrency = (n) => n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });
    const formatNumber = (n) => n.toLocaleString('cs-CZ', { maximumFractionDigits: 0 });
    const scrollToTarget = (targetId) => {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // --- DYNAMIC CONTENT & LAYOUTS ---
    const createSlider = (id, label, value, min, max, step, containerClass = '') => {
        const suffix = (id.includes('Term') || id.includes('age') || id.includes('children') || id.includes('fixation')) ? ' let' : ' Kč';
        return `<div class="${containerClass}">
            <div class="flex justify-between items-center mb-1">
                <label for="${id}" class="form-label">${label}</label>
                <input type="text" id="${id}-input" value="${formatNumber(value)}" class="slider-value-input" />
            </div>
            <input type="range" id="${id}" name="${id}" min="${min}" max="${max}" value="${value}" step="${step}" class="slider-input">
        </div>`;
    };

    const createSelect = (id, label, options, selectedValue) => {
        const optionsHTML = Object.entries(options).map(([key, val]) => 
            `<option value="${key}" ${key === selectedValue ? 'selected' : ''}>${val}</option>`
        ).join('');
        return `<div>
            <label for="${id}" class="form-label">${label}</label>
            <select id="${id}" name="${id}" class="modern-select">${optionsHTML}</select>
        </div>`;
    };

    const getCalculatorLayout = (formHTML) => 
        `<div class="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-hard border">${formHTML}</div>`;

    const getExpressHTML = () => getCalculatorLayout(`
        <div id="express-form" class="space-y-5">
            ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000)}
            ${createSlider('loanAmount','Chci si půjčit',state.formData.loanAmount,200000,20000000,100000)}
            ${createSlider('income','Měsíční čistý příjem',state.formData.income,20000,300000,1000)}
            <div class="pt-2">
                <button class="nav-btn nav-btn-primary w-full" data-action="calculate">
                    <span class="button-text">Spočítat a najít nabídky</span>
                    <div class="loading-spinner-white hidden"></div>
                </button>
            </div>
        </div>
        <div id="results-container" class="hidden mt-6"></div>`);
    
    const getGuidedHTML = () => {
        const purposes = { 'koupě': 'Koupě', 'výstavba': 'Výstavba', 'rekonstrukce': 'Rekonstrukce', 'refinancování': 'Refinancování' };
        const propertyTypes = { 'byt': 'Byt', 'rodinný dům': 'Rodinný dům', 'pozemek': 'Pozemek' };
        const employments = { 'zaměstnanec': 'Zaměstnanec', 'osvc': 'OSVČ', 'jednatel': 'Jednatel s.r.o.'};
        const educations = { 'základní': 'Základní', 'středoškolské': 'SŠ s maturitou', 'vysokoškolské': 'VŠ' };

        return getCalculatorLayout(`
            <div id="guided-form">
                <div>
                    <h3 class="form-section-heading">Parametry úvěru a nemovitosti</h3>
                    <div class="form-grid md:grid-cols-2 gap-6">
                        ${createSelect('purpose', 'Účel hypotéky', purposes, state.formData.purpose)}
                        ${createSelect('propertyType', 'Typ nemovitosti', propertyTypes, state.formData.propertyType)}
                        ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000)}
                        ${createSlider('reconstructionValue','Rozsah rekonstrukce',state.formData.reconstructionValue,0,10000000,50000, 'hidden')}
                        ${createSlider('landValue','Hodnota pozemku (u výstavby)',state.formData.landValue,0,10000000,50000, 'hidden')}
                        ${createSlider('loanAmount','Požadovaná výše úvěru',state.formData.loanAmount,200000,20000000,100000)}
                        <div class="md:col-span-2 text-center font-semibold text-green-600" id="ltv-display">
                            LTV: ${Math.round((state.formData.loanAmount / state.formData.propertyValue) * 100)}%
                        </div>
                        ${createSlider('loanTerm','Délka splatnosti',state.formData.loanTerm,5,30,1)}
                        ${createSlider('fixation','Délka fixace',state.formData.fixation,3,10,1)}
                    </div>
                </div>
                <div class="mt-8">
                    <h3 class="form-section-heading">Vaše bonita a osobní údaje</h3>
                    <div class="form-grid md:grid-cols-2 gap-6">
                        ${createSelect('employment', 'Typ příjmu', employments, state.formData.employment)}
                        ${createSelect('education', 'Nejvyšší vzdělání', educations, state.formData.education)}
                        ${createSlider('income','Čistý měsíční příjem',state.formData.income,20000,300000,1000)}
                        ${createSlider('liabilities','Měsíční splátky jiných úvěrů',state.formData.liabilities,0,100000,500)}
                        ${createSlider('age','Věk nejstaršího žadatele',state.formData.age,18,70,1)}
                        ${createSlider('children','Počet dětí',state.formData.children,0,10,1)}
                    </div>
                </div>
                <div class="mt-8 pt-6 border-t text-center">
                    <button class="nav-btn nav-btn-primary w-full max-w-xs" data-action="calculate">
                        <span class="button-text">Spočítat a najít nabídky</span>
                        <div class="loading-spinner-white hidden"></div>
                    </button>
                </div>
            </div>
            <div id="results-container" class="hidden mt-8"></div>`);
    };

    const getAiLayout = () => {
        return `
            <div class="bg-white rounded-2xl shadow-hard border flex flex-col min-h-[70vh]">
                 <div class="p-4 border-b flex justify-between items-center">
                    <div class="flex items-center">
                        <span class="text-2xl mr-2">🤖</span>
                        <div>
                            <h3 class="font-bold text-gray-800">AI Hypoteční stratég</h3>
                            <p class="text-xs text-gray-600">Zeptejte se na cokoliv</p>
                        </div>
                    </div>
                    <button class="text-xs bg-gray-100 px-3 py-1 rounded-lg border hover:bg-gray-200" data-action="reset-chat">
                        Nový chat
                    </button>
                </div>
                <div id="chat-messages" class="chat-messages flex-grow p-4"></div>
                <div id="ai-suggestions" class="p-2 flex flex-wrap gap-2 border-t bg-gray-50/50"></div>
                <div class="chat-input-area p-3 border-t">
                    <div class="flex items-center gap-2">
                        <input type="text" id="chat-input" placeholder="Napište zprávu..." class="w-full">
                        <button id="chat-send" class="chat-send-btn" aria-label="Odeslat">
                            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        </button>
                    </div>
                </div>
            </div>`;
    };

    const renderResults = () => {
        const { offers, approvability, fixationDetails } = state.calculation;
        const container = document.getElementById('results-container');
        if (!container) return;

        container.classList.remove('hidden');
        if (!offers || offers.length === 0) {
            container.innerHTML = `<div class="text-center bg-red-50 p-6 rounded-lg">
                <h3 class="text-xl font-bold text-red-800 mb-2">Dle zadaných parametrů to nevychází</h3>
                <p class="text-red-700">Zkuste upravit parametry, nebo se <a href="#kontakt" data-action="show-lead-form-direct" data-target="#kontakt" class="font-bold underline">spojte se specialistou</a>.</p>
            </div>`;
            return;
        }

        const offersHTML = offers.map(o => `
            <div class="offer-card" data-offer-id="${o.id}">
                <div>
                    <h4 class="font-bold text-blue-700">${o.title}</h4>
                    <p class="text-xs text-gray-600 mt-1">${o.description}</p>
                </div>
                <div class="text-right mt-3">
                    <div class="text-xl font-extrabold">${formatCurrency(o.monthlyPayment)}</div>
                    <div class="text-sm font-semibold text-gray-500">Úrok ${o.rate.toFixed(2)} %</div>
                </div>
            </div>`).join('');
        
        const scoreHTML = (label, value, color) => `
            <div>
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-semibold">${label}</span>
                    <span class="font-bold text-sm">${value}%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-gray-200"><div class="h-full rounded-full ${color}" style="width: ${value}%"></div></div>
            </div>`;

        container.innerHTML = `
            <h3 class="text-2xl font-bold mb-4">Našli jsme pro vás tyto nabídky:</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">${offersHTML}</div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Levý sloupec: Skóre a Graf -->
                <div class="space-y-6">
                    <div class="bg-gray-50 p-6 rounded-xl border">
                        <h4 class="text-lg font-bold mb-4">Skóre vaší žádosti</h4>
                        <div class="space-y-4">
                            ${scoreHTML('LTV (do 80% ideál)', approvability.ltv, 'bg-green-500')}
                            ${scoreHTML('DSTI (do 45% ideál)', approvability.dsti, 'bg-yellow-500')}
                            ${scoreHTML('Bonita', approvability.bonita, 'bg-blue-500')}
                        </div>
                        <div class="mt-6 text-center">
                            <p class="text-sm text-gray-600">Celková šance na schválení</p>
                            <p class="text-4xl font-extrabold text-green-600">${approvability.total}%</p>
                        </div>
                    </div>
                    <div class="bg-white p-4 rounded-xl border">
                        <h4 class="text-lg font-bold mb-2">Vývoj splácení v čase</h4>
                        <div class="h-64"><canvas id="resultsChart"></canvas></div>
                    </div>
                </div>
                <!-- Pravý sloupec: Analýza fixace a Akce -->
                <div class="space-y-6">
                    ${fixationDetails ? `
                    <div class="bg-gray-50 p-6 rounded-xl border">
                        <h4 class="text-lg font-bold mb-4">Analýza ${state.formData.fixation}-leté fixace</h4>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between"><span>Celkem zaplatíte:</span><strong class="text-base">${formatCurrency(fixationDetails.totalPaymentsInFixation)}</strong></div>
                            <div class="flex justify-between"><span>Z toho na úrocích:</span><strong class="text-base text-red-600">${formatCurrency(fixationDetails.totalInterestForFixation)}</strong></div>
                            <div class="flex justify-between"><span>Zbývající dluh:</span><strong class="text-base">${formatCurrency(fixationDetails.remainingBalanceAfterFixation)}</strong></div>
                        </div>
                         <div class="mt-4 pt-4 border-t">
                             <p class="text-xs text-gray-500 mb-2">Co kdyby sazby klesly na ${fixationDetails.futureScenario.optimistic.rate.toFixed(2)}%?</p>
                             <div class="flex justify-between text-sm"><span>Nová splátka by byla:</span><strong class="text-base text-green-600">${formatCurrency(fixationDetails.futureScenario.optimistic.newMonthlyPayment)}</strong></div>
                         </div>
                    </div>` : ''}
                    <div class="bg-blue-50 p-6 rounded-xl border border-blue-200 text-center">
                        <h4 class="text-lg font-bold mb-2">Co dál?</h4>
                        <p class="text-sm text-gray-700 mb-4">Nechte si poradit od našich expertů a AI.</p>
                        <div class="flex flex-col sm:flex-row gap-3 justify-center">
                            <button class="nav-btn-secondary bg-white" data-action="discuss-with-ai">🤖 Probrat s AI</button>
                            <button class="nav-btn nav-btn-primary" data-action="show-lead-form-direct" data-target="#kontakt">📞 Spojit se specialistou</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const firstCard = container.querySelector('.offer-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            state.calculation.selectedOffer = offers.find(o => o.id === firstCard.dataset.offerId);
        }
        setTimeout(renderResultsChart, 50);
        scrollToTarget('#results-container');
    };

    const renderResultsChart = () => {
        if (state.chart) state.chart.destroy();
        const ctx = document.getElementById('resultsChart')?.getContext('2d');
        if (!ctx || !state.calculation.selectedOffer) return;

        const { loanAmount, loanTerm } = state.formData;
        const { rate } = state.calculation.selectedOffer;
        if (loanTerm <= 0) return;

        const schedule = Array.from({ length: loanTerm }, (_, i) => {
            const year = i + 1;
            const mR = rate / 100 / 12, n = loanTerm * 12;
            const mP = (loanAmount * mR * Math.pow(1 + mR, n)) / (Math.pow(1 + mR, n) - 1);
            let bal = loanAmount, yI = 0, yP = 0;
            for (let month = 0; month < year * 12; month++) {
                const int = bal * mR, pP = mP - int;
                if (month >= (year - 1) * 12) {
                    yI += int; yP += pP;
                }
                bal -= pP;
            }
            return { year, interest: yI, principal: yP };
        });

        state.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: schedule.map(item => item.year % 5 === 0 ? item.year : ''),
                datasets: [
                    { label: 'Úroky', data: schedule.map(item => item.interest), backgroundColor: '#fecaca' },
                    { label: 'Jistina', data: schedule.map(item => item.principal), backgroundColor: '#a7f3d0' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: v => `${v / 1000}k` } } },
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
                animation: { duration: 500 },
            }
        });
    };
    
    // --- CHAT LOGIC ---
    const addChatMessage = (message, sender) => {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        const existingTyping = document.getElementById('typing-indicator');
        if (existingTyping) existingTyping.remove();

        const bubble = document.createElement('div');
        bubble.className = `chat-bubble chat-bubble-${sender}`;
        
        if (sender === 'ai-typing') {
            bubble.id = 'typing-indicator';
            bubble.innerHTML = '<div class="loading-spinner-blue w-5 h-5"></div>';
        } else {
            let processedMessage = message
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            bubble.innerHTML = processedMessage;
            state.chatHistory.push({ text: message, sender });
        }
        
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    };
    
    const generateAISuggestions = () => {
        const container = document.getElementById('ai-suggestions');
        if (!container) return;

        let suggestions = [];
        if (state.calculation.offers.length > 0) {
            suggestions = ["Jaká jsou rizika?", "Ušetřím refinancováním?", "Splácet, nebo investovat?", "Plán na 10 let dopředu"];
        } else {
            suggestions = ["Kolik si můžu půjčit?", "Jaké jsou aktuální sazby?", "Co potřebuji k hypotéce?", "Můžu dostat hypotéku jako OSVČ?"];
        }

        container.innerHTML = suggestions.map(s => 
            `<button class="suggestion-btn" data-suggestion="${s}">${s}</button>`
        ).join('');
    };

    // --- EVENT HANDLERS ---
    const handleInput = (e) => {
        const { id, value } = e.target;
        const baseId = id.replace('-input', '');

        if (state.formData.hasOwnProperty(baseId)) {
            const parsedValue = id.endsWith('-input') ? parseNumber(value) : Number(value);
            state.formData[baseId] = parsedValue;

            requestAnimationFrame(() => {
                if (e.target.type === 'range') {
                    const input = document.getElementById(`${baseId}-input`);
                    if (input) input.value = formatNumber(parsedValue);
                } else if (id.endsWith('-input')) {
                    const slider = document.getElementById(baseId);
                    if (slider) slider.value = parsedValue;
                }
            });

            if (['loanAmount', 'propertyValue'].includes(baseId) && state.mode === 'guided') {
                updateLTVDisplay();
            }
            if (baseId === 'purpose') {
                handleGuidedFormLogic();
            }
        }
    };

    const handleClick = async (e) => {
        const target = e.target.closest('[data-action], [data-mode], [data-suggestion], .offer-card, .scroll-to');
        if (!target) return;

        const { action, mode, suggestion, target: targetId } = target.dataset;

        if (mode) switchMode(mode);
        else if (action === 'calculate') handleCalculate(target);
        else if (action === 'show-lead-form-direct') {
            DOM.leadFormContainer.classList.remove('hidden');
            scrollToTarget(targetId);
        } else if (action === 'discuss-with-ai') {
            switchMode('ai', true);
        } else if (action === 'reset-chat') {
            switchMode('ai');
        } else if (suggestion) {
            const input = document.getElementById('chat-input');
            if(input) {
                input.value = suggestion;
                handleChatMessageSend();
            }
        } else if (target.classList.contains('offer-card')) {
            document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
            target.classList.add('selected');
            state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === target.dataset.offerId);
            setTimeout(renderResultsChart, 0);
        } else if(target.classList.contains('scroll-to')) {
            e.preventDefault();
            scrollToTarget(targetId);
             if (DOM.mobileMenu && !DOM.mobileMenu.classList.contains('hidden')) {
                DOM.mobileMenu.classList.add('hidden');
            }
        }
    };

    const handleChatMessageSend = async () => {
        const input = document.getElementById('chat-input');
        if (!input) return;
        const message = input.value.trim();
        if (!message || state.isAiTyping) return;

        addChatMessage(message, 'user');
        input.value = '';
        state.isAiTyping = true;
        addChatMessage('', 'ai-typing');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            addChatMessage('Omlouvám se, odpověď trvá déle než obvykle. Zkuste prosím zjednodušit dotaz.', 'ai');
            state.isAiTyping = false;
        }, CONFIG.API_TIMEOUT);

        try {
            const contextForApi = { ...state, chart: null }; // remove chart object
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context: contextForApi }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(await response.text());
            
            const data = await response.json();

            if (data.tool === 'showLeadForm') {
                addChatMessage(data.response || 'Rád vám pomohu. Otevírám formulář pro spojení se specialistou.', 'ai');
                DOM.leadFormContainer.classList.remove('hidden');
                scrollToTarget('#kontakt');
            } else {
                addChatMessage(data.response, 'ai');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Chyba AI chatu:', error);
                addChatMessage('Omlouvám se, došlo k chybě. Zkuste to prosím znovu.', 'ai');
            }
        } finally {
            state.isAiTyping = false;
        }
    };
    
    // --- LOGIC FOR SPECIFIC FORMS/MODES ---
    const updateLTVDisplay = () => {
        const { loanAmount, propertyValue } = state.formData;
        const ltv = propertyValue > 0 ? Math.round((loanAmount / propertyValue) * 100) : 0;
        const display = document.getElementById('ltv-display');
        if (display) display.textContent = `LTV: ${ltv}%`;
    };
    
    const handleGuidedFormLogic = () => {
        const purposeSelect = document.getElementById('purpose');
        if (!purposeSelect) return;
        const landValueGroup = document.getElementById('landValue')?.parentElement;
        const reconstructionValueGroup = document.getElementById('reconstructionValue')?.parentElement;

        landValueGroup?.classList.toggle('hidden', purposeSelect.value !== 'výstavba');
        reconstructionValueGroup?.classList.toggle('hidden', purposeSelect.value !== 'rekonstrukce');
    };

    // --- INITIALIZATION & MAIN LOGIC ---
    const switchMode = (mode, fromResults = false) => {
        state.mode = mode;
        DOM.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));

        if (mode === 'express') {
            DOM.contentContainer.innerHTML = getExpressHTML();
        } else if (mode === 'guided') {
            DOM.contentContainer.innerHTML = getGuidedHTML();
            handleGuidedFormLogic();
            updateLTVDisplay();
        } else if (mode === 'ai') {
            DOM.contentContainer.innerHTML = getAiLayout();
            if (!fromResults) {
                state.chatHistory = [];
                state.calculation.offers = []; // Clear offers if starting fresh AI chat
                addChatMessage('Jsem váš AI hypoteční stratég. Zadejte parametry vlevo a spočítejte si nabídku, nebo se rovnou zeptejte na cokoliv, co vás zajímá.', 'ai');
            } else {
                 state.chatHistory.forEach(msg => addChatMessage(msg.text, msg.sender, true));
            }
            generateAISuggestions();
        }
    };

    const handleCalculate = async (button) => {
        const btnText = button.querySelector('.button-text');
        const spinner = button.querySelector('.loading-spinner-white');
        
        button.disabled = true;
        if(btnText) btnText.textContent = 'Počítám...';
        spinner?.classList.remove('hidden');
        renderResults(); // Show loading state inside results
        const container = document.getElementById('results-container');
        if(container) container.innerHTML = `<div class="text-center p-8"><div class="loading-spinner-blue"></div><p>Počítám nejlepší nabídky...</p></div>`;


        try {
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${new URLSearchParams(state.formData).toString()}`);
            if (!response.ok) throw new Error(`Server vrátil chybu: ${response.status}`);
            const data = await response.json();
            state.calculation = { ...state.calculation, ...data, isFromOurCalculator: true };
            renderResults();

        } catch (error) {
            console.error('Chyba při výpočtu sazeb:', error);
            const container = document.getElementById('results-container');
            if(container) container.innerHTML = `<div class="text-center bg-red-50 p-6 rounded-lg">
                <h3 class="text-xl font-bold text-red-800 mb-2">Chyba při výpočtu</h3>
                <p class="text-red-700">Nepodařilo se načíst data. Zkuste to prosím znovu.</p>
            </div>`;
        } finally {
            button.disabled = false;
            if(btnText) btnText.textContent = 'Spočítat a najít nabídky';
            spinner?.classList.add('hidden');
        }
    };

    const init = () => {
        // Initial render
        switchMode(state.mode);

        // Event Listeners
        document.body.addEventListener('click', handleClick);
        DOM.contentContainer.addEventListener('input', handleInput);
        DOM.contentContainer.addEventListener('keydown', (e) => {
            if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatMessageSend();
            }
        });
        
        if (DOM.leadForm) DOM.leadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Odesílám...';
            setTimeout(() => {
                 document.getElementById('lead-form').style.display = 'none';
                 document.getElementById('form-success').style.display = 'block';
            }, 1000);
        });

        DOM.mobileMenuButton?.addEventListener('click', () => {
            DOM.mobileMenu?.classList.toggle('hidden');
        });
        
        // Cookie Banner
        if (localStorage.getItem('cookieConsent') !== 'true') {
            DOM.cookieBanner?.classList.remove('hidden');
        }
        DOM.cookieAcceptBtn?.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'true');
            DOM.cookieBanner?.classList.add('hidden');
        });

        // Active Users Simulation
        setInterval(() => {
             state.activeUsers += Math.floor(Math.random() * 3) - 1;
             if (state.activeUsers < 110) state.activeUsers = 110;
             if (DOM.activeUsersCounter) DOM.activeUsersCounter.textContent = `${state.activeUsers} lidí právě používá naše nástroje`;
        }, 5000);
    };

    init();
});
