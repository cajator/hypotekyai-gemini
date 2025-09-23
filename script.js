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
        mode: 'express',
        chatFormState: 'idle',
        chatFormData: {},
        formData: {
            propertyValue: 5000000, loanAmount: 4000000, landValue: 0,
            income: 60000, liabilities: 0, age: 35, children: 0,
            loanTerm: 25, fixation: 5,
            loanPurpose: 'koupe', propertyType: 'byt',
            employmentType: 'zamestnanec', education: 'stredoskolske',
        },
        calculation: { offers: [], selectedOffer: null, approvability: { total: 0, ltv: 80 }, smartTip: null, tips: [] },
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
    const scrollToAndShow = (targetId, block = 'center') => { const el = document.querySelector(targetId); if (el) { if (targetId === '#kontakt') el.classList.remove('hidden'); el.scrollIntoView({ behavior: 'smooth', block }); } };
    
    // --- COMPONENT FACTORIES ---
    const createSlider = (id, label, value, min, max, step, options = {}) => {
        const { suffix = ' Kč', containerClass = '', sliderContainerClass = '', isSidebar = false } = options;
        const finalContainerClass = isSidebar ? '' : containerClass;
        return `<div class="form-group ${finalContainerClass}"><div class="flex justify-between items-center mb-1"><label for="${id}" class="form-label mb-0">${label}</label><div class="flex items-center"><input type="text" id="${id}-input" value="${formatNumber(value, false)}" class="slider-value-input"><span class="font-semibold">${suffix}</span></div></div><div class="slider-container ${sliderContainerClass}"><input type="range" id="${id}" name="${id}" min="${min}" max="${max}" value="${value}" step="${step}" class="slider-input"></div></div>`;
    };
    const createSelect = (id, label, options) => {
        const optionsHTML = Object.entries(options).map(([value, text]) => `<option value="${value}" ${state.formData[id] === value ? 'selected' : ''}>${text}</option>`).join('');
        return `<div class="form-group"><label for="${id}" class="form-label">${label}</label><select id="${id}" name="${id}" class="modern-select">${optionsHTML}</select></div>`;
    };

    // --- DYNAMIC CONTENT & LAYOUTS ---
    const getCalculatorLayout = (formHTML) => `<div class="bg-white p-6 md:p-12 rounded-2xl shadow-xl border">${formHTML}</div>`;
    const getAiLayout = (chatHTML) => `<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"><div class="lg:col-span-2 bg-white rounded-2xl shadow-xl border">${chatHTML}</div><div id="sidebar-container" class="lg:sticky top-28 space-y-6"></div></div>`;
    
    const getSidebarHTML = () => { 
        const calc = state.calculation;
        const hasCalc = calc && calc.offers && calc.offers.length > 0;
        
        const sidebarCalcHTML = `<div id="ai-sidebar-calculator" class="bg-white p-4 rounded-xl border space-y-3">
            ${createSlider('loanAmount', 'Výše úvěru', state.formData.loanAmount, 200000, 20000000, 100000, { isSidebar: true })}
            ${createSlider('propertyValue', 'Hodnota nemovitosti', state.formData.propertyValue, 500000, 30000000, 100000, { isSidebar: true })}
             <div class="text-center bg-gray-50 p-2 rounded-lg">LTV: <strong id="ltv-display-sidebar" class="text-lg">${state.calculation.approvability.ltv}%</strong></div>
            ${createSlider('loanTerm', 'Splatnost', state.formData.loanTerm, 5, 30, 1, { suffix: ' let', isSidebar: true })}
        </div>`;

        if (!hasCalc) {
            return `<div class="bg-blue-50 p-6 rounded-2xl border border-blue-200 text-center space-y-4">
                        <h3 class="text-xl font-bold mb-2">Interaktivní modelování</h3>
                        <p class="text-gray-600 text-sm">Zadejte do chatu, co chcete spočítat, nebo si pohrajte s parametry níže. Já to okamžitě propočítám.</p>
                        ${sidebarCalcHTML}
                    </div>`;
        }
        
        return `
            <div id="ai-analysis-box">
                <div class="text-center p-4">
                    <div class="loading-spinner-blue"></div>
                    <p class="text-sm text-gray-600 mt-2">AI analyzuje vaše data...</p>
                </div>
            </div>
            <div class="bg-gray-100 p-4 rounded-2xl border">
                <h4 class="font-bold text-center mb-2">Graf splácení</h4>
                <div id="sidebar-chart-container" class="relative h-48"><canvas id="sidebarChart"></canvas></div>
            </div>`; 
    };

    const getExpressHTML = () => {
        const ltvValue = state.calculation.approvability.ltv;
        const ltvColor = ltvValue > 90 ? 'text-red-600' : ltvValue > 80 ? 'text-yellow-600' : 'text-green-600';
        return getCalculatorLayout(`<div id="express-form" class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000, {containerClass: 'md:col-span-2', sliderContainerClass: '!max-w-full'})}
            ${createSlider('loanAmount','Chci si půjčit',state.formData.loanAmount,200000,20000000,100000, {containerClass: 'md:col-span-2', sliderContainerClass: '!max-w-full'})}
            <div class="md:col-span-2 text-center bg-gray-50 p-3 rounded-lg">
                Aktuální LTV: <strong id="ltv-display" class="text-xl ${ltvColor}">${ltvValue}%</strong>
            </div>
            ${createSlider('income','Měsíční čistý příjem',state.formData.income,15000,300000,1000)}
            ${createSlider('liabilities','Měsíční splátky jiných úvěrů',state.formData.liabilities,0,100000,500)}
            <div class="flex justify-center pt-4 md:col-span-2"><button class="nav-btn text-lg w-full md:w-auto" data-action="calculate"><span class="mr-2">Spočítat nabídky</span><div class="loading-spinner-white hidden"></div></button></div>
        </div><div id="results-container" class="hidden mt-12"></div>`);
    };
    
    const getGuidedHTML = () => {
        const ltvValue = state.calculation.approvability.ltv;
        const ltvColor = ltvValue > 90 ? 'text-red-600' : ltvValue > 80 ? 'text-yellow-600' : 'text-green-600';
        return getCalculatorLayout(`<div id="guided-form" class="space-y-8">
            <div>
                <h3 class="form-section-heading">Parametry úvěru a nemovitosti</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    ${createSelect('loanPurpose', 'Účel hypotéky', {'koupe': 'Koupě', 'vystavba': 'Výstavba', 'rekonstrukce': 'Rekonstrukce', 'refinancovani': 'Refinancování'})}
                    ${createSelect('propertyType', 'Typ nemovitosti', {'byt': 'Byt', 'dum': 'Rodinný dům', 'pozemek': 'Pozemek'})}
                    ${createSlider('propertyValue','Hodnota nemovitosti po dokončení',state.formData.propertyValue,500000,30000000,100000, {containerClass: 'md:col-span-2', sliderContainerClass: '!max-w-full'})}
                    ${createSlider('landValue','Hodnota pozemku (u výstavby)',state.formData.landValue,0,10000000,50000, {containerClass: 'md:col-span-2', sliderContainerClass: '!max-w-full'})}
                    ${createSlider('loanAmount','Požadovaná výše úvěru',state.formData.loanAmount,200000,20000000,100000, {containerClass: 'md:col-span-2', sliderContainerClass: '!max-w-full'})}
                    <div class="md:col-span-2 text-center bg-gray-50 p-3 rounded-lg">
                        Aktuální LTV: <strong id="ltv-display" class="text-xl ${ltvColor}">${ltvValue}%</strong>
                    </div>
                    ${createSlider('loanTerm','Délka splatnosti',state.formData.loanTerm,5,30,1, {suffix: ' let'})}
                    ${createSlider('fixation','Délka fixace',state.formData.fixation,3,10,1, {suffix: ' let'})}
                </div>
            </div>
            <div>
                <h3 class="form-section-heading">Vaše bonita a osobní údaje</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    ${createSelect('employmentType', 'Typ příjmu', {'zamestnanec': 'Zaměstnanec', 'osvc': 'OSVČ', 'jine': 'Jiné'})}
                    ${createSelect('education', 'Nejvyšší dosažené vzdělání', {'zakladni': 'Základní', 'stredoskolske': 'Středoškolské', 'vysokoskolske': 'Vysokoškolské'})}
                    ${createSlider('income','Čistý měsíční příjem',state.formData.income,15000,300000,1000)}
                    ${createSlider('liabilities','Měsíční splátky jiných úvěrů',state.formData.liabilities,0,100000,500)}
                    ${createSlider('age','Věk nejstaršího žadatele',state.formData.age,18,70,1, {suffix: ' let'})}
                    ${createSlider('children','Počet dětí',state.formData.children,0,10,1, {suffix: ' dětí'})}
                </div>
            </div>
            <div class="flex justify-center pt-4"><button class="nav-btn text-lg w-full md:w-auto" data-action="calculate"><span class="mr-2">Spočítat a najít nabídky</span><div class="loading-spinner-white hidden ml-2"></div></button></div>
        </div><div id="results-container" class="hidden mt-12"></div>`);
    };

    const getAiModeHTML = () => getAiLayout(`<div class="flex flex-col h-[75vh]"><div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4"></div><div id="ai-suggestions" class="p-4 border-t"></div><div class="p-4 border-t flex items-center space-x-2"><input type="text" id="chat-input" class="modern-input !max-w-full" placeholder="Zadejte svůj dotaz..."><button id="chat-send" class="nav-btn" data-action="send-chat">Odeslat</button></div></div>`);
    
    const renderResults = () => {
        const { offers, approvability, smartTip } = state.calculation;
        const container = document.getElementById('results-container');
        if (!container) return;
        
        scrollToAndShow('#results-container', 'start');
        container.classList.remove('hidden');

        if (!offers || offers.length === 0) { container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg mt-8"><h3 class="text-2xl font-bold text-red-800 mb-2">Dle zadaných parametrů to nevychází</h3><p class="text-red-700">Zkuste upravit parametry, nebo se <a href="#kontakt" class="font-bold underline nav-link" data-action="show-lead-form">spojte s naším specialistou</a>.</p></div>`; return; }
        
        const offersHTML = offers.map((o, index) => {
            const badge = index === 0 ? `<div class="badge-offer">Nejlepší úrok</div>` : '';
            return `<div class="offer-card p-6 rounded-xl" data-offer-id="${o.id}"> ${badge} <div class="flex-grow"><h4 class="text-lg font-bold text-gray-800">${o.title}</h4><p class="text-sm text-gray-500 mt-1">${o.description}</p></div><div class="text-right mt-4"><div class="text-3xl font-extrabold text-blue-600">${formatNumber(o.monthlyPayment)}</div><div class="text-sm font-semibold text-gray-500">Úrok ${o.rate.toFixed(2)} %</div></div></div>`;
        }).join('');

        const scoreHTML = (label, value, color) => `<div class="flex justify-between items-center text-sm"><span class="font-semibold text-gray-600">${label}:</span><div class="flex items-center gap-2"><div class="w-24 h-2 rounded-full bg-gray-200"><div class="h-2 rounded-full ${color}" style="width: ${value}%"></div></div><span class="font-bold">${value}%</span></div></div>`;
        const tipHTML = smartTip ? `<div class="smart-tip"><p class="font-bold">${smartTip.title}</p><p class="text-sm">${smartTip.message}</p></div>` : '';
        
        container.innerHTML = `<div class="space-y-12">
            <div><h3 class="text-3xl font-bold mb-6">Našli jsme pro vás tyto nabídky:</h3><div class="grid grid-cols-1 md:grid-cols-3 gap-6">${offersHTML}</div></div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div class="lg:col-span-2"><h3 class="text-3xl font-bold mb-6">Vývoj splácení v čase</h3><div class="bg-white p-6 rounded-xl border"><div class="relative h-96"><canvas id="resultsChart"></canvas></div></div></div>
                <div class="lg:sticky top-28 space-y-6">
                    <div class="summary-card">
                        <h4 class="text-xl font-bold mb-4">Přehled a skóre vaší žádosti</h4>
                        <div class="space-y-3">${scoreHTML('LTV', approvability.ltv, 'bg-green-500')}${scoreHTML('DSTI', approvability.dsti, 'bg-yellow-500')}${scoreHTML('Bonita', approvability.bonita, 'bg-green-500')}</div>
                        <h4 class="text-lg font-bold mt-6 mb-2">Celková šance: <span class="text-2xl font-bold text-green-600">${approvability.total}%</span></h4>
                        <div class="approvability-bar-bg"><div class="approvability-bar bg-green-500" style="width: ${approvability.total}%"></div></div>
                        ${tipHTML}
                    </div>
                    <button class="nav-btn btn-ai-discuss text-md w-full" data-action="discuss-with-ai">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        Probrat s AI stratégem
                    </button>
                    <button class="nav-btn btn-green text-lg w-full" data-action="show-lead-form">Mám zájem o nabídku</button>
                </div>
            </div>
        </div>`;
        
        const firstCard = container.querySelector('.offer-card'); 
        if (firstCard) { 
            firstCard.classList.add('selected'); 
            state.calculation.selectedOffer = offers.find(o => o.id === firstCard.dataset.offerId); 
        }
        setTimeout(renderResultsChart, 50);
    };
    
    const renderChart = (canvasId, calc) => { if (state.chart) { state.chart.destroy(); } const ctx = document.getElementById(canvasId)?.getContext('2d'); if (!ctx || !calc.selectedOffer) return; const { loanAmount, loanTerm } = state.formData; const { rate } = calc.selectedOffer; if (loanTerm <= 0) return; const schedule = Array.from({ length: loanTerm }, (_, i) => calculateAmortization(loanAmount, rate, loanTerm, i + 1)); state.chart = new Chart(ctx, { type: 'bar', data: { labels: schedule.map(item => item.year), datasets: [{ label: 'Úroky', data: schedule.map(item => item.interest), backgroundColor: '#fca5a5' }, { label: 'Jistina', data: schedule.map(item => item.principal), backgroundColor: '#60a5fa' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, ticks: { display: false } } }, plugins: { legend: { display: false } } } }); };
    const renderResultsChart = () => renderChart('resultsChart', state.calculation);
    const renderSidebarChart = () => renderChart('sidebarChart', state.calculation);
    const addChatMessage = (message, sender) => { const container = document.getElementById('chat-messages'); if (!container) return; const bubble = document.createElement('div'); if (sender === 'ai-typing') { bubble.className = 'chat-bubble-ai-typing'; bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`; bubble.id = 'typing-indicator'; } else { bubble.className = sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'; bubble.innerHTML = message.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); } container.appendChild(bubble); container.scrollTop = container.scrollHeight; };
    const generateAISuggestions = () => { const container = document.getElementById('ai-suggestions'); if (!container) return; const tips = state.calculation.tips || []; let suggestions = [...CONFIG.AI_SUGGESTIONS.initial, ...CONFIG.AI_SUGGESTIONS.actions]; if (state.calculation.offers && state.calculation.offers.length > 0) { suggestions = [...CONFIG.AI_SUGGESTIONS.contextual.base, ...CONFIG.AI_SUGGESTIONS.actions]; if (tips.some(t => t.id === 'low_dsti')) suggestions.push(...CONFIG.AI_SUGGESTIONS.contextual.low_dsti); if (tips.some(t => t.id === 'low_ltv')) suggestions.push(...CONFIG.AI_SUGGESTIONS.contextual.low_ltv); } container.innerHTML = `<div class="flex flex-wrap gap-2">${suggestions.map(s => `<button class="suggestion-btn" data-suggestion="${s}">${s}</button>`).join('')}</div>`; };
    
    const updateLTVDisplay = (isSidebar = false) => {
        const { propertyValue, loanAmount, loanPurpose, landValue } = state.formData;
        const effectivePropertyValue = loanPurpose === 'vystavba' ? propertyValue + landValue : propertyValue;
        const ltv = (effectivePropertyValue > 0 && loanAmount > 0) ? Math.round((loanAmount / effectivePropertyValue) * 100) : 0;
        state.calculation.approvability.ltv = ltv;
        
        const displayId = isSidebar ? 'ltv-display-sidebar' : 'ltv-display';
        const display = document.getElementById(displayId);
        
        if (display) {
            display.textContent = `${ltv}%`;
            display.classList.remove('text-red-600', 'text-yellow-600', 'text-green-600');
            if (ltv > 90) display.classList.add('text-red-600');
            else if (ltv > 80) display.classList.add('text-yellow-600');
            else display.classList.add('text-green-600');
        }
    };

    const calculateAmortization = (p, r, t, year) => { if (t <= 0) return { year, interest: 0, principal: 0 }; const mR = r / 100 / 12, n = t * 12, mP = (p * mR * Math.pow(1 + mR, n)) / (Math.pow(1 + mR, n) - 1); let bal = p, yI = 0, yP = 0; for (let i = 0; i < year * 12; i++) { const int = bal * mR, pP = mP - int; if (i >= (year - 1) * 12) { yI += int; yP += pP; } bal -= pP; } return { year, interest: yI, principal: yP }; };
    
    const calculateRates = async (button = null, isSilent = false) => {
        if (!isSilent) {
            const spinner = button?.querySelector('.loading-spinner-white');
            if (button) { button.disabled = true; spinner?.classList.remove('hidden'); }
            const container = document.getElementById('results-container');
            if(container) { container.innerHTML = `<div class="text-center p-8"><div class="loading-spinner-blue"></div><p>Počítám nejlepší nabídky...</p></div>`; container.classList.remove('hidden'); }
        }
        try {
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${new URLSearchParams(state.formData).toString()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            state.calculation = { ...state.calculation, ...data };
            updateLTVDisplay(); // Update LTV based on the final data
            if (!isSilent) renderResults();
        } catch (error) {
            console.error('Chyba při načítání sazeb:', error);
            if (!isSilent) { const container = document.getElementById('results-container'); if(container) container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg"><h3 class="text-2xl font-bold text-red-800 mb-2">Chyba při výpočtu</h3><p class="text-red-700">Zkuste to prosím znovu.</p></div>`; }
        } finally {
            if (button && !isSilent) { button.disabled = false; button.querySelector('.loading-spinner-white')?.classList.add('hidden'); }
        }
    };

    const handleInput = (e) => {
        const { id, value, type } = e.target;
        const baseId = id.replace('-input', '');
        if (state.formData.hasOwnProperty(baseId)) {
            const parsedValue = type === 'select-one' ? value : parseNumber(value);
            state.formData[baseId] = parsedValue;
            if (type === 'range') {
                const input = document.getElementById(`${baseId}-input`);
                if(input) input.value = formatNumber(parsedValue, false);
            } else if (type === 'text') {
                const slider = document.getElementById(baseId);
                if(slider) slider.value = parsedValue;
            }
            if (['propertyValue', 'loanAmount', 'landValue', 'loanPurpose'].includes(baseId)) {
                updateLTVDisplay();
                updateLTVDisplay(true); // Update sidebar as well
            }
            if(e.target.closest('#ai-sidebar-calculator')) {
                clearTimeout(state.recalcTimeout);
                state.recalcTimeout = setTimeout(() => handleChatMessageSend(`přepočítej hypotéku`, true), 800);
            }
        }
    };
    const handleClick = (e) => {
        const target = e.target.closest('[data-action], .offer-card, .suggestion-btn, [data-mode]');
        if (!target) return;
        const { action, mode, suggestion } = target.dataset;
        if (mode) switchMode(mode);
        else if (action === 'calculate') calculateRates(target);
        else if (action === 'show-lead-form') scrollToAndShow('#kontakt', 'center');
        else if (action === 'discuss-with-ai') switchMode('ai');
        else if (action === 'send-chat' || suggestion) { const input = document.getElementById('chat-input'); const message = suggestion || input.value.trim(); if (!message || !input) return; addChatMessage(message, 'user'); input.value = ''; handleChatMessageSend(message); }
        else if (target.matches('.offer-card')) { 
            document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected')); 
            target.classList.add('selected'); 
            state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === target.dataset.offerId); 
            setTimeout(renderResultsChart, 0); 
        }
    };
    const handleFormSubmit = async (e) => { e.preventDefault(); const form = e.target, btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Odesílám...'; try { await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() }); form.style.display = 'none'; document.getElementById('form-success').style.display = 'block'; } catch (error) { alert('Odeslání se nezdařilo.'); btn.disabled = false; btn.textContent = 'Odeslat nezávazně'; } };
    
    const handleChatMessageSend = async (message, isSilent = false) => {
        if (state.chatFormState !== 'idle') { handleChatFormInput(message); return; }
        if (!isSilent) addChatMessage('', 'ai-typing');
        
        const { chart, ...cleanContext } = state;
        try {
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, context: cleanContext }) });
            if (!isSilent) document.getElementById('typing-indicator')?.remove();
            if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            
            const data = await response.json();
            
            // Centralized function to handle all AI tool calls
            const handleToolCall = async (toolData) => {
                if (toolData.tool === 'modelScenario' || message === 'přepočítej hypotéku') {
                    if(toolData.params) state.formData = { ...state.formData, ...toolData.params };
                    if (!isSilent) addChatMessage('Rozumím, moment. Počítám nový scénář a aktualizuji data vpravo.', 'ai');
                    
                    await calculateRates(null, true); // Perform silent calculation
                    
                    const sidebarContainer = document.getElementById('sidebar-container');
                    if (state.calculation.offers.length > 0) {
                        state.calculation.selectedOffer = state.calculation.offers[0];
                        if (sidebarContainer) {
                            sidebarContainer.innerHTML = getSidebarHTML(); // Re-render sidebar with analysis box
                            updateLTVDisplay(true); // update LTV in sidebar
                            renderSidebarChart(); // Render chart in sidebar
                            await handleChatMessageSend("Proveď úvodní analýzu mé situace.", true); // Silently fetch analysis
                        }
                    } else {
                        // No offers found, show calculator in sidebar
                        if (sidebarContainer) sidebarContainer.innerHTML = getSidebarHTML();
                        if (!isSilent) addChatMessage('Bohužel pro tento scénář nemáme vhodnou nabídku.', 'ai');
                    }
                } else if (toolData.tool === 'startContactForm') {
                    addChatMessage(toolData.response.replace(/\n/g, '<br>'), 'ai');
                    state.chatFormState = 'awaiting_name';
                }
            };
            
            if (data.tool) { await handleToolCall(data); }
            else if (data.response) {
                 // The main response is text, but it might CONTAIN a JSON tool call for analysis
                const analysisMatch = data.response.match(/\{[\s\S]*\}/);
                let mainMessage = data.response;

                if (analysisMatch) {
                    try {
                        const nestedData = JSON.parse(analysisMatch[0]);
                        if (nestedData.tool === 'initialAnalysis') {
                             const analysisBox = document.getElementById('ai-analysis-box');
                             if(analysisBox) {
                                analysisBox.innerHTML = nestedData.response.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<h3>$1</h3>');
                             }
                             // Remove the JSON part from the message to user
                             mainMessage = mainMessage.replace(analysisMatch[0], '').trim();
                        }
                    } catch (e) { /* It's not a valid JSON, ignore */ }
                }
                
                if (mainMessage && !isSilent) {
                    addChatMessage(mainMessage, 'ai');
                }
            }
        } catch (error) {
            if (!isSilent) document.getElementById('typing-indicator')?.remove();
            addChatMessage(`Omlouvám se, došlo k chybě: ${error.message}`, 'ai');
        }
    };

    const handleChatFormInput = (message) => {
        if (state.chatFormState === 'awaiting_name') { state.chatFormData.name = message; addChatMessage('Děkuji. Jaký je Váš telefon?', 'ai'); state.chatFormState = 'awaiting_phone'; }
        else if (state.chatFormState === 'awaiting_phone') { state.chatFormData.phone = message; addChatMessage('Skvělé. A poslední údaj, Váš e-mail?', 'ai'); state.chatFormState = 'awaiting_email'; }
        else if (state.chatFormState === 'awaiting_email') { state.chatFormData.email = message; addChatMessage('Děkuji mockrát! Všechny údaje mám. Kolega se Vám brzy ozve. Přejete si ještě s něčím pomoci?', 'ai'); state.chatFormState = 'idle'; const finalData = new FormData(); finalData.append('form-name', 'lead-form'); Object.entries(state.chatFormData).forEach(([key, value]) => finalData.append(key, value)); fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(finalData).toString() }); state.chatFormData = {}; }
    };
    const handleChatEnter = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); DOMElements.contentContainer.querySelector('[data-action="send-chat"]').click(); } };
    
    const switchMode = async (mode) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        const container = DOMElements.contentContainer;
        
        if (mode === 'express') { container.innerHTML = getExpressHTML(); updateLTVDisplay(); }
        else if (mode === 'guided') { container.innerHTML = getGuidedHTML(); updateLTVDisplay(); }
        else if (mode === 'ai') {
            const hasCalc = state.calculation && state.calculation.offers && state.calculation.offers.length > 0;
            container.innerHTML = getAiModeHTML();
            
            const sidebarContainer = document.getElementById('sidebar-container');
            sidebarContainer.innerHTML = getSidebarHTML();

            if (hasCalc) {
                renderSidebarChart();
                addChatMessage("Dobrý den, připravil jsem pro Vás osobní analýzu vaší situace, kterou vidíte v panelu vpravo. Můžeme se na ni podívat podrobněji.", 'ai');
                await handleChatMessageSend("Proveď úvodní analýzu mé situace.", true);
            } else {
                addChatMessage('Dobrý den! Jsem Hypoteční stratég. Zeptejte se na cokoliv, nebo si namodelujte hypotéku v panelu vpravo.', 'ai');
            }
            generateAISuggestions();
            document.getElementById('chat-input')?.addEventListener('keydown', handleChatEnter);
            updateLTVDisplay(true);
        }
        
        if (mode === 'ai') {
            scrollToAndShow('#kalkulacka-a-vysledky', 'start');
        }
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

