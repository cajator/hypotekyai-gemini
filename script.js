'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/api/chat',
        API_RATES_ENDPOINT: '/api/rates',
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'express',
        isAiTyping: false,
        chatFormState: 'idle', 
        chatFormData: {},
        formData: {
            propertyValue: 5000000, loanAmount: 4000000,
            income: 70000, liabilities: 5000, age: 35, children: 1,
            loanTerm: 25, fixation: 5,
            purpose: 'koupě', propertyType: 'byt', landValue: 0, reconstructionValue: 0,
            employment: 'zaměstnanec', education: 'středoškolské'
        },
        calculation: { offers: [], selectedOffer: null, approvability: { total: 0 }, smartTip: null, tips: [], fixationDetails: null },
        chart: null,
    };

    // --- DOM ELEMENTS CACHE ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        leadFormContainer: document.getElementById('kontakt'),
        leadForm: document.getElementById('lead-form'),
        mobileMenuButton: document.getElementById('mobile-menu-button'),
        mobileMenu: document.getElementById('mobile-menu'),
        cookieBanner: document.getElementById('cookie-banner'),
        cookieAcceptBtn: document.getElementById('cookie-accept'),
    };
    
    // --- UTILITIES ---
    const parseNumber = (s) => parseFloat(String(s).replace(/[^0-9]/g, '')) || 0;
    const formatNumber = (n, currency = true) => n.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });
    const scrollToTarget = (targetId) => {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    
    // --- COMPONENT FACTORIES ---
    const createSlider = (id, label, value, min, max, step, containerClass = '') => {
        const suffix = (id.includes('Term') || id.includes('age') || id.includes('children') || id.includes('fixation')) ? ' let' : ' Kč';
        return `<div class="${containerClass}" id="${id}-group"><div class="flex justify-between items-center mb-1"><label for="${id}" class="form-label mb-0">${label}</label><div class="flex items-center"><input type="text" id="${id}-input" value="${formatNumber(value, false)}" class="slider-value-input"><span class="font-semibold text-gray-500">${suffix}</span></div></div><div class="slider-container"><input type="range" id="${id}" name="${id}" min="${min}" max="${max}" value="${value}" step="${step}" class="slider-input"></div></div>`;
    };
    const createSelect = (id, label, options, selectedValue, containerClass = '') => {
        const optionsHTML = Object.entries(options).map(([key, val]) => `<option value="${key}" ${key === selectedValue ? 'selected' : ''}>${val}</option>`).join('');
        return `<div class="${containerClass}"><label for="${id}" class="form-label">${label}</label><select id="${id}" name="${id}" class="modern-select">${optionsHTML}</select></div>`;
    };
    
    // --- DYNAMIC CONTENT & LAYOUTS ---
    const getCalculatorLayout = (formHTML) => `<div class="bg-white p-6 md:p-12 rounded-2xl shadow-xl border">${formHTML}</div>`;
    const getAiLayout = () => `<div class="grid ai-layout-grid gap-8 items-start"><div class="bg-white rounded-2xl shadow-xl border h-[75vh] flex flex-col"><div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4"></div><div id="ai-suggestions" class="p-4 border-t"></div><div class="p-4 border-t flex items-center space-x-2"><input type="text" id="chat-input" class="modern-input" placeholder="Zadejte svůj dotaz..."><button id="chat-send" class="nav-btn" data-action="send-chat">Odeslat</button></div></div><div id="sidebar-container" class="lg:sticky top-28 space-y-6"></div></div>`;
    
    const getSidebarHTML = () => { 
        if (state.calculation.offers && state.calculation.offers.length > 0 && state.calculation.selectedOffer) {
            const { loanAmount, propertyValue, loanTerm, fixation } = state.formData;
            const ltv = propertyValue > 0 ? Math.round((loanAmount / propertyValue) * 100) : 0;
            const monthlyPayment = state.calculation.selectedOffer.monthlyPayment;
            const rate = state.calculation.selectedOffer.rate;
            
            // Výpočty pro fixaci - vylepšená verze
            const totalPayments = fixation * 12 * monthlyPayment;
            const monthlyRate = rate / 100 / 12;
            let remainingBalance = loanAmount;
            let totalInterest = 0;
            
            for (let i = 0; i < fixation * 12; i++) {
                const interest = remainingBalance * monthlyRate;
                const principal = monthlyPayment - interest;
                totalInterest += interest;
                remainingBalance -= principal;
            }
            
            // Scénář poklesu sazeb po fixaci
            const reducedRate = Math.max(2.5, rate - 1.0); // Pokles o 1%
            const remainingMonths = (loanTerm - fixation) * 12;
            const newMonthlyPayment = calculateMonthlyPaymentForBalance(remainingBalance, reducedRate, remainingMonths);
            const savings = monthlyPayment - newMonthlyPayment;
            
            return `
                <div id="ai-analysis-container" class="bg-blue-50 p-6 rounded-2xl border border-blue-200 space-y-4">
                    <h3 class="text-xl font-bold">Rekapitulace hypotéky</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between"><span>Výše úvěru:</span> <strong class="text-gray-900">${formatNumber(loanAmount)}</strong></div>
                        <div class="flex justify-between"><span>Hodnota nemovitosti:</span> <strong class="text-gray-900">${formatNumber(propertyValue)}</strong></div>
                        <div class="flex justify-between"><span>Splatnost:</span> <strong class="text-gray-900">${loanTerm} let</strong></div>
                        <div class="flex justify-between"><span>Fixace:</span> <strong class="text-gray-900">${fixation} let</strong></div>
                        <div class="flex justify-between"><span>LTV:</span> <strong class="text-gray-900">${ltv}%</strong></div>
                        <div class="flex justify-between pt-2 border-t border-blue-200">
                            <span>Měsíční splátka:</span> 
                            <strong class="text-xl text-blue-600">${formatNumber(monthlyPayment)}</strong>
                        </div>
                        <div class="flex justify-between"><span>Úroková sazba:</span> <strong class="text-gray-900">${rate.toFixed(2)}% p.a.</strong></div>
                    </div>
                </div>
                
                <div class="bg-green-50 p-6 rounded-2xl border border-green-200 space-y-4">
                    <h3 class="text-lg font-bold">📊 Inteligentní analýza fixace</h3>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span>Zaplatíte celkem za ${fixation} let:</span> 
                            <strong class="text-gray-900">${formatNumber(totalPayments)}</strong>
                        </div>
                        <div class="flex justify-between">
                            <span>Z toho úroky:</span> 
                            <strong class="text-red-600">${formatNumber(totalInterest)}</strong>
                        </div>
                        <div class="flex justify-between">
                            <span>Splaceno z jistiny:</span> 
                            <strong class="text-green-600">${formatNumber(loanAmount - remainingBalance)}</strong>
                        </div>
                        <div class="flex justify-between pt-2 border-t border-green-200">
                            <span>Zbývající dluh po fixaci:</span> 
                            <strong class="text-gray-900">${formatNumber(remainingBalance)}</strong>
                        </div>
                    </div>
                    
                    <div class="bg-white p-4 rounded-lg border border-green-300">
                        <h4 class="font-bold text-sm mb-2">💡 Co kdyby klesly sazby?</h4>
                        <p class="text-xs text-gray-600 mb-2">Pokud by po ${fixation} letech klesla sazba na ${reducedRate.toFixed(2)}%:</p>
                        <div class="flex justify-between text-sm">
                            <span>Nová splátka:</span>
                            <strong class="text-green-600">${formatNumber(newMonthlyPayment)}</strong>
                        </div>
                        <div class="flex justify-between text-sm">
                            <span>Měsíční úspora:</span>
                            <strong class="text-green-600">${formatNumber(savings)}</strong>
                        </div>
                    </div>
                </div>
                
                <div id="ai-analysis-content" class="text-gray-700 bg-gray-50 p-6 rounded-2xl border">
                    <div class="loading-spinner-blue mx-auto"></div>
                    <p class="text-center text-sm">AI analyzuje vaši situaci...</p>
                </div>
                
                <button class="nav-btn bg-green-600 hover:bg-green-700 text-lg w-full" data-action="show-lead-form">
                    📞 Chci konzultaci se specialistou
                </button>`;
        } else {
            // Sidebar před výpočtem
            return `<div class="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                <h3 class="text-xl font-bold mb-4">Namodelujte si hypotéku</h3>
                <div id="ai-calculator" class="space-y-4">
                    ${createSlider('loanAmount-ai','Chci si půjčit',state.formData.loanAmount,200000,20000000,100000)}
                    ${createSlider('propertyValue-ai','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000)}
                    ${createSlider('loanTerm-ai','Délka splatnosti',state.formData.loanTerm,5,30,1)}
                    ${createSlider('income-ai','Měsíční čistý příjem',state.formData.income,15000,300000,1000)}
                    <div class="pt-2 border-t border-blue-200">
                        <div class="text-sm space-y-1">
                            <div class="flex justify-between"><span>LTV:</span> <strong class="text-gray-900">${Math.round((state.formData.loanAmount / state.formData.propertyValue) * 100)}%</strong></div>
                        </div>
                    </div>
                    <button class="nav-btn w-full mt-4" data-action="calculate-from-ai">Spočítat a analyzovat</button>
                </div>
            </div>`;
        }
    };
    
    const calculateMonthlyPaymentForBalance = (balance, rate, months) => {
        const monthlyRate = rate / 100 / 12;
        if (monthlyRate === 0) return balance / months;
        return (balance * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    };
    
    const getExpressHTML = () => getCalculatorLayout(`<div id="express-form" class="space-y-6">${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000)}${createSlider('loanAmount','Chci si půjčit',state.formData.loanAmount,200000,20000000,100000)}${createSlider('income','Měsíční čistý příjem',state.formData.income,15000,300000,1000)}<div class="flex justify-center pt-4"><button class="nav-btn text-lg w-full md:w-auto" data-action="calculate"><span class="mr-2">Spočítat a najít nabídky</span><div class="loading-spinner-white hidden"></div></button></div></div><div id="results-container" class="hidden mt-12"></div>`);
    
    const getGuidedHTML = () => {
        const purposes = { 'koupě': 'Koupě', 'výstavba': 'Výstavba', 'rekonstrukce': 'Rekonstrukce', 'refinancování': 'Refinancování' };
        const propertyTypes = { 'byt': 'Byt', 'rodinný dům': 'Rodinný dům', 'pozemek': 'Pozemek' };
        const employments = { 'zaměstnanec': 'Zaměstnanec', 'osvč': 'OSVČ', 'jednatel': 'Jednatel s.r.o.'};
        const educations = { 'základní': 'Základní', 'středoškolské': 'SŠ s maturitou', 'vysokoškolské': 'VŠ' };

        return getCalculatorLayout(`<div id="guided-form" class="space-y-8">
            <div><h3 class="form-section-heading">Parametry úvěru a nemovitosti</h3>
                <div class="form-grid">
                    ${createSelect('purpose', 'Účel hypotéky', purposes, state.formData.purpose)}
                    ${createSelect('propertyType', 'Typ nemovitosti', propertyTypes, state.formData.propertyType)}
                    ${createSlider('propertyValue','Hodnota nemovitosti po dokončení',state.formData.propertyValue,500000,30000000,100000, 'col-span-2 md:col-span-1')}
                    ${createSlider('reconstructionValue','Rozsah rekonstrukce',state.formData.reconstructionValue,0,10000000,50000, 'col-span-2 md:col-span-1 hidden')}
                    ${createSlider('landValue','Hodnota pozemku (u výstavby)',state.formData.landValue,0,10000000,50000, 'col-span-2 md:col-span-1 hidden')}
                    <div class="col-span-2 md:col-span-1"></div>
                    ${createSlider('loanAmount','Požadovaná výše úvěru',state.formData.loanAmount,200000,20000000,100000, 'col-span-2')}
                    <div class="col-span-2 text-center font-bold text-lg text-green-600" id="ltv-display">Aktuální LTV: ${Math.round((state.formData.loanAmount / state.formData.propertyValue) * 100)}%</div>
                    ${createSlider('loanTerm','Délka splatnosti',state.formData.loanTerm,5,30,1)}
                    ${createSlider('fixation','Délka fixace',state.formData.fixation,3,10,1)}
                </div>
            </div>
            <div><h3 class="form-section-heading">Vaše bonita a osobní údaje</h3>
                <div class="form-grid">
                    ${createSelect('employment', 'Typ příjmu', employments, state.formData.employment)}
                    ${createSelect('education', 'Nejvyšší dosažené vzdělání', educations, state.formData.education)}
                    ${createSlider('income','Čistý měsíční příjem',state.formData.income,15000,300000,1000)}
                    ${createSlider('liabilities','Měsíční splátky jiných úvěrů',state.formData.liabilities,0,100000,500)}
                    ${createSlider('age','Věk nejstaršího žadatele',state.formData.age,18,70,1)}
                    ${createSlider('children','Počet dětí',state.formData.children,0,10,1)}
                </div>
            </div>
            <div class="flex justify-center pt-4"><button class="nav-btn text-lg w-full md:w-auto" data-action="calculate"><span class="mr-2">Spočítat a najít nabídky</span><div class="loading-spinner-white hidden ml-2"></div></button></div>
        </div><div id="results-container" class="hidden mt-12"></div>`);
    };
    
    const renderResults = () => {
        const { offers, approvability, smartTip, tips, fixationDetails } = state.calculation;
        const container = document.getElementById('results-container');
        if (!container) return;
        
        container.classList.remove('hidden');
        if (!offers || offers.length === 0) {
            container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg mt-8"><h3 class="text-2xl font-bold text-red-800 mb-2">Dle zadaných parametrů to nevychází</h3><p class="text-red-700">Zkuste upravit parametry, nebo se <a href="#kontakt" data-action="show-lead-form" class="font-bold underline nav-link scroll-to">spojte s naším specialistou</a>.</p></div>`;
            return;
        }

        const offersHTML = offers.map(o => `<div class="offer-card p-6" data-offer-id="${o.id}"><div class="flex-grow"><h4 class="text-lg font-bold text-blue-700">${o.title}</h4><p class="text-sm text-gray-600 mt-1">${o.description}</p></div><div class="text-right mt-4"><div class="text-2xl font-extrabold">${formatNumber(o.monthlyPayment)}</div><div class="text-sm font-semibold text-gray-500">Úrok ${o.rate.toFixed(2)} %</div></div></div>`).join('');
        const scoreHTML = (label, value, color) => `<div class="flex justify-between items-center text-sm"><span class="font-semibold">${label}:</span><div class="flex items-center gap-2"><div class="w-24 h-2 rounded-full bg-gray-200"><div class="h-2 rounded-full ${color}" style="width: ${value}%"></div></div><span class="font-bold">${value}%</span></div></div>`;
        const tipHTML = (tip) => `<div class="mt-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg"><p class="font-bold">${tip.title}</p><p class="text-sm">${tip.message}</p></div>`;
        const allTipsHTML = (smartTip ? [smartTip] : []).concat(tips || []).map(tipHTML).join('');

        container.innerHTML = `
            <div>
                <h3 class="text-3xl font-bold mb-6">Našli jsme pro vás tyto nabídky:</h3>
                <div class="results-grid">${offersHTML}</div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-12">
                <div class="lg:col-span-3">
                    <div class="mt-8 lg:mt-0"><h3 class="text-3xl font-bold mb-6">Vývoj splácení v čase</h3><div class="bg-white p-6 rounded-xl border shadow-lg"><div class="relative h-96"><canvas id="resultsChart"></canvas></div></div></div>
                </div>
                <div class="lg:col-span-2 space-y-6">
                    <div class="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                        <h4 class="text-xl font-bold mb-4">Přehled a skóre vaší žádosti</h4>
                        <div class="space-y-3">${scoreHTML('LTV', approvability.ltv, 'bg-green-500')}${scoreHTML('DSTI', approvability.dsti, 'bg-yellow-500')}${scoreHTML('Bonita', approvability.bonita, 'bg-green-500')}</div>
                        <h4 class="text-lg font-bold mt-6 mb-2">Celková šance: <span class="text-2xl font-bold text-green-600">${approvability.total}%</span></h4>
                        <div class="approvability-bar-bg"><div class="approvability-bar bg-green-500" style="width: ${approvability.total}%"></div></div>
                        ${allTipsHTML}
                    </div>
                    <div class="text-center mt-6 space-y-3">
                        <button class="nav-btn bg-blue-600 hover:bg-blue-700 text-lg w-full" data-action="discuss-with-ai">Probrat s AI stratégem</button>
                        <button class="nav-btn bg-green-600 hover:bg-green-700 text-lg w-full" data-action="show-lead-form">Chci nejlepší nabídku</button>
                    </div>
                </div>
            </div>`;

        const firstCard = container.querySelector('.offer-card'); 
        if (firstCard) { 
            firstCard.classList.add('selected'); 
            state.calculation.selectedOffer = offers.find(o => o.id === firstCard.dataset.offerId); 
        }
        setTimeout(renderResultsChart, 50);
        scrollToTarget('#results-container');
    };
    
    const renderChart = (canvasId, calc) => { 
        if (state.chart) { state.chart.destroy(); } 
        const ctx = document.getElementById(canvasId)?.getContext('2d'); 
        if (!ctx || !calc.selectedOffer) return; 
        
        const { loanAmount, loanTerm } = state.formData; 
        const { rate } = calc.selectedOffer; 
        if (loanTerm <= 0) return; 

        const schedule = Array.from({ length: loanTerm }, (_, i) => calculateAmortization(loanAmount, rate, loanTerm, i + 1)); 
        state.chart = new Chart(ctx, { 
            type: 'bar', 
            data: { 
                labels: schedule.map(item => item.year), 
                datasets: [
                    { label: 'Úroky', data: schedule.map(item => item.interest), backgroundColor: '#fca5a5' }, 
                    { label: 'Jistina', data: schedule.map(item => item.principal), backgroundColor: '#60a5fa' }
                ] 
            }, 
            options: { 
                responsive: true, maintainAspectRatio: false, 
                scales: { x: { stacked: true }, y: { stacked: true, ticks: { display: false } } }, 
                plugins: { legend: { position: 'top' } } 
            } 
        }); 
    };
    const renderResultsChart = () => renderChart('resultsChart', state.calculation);
    const renderSidebarChart = () => renderChart('sidebarChart', state.calculation);

    const addChatMessage = (message, sender) => {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const bubble = document.createElement('div');
        if (sender === 'ai-typing') {
            bubble.innerHTML = `<div class="chat-bubble-ai"><div class="loading-spinner-blue !m-0"></div></div>`;
            bubble.id = 'typing-indicator';
        } else {
            bubble.className = sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user';
            // Enhanced markdown processing for better formatting
            let processedMessage = message
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\[(.*?)\]\((#.*?)\)/g, '<a href="$2" data-action="scroll-to-chat-link" class="font-bold text-blue-600 underline">$1</a>')
                .replace(/\n/g, '<br>');
            bubble.innerHTML = processedMessage;
        }
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    };

    const generateAISuggestions = () => {
        const container = document.getElementById('ai-suggestions');
        if (!container) return;
        let suggestions = ["Chci spočítat hypotéku", "Jaké jsou aktuální úrokové sazby?", "Jsou vaše služby zdarma?"];
        
        if (state.calculation.offers && state.calculation.offers.length > 0) {
            suggestions = ["Co přesně ovlivnilo mé skóre?", "Můžu dostat ještě lepší úrok?", "Jak rychle lze hypotéku vyřídit?"];
            if (state.calculation.tips?.some(t => t.id === 'low_dsti')) suggestions.push("Jak konkrétně mohu vylepšit své DSTI?");
            if (state.calculation.tips?.some(t => t.id === 'low_ltv')) suggestions.push("Co se stane, když navýším vlastní zdroje?");
            if (state.calculation.smartTip) suggestions.push("Řekni mi více o tom chytrém tipu.");
        }
        suggestions.push("Chci mluvit se specialistou");
        container.innerHTML = `<div class="flex flex-wrap gap-2">${suggestions.map(s => `<button class="suggestion-btn" data-suggestion="${s}">${s}</button>`).join('')}</div>`;
    };

    const calculateAmortization = (p, r, t, year) => {
        if (t <= 0) return { year, interest: 0, principal: 0 }; 
        const mR = r / 100 / 12, n = t * 12;
        const mP = (p * mR * Math.pow(1 + mR, n)) / (Math.pow(1 + mR, n) - 1); 
        let bal = p, yI = 0, yP = 0; 
        for (let i = 0; i < year * 12; i++) { 
            const int = bal * mR, pP = mP - int; 
            if (i >= (year - 1) * 12) { yI += int; yP += pP; } 
            bal -= pP; 
        } 
        return { year, interest: yI, principal: yP }; 
    };

    const calculateRates = async (button = null, isSilent = false) => {
        if (!isSilent) {
            const spinner = button?.querySelector('.loading-spinner-white');
            if (button) { button.disabled = true; spinner?.classList.remove('hidden'); }
            const container = document.getElementById('results-container');
            if(container) { 
                container.innerHTML = `<div class="text-center p-8"><div class="loading-spinner-blue"></div><p>Počítám nejlepší nabídky...</p></div>`; 
                container.classList.remove('hidden'); 
            }
        }
        try {
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${new URLSearchParams(state.formData).toString()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            state.calculation = { ...state.calculation, ...(await response.json()) };
            if (!isSilent) renderResults();
            return true;
        } catch (error) {
            console.error('Chyba při načítání sazeb:', error);
            if (!isSilent) { 
                const container = document.getElementById('results-container'); 
                if(container) container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg"><h3 class="text-2xl font-bold text-red-800 mb-2">Chyba při výpočtu</h3><p class="text-red-700">Zkuste to prosím znovu.</p></div>`;
            }
            return false;
        } finally {
            if (button && !isSilent) { 
                button.disabled = false; 
                button.querySelector('.loading-spinner-white')?.classList.add('hidden'); 
            }
        }
    };
    
    const updateLTVDisplay = () => {
        const { loanAmount, propertyValue } = state.formData;
        const ltv = propertyValue > 0 ? Math.round((loanAmount / propertyValue) * 100) : 0;
        const display = document.getElementById('ltv-display');
        const displayAi = document.getElementById('ltv-display-ai');
        if (display) display.textContent = `Aktuální LTV: ${ltv}%`;
        if (displayAi) displayAi.textContent = `Aktuální LTV: ${ltv}%`;
    };
    
    const handleGuidedFormLogic = () => {
        const purposeSelect = document.getElementById('purpose');
        const landValueGroup = document.getElementById('landValue-group');
        const reconstructionValueGroup = document.getElementById('reconstructionValue-group');
        if (!purposeSelect || !landValueGroup || !reconstructionValueGroup) return;

        const resetAndHide = (group, valueKey) => {
            group.classList.add('hidden');
            if (state.formData[valueKey] > 0) {
                state.formData[valueKey] = 0;
                const input = document.getElementById(`${valueKey}-input`);
                const slider = document.getElementById(valueKey);
                if (input) input.value = formatNumber(0, false);
                if (slider) slider.value = 0;
            }
        };

        if (purposeSelect.value === 'výstavba') {
            landValueGroup.classList.remove('hidden');
            resetAndHide(reconstructionValueGroup, 'reconstructionValue');
        } else if (purposeSelect.value === 'rekonstrukce') {
            reconstructionValueGroup.classList.remove('hidden');
            resetAndHide(landValueGroup, 'landValue');
        } else {
            resetAndHide(landValueGroup, 'landValue');
            resetAndHide(reconstructionValueGroup, 'reconstructionValue');
        }
    };

    const handleInput = (e) => {
        const { id, value, type } = e.target;
        const baseId = id.replace('-input', '').replace('-ai', '');
        
        if (state.formData.hasOwnProperty(baseId)) {
            const parsedValue = (type === 'range' || id.endsWith('-input')) ? parseNumber(value) : value;
            state.formData[baseId] = parsedValue;
            
            // Update corresponding inputs
            if (type === 'range') {
                const input = document.getElementById(`${id}-input`);
                if(input) input.value = formatNumber(parsedValue, false);
            } else if (type !== 'select-one') {
                const slider = document.getElementById(baseId);
                const sliderAi = document.getElementById(`${baseId}-ai`);
                if(slider) slider.value = parsedValue;
                if(sliderAi) sliderAi.value = parsedValue;
            }
            
            if (['loanAmount', 'propertyValue'].includes(baseId)) {
                updateLTVDisplay();
                // Update sidebar if in AI mode
                if (state.mode === 'ai' && !state.calculation.selectedOffer) {
                    const sidebarContainer = document.getElementById('sidebar-container');
                    if(sidebarContainer) {
                        // Update LTV display in sidebar
                        const ltvElement = sidebarContainer.querySelector('.text-sm strong');
                        if(ltvElement) {
                            const ltv = state.formData.propertyValue > 0 ? Math.round((state.formData.loanAmount / state.formData.propertyValue) * 100) : 0;
                            ltvElement.textContent = `${ltv}%`;
                        }
                    }
                }
            }
            
            if (baseId === 'purpose') {
                handleGuidedFormLogic();
            }
        }
    };

    const handleClick = async (e) => {
        let target = e.target.closest('[data-action], .offer-card, .suggestion-btn, [data-mode], .scroll-to');
        if (!target) return;
        
        // Handle special case for links inside chat
        if (target.dataset.action === 'scroll-to-chat-link') {
            const href = target.getAttribute('href');
            if (href) {
                e.preventDefault();
                DOMElements.leadFormContainer.classList.remove('hidden');
                scrollToTarget(href);
            }
            return;
        }

        const { action, mode, suggestion, target: targetId } = target.dataset;

        if (targetId) {
            e.preventDefault();
            if (action === 'show-lead-form-direct') {
                 DOMElements.leadFormContainer.classList.remove('hidden');
            }
            scrollToTarget(targetId);
            if (DOMElements.mobileMenu.classList.contains('hidden') === false) {
                 DOMElements.mobileMenu.classList.add('hidden');
            }
        }
        else if (mode) switchMode(mode);
        else if (action === 'calculate') calculateRates(target);
        else if (action === 'calculate-from-ai') {
            const success = await calculateRates(null, true);
            if (success) {
                switchMode('ai', true);
            }
        }
        else if (action === 'show-lead-form') {
            DOMElements.leadFormContainer.classList.remove('hidden');
            scrollToTarget('#kontakt');
        }
        else if (action === 'discuss-with-ai') switchMode('ai', true);
        else if (action === 'send-chat' || suggestion) {
            const input = document.getElementById('chat-input');
            const message = suggestion || input.value.trim();
            if (!message || state.isAiTyping) return;
            addChatMessage(message, 'user');
            if (input) input.value = '';
            handleChatMessageSend(message);
        }
        else if (target.matches('.offer-card')) {
            document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
            target.classList.add('selected');
            state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === target.dataset.offerId);
            setTimeout(renderResultsChart, 0);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target, btn = form.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Odesílám...';
        try {
            await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() });
            form.style.display = 'none';
            document.getElementById('form-success').style.display = 'block';
        } catch (error) {
            alert('Odeslání se nezdařilo.');
            btn.disabled = false;
            btn.textContent = 'Odeslat nezávazně';
        }
    };
    
    const handleChatMessageSend = async (message) => {
        if (state.chatFormState !== 'idle') {
            handleChatFormInput(message);
            return;
        }

        state.isAiTyping = true;
        addChatMessage('', 'ai-typing');
        generateAISuggestions();
        
        const { chart, ...cleanContext } = state;
        try {
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ message, context: cleanContext }) 
            });
            document.getElementById('typing-indicator')?.remove();
            if (!response.ok) throw new Error((await response.json()).error || 'Chyba serveru');
            const data = await response.json();

            if (data.tool === 'modelScenario') {
                state.formData = {...state.formData, ...(data.params || {})};
                addChatMessage('Rozumím, moment. Počítám nový scénář...', 'ai');
                const success = await calculateRates(null, true);
                if (success) {
                    switchMode('ai', true);
                    addChatMessage(`Výborně! Vypočítal jsem novou hypotéku: **${formatNumber(state.formData.loanAmount)}** na **${state.formData.loanTerm} let**. Měsíční splátka vychází na **${formatNumber(state.calculation.selectedOffer?.monthlyPayment || 0)}**.`, 'ai');
                }
            }
            else if (data.tool === 'startContactForm') {
                addChatMessage(data.response, 'ai');
                state.chatFormState = 'awaiting_name';
            }
            else if (data.tool === 'initialAnalysis') {
                const analysisContainer = document.getElementById('ai-analysis-content');
                if(analysisContainer) analysisContainer.innerHTML = `<div class="text-sm space-y-2">${data.response}</div>`;
            }
            else if (data.tool === 'showLeadForm') {
                DOMElements.leadFormContainer.classList.remove('hidden');
                scrollToTarget('#kontakt');
                addChatMessage(data.response || 'Otevírám formulář pro spojení se specialistou...', 'ai');
            }
            else {
                addChatMessage(data.response, 'ai');
            }
        } catch (error) {
            document.getElementById('typing-indicator')?.remove();
            addChatMessage(`Omlouvám se, došlo k chybě: ${error.message}`, 'ai');
        } finally {
            state.isAiTyping = false;
        }
    };

    const handleChatFormInput = (message) => {
        if (state.chatFormState === 'awaiting_name') {
            state.chatFormData.name = message;
            addChatMessage('Děkuji. Jaké je Váš telefon?', 'ai');
            state.chatFormState = 'awaiting_phone';
        } else if (state.chatFormState === 'awaiting_phone') {
            state.chatFormData.phone = message;
            addChatMessage('Skvělé. A poslední údaj, Váš e-mail?', 'ai');
            state.chatFormState = 'awaiting_email';
        } else if (state.chatFormState === 'awaiting_email') {
            state.chatFormData.email = message;
            addChatMessage('Děkuji mockrát! Všechny údaje mám. Kolega se Vám brzy ozve. Přejete si ještě s něčím pomoci?', 'ai');
            state.chatFormState = 'idle';
            // Send the lead data to backend/CRM
            console.log("Captured lead:", state.chatFormData);
            // Reset form data
            state.chatFormData = {};
        }
    };

    const handleChatEnter = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            DOMElements.contentContainer.querySelector('[data-action="send-chat"]')?.click();
        }
    };
    
    const switchMode = (mode, fromResults = false) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        
        if (mode === 'express') DOMElements.contentContainer.innerHTML = getExpressHTML();
        else if (mode === 'guided') {
            DOMElements.contentContainer.innerHTML = getGuidedHTML();
            handleGuidedFormLogic();
        }
        else if (mode === 'ai') {
            if (!fromResults) {
                state.calculation = { offers: [], selectedOffer: null, approvability: { total: 0 }, smartTip: null, tips: [], fixationDetails: null };
            }
            DOMElements.contentContainer.innerHTML = getAiLayout();
            const sidebarContainer = document.getElementById('sidebar-container');
            if(sidebarContainer) sidebarContainer.innerHTML = getSidebarHTML();

            if (!fromResults) {
                addChatMessage('Dobrý den! 👋 Jsem Hypoteční stratég. Pomohu vám najít nejlepší hypotéku na míru. Co vás zajímá?', 'ai');
            } else {
                 addChatMessage('Výborně! Mám připravenou analýzu vaší situace. Podívejte se na panel vpravo. Co vás zajímá nejvíce?', 'ai');
                 if(state.calculation.selectedOffer){
                    handleChatMessageSend("Proveď úvodní analýzu mé situace.");
                    setTimeout(() => renderSidebarChart(), 100);
                 }
            }
            generateAISuggestions();
            document.getElementById('chat-input')?.addEventListener('keydown', handleChatEnter);
            scrollToTarget('#content-container');
        }
    };

    const handleCookieBanner = () => {
        if (localStorage.getItem('cookieConsent') === 'true') {
            DOMElements.cookieBanner.classList.add('hidden');
        } else {
            DOMElements.cookieBanner.classList.remove('hidden');
        }
        DOMElements.cookieAcceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'true');
            DOMElements.cookieBanner.classList.add('hidden');
        });
    };

    const init = () => {
        document.body.addEventListener('click', handleClick);
        DOMElements.contentContainer.addEventListener('input', handleInput);
        if (DOMElements.leadForm) DOMElements.leadForm.addEventListener('submit', handleFormSubmit);

        DOMElements.mobileMenuButton.addEventListener('click', () => {
            DOMElements.mobileMenu.classList.toggle('hidden');
        });

        handleCookieBanner();
        switchMode(state.mode);
    };

    init();
});