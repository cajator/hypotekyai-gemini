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
        chatHistory: [],
        mobileSidebarOpen: false,
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
    
    const isMobile = () => window.innerWidth < 768;
    const isTablet = () => window.innerWidth >= 768 && window.innerWidth < 1024;
    
    // --- COMPONENT FACTORIES ---
    const createSlider = (id, label, value, min, max, step, containerClass = '') => {
        const suffix = (id.includes('Term') || id.includes('age') || id.includes('children') || id.includes('fixation')) ? ' let' : ' Kč';
        return `<div class="${containerClass}" id="${id}-group">
            <div class="flex justify-between items-center mb-1">
                <label for="${id}" class="form-label mb-0">${label}</label>
                <div class="flex items-center">
                    <input type="text" id="${id}-input" value="${formatNumber(value, false)}" class="slider-value-input">
                    <span class="font-semibold text-gray-500">${suffix}</span>
                </div>
            </div>
            <div class="slider-container">
                <input type="range" id="${id}" name="${id}" min="${min}" max="${max}" value="${value}" step="${step}" class="slider-input">
            </div>
        </div>`;
    };
    
    const createSelect = (id, label, options, selectedValue, containerClass = '') => {
        const optionsHTML = Object.entries(options).map(([key, val]) => 
            `<option value="${key}" ${key === selectedValue ? 'selected' : ''}>${val}</option>`
        ).join('');
        return `<div class="${containerClass}">
            <label for="${id}" class="form-label">${label}</label>
            <select id="${id}" name="${id}" class="modern-select">${optionsHTML}</select>
        </div>`;
    };
    
    // --- DYNAMIC CONTENT & LAYOUTS ---
    const getCalculatorLayout = (formHTML) => 
        `<div class="bg-white p-4 md:p-6 lg:p-12 rounded-2xl shadow-xl border">${formHTML}</div>`;
    
    const getAiLayout = () => {
        if (isMobile()) {
            return `
                <div class="flex flex-col h-[calc(100vh-120px)]">
                    <div class="bg-white flex-1 flex flex-col">
                        <div id="chat-messages" class="flex-1 overflow-y-auto p-3 space-y-3"></div>
                        <div id="ai-suggestions" class="p-3 border-t overflow-x-auto"></div>
                        <div class="p-3 border-t flex items-center space-x-2">
                            <input type="text" id="chat-input" class="modern-input flex-1" placeholder="Zeptejte se na cokoliv ohledně hypotéky..." style="font-size: 16px;">
                            <button id="chat-send" class="nav-btn px-4 py-3" data-action="send-chat">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    ${state.calculation.selectedOffer ? `
                    <button id="mobile-sidebar-toggle" class="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40" data-action="toggle-mobile-sidebar">
                        <span class="text-2xl">📊</span>
                    </button>
                    ` : ''}
                    
                    <div id="mobile-sidebar-overlay" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50" data-action="close-mobile-sidebar">
                        <div id="sidebar-container" class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto" onclick="event.stopPropagation()"></div>
                    </div>
                </div>`;
        }
        
        return `
            <div class="grid ai-layout-grid gap-8 items-start">
                <div class="bg-white rounded-2xl shadow-xl border flex flex-col">
                    <!-- Info panel -->
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-t-2xl border-b">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <span class="text-2xl mr-2">🤖</span>
                                <div>
                                    <h3 class="font-bold text-gray-800">AI Hypoteční stratég</h3>
                                    <p class="text-xs text-gray-600">Analýza dat z 19+ bank • Odpovědi do 3 sekund</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button class="text-xs bg-white px-3 py-1 rounded-lg border hover:bg-gray-50"
                                        data-action="reset-chat">
                                    🔄 Nový chat
                                </button>
                                <button class="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                                        data-action="show-lead-form">
                                    📞 Domluvit se specialistou
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Chat messages -->
                    <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4" style="height: calc(75vh - 200px);"></div>
                    
                    <!-- AI suggestions -->
                    <div id="ai-suggestions" class="p-4 border-t bg-gray-50"></div>
                    
                    <!-- Input area -->
                    <div class="p-4 border-t flex items-center space-x-2 bg-white rounded-b-2xl">
                        <input type="text" id="chat-input" class="modern-input flex-1" 
                               placeholder="Zeptejte se na cokoliv ohledně hypotéky...">
                        <button id="chat-send" class="nav-btn" data-action="send-chat">
                            <span class="hidden sm:inline mr-2">Odeslat</span>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="sidebar-container" class="lg:sticky top-28 space-y-6"></div>
            </div>`;
    };
    
    const getSidebarHTML = () => { 
        if (state.calculation.offers && state.calculation.offers.length > 0 && state.calculation.selectedOffer) {
            const { loanAmount, propertyValue, loanTerm, fixation } = state.formData;
            const monthlyPayment = state.calculation.selectedOffer.monthlyPayment;
            const rate = state.calculation.selectedOffer.rate;
            const quickAnalysis = state.calculation.fixationDetails?.quickAnalysis;
            
            return `
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <span class="text-2xl mr-2">💼</span> Váš hypoteční plán
                    </h3>
                    
                    <!-- Hlavní parametry -->
                    <div class="bg-white p-4 rounded-xl mb-4 shadow-sm">
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Úvěr:</span>
                                <strong>${formatNumber(loanAmount)}</strong>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Nemovitost:</span>
                                <strong>${formatNumber(propertyValue)}</strong>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Fixace:</span>
                                <strong>${fixation} let</strong>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Splatnost:</span>
                                <strong>${loanTerm} let</strong>
                            </div>
                        </div>
                        <div class="mt-3 pt-3 border-t">
                            <div class="flex justify-between items-center">
                                <span class="text-gray-600">Měsíční splátka:</span>
                                <span class="text-2xl font-bold text-blue-600">${formatNumber(monthlyPayment)}</span>
                            </div>
                            <div class="flex justify-between mt-1">
                                <span class="text-gray-600 text-xs">Úrok:</span>
                                <span class="text-sm font-semibold">${rate.toFixed(2)}% p.a.</span>
                            </div>
                        </div>
                    </div>

                    ${quickAnalysis ? `
                    <!-- Rychlá analýza -->
                    <div class="bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-200">
                        <p class="text-xs font-semibold text-yellow-800 mb-2">⚡ Rychlá analýza</p>
                        <div class="text-xs text-gray-700 space-y-1">
                            <div>📅 Denně platíte: <strong>${formatNumber(quickAnalysis.dailyCost)}</strong></div>
                            <div>🏠 Vs. nájem: ušetříte cca <strong>${formatNumber(Math.max(0, quickAnalysis.equivalentRent - monthlyPayment))}/měs</strong></div>
                            <div>💰 Daňová úleva: až <strong>${formatNumber(quickAnalysis.taxSavings)}/měs</strong></div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Rychlé úpravy -->
                    <div class="mb-4">
                        <p class="text-xs font-semibold text-gray-700 mb-2">Upravit parametry:</p>
                        <div class="grid grid-cols-2 gap-2">
                            <button class="text-xs bg-white px-3 py-2 rounded-lg hover:bg-gray-50 border" 
                                    data-quick-question="Chci změnit výši úvěru">
                                💰 Výše úvěru
                            </button>
                            <button class="text-xs bg-white px-3 py-2 rounded-lg hover:bg-gray-50 border"
                                    data-quick-question="Chci jinou fixaci">
                                📊 Fixace
                            </button>
                            <button class="text-xs bg-white px-3 py-2 rounded-lg hover:bg-gray-50 border"
                                    data-quick-question="Jak změnit splatnost?">
                                ⏱️ Splatnost
                            </button>
                            <button class="text-xs bg-white px-3 py-2 rounded-lg hover:bg-gray-50 border"
                                    data-quick-question="Můžu dostat lepší sazbu?">
                                📉 Lepší sazba
                            </button>
                        </div>
                    </div>

                    <button class="nav-btn bg-green-600 hover:bg-green-700 text-white w-full mb-2" 
                            data-action="show-lead-form">
                        📞 Domluvit se specialistou
                    </button>
                    
                    <button class="text-xs text-center w-full text-gray-600 hover:text-blue-600 underline" 
                            data-action="download-summary">
                        Stáhnout souhrn (PDF)
                    </button>
                </div>`;
        } else {
            // Když nejsou data
            return `
                <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200">
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <span class="text-2xl mr-2">🎯</span> Rychlý start
                    </h3>
                    
                    <div class="space-y-3 mb-4">
                        <button class="w-full text-left p-3 bg-white rounded-lg hover:shadow-md transition-shadow" 
                                data-quick-question="Kolik si můžu půjčit s příjmem 50 tisíc?">
                            <span class="text-purple-600 font-semibold">💰</span>
                            <span class="text-sm ml-2">Kolik si můžu půjčit?</span>
                        </button>
                        <button class="w-full text-left p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                                data-quick-question="Jaký je rozdíl mezi fixací na 5 a 10 let?">
                            <span class="text-purple-600 font-semibold">📊</span>
                            <span class="text-sm ml-2">Porovnat fixace</span>
                        </button>
                        <button class="w-full text-left p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                                data-quick-question="Můžu dostat hypotéku jako OSVČ?">
                            <span class="text-purple-600 font-semibold">🏢</span>
                            <span class="text-sm ml-2">Hypotéka pro OSVČ</span>
                        </button>
                        <button class="w-full text-left p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                                data-quick-question="Jaké dokumenty potřebuji?">
                            <span class="text-purple-600 font-semibold">📋</span>
                            <span class="text-sm ml-2">Checklist dokumentů</span>
                        </button>
                    </div>

                    <button class="nav-btn bg-purple-600 hover:bg-purple-700 w-full mb-2" 
                            data-action="go-to-calculator">
                        🔢 Spočítat hypotéku
                    </button>
                    
                    <button class="nav-btn bg-green-600 hover:bg-green-700 w-full" 
                            data-action="show-lead-form">
                        📞 Domluvit se specialistou
                    </button>
                </div>`;
        }
    };
    
    const getExpressHTML = () => getCalculatorLayout(`
        <div id="express-form" class="space-y-6">
            ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000)}
            ${createSlider('loanAmount','Chci si půjčit',state.formData.loanAmount,200000,20000000,100000)}
            ${createSlider('income','Měsíční čistý příjem',state.formData.income,15000,300000,1000)}
            <div class="flex justify-center pt-4">
                <button class="nav-btn text-lg w-full md:w-auto" data-action="calculate">
                    <span class="mr-2">Spočítat a najít nabídky</span>
                    <div class="loading-spinner-white hidden"></div>
                </button>
            </div>
        </div>
        <div id="results-container" class="hidden mt-12"></div>`);
    
    const getGuidedHTML = () => {
        const purposes = { 'koupě': 'Koupě', 'výstavba': 'Výstavba', 'rekonstrukce': 'Rekonstrukce', 'refinancování': 'Refinancování' };
        const propertyTypes = { 'byt': 'Byt', 'rodinný dům': 'Rodinný dům', 'pozemek': 'Pozemek' };
        const employments = { 'zaměstnanec': 'Zaměstnanec', 'osvc': 'OSVČ', 'jednatel': 'Jednatel s.r.o.'};
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
                    <div class="col-span-2 text-center font-bold text-lg text-green-600" id="ltv-display">
                        Aktuální LTV: ${Math.round((state.formData.loanAmount / state.formData.propertyValue) * 100)}%
                    </div>
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
            <div class="flex justify-center pt-4">
                <button class="nav-btn text-lg w-full md:w-auto" data-action="calculate">
                    <span class="mr-2">Spočítat a najít nabídky</span>
                    <div class="loading-spinner-white hidden ml-2"></div>
                </button>
            </div>
        </div>
        <div id="results-container" class="hidden mt-12"></div>`);
    };
    
    const renderResults = () => {
        const { offers, approvability, smartTip, tips, fixationDetails } = state.calculation;
        const container = document.getElementById('results-container');
        if (!container) return;
        
        container.classList.remove('hidden');
        if (!offers || offers.length === 0) {
            container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg mt-8">
                <h3 class="text-2xl font-bold text-red-800 mb-2">Dle zadaných parametrů to nevychází</h3>
                <p class="text-red-700">Zkuste upravit parametry, nebo se 
                    <a href="#kontakt" data-action="show-lead-form" class="font-bold underline nav-link scroll-to">spojte s naším specialistou</a>.
                </p>
            </div>`;
            return;
        }

        const offersHTML = offers.map(o => `
            <div class="offer-card p-6" data-offer-id="${o.id}">
                <div class="flex-grow">
                    <h4 class="text-lg font-bold text-blue-700 mb-1">${o.title}</h4>
                    <p class="text-sm text-gray-600">${o.description}</p>
                    ${o.highlights ? `
                        <div class="flex flex-wrap gap-1 mt-2">
                            ${o.highlights.map(h => `
                                <span class="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                    ${h}
                                </span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="text-right mt-4">
                    <div class="text-2xl font-extrabold text-gray-900">${formatNumber(o.monthlyPayment)}</div>
                    <div class="text-sm font-semibold text-gray-500">Úrok ${o.rate.toFixed(2)} %</div>
                    <button class="text-xs text-blue-600 underline mt-1" 
                            data-action="compare-offer" data-offer="${o.id}">
                        Porovnat detaily →
                    </button>
                </div>
            </div>`).join('');

        const scoreHTML = (label, value, color, icon) => `
            <div class="bg-white p-3 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold flex items-center">
                        <span class="text-lg mr-1">${icon}</span> ${label}
                    </span>
                    <span class="font-bold text-lg">${value}%</span>
                </div>
                <div class="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
                    <div class="h-full rounded-full ${color} transition-all duration-500" style="width: ${value}%"></div>
                </div>
            </div>`;

        const tipHTML = (tip) => `
            <div class="mt-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg">
                <p class="font-bold flex items-center">
                    <span class="text-lg mr-2">⚠️</span> ${tip.title}
                </p>
                <p class="text-sm mt-1">${tip.message}</p>
            </div>`;
            
        const allTipsHTML = (smartTip ? [smartTip] : []).concat(tips || []).map(tipHTML).join('');

        container.innerHTML = `
            <div>
                <h3 class="text-3xl font-bold mb-6">Našli jsme pro vás tyto nabídky:</h3>
                <div class="results-grid">${offersHTML}</div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                <div class="space-y-6">
                    <!-- Score Card -->
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-lg">
                        <h4 class="text-xl font-bold mb-4 flex items-center">
                            <span class="text-2xl mr-2">🎯</span> Skóre vaší žádosti
                        </h4>
                        <div class="space-y-3">
                            ${scoreHTML('LTV', approvability.ltv, 'bg-green-500', '🏠')}
                            ${scoreHTML('DSTI', approvability.dsti, 'bg-yellow-500', '💰')}
                            ${scoreHTML('Bonita', approvability.bonita, 'bg-blue-500', '⭐')}
                        </div>
                        
                        <div class="mt-6 p-4 bg-white rounded-xl">
                            <h5 class="text-lg font-bold mb-2">Celková šance na schválení:</h5>
                            <div class="flex items-center justify-center">
                                <div class="relative w-32 h-32">
                                    <svg class="transform -rotate-90 w-32 h-32">
                                        <circle cx="64" cy="64" r="56" stroke="#e5e7eb" stroke-width="8" fill="none"/>
                                        <circle cx="64" cy="64" r="56" stroke="#10b981" stroke-width="8" fill="none" 
                                                stroke-dasharray="${approvability.total * 3.51} 351" stroke-linecap="round"/>
                                    </svg>
                                    <div class="absolute inset-0 flex items-center justify-center">
                                        <span class="text-3xl font-bold text-green-600">${approvability.total}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ${allTipsHTML}
                    </div>
                    
                    <!-- Chart -->
                    <div class="bg-white p-6 rounded-xl border shadow-lg">
                        <h3 class="text-xl font-bold mb-4">Vývoj splácení v čase</h3>
                        <div class="relative h-80">
                            <canvas id="resultsChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <!-- Fixation Analysis -->
                    ${fixationDetails ? `
                        <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-lg">
                            <h4 class="text-xl font-bold mb-4 flex items-center">
                                <span class="text-2xl mr-2">📊</span> Inteligentní analýza fixace
                            </h4>
                            
                            <div class="bg-white p-5 rounded-xl space-y-3">
                                <div class="flex justify-between items-center py-2 border-b">
                                    <span class="text-gray-600">Zaplatíte celkem za ${state.formData.fixation} let:</span>
                                    <strong class="text-xl text-gray-900">${formatNumber(fixationDetails.totalPaymentsInFixation)}</strong>
                                </div>
                                
                                <div class="flex justify-between items-center py-2">
                                    <span class="text-gray-600">Z toho úroky:</span>
                                    <strong class="text-lg text-red-600">${formatNumber(fixationDetails.totalInterestForFixation)}</strong>
                                </div>
                                
                                <div class="flex justify-between items-center py-2">
                                    <span class="text-gray-600">Splaceno z jistiny:</span>
                                    <strong class="text-lg text-green-600">${formatNumber(fixationDetails.totalPrincipalForFixation)}</strong>
                                </div>
                                
                                <div class="flex justify-between items-center py-2 border-t pt-4">
                                    <span class="text-gray-700 font-semibold">Zbývající dluh po fixaci:</span>
                                    <strong class="text-xl text-gray-900">${formatNumber(fixationDetails.remainingBalanceAfterFixation)}</strong>
                                </div>
                            </div>
                            
                            ${fixationDetails.quickAnalysis ? `
                            <div class="mt-4 bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                <h5 class="font-bold text-sm mb-2 flex items-center">
                                    <span class="text-lg mr-1">⚡</span> Rychlá analýza
                                </h5>
                                <div class="grid grid-cols-2 gap-2 text-xs">
                                    <div>📅 Denní náklady: <strong>${formatNumber(fixationDetails.quickAnalysis.dailyCost)}</strong></div>
                                    <div>💰 Daňová úleva: <strong>${formatNumber(fixationDetails.quickAnalysis.taxSavings)}/měs</strong></div>
                                    <div>🏠 Úroky tvoří: <strong>${fixationDetails.quickAnalysis.percentOfTotal}%</strong></div>
                                    <div>📊 Vs. nájem: <strong>${formatNumber(fixationDetails.quickAnalysis.equivalentRent)}</strong></div>
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-200">
                                <h5 class="font-bold text-sm mb-2 flex items-center">
                                    <span class="text-lg mr-1">💡</span> Co kdyby klesly sazby?
                                </h5>
                                <p class="text-xs text-gray-600 mb-2">
                                    Pokud by po ${state.formData.fixation} letech klesla sazba na ${fixationDetails.futureScenario.optimistic.rate.toFixed(2)}%:
                                </p>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm">Nová splátka:</span>
                                    <strong class="text-green-600 text-lg">${formatNumber(fixationDetails.futureScenario.optimistic.newMonthlyPayment)}</strong>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm">Měsíční úspora:</span>
                                    <strong class="text-green-600 text-lg">${formatNumber(fixationDetails.futureScenario.optimistic.monthlySavings)}</strong>
                                </div>
                            </div>
                            
                            <button class="nav-btn bg-blue-600 hover:bg-blue-700 text-white w-full mt-4" data-action="discuss-fixation-with-ai">
                                <span class="mr-2">🤖</span> Probrat detaily s AI rádcem
                            </button>
                        </div>
                    ` : ''}
                    
                    <!-- Action buttons -->
                    <div class="text-center space-y-3">
                        <button class="nav-btn bg-green-600 hover:bg-green-700 text-lg w-full" data-action="show-lead-form">
                            <span class="mr-2">📞</span> Domluvit se specialistou
                        </button>
                        ${!fixationDetails ? `
                            <button class="nav-btn bg-blue-600 hover:bg-blue-700 text-lg w-full" data-action="discuss-with-ai">
                                <span class="mr-2">🤖</span> Probrat s AI rádcem
                            </button>
                        ` : ''}
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
                    { label: 'Úroky', data: schedule.map(item => item.interest), backgroundColor: '#ef4444' }, 
                    { label: 'Jistina', data: schedule.map(item => item.principal), backgroundColor: '#22c55e' }
                ] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    x: { stacked: true }, 
                    y: { stacked: true, ticks: { display: false } } 
                }, 
                plugins: { legend: { position: 'top' } } 
            } 
        }); 
    };
    
    const renderResultsChart = () => renderChart('resultsChart', state.calculation);

    const addChatMessage = (message, sender) => {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        if (sender !== 'ai-typing') {
            state.chatHistory.push({ text: message, sender: sender, timestamp: Date.now() });
        }
        
        const bubble = document.createElement('div');
        if (sender === 'ai-typing') {
            bubble.innerHTML = `<div class="chat-bubble-ai"><div class="loading-spinner-blue !m-0"></div></div>`;
            bubble.id = 'typing-indicator';
        } else {
            bubble.className = sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user';
            let processedMessage = message
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\[(.*?)\]\((#.*?)\)/g, '<a href="$2" data-action="scroll-to-chat-link" class="font-bold text-blue-600 underline">$1</a>')
                .replace(/\n/g, '<br>');
            bubble.innerHTML = processedMessage;
        }
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
        
        if (state.mode === 'ai') {
            const sidebarContainer = document.getElementById('sidebar-container');
            if(sidebarContainer) sidebarContainer.innerHTML = getSidebarHTML();
        }
    };

    const generateAISuggestions = () => {
        const container = document.getElementById('ai-suggestions');
        if (!container) return;
        
        let suggestions = [];
        if (state.calculation.offers && state.calculation.offers.length > 0) {
            suggestions = [
                "📊 Rychlá analýza", 
                "💰 Lepší úrok?", 
                "⏱️ Změnit fixaci", 
                "📞 Domluvit se specialistou"
            ];
        } else {
            suggestions = [
                "🔢 Spočítat hypotéku", 
                "📈 Aktuální sazby", 
                "📋 Co potřebuji?", 
                "📞 Domluvit se specialistou"
            ];
        }
        
        const suggestionsHTML = isMobile() 
            ? `<div class="flex gap-2 overflow-x-auto pb-1">${suggestions.map(s => 
                `<button class="suggestion-btn whitespace-nowrap flex-shrink-0" data-suggestion="${s}">${s}</button>`
              ).join('')}</div>`
            : `<div class="flex flex-wrap gap-2">${suggestions.map(s => 
                `<button class="suggestion-btn" data-suggestion="${s}">${s}</button>`
              ).join('')}</div>`;
            
        container.innerHTML = suggestionsHTML;
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
            if (button) { 
                button.disabled = true; 
                spinner?.classList.remove('hidden'); 
            }
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
                if(container) container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg">
                    <h3 class="text-2xl font-bold text-red-800 mb-2">Chyba při výpočtu</h3>
                    <p class="text-red-700">Zkuste to prosím znovu.</p>
                </div>`;
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
        if (display) display.textContent = `Aktuální LTV: ${ltv}%`;
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
        const baseId = id.replace('-input', '');
        
        if (state.formData.hasOwnProperty(baseId)) {
            const parsedValue = (type === 'range' || id.endsWith('-input')) ? parseNumber(value) : value;
            state.formData[baseId] = parsedValue;
            
            if (type === 'range') {
                const input = document.getElementById(`${baseId}-input`);
                if(input) input.value = formatNumber(parsedValue, false);
            } else if (type !== 'select-one') {
                const slider = document.getElementById(baseId);
                if(slider) slider.value = parsedValue;
            }
            
            if (['loanAmount', 'propertyValue'].includes(baseId)) {
                updateLTVDisplay();
            }
            if (baseId === 'purpose') {
                handleGuidedFormLogic();
            }
        }
    };

    const toggleMobileSidebar = () => {
        const overlay = document.getElementById('mobile-sidebar-overlay');
        if (!overlay) return;
        
        if (state.mobileSidebarOpen) {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        } else {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
        state.mobileSidebarOpen = !state.mobileSidebarOpen;
    };

    const handleClick = async (e) => {
        let target = e.target.closest('[data-action], .offer-card, .suggestion-btn, [data-mode], .scroll-to, [data-quick-question]');
        if (!target) return;
        
        const { action, mode, suggestion, target: targetId } = target.dataset;
        const quickQuestion = target.dataset.quickQuestion;

        if (action === 'toggle-mobile-sidebar') {
            toggleMobileSidebar();
            return;
        }
        
        if (action === 'close-mobile-sidebar') {
            toggleMobileSidebar();
            return;
        }

        if (quickQuestion) {
            if (isMobile()) toggleMobileSidebar();
            document.getElementById('chat-input').value = quickQuestion;
            handleChatMessageSend(quickQuestion);
            return;
        }

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
        else if (action === 'go-to-calculator') {
            if (isMobile()) toggleMobileSidebar();
            switchMode('express');
        }
        else if (action === 'ask-about-fixation') {
            if (isMobile()) toggleMobileSidebar();
            handleChatMessageSend("Řekni mi více o analýze fixace");
        }
        else if (action === 'show-lead-form') {
            if (isMobile()) toggleMobileSidebar();
            DOMElements.leadFormContainer.classList.remove('hidden');
            scrollToTarget('#kontakt');
        }
        else if (action === 'discuss-with-ai' || action === 'discuss-fixation-with-ai') {
            switchMode('ai', true);
            if (action === 'discuss-fixation-with-ai') {
                setTimeout(() => {
                    handleChatMessageSend("Vysvětli mi detailně analýzu fixace");
                }, 500);
            }
        }
        else if (action === 'reset-chat') {
            state.chatHistory = [];
            document.getElementById('chat-messages').innerHTML = '';
            addChatMessage('Dobrý den! Jsem váš hypoteční poradce s AI nástroji. Jak vám mohu pomoci?', 'ai');
            generateAISuggestions();
        }
        else if (action === 'download-summary') {
            alert('Funkce bude brzy dostupná. Mezitím si můžete udělat screenshot nebo zkopírovat data.');
        }
        else if (action === 'compare-offer') {
            const offerId = target.dataset.offer;
            const offer = state.calculation.offers.find(o => o.id === offerId);
            if (offer) {
                handleChatMessageSend(`Řekni mi více o nabídce "${offer.title}" a porovnej ji s ostatními`);
            }
        }
        else if (action === 'send-chat' || suggestion) {
            const input = document.getElementById('chat-input');
            const message = suggestion || input.value.trim();
            if (!message || state.isAiTyping) return;
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
            await fetch("/", { 
                method: "POST", 
                headers: { "Content-Type": "application/x-form-urlencoded" }, 
                body: new URLSearchParams(new FormData(form)).toString() 
            });
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

        // Mapování zkrácených návrhů na plné otázky
        const suggestionMap = {
            "📊 Rychlá analýza": "Proveď úvodní analýzu mé situace.",
            "💰 Lepší úrok?": "Můžu dostat lepší úrok? Jak?",
            "⏱️ Změnit fixaci": "Chci změnit délku fixace",
            "📞 Domluvit se specialistou": "Chci se domluvit se specialistou",
            "🔢 Spočítat hypotéku": "Chci spočítat hypotéku",
            "📈 Aktuální sazby": "Jaké jsou aktuální sazby?",
            "📋 Co potřebuji?": "Jaké dokumenty potřebuji?"
        };
        
        const finalMessage = suggestionMap[message] || message;

        addChatMessage(message, 'user');
        state.isAiTyping = true;
        addChatMessage('', 'ai-typing');
        generateAISuggestions();
        
        const { chart, chatHistory, mobileSidebarOpen, ...cleanContext } = state;
        try {
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ message: finalMessage, context: cleanContext }) 
            });
            document.getElementById('typing-indicator')?.remove();
            if (!response.ok) throw new Error((await response.json()).error || 'Chyba serveru');
            const data = await response.json();

            if (data.tool === 'modelScenario') {
                state.formData = {...state.formData, ...(data.params || {})};
                addChatMessage('Rozumím, počítám scénář...', 'ai');
                const success = await calculateRates(null, true);
                if (success && state.calculation.selectedOffer) {
                    addChatMessage(`Výborně! Pro **${formatNumber(state.formData.loanAmount)}** na **${state.formData.loanTerm} let** vychází splátka **${formatNumber(state.calculation.selectedOffer.monthlyPayment)}**.`, 'ai');
                }
            }
            else if (data.tool === 'initialAnalysis') {
                addChatMessage(data.response, 'ai');
            }
            else if (data.tool === 'startContactForm') {
                addChatMessage(data.response, 'ai');
                state.chatFormState = 'awaiting_name';
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
            addChatMessage('Perfektní! 📞 Všechny údaje mám. Náš specialista se Vám ozve do 24 hodin.', 'ai');
            state.chatFormState = 'idle';
            console.log("Captured lead:", state.chatFormData);
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
                state.chatHistory = [];
            }
            DOMElements.contentContainer.innerHTML = getAiLayout();
            const sidebarContainer = document.getElementById('sidebar-container');
            if(sidebarContainer) sidebarContainer.innerHTML = getSidebarHTML();

            if (!fromResults) {
                addChatMessage('Dobrý den! Jsem váš hypoteční poradce s přístupem k datům z 19+ bank. Pomohu vám najít nejlepší řešení pro vaši situaci. Co vás zajímá?', 'ai');
            } else if (state.calculation.selectedOffer) {
                addChatMessage(`Výborně! Mám vaši analýzu. Splátka **${formatNumber(state.calculation.selectedOffer.monthlyPayment)}** při sazbě **${state.calculation.selectedOffer.rate.toFixed(2)}%** je ${state.calculation.approvability.total > 80 ? 'velmi dobrá' : 'přijatelná'}. Co vás zajímá nejvíc?`, 'ai');
            }
            generateAISuggestions();
            document.getElementById('chat-input')?.addEventListener('keydown', handleChatEnter);
            scrollToTarget('#content-container');
        }
    };

    const handleCookieBanner = () => {
        if (localStorage.getItem('cookieConsent') === 'true') {
            DOMElements.cookieBanner?.classList.add('hidden');
        } else {
            DOMElements.cookieBanner?.classList.remove('hidden');
        }
        DOMElements.cookieAcceptBtn?.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'true');
            DOMElements.cookieBanner?.classList.add('hidden');
        });
    };

    const init = () => {
        document.body.addEventListener('click', handleClick);
        DOMElements.contentContainer.addEventListener('input', handleInput);
        if (DOMElements.leadForm) DOMElements.leadForm.addEventListener('submit', handleFormSubmit);

        DOMElements.mobileMenuButton?.addEventListener('click', () => {
            DOMElements.mobileMenu?.classList.toggle('hidden');
        });

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (state.mode === 'ai') {
                    DOMElements.contentContainer.innerHTML = getAiLayout();
                    const sidebarContainer = document.getElementById('sidebar-container');
                    if(sidebarContainer) sidebarContainer.innerHTML = getSidebarHTML();
                }
            }, 250);
        });

        handleCookieBanner();
        switchMode(state.mode);
    };

    init();
});
