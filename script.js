'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/api/chat',
        API_RATES_ENDPOINT: '/api/rates',
        AI_SUGGESTIONS: {
            initial: ["Chci spočítat hypotéku", "Jaké jsou aktuální úrokové sazby?", "Jsou vaše služby zdarma?"],
            contextual: {
                base: ["Co přesně ovlivnilo mé skóre?", "Můžu dostat ještě lepší úrok?"],
                low_dsti: ["Jak konkrétně mohu vylepšit své DSTI?"],
                low_ltv: ["Jaký vliv má LTV na úrokovou sazbu?"]
            },
            actions: ["Chci mluvit se specialistou"]
        }
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'express', // Výchozí režim je Expresní kalkulačka
        formData: {
            propertyValue: 5000000,
            loanAmount: 4000000,
            income: 60000,
            liabilities: 0,
            age: 35,
            children: 0,
            loanTerm: 25,
            fixation: 5,
        },
        calculation: {
            offers: [],
            selectedOffer: null,
            approvability: { total: 0 },
            smartTip: null,
            tips: []
        },
        chart: null,
    };

    // --- DOM ELEMENTS CACHE ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        leadForm: document.getElementById('lead-form'),
    };

    // --- UTILITIES ---
    const parseNumber = (s) => parseFloat(String(s).replace(/[^0-9]/g, '')) || 0;
    const formatNumber = (n, currency = true) => n.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });
    const scrollToAndShow = (targetId) => {
        const el = document.querySelector(targetId);
        if (el) {
            if (targetId === '#kontakt') el.classList.remove('hidden');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    // --- COMPONENT FACTORIES ---
    const createSlider = (id, label, value, min, max, step) => {
        const suffix = id.includes('Term') || id.includes('age') || id.includes('children') ? ' let' : ' Kč';
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

    // --- HTML TEMPLATE GENERATION ---
    const getCalculatorLayout = (formHTML) => {
        return `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div class="lg:col-span-2 bg-white rounded-2xl space-y-8">
                    ${formHTML}
                </div>
                <div id="sidebar-container" class="lg:sticky top-28 space-y-6">
                    ${getSidebarHTML()}
                </div>
            </div>
            <div id="results-container" class="hidden mt-12"></div>
        `;
    };

    const getSidebarHTML = (calc = null) => {
        const hasCalc = calc && calc.offers && calc.offers.length > 0;
        const payment = hasCalc ? formatNumber(calc.selectedOffer.monthlyPayment) : '-';
        const rate = hasCalc ? `${calc.selectedOffer.rate.toFixed(2)} %` : '-';
        const ltv = hasCalc ? `${Math.round((state.formData.loanAmount / state.formData.propertyValue) * 100)} %` : '-';

        return `
            <div class="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                <h3 class="text-xl font-bold mb-4">Souhrn hypotéky</h3>
                <div class="space-y-3">
                    <div class="flex justify-between text-lg"><span class="text-gray-600">Měsíční splátka</span><strong id="sidebar-payment">${payment}</strong></div>
                    <div class="flex justify-between"><span class="text-gray-600">Úroková sazba</span><strong id="sidebar-rate">${rate}</strong></div>
                    <div class="flex justify-between"><span class="text-gray-600">LTV</span><strong id="sidebar-ltv">${ltv}</strong></div>
                </div>
            </div>
            <div class="bg-gray-50 p-6 rounded-2xl border">
                <h4 class="font-bold mb-2">Graf splácení</h4>
                <div id="sidebar-chart-container" class="relative h-48">
                    <canvas id="sidebarChart"></canvas>
                </div>
            </div>
        `;
    };

    const getExpressHTML = () => {
        const formHTML = `
            <div id="express-form" class="space-y-6 p-6 md:p-8">
                ${createSlider('propertyValue', 'Hodnota nemovitosti', state.formData.propertyValue, 500000, 30000000, 100000)}
                ${createSlider('loanAmount', 'Chci si půjčit', state.formData.loanAmount, 200000, 20000000, 100000)}
                ${createSlider('income', 'Měsíční čistý příjem', state.formData.income, 15000, 300000, 1000)}
                ${createSlider('liabilities', 'Měsíční splátky jiných úvěrů', state.formData.liabilities, 0, 100000, 500)}
                <div class="flex justify-center pt-4">
                    <button class="nav-btn text-lg w-full md:w-auto" data-action="calculate">
                        <span class="mr-2">Spočítat nabídky</span>
                        <div class="loading-spinner-white hidden"></div>
                    </button>
                </div>
            </div>`;
        return getCalculatorLayout(formHTML);
    };

    const getGuidedHTML = () => {
        const formHTML = `
            <div id="guided-form" class="space-y-8 p-6 md:p-8">
                <div>
                    <h3 class="form-section-heading">Parametry úvěru a nemovitosti</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${createSlider('propertyValue', 'Hodnota nemovitosti', state.formData.propertyValue, 500000, 30000000, 100000)}
                        ${createSlider('loanAmount', 'Požadovaná výše úvěru', state.formData.loanAmount, 200000, 20000000, 100000)}
                        ${createSlider('loanTerm', 'Délka splatnosti', state.formData.loanTerm, 5, 30, 1)}
                        ${createSlider('fixation', 'Délka fixace', state.formData.fixation, 3, 10, 1)}
                    </div>
                </div>
                <div>
                    <h3 class="form-section-heading">Vaše bonita a osobní údaje</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${createSlider('income', 'Čistý měsíční příjem', state.formData.income, 15000, 300000, 1000)}
                        ${createSlider('liabilities', 'Měsíční splátky jiných úvěrů', state.formData.liabilities, 0, 100000, 500)}
                        ${createSlider('age', 'Věk nejstaršího žadatele', state.formData.age, 18, 70, 1)}
                        ${createSlider('children', 'Počet dětí', state.formData.children, 0, 10, 1)}
                    </div>
                </div>
                <div class="flex justify-center pt-4">
                    <button class="nav-btn text-lg w-full md:w-auto" data-action="calculate">
                        <span class="mr-2">Spočítat a najít nabídky</span>
                        <div class="loading-spinner-white hidden ml-2"></div>
                    </button>
                </div>
            </div>`;
        return getCalculatorLayout(formHTML);
    };

    const getAiModeHTML = () => {
        return `<div class="bg-white rounded-2xl"><div class="flex flex-col h-[70vh]"><div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4"></div><div id="ai-suggestions" class="p-4 border-t"></div><div class="p-4 border-t flex items-center space-x-2"><input type="text" id="chat-input" class="modern-input" placeholder="Zadejte svůj dotaz..."><button id="chat-send" class="nav-btn" data-action="send-chat">Odeslat</button></div></div></div>`;
    };
    
    const renderResults = () => {
        const { offers, approvability, smartTip, tips } = state.calculation;
        const container = document.getElementById('results-container');
        if (!container) return;
        container.classList.remove('hidden');
        if (!offers || offers.length === 0) {
            container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg"><h3 class="text-2xl font-bold text-red-800 mb-2">Dle zadaných parametrů to nevychází</h3><p class="text-red-700">Zkuste upravit parametry, nebo se <a href="#kontakt" class="font-bold underline nav-link" data-action="show-lead-form">spojte s naším specialistou</a>.</p></div>`;
            return;
        }

        const offersHTML = offers.map(o => `<div class="offer-card p-6 rounded-xl" data-offer-id="${o.id}"><div class="flex-grow"><h4 class="text-lg font-bold text-blue-700">${o.title}</h4><p class="text-sm text-gray-600 mt-1">${o.description}</p></div><div class="text-right mt-4"><div class="text-2xl font-extrabold">${formatNumber(o.monthlyPayment)}</div><div class="text-sm font-semibold text-gray-500">Úrok ${o.rate.toFixed(2)} %</div></div></div>`).join('');
        const scoreHTML = (label, value, color) => `<div class="flex justify-between items-center text-sm"><span class="font-semibold">${label}:</span><div class="flex items-center gap-2"><div class="w-24 h-2 rounded-full bg-gray-200"><div class="h-2 rounded-full ${color}" style="width: ${value}%"></div></div><span class="font-bold">${value}%</span></div></div>`;
        const tipHTML = (tip) => `<div class="mt-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg"><p class="font-bold">${tip.title}</p><p class="text-sm">${tip.message}</p></div>`;
        const allTipsHTML = (smartTip ? [smartTip] : []).concat(tips || []).map(tipHTML).join('');
        
        container.innerHTML = `
            <div class="lg:col-span-3"><h3 class="text-3xl font-bold mb-6">Našli jsme pro vás tyto nabídky:</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${offersHTML}</div></div>
            <div class="lg:col-span-3 text-center mt-12 bg-white p-8 rounded-2xl shadow-lg border">
                <h3 class="text-2xl font-bold mb-2">Co dál?</h3>
                <p class="text-gray-600 mb-6 max-w-2xl mx-auto">Zobrazené nabídky jsou přesnou indikací reálných sazeb, které naši specialisté v posledních dnech pro klienty s podobným profilem vyjednali. Finální sazba závisí na detailním posouzení bankou. Náš specialista s vámi probere všechny detaily a zajistí ty nejlepší možné podmínky.</p>
                <div class="flex justify-center items-center gap-4">
                    <button class="nav-btn bg-green-600 hover:bg-green-700 text-lg" data-action="show-lead-form">Chci nejlepší nabídku</button>
                    <button class="nav-btn bg-gray-600 hover:bg-gray-700" data-action="discuss-with-ai">Probrat s AI stratégem</button>
                </div>
            </div>`;

        const firstCard = container.querySelector('.offer-card');
        if (firstCard) {
            firstCard.classList.add('selected');
            state.calculation.selectedOffer = offers.find(o => o.id === firstCard.dataset.offerId);
        }
        document.getElementById('sidebar-container').innerHTML = getSidebarHTML(state.calculation);
        setTimeout(renderSidebarChart, 50);
    };
    
    const renderSidebarChart = () => {
        if (state.chart) { state.chart.destroy(); }
        const ctx = document.getElementById('sidebarChart')?.getContext('2d');
        if (!ctx || !state.calculation.selectedOffer) return;
        const { loanAmount, loanTerm } = state.formData;
        const { rate } = state.calculation.selectedOffer;
        if (loanTerm <= 0) return;
        const schedule = Array.from({ length: loanTerm }, (_, i) => calculateAmortization(loanAmount, rate, loanTerm, i + 1));
        state.chart = new Chart(ctx, { type: 'bar', data: { labels: schedule.map(item => item.year), datasets: [{ label: 'Úroky', data: schedule.map(item => item.interest), backgroundColor: '#fca5a5' }, { label: 'Jistina', data: schedule.map(item => item.principal), backgroundColor: '#60a5fa' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, ticks: { display: false } } }, plugins: { legend: { display: false } } } });
    };

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
        const tips = state.calculation.tips || [];
        let suggestions = [...CONFIG.AI_SUGGESTIONS.initial, ...CONFIG.AI_SUGGESTIONS.actions];
        if (state.calculation.offers && state.calculation.offers.length > 0) {
            suggestions = [...CONFIG.AI_SUGGESTIONS.contextual.base, ...CONFIG.AI_SUGGESTIONS.actions];
            if (tips.some(t => t.id === 'low_dsti')) suggestions.push(...CONFIG.AI_SUGGESTIONS.contextual.low_dsti);
            if (tips.some(t => t.id === 'low_ltv')) suggestions.push(...CONFIG.AI_SUGGESTIONS.contextual.low_ltv);
        }
        container.innerHTML = `<div class="flex flex-wrap gap-2">${suggestions.map(s => `<button class="suggestion-btn" data-suggestion="${s}">${s}</button>`).join('')}</div>`;
    };

    const calculateAmortization = (p, r, t, year) => {
        if (t <= 0) return { year, interest: 0, principal: 0 };
        const mR = r / 100 / 12, n = t * 12, mP = (p * mR * Math.pow(1 + mR, n)) / (Math.pow(1 + mR, n) - 1);
        let bal = p, yI = 0, yP = 0;
        for (let i = 0; i < year * 12; i++) {
            const int = bal * mR;
            const pP = mP - int;
            if (i >= (year - 1) * 12) {
                yI += int;
                yP += pP;
            }
            bal -= pP;
        }
        return { year, interest: yI, principal: yP };
    };
    
    const calculateRates = async (button = null) => {
        const spinner = button?.querySelector('.loading-spinner-white');
        if (button) { button.disabled = true; spinner?.classList.remove('hidden'); }
        const container = document.getElementById('results-container');
        if(container) {
            container.innerHTML = `<div class="text-center p-8"><div class="loading-spinner-blue"></div><p>Počítám nejlepší nabídky...</p></div>`;
            container.classList.remove('hidden');
            scrollToAndShow('#content-container');
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
            if (button) { button.disabled = false; spinner?.classList.add('hidden'); }
        }
    };

    const handleInput = (e) => {
        const { id, value, type } = e.target;
        const baseId = id.replace('-input', '');
        if (state.formData.hasOwnProperty(baseId)) {
            const parsedValue = (type === 'range' || id.endsWith('-input')) ? parseNumber(value) : value;
            state.formData[baseId] = parsedValue;
            if (type === 'range') {
                const input = document.getElementById(`${baseId}-input`);
                if(input) input.value = formatNumber(parsedValue, false);
            } else if (id.endsWith('-input')) {
                const slider = document.getElementById(baseId);
                if(slider) slider.value = parsedValue;
            }
        }
    };
    
    const handleClick = (e) => {
        const target = e.target.closest('[data-action], .offer-card, .suggestion-btn, [data-mode]');
        if (!target) return;
        const { action, mode, suggestion } = target.dataset;
        if (mode) {
            switchMode(mode);
        } else if (action === 'calculate') {
            calculateRates(target);
        } else if (action === 'show-lead-form') {
            scrollToAndShow('#kontakt');
        } else if (action === 'discuss-with-ai') {
            switchMode('ai');
        } else if (action === 'send-chat' || suggestion) {
            const input = document.getElementById('chat-input');
            const message = suggestion || input.value.trim();
            if (!message || !input) return;
            addChatMessage(message, 'user');
            input.value = '';
            handleChatMessageSend(message);
        } else if (target.matches('.offer-card')) {
            document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
            target.classList.add('selected');
            state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === target.dataset.offerId);
            renderSidebar();
        }
    };

    const handleFormSubmit = async (e) => { e.preventDefault(); const form = e.target, btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Odesílám...'; try { await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() }); form.style.display = 'none'; document.getElementById('form-success').style.display = 'block'; } catch (error) { alert('Odeslání se nezdařilo.'); btn.disabled = false; btn.textContent = 'Odeslat nezávazně'; } };
    
    const handleChatMessageSend = async (message) => {
        addChatMessage('', 'ai-typing');
        const { chart, ...cleanContext } = state; // FIX: Remove circular chart object
        try {
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, context: cleanContext }) });
            document.getElementById('typing-indicator')?.remove();
            if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            const data = await response.json();
            if (data.tool === 'goToCalculator') {
                switchMode('express');
                if (data.params) {
                    Object.assign(state.formData, data.params);
                    // Manually re-render the express form with new data
                    DOMElements.contentContainer.innerHTML = getExpressHTML();
                }
            } else if (data.tool === 'goToContact') {
                addChatMessage(data.response, 'ai');
                scrollToAndShow('#kontakt');
            } else {
                addChatMessage(data.response, 'ai');
            }
        } catch (error) {
            document.getElementById('typing-indicator')?.remove();
            addChatMessage(`Omlouvám se, došlo k chybě: ${error.message}`, 'ai');
        }
    };
    
    const handleChatEnter = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); DOMElements.contentContainer.querySelector('[data-action="send-chat"]').click(); } };
    
    const switchMode = (mode) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        const container = DOMElements.contentContainer;
        if (mode === 'express') { container.innerHTML = getExpressHTML(); }
        else if (mode === 'guided') { container.innerHTML = getGuidedHTML(); }
        else if (mode === 'ai') { container.innerHTML = getAiModeHTML(); addChatMessage('Dobrý den! Jsem Hypoteční stratég. Na co se chcete zeptat?', 'ai'); generateAISuggestions(); document.getElementById('chat-input')?.addEventListener('keydown', handleChatEnter); }
    };

    const init = () => {
        document.body.addEventListener('click', handleClick);
        DOMElements.contentContainer.addEventListener('input', handleInput);
        if (DOMElements.leadForm) DOMElements.leadForm.addEventListener('submit', handleFormSubmit);
        switchMode(state.mode);
        let count = 147; setInterval(() => { const hour = new Date().getHours(); const baseCount = (hour >= 9 && hour <= 17) ? 150 : 80; count = Math.max(baseCount - 20, Math.min(baseCount + 20, count + (Math.floor(Math.random() * 5) - 2))); const counter = document.querySelector('#live-users-counter span:last-child'); if(counter) counter.textContent = `${count} lidí právě počítá hypotéku`; }, 4000);
    };

    init();
});