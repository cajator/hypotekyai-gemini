'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/api/chat',
        API_RATES_ENDPOINT: '/api/rates',
        DEBOUNCE_DELAY: 500,
        AI_SUGGESTIONS: {
            initial: ["Jak celý proces funguje?", "Co je to LTV?", "Co když jsem OSVČ?"],
            contextual: ["Jaké jsou podmínky pro mimořádný vklad?", "Co přesně ovlivnilo mé skóre?", "Můžu dostat ještě lepší úrok?"]
        }
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'calculator',
        formData: {
            purpose: 'koupě',
            propertyType: 'rodinny-dum',
            propertyValue: 8900000,
            loanAmount: 4000000,
            income: 29000,
            incomeSources: ['osvc'],
            liabilities: 0,
            age: 35,
            children: 3,
            education: 'stredoskolske',
            loanTerm: 15,
            fixation: 5
        },
        calculation: { offers: [], selectedOffer: null, approvability: { total: 0 }, smartTip: null },
        chart: null,
    };

    // --- DOM ELEMENTS CACHE ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        liveUsersCounter: document.getElementById('live-users-counter'),
        leadForm: document.getElementById('lead-form'),
    };

    // --- UTILITIES ---
    const parseNumber = (s) => parseFloat(String(s).replace(/[^0-9]/g, '')) || 0;
    const formatNumber = (n, currency = true) => n.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };
    const scrollToAndShow = (targetId) => {
        const el = document.querySelector(targetId);
        if (el) {
            if (targetId === '#kontakt') {
                el.classList.remove('hidden');
            }
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // --- COMPONENT FACTORIES (UI building blocks) ---
    const createSlider = (id, label, value, min, max, step) => {
        const suffix = id.includes('Term') || id.includes('age') || id.includes('children') ? ' let' : ' Kč';
        if (id.includes('children')) {
           return `<div><label for="${id}" class="form-label">${label}</label><input type="number" id="${id}" name="${id}" value="${value}" min="${min}" max="${max}" step="${step}" class="modern-input"></div>`;
        }
        return `
            <div class="slider-group">
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

    const createSelect = (id, label, options, currentValue) => {
        const opts = Object.entries(options).map(([val, text]) => `<option value="${val}" ${val === currentValue ? 'selected' : ''}>${text}</option>`).join('');
        return `<div><label for="${id}" class="form-label">${label}</label><select id="${id}" name="${id}" class="modern-select">${opts}</select></div>`;
    };

    const createCheckboxGroup = (id, label, options, currentValues) => {
        const opts = Object.entries(options).map(([val, text]) => `<label class="checkbox-label"><input type="checkbox" name="${id}" value="${val}" ${currentValues.includes(val) ? 'checked' : ''}><span>${text}</span></label>`).join('');
        return `<div><label class="form-label">${label}</label><div class="checkbox-group">${opts}</div></div>`;
    };

    // --- HTML TEMPLATE GENERATION ---
    const getCalculatorHTML = () => `
        <div id="calculator-form" class="space-y-8">
            <div>
                <h2 class="form-section-heading">Parametry nemovitosti a úvěru</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${createSelect('purpose', 'Účel hypotéky', { 'koupě': 'Koupě', 'výstavba': 'Výstavba', 'rekonstrukce': 'Rekonstrukce', 'refinancování': 'Refinancování' }, state.formData.purpose)}
                    ${createSelect('propertyType', 'Druh nemovitosti', { 'rodinny-dum': 'Rodinný dům', 'byt': 'Byt', 'pozemek': 'Pozemek', 'rekreacni': 'Rekreační objekt' }, state.formData.propertyType)}
                    ${createSlider('propertyValue', 'Hodnota nemovitosti', state.formData.propertyValue, 500000, 30000000, 100000)}
                    ${createSlider('loanAmount', 'Požadovaná výše úvěru', state.formData.loanAmount, 200000, 20000000, 100000)}
                </div>
            </div>
            <div>
                <h2 class="form-section-heading">O vás a vašich příjmech</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${createSlider('income', 'Celkový měsíční čistý příjem', state.formData.income, 15000, 300000, 1000)}
                    ${createCheckboxGroup('incomeSources', 'Zdroje příjmů', { 'zamestnanec': 'Zaměstnanec', 'osvc': 'OSVČ', 'pronajem': 'Pronájem', 'jine': 'Jiné' }, state.formData.incomeSources)}
                    ${createSlider('liabilities', 'Měsíční splátky jiných úvěrů', state.formData.liabilities, 0, 100000, 500)}
                    ${createSlider('age', 'Věk nejstaršího žadatele', state.formData.age, 18, 70, 1)}
                    ${createSelect('education', 'Nejvyšší dosažené vzdělání', { 'zs': 'Základní', 'stredoskolske': 'Středoškolské', 'vs': 'Vysokoškolské' }, state.formData.education)}
                    ${createSlider('children', 'Počet nezaopatřených dětí', state.formData.children, 0, 10, 1)}
                </div>
            </div>
            <div>
                 <h2 class="form-section-heading">Nastavení hypotéky</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${createSlider('loanTerm', 'Doba splatnosti', state.formData.loanTerm, 5, 30, 1)}
                    ${createSelect('fixation', 'Délka fixace úroku', { 3: '3 roky', 5: '5 let', 7: '7 let', 10: '10 let' }, state.formData.fixation)}
                </div>
            </div>
            <div class="flex justify-center pt-4">
                <button class="nav-btn text-lg w-full md:w-auto" data-action="calculate">
                    <span class="mr-2">Spočítat a najít nabídky</span><div class="loading-spinner-white hidden"></div>
                </button>
            </div>
        </div>
        <div id="results-container" class="hidden mt-12"></div>`;

    const getAiModeHTML = () => `
        <div class="flex flex-col h-[600px]">
            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4"></div>
            <div id="ai-suggestions" class="p-4 border-t"></div>
            <div class="p-4 border-t flex items-center space-x-2">
                <input type="text" id="chat-input" class="modern-input" placeholder="Zadejte svůj dotaz...">
                <button id="chat-send" class="nav-btn">Odeslat</button>
            </div>
        </div>`;

    // --- UI UPDATE & RENDER ---
    const renderResults = () => {
        const { offers, approvability, smartTip } = state.calculation;
        const container = document.getElementById('results-container');
        if (!container) return;
        container.classList.remove('hidden');

        if (!offers || offers.length === 0) {
            container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg"><h3 class="text-2xl font-bold text-red-800 mb-2">Dle zadaných parametrů to nevychází</h3><p class="text-red-700">Zkuste upravit parametry, nebo se <a href="#kontakt" class="font-bold underline nav-link">spojte s naším specialistou</a>.</p></div>`;
            return;
        }

        const offersHTML = offers.map(o => `
            <div class="offer-card p-6 rounded-xl" data-offer-id="${o.id}">
                <div class="flex-grow">
                    <h4 class="text-lg font-bold text-blue-700">${o.title}</h4>
                    <p class="text-sm text-gray-600 mt-1">${o.description}</p>
                </div>
                <div class="text-right mt-4">
                    <div class="text-2xl font-extrabold">${formatNumber(o.monthlyPayment)}</div>
                    <div class="text-sm font-semibold text-gray-500">Úrok ${o.rate.toFixed(2)} %</div>
                </div>
            </div>`).join('');

        const scoreHTML = (label, value, color) => `
            <div class="flex justify-between items-center text-sm">
                <span class="font-semibold">${label}:</span>
                <div class="flex items-center gap-2">
                    <div class="w-24 h-2 rounded-full bg-gray-200">
                        <div class="h-2 rounded-full ${color}" style="width: ${value}%"></div>
                    </div>
                    <span class="font-bold">${value}%</span>
                </div>
            </div>`;

        const tipHTML = smartTip ? `
            <div class="mt-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg">
                <p class="font-bold">${smartTip.title}</p>
                <p class="text-sm">${smartTip.message}</p>
            </div>` : '';

        container.innerHTML = `
            <div>
                <h3 class="text-3xl font-bold mb-6">Našli jsme pro vás tyto nabídky:</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${offersHTML}</div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                <div class="lg:col-span-2 bg-gray-50 p-6 rounded-xl">
                    <h4 class="text-xl font-bold mb-4">Vývoj splácení v čase</h4>
                    <canvas id="repaymentChart"></canvas>
                </div>
                <div class="bg-blue-50 p-6 rounded-xl">
                    <h4 class="text-xl font-bold mb-4">Přehled a skóre vaší žádosti</h4>
                    <div class="space-y-3">
                        ${scoreHTML('LTV (zadlužení nemovitosti)', approvability.ltv, 'bg-green-500')}
                        ${scoreHTML('DSTI (zatížení příjmu)', approvability.dsti, 'bg-yellow-500')}
                        ${scoreHTML('Bonita (příjmy a výdaje)', approvability.bonita, 'bg-green-500')}
                    </div>
                    <h4 class="text-lg font-bold mt-6 mb-2">Celková šance: <span class="text-2xl font-bold text-green-600">${approvability.total}%</span></h4>
                    <div class="approvability-bar-bg"><div class="approvability-bar bg-green-500" style="width: ${approvability.total}%"></div></div>
                    ${tipHTML}
                </div>
            </div>
            <div class="text-center mt-12 bg-white p-8 rounded-2xl shadow-lg border">
                 <h3 class="text-2xl font-bold mb-2">Co dál?</h3>
                 <p class="text-gray-600 mb-6 max-w-2xl mx-auto">Náš specialista s vámi probere detaily a vyjedná finální podmínky.</p>
                 <div class="flex justify-center items-center gap-4">
                    <button class="nav-btn bg-green-600 hover:bg-green-700 text-lg" data-action="show-lead-form">Kontaktovat specialistu</button>
                    <button class="nav-btn bg-gray-600 hover:bg-gray-700" data-action="discuss-with-ai">Probrat s AI stratégem</button>
                 </div>
            </div>`;

        const firstCard = container.querySelector('.offer-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            state.calculation.selectedOffer = offers.find(o => o.id === firstCard.dataset.offerId);
        }
        renderRepaymentChart();
    };
    
    // --- Chart.js and Chat UI ---
    const addChatMessage = (message, sender) => {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const bubble = document.createElement('div');
        if (sender === 'ai-typing') {
            bubble.className = 'chat-bubble-ai-typing';
            bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
            bubble.id = 'typing-indicator';
        } else {
            bubble.className = sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user';
            bubble.innerHTML = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    };
    const generateAISuggestions = () => {
        const container = document.getElementById('ai-suggestions');
        if (!container) return;
        const suggestions = (state.calculation.offers && state.calculation.offers.length > 0) ? CONFIG.AI_SUGGESTIONS.contextual : CONFIG.AI_SUGGESTIONS.initial;
        container.innerHTML = `<div class="flex flex-wrap gap-2">${suggestions.map(s => `<button class="suggestion-btn" data-suggestion="${s}">${s}</button>`).join('')}</div>`;
    };
    const renderRepaymentChart = () => {
        if (state.chart) state.chart.destroy();
        const ctx = document.getElementById('repaymentChart')?.getContext('2d');
        if (!ctx || !state.calculation.selectedOffer) return;

        const { loanAmount, loanTerm } = state.formData;
        const { rate } = state.calculation.selectedOffer;
        const schedule = Array.from({ length: loanTerm }, (_, i) => {
            return calculateAmortization(loanAmount, rate, loanTerm, i + 1);
        });

        state.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: schedule.map(item => `Rok ${item.year}`),
                datasets: [
                    { label: 'Úroky', data: schedule.map(item => item.interest), backgroundColor: '#fca5a5' },
                    { label: 'Jistina', data: schedule.map(item => item.principal), backgroundColor: '#60a5fa' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: value => formatNumber(value) } } }
            }
        });
    };

    // --- API & CALCULATIONS ---
    const calculateAmortization = (principal, annualRate, years, targetYear) => {
        const monthlyRate = annualRate / 100 / 12;
        const n = years * 12;
        const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
        let balance = principal;
        let yearlyInterest = 0;
        let yearlyPrincipal = 0;
        for (let i = 0; i < (targetYear * 12); i++) {
            const interest = balance * monthlyRate;
            const principalPayment = monthlyPayment - interest;
            if (i >= (targetYear - 1) * 12) {
                yearlyInterest += interest;
                yearlyPrincipal += principalPayment;
            }
            balance -= principalPayment;
        }
        return { year: targetYear, interest: yearlyInterest, principal: yearlyPrincipal };
    };
    const calculateRates = async (button = null) => {
        const spinner = button?.querySelector('.loading-spinner-white');
        if (button) {
            button.disabled = true;
            spinner?.classList.remove('hidden');
        }
        const container = document.getElementById('results-container');
        if (container) {
            container.innerHTML = `<div class="text-center p-8"><div class="loading-spinner-blue"></div><p>Počítám nejlepší nabídky...</p></div>`;
            container.classList.remove('hidden');
            scrollToAndShow('#results-container');
        }
        try {
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${new URLSearchParams(state.formData).toString()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            state.calculation = { ...state.calculation, ...(await response.json()) };
            renderResults();
        } catch (error) {
            console.error('Chyba při načítání sazeb:', error);
            if(container) container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg"><h3 class="text-2xl font-bold text-red-800 mb-2">Chyba při výpočtu</h3><p class="text-red-700">Zkuste to prosím znovu.</p></div>`;
        } finally {
            if (button) {
                button.disabled = false;
                spinner?.classList.add('hidden');
            }
        }
    };

    // --- EVENT HANDLERS ---
    const debouncedCalculation = debounce(() => calculateRates(document.querySelector('[data-action="calculate"]')), CONFIG.DEBOUNCE_DELAY);
    const handleInput = (e) => {
        const { id, value, name, type } = e.target;
        if (type === 'checkbox') {
            const current = state.formData[name] || [];
            if (e.target.checked) state.formData[name] = [...current, value];
            else state.formData[name] = current.filter(v => v !== value);
        } else {
            const baseId = id.replace('-input', '');
            if (state.formData.hasOwnProperty(baseId)) {
                const parsedValue = (type === 'range' || id.endsWith('-input') || type === 'number') ? parseNumber(value) : value;
                state.formData[baseId] = parsedValue;
                if (type === 'range') {
                    const input = document.getElementById(`${baseId}-input`);
                    if (input) input.value = formatNumber(parsedValue, false);
                } else if (id.endsWith('-input')) {
                    const slider = document.getElementById(baseId);
                    if (slider) slider.value = parsedValue;
                }
            }
        }
        debouncedCalculation();
    };
    const handleClick = (e) => {
        const target = e.target.closest('[data-action], .offer-card, .suggestion-btn, #chat-send, [data-mode]');
        if (!target) return;
        
        const action = target.dataset.action;
        const mode = target.dataset.mode;

        if (mode) switchMode(mode);
        else if (action === 'calculate') calculateRates(target);
        else if (action === 'show-lead-form') scrollToAndShow('#kontakt');
        else if (action === 'discuss-with-ai') switchMode('ai');
        else if (target.id === 'chat-send' || target.matches('.suggestion-btn')) {
            const input = document.getElementById('chat-input');
            const message = target.matches('.suggestion-btn') ? target.dataset.suggestion : input.value.trim();
            if (!message || !input) return;
            addChatMessage(message, 'user');
            input.value = '';
            handleChatMessageSend(message);
        } else if (target.matches('.offer-card')) {
            document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
            target.classList.add('selected');
            state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === target.dataset.offerId);
            renderRepaymentChart();
        }
    };
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target, btn = form.querySelector('button');
        btn.disabled = true; btn.textContent = 'Odesílám...';
        try {
            await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() });
            form.style.display = 'none';
            document.getElementById('form-success').style.display = 'block';
        } catch (error) {
            alert('Odeslání se nezdařilo.');
            btn.disabled = false; btn.textContent = 'Odeslat nezávazně';
        }
    };
    const handleChatMessageSend = async (message) => {
        addChatMessage('', 'ai-typing');
        try {
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, context: state }) });
            document.getElementById('typing-indicator')?.remove();
            if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            const data = await response.json();
            if (data.tool === 'calculateMortgage') {
                Object.assign(state.formData, data.params);
                switchMode('calculator');
                setTimeout(() => calculateRates(document.querySelector('[data-action="calculate"]')), 200);
            } else {
                addChatMessage(data.response, 'ai');
            }
        } catch (error) {
            document.getElementById('typing-indicator')?.remove();
            addChatMessage(`Omlouvám se, došlo k chybě: ${error.message}`, 'ai');
        }
    };
    const handleChatEnter = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('chat-send').click();
        }
    };

    // --- MODE SWITCH & INITIALIZATION ---
    const switchMode = (mode) => {
        if (!DOMElements.contentContainer) return;
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        DOMElements.contentContainer.innerHTML = mode === 'calculator' ? getCalculatorHTML() : getAiModeHTML();
        if (mode === 'ai') {
            addChatMessage('Dobrý den! Jsem Hypoteky Ai stratég. Na co se chcete zeptat?', 'ai');
            generateAISuggestions();
            document.getElementById('chat-input')?.addEventListener('keydown', handleChatEnter);
        }
    };
    const init = () => {
        if (!DOMElements.contentContainer) {
            console.error("Kritická chyba: Element #content-container nebyl nalezen.");
            return;
        }
        // Use event delegation on a static parent (body or main)
        document.body.addEventListener('input', handleInput);
        document.body.addEventListener('change', handleInput); // Also delegate change
        document.body.addEventListener('click', handleClick);

        if (DOMElements.leadForm) {
            DOMElements.leadForm.addEventListener('submit', handleFormSubmit);
        }

        switchMode(state.mode);
        let count = 147;
        setInterval(() => {
            count = Math.max(130, Math.min(160, count + (Math.floor(Math.random() * 3) - 1)));
            if (DOMElements.liveUsersCounter) {
                DOMElements.liveUsersCounter.querySelector('span:last-child').textContent = `${count} lidí právě počítá hypotéku`;
            }
        }, 3500);
    };

    init();
});