'use strict';

document.addEventListener('DOMContentLoaded', () => {

// ========================================
// QUICK RESPONSE SYSTEM V4.0
// Okamžité odpovědi na časté otázky
// ========================================

const QUICK_RESPONSES = {
    'dokumenty|potřebuji|doklady|podklady': {
        response: `<strong>📋 Kompletní seznam dokumentů pro hypotéku:</strong>

<strong>ZÁKLADNÍ DOKUMENTY (vždy potřeba):</strong>
• Občanský průkaz všech žadatelů
• Potvrzení o příjmu (formulář banky)
• Výpisy z účtů za poslední 3 měsíce
• Výpis z katastru nemovitostí (kupovaná nemovitost)
• Rezervační či kupní smlouva

<strong>PRO ZAMĚSTNANCE:</strong>
• Poslední 3 výplatní pásky
• Pracovní smlouva
• Potvrzení od zaměstnavatele

<strong>PRO OSVČ (navíc):</strong>
• Daňová přiznání za 2 roky + přílohy
• Potvrzení o bezdlužnosti (ZP, SP)
• Výpis z živnostenského rejstříku
• Faktury a účetnictví

<strong>DALŠÍ DOKUMENTY:</strong>
• Znalecký posudek (zajistí banka, 5-8k Kč)
• Pojistná smlouva nemovitosti
• Energetický štítek budovy

💡 <strong>TIP:</strong> Začněte sbírat dokumenty už teď - šetří to týdny! Náš specialista vás provede procesem krok za krokem.`,
        instant: true
    },
    
    'kolik.*půjčit|maximální.*úvěr|jakou.*částku|kolik.*dostan': {
        response: `<strong>💰 Kolik si můžete půjčit - Rychlý výpočet:</strong>

<strong>ZÁKLADNÍ VZOREC:</strong>
Max. hypotéka = <em>Čistý měsíční příjem × 9</em>

<strong>PŘÍKLADY:</strong>
• Příjem 30 000 Kč → max. ~2 700 000 Kč
• Příjem 50 000 Kč → max. ~4 500 000 Kč
• Příjem 80 000 Kč → max. ~7 200 000 Kč

<strong>CO TO OVLIVŇUJE:</strong>
• ⚠️ Jiné splátky (snižují max. částku)
• ⚠️ Počet dětí (vyšší životní minimum)
• ⚠️ Typ zaměstnání (OSVČ mají koef. 7-8×)
• ✅ Spolužadatel (přičte se příjem)

<strong>🎯 PRO PŘESNÝ VÝPOČET:</strong>
Použijte naši kalkulačku výše - za 30 sekund víte přesně kolik a od které banky!`,
        instant: true
    },
    
    'osvč|podnikatel|živnost|podnikám': {
        response: `<strong>🏢 Hypotéka pro OSVČ - Kompletní průvodce:</strong>

<strong>PODMÍNKY:</strong>
• Min. 2 roky podnikání
• 2 daňová přiznání s kladným výsledkem
• Stabilní příjmy

<strong>JAK BANKA POČÍTÁ PŘÍJEM:</strong>
• Průměr čistého zisku za 2 roky
• Některé odečítají odpisy
• Koeficient 7-8× (vs. 9× u zaměstnanců)

<strong>VÝHODY:</strong>
✅ Můžete odečíst úroky z daní
✅ Některé banky akceptují 1 rok historie

<strong>NEVÝHODY:</strong>
❌ Nižší maximální částka
❌ O 0.1-0.3% vyšší úrok
❌ Více dokumentů

<strong>TOP BANKY PRO OSVČ:</strong>
1. Raiffeisenbank - nejlépe hodnotí OSVČ
2. Česká spořitelna - akceptuje kratší historii  
3. ČSOB - férový přístup

💡 <strong>STRATEGIE:</strong> Optimalizujte daňové přiznání (ne moc nízký zisk!) a zvažte spolužadatele se zaměstnaneckým příjmem.`,
        instant: true
    }
};

const responseCache = new Map();

const findQuickResponse = (message) => {
    const lowercaseMessage = message.toLowerCase();
    for (const [pattern, response] of Object.entries(QUICK_RESPONSES)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(lowercaseMessage)) {
            return response;
        }
    }
    return null;
};

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
        sidebarMinimized: true, // NOVÉ - defaultně minimalizovaný
        activeUsers: Math.floor(Math.random() * 30) + 120,
        formData: {
            propertyValue: 5000000, loanAmount: 4000000,
            income: 50000, liabilities: 0, age: 35, children: 0,
            loanTerm: 25, fixation: 3,
            purpose: 'koupě', propertyType: 'byt', landValue: 0, reconstructionValue: 0,
            employment: 'zaměstnanec', education: 'středoškolské'
        },
        calculation: { offers: [], selectedOffer: null, approvability: { total: 0 }, smartTip: null, tips: [], fixationDetails: null, isFromOurCalculator: false },
        chart: null,
    };

    // Simulace aktivních uživatelů
    const updateActiveUsers = () => {
        const hour = new Date().getHours();
        let baseUsers = 120;
        
        if (hour >= 8 && hour <= 18) {
            baseUsers = 140;
        } else if (hour >= 19 && hour <= 22) {
            baseUsers = 130;
        } else if (hour >= 6 && hour <= 7) {
            baseUsers = 125;
        }
        
        state.activeUsers = baseUsers + Math.floor(Math.random() * 10) - 5;
        
        const footerCounter = document.getElementById('active-users-counter');
        if (footerCounter) {
            footerCounter.textContent = `${state.activeUsers} lidí právě používá naše nástroje`;
        }
    };

    setInterval(updateActiveUsers, 30000);

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
    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // --- COMPONENT FACTORIES ---
    const createSlider = (id, label, value, min, max, step, containerClass = '') => {
        const suffix = (id.includes('Term') || id.includes('age') || id.includes('children') || id.includes('fixation')) ? ' let' : ' Kč';
        const isMobileDevice = isMobile();
        return `<div class="${containerClass}" id="${id}-group" style="width: 100%; position: relative; z-index: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; gap: 0.5rem;">
                <label for="${id}" class="form-label" style="margin: 0; flex-shrink: 0; font-size: ${isMobileDevice ? '0.875rem' : '0.9375rem'};">${label}</label>
                <div style="display: flex; align-items: center; gap: 0.25rem; position: relative; z-index: 2;">
                    <input type="text" id="${id}-input" value="${formatNumber(value, false)}" 
                           class="slider-value-input" 
                           style="max-width: ${isMobileDevice ? '100px' : '140px'}; font-size: ${isMobileDevice ? '0.9375rem' : '1rem'}; position: relative; z-index: 2;">
                    <span style="font-weight: 600; color: #6b7280; font-size: ${isMobileDevice ? '0.875rem' : '0.9375rem'}; flex-shrink: 0;">${suffix}</span>
                </div>
            </div>
            <div class="slider-container" style="padding: 0.5rem 0; position: relative; z-index: 1;">
                <input type="range" id="${id}" name="${id}" min="${min}" max="${max}" value="${value}" step="${step}" class="slider-input" style="position: relative; z-index: 1;">
            </div>
        </div>`;
    };
    
    const createSelect = (id, label, options, selectedValue, containerClass = '') => {
        const optionsHTML = Object.entries(options).map(([key, val]) => 
            `<option value="${key}" ${key === selectedValue ? 'selected' : ''}>${val}</option>`
        ).join('');
        return `<div class="${containerClass}" style="width: 100%;">
            <label for="${id}" class="form-label" style="font-size: ${isMobile() ? '0.875rem' : '0.9375rem'};">${label}</label>
            <select id="${id}" name="${id}" class="modern-select" style="font-size: ${isMobile() ? '1rem' : '0.9375rem'};">${optionsHTML}</select>
        </div>`;
    };
    
    // --- DYNAMIC CONTENT & LAYOUTS ---
    const getCalculatorLayout = (formHTML) => 
        `<div class="bg-white p-4 md:p-6 lg:p-12 rounded-2xl shadow-xl border">${formHTML}</div>`;
    
    // ========================================
    // PLOVOUCÍ SIDEBAR IMPLEMENTATION
    // ========================================
    
    const getAiLayout = () => {
        const isMobileDevice = isMobile() || window.innerWidth < 1024;
        
        return `
            <div style="position: relative; width: 100%;">
                <!-- CHAT AREA - celá šířka -->
                <div id="ai-chat-wrapper" style="position: relative; width: 100%; min-height: ${isMobileDevice ? 'calc(100vh - 200px)' : 'calc(100vh - 250px)'};">
                    <!-- Chat container -->
                    <div class="bg-white rounded-2xl shadow-xl border" style="height: 100%; display: flex; flex-direction: column;">
                        <!-- Header -->
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-t-2xl border-b">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <span class="text-xl sm:text-2xl mr-2">🤖</span>
                                    <div>
                                        <h3 class="font-bold text-sm sm:text-base text-gray-800">AI Hypoteční stratég</h3>
                                        <p class="text-xs text-gray-600">Analýza dat z 19+ bank • Odpovědi do 3 sekund</p>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    ${!isMobileDevice ? `
                                    <button class="text-xs bg-white px-3 py-1 rounded-lg border hover:bg-gray-50"
                                            data-action="reset-chat">
                                        🔄 Nový chat
                                    </button>
                                    ` : ''}
                                    <button class="text-xs sm:text-sm bg-green-600 text-white px-2 sm:px-3 py-1 rounded-lg hover:bg-green-700"
                                            data-action="show-lead-form">
                                        📞 Specialista
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Chat messages -->
                        <div id="chat-messages" class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3" style="min-height: 400px;"></div>
                        
                        <!-- AI suggestions -->
                        <div id="ai-suggestions" class="px-3 sm:px-4 py-2 border-t bg-gray-50"></div>
                        
                        <!-- PERMANENT INPUT AREA -->
                        <div id="chat-input-footer" class="p-3 sm:p-4 border-t bg-white rounded-b-2xl">
                            <!-- Input bude přidán pomocí JavaScript -->
                        </div>
                    </div>
                </div>
            </div>`;
    };
    
    // NOVÁ FUNKCE - Vytvoření permanentního inputu
    const createPermanentChatInput = () => {
        const footer = document.getElementById('chat-input-footer');
        if (!footer) return;
        
        // Zkontrolovat, jestli už input neexistuje
        if (footer.querySelector('#permanent-chat-input')) return;
        
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; width: 100%;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'permanent-chat-input';
        input.placeholder = 'Napište dotaz k hypotéce...';
        input.style.cssText = `
            flex: 1;
            padding: 10px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 16px;
            background: white;
            box-sizing: border-box;
            -webkit-appearance: none;
            appearance: none;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            position: relative !important;
            z-index: 9999 !important;
        `;
        
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'permanent-chat-send';
        button.innerHTML = '→';
        button.style.cssText = `
            padding: 10px 16px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            white-space: nowrap;
        `;
        
        // Event handlery
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatMessageSend(input.value.trim());
                input.value = '';
            }
        });
        
        button.addEventListener('click', () => {
            const message = input.value.trim();
            if (message) {
                handleChatMessageSend(message);
                input.value = '';
            }
        });
        
        inputContainer.appendChild(input);
        inputContainer.appendChild(button);
        footer.appendChild(inputContainer);
    };
    
    // ========================================
    // PLOVOUCÍ SIDEBAR - kompaktní přehled
    // ========================================
    
    const createFloatingSidebar = () => {
        // Odstranit existující sidebar pokud je
        const existing = document.getElementById('floating-sidebar');
        if (existing) existing.remove();
        
        if (!state.calculation.selectedOffer) return;
        
        const { loanAmount, propertyValue, loanTerm, fixation } = state.formData;
        const monthlyPayment = state.calculation.selectedOffer.monthlyPayment;
        const rate = state.calculation.selectedOffer.rate;
        const quickAnalysis = state.calculation.fixationDetails?.quickAnalysis;
        
        const sidebar = document.createElement('div');
        sidebar.id = 'floating-sidebar';
        sidebar.className = state.sidebarMinimized ? 'minimized' : '';
        
        sidebar.innerHTML = `
            <!-- Toggle Button -->
            <button class="sidebar-toggle" onclick="window.toggleFloatingSidebar()" aria-label="Toggle sidebar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
            </button>
            
            <!-- Mini Preview Icons -->
            <div class="sidebar-mini-preview">
                <div class="sidebar-mini-item" onclick="window.toggleFloatingSidebar()" title="Váš plán">💼</div>
                <div class="sidebar-mini-item" onclick="window.toggleFloatingSidebar()" title="Splátka">💰</div>
                <div class="sidebar-mini-item" onclick="window.toggleFloatingSidebar()" title="Analýza">⚡</div>
            </div>
            
            <!-- Plný Obsah -->
            <div class="sidebar-content-wrapper">
                <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: #1f2937;">
                    💼 Váš hypoteční plán
                </h3>
                
                <!-- Základní údaje -->
                <div class="plan-summary-card">
                    <div class="plan-summary-header">📊 Základní údaje</div>
                    <div class="plan-summary-row">
                        <span class="plan-summary-label">Úvěr:</span>
                        <span class="plan-summary-value">${formatNumber(loanAmount)}</span>
                    </div>
                    <div class="plan-summary-row">
                        <span class="plan-summary-label">Nemovitost:</span>
                        <span class="plan-summary-value">${formatNumber(propertyValue)}</span>
                    </div>
                    <div class="plan-summary-row">
                        <span class="plan-summary-label">Fixace:</span>
                        <span class="plan-summary-value">${fixation} let</span>
                    </div>
                    <div class="plan-summary-row">
                        <span class="plan-summary-label">Splatnost:</span>
                        <span class="plan-summary-value">${loanTerm} let</span>
                    </div>
                </div>
                
                <!-- Měsíční splátka -->
                <div class="plan-summary-card">
                    <div class="plan-summary-header">💰 Měsíční splátka</div>
                    <div class="plan-summary-highlight">${formatNumber(monthlyPayment)}</div>
                    <div style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 4px;">
                        Úrok: ${rate.toFixed(2)}% p.a.
                    </div>
                </div>
                
                ${quickAnalysis ? `
                <!-- Rychlá analýza -->
                <div class="plan-summary-card" style="background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-color: #fbbf24;">
                    <div class="plan-summary-header">⚡ Rychlá analýza</div>
                    <div class="plan-summary-row">
                        <span class="plan-summary-label">💰 Denně platíte:</span>
                        <span class="plan-summary-value">${formatNumber(quickAnalysis.dailyCost)}</span>
                    </div>
                    <div class="plan-summary-row">
                        <span class="plan-summary-label">🍕 Vs. nájmu:</span>
                        <span class="plan-summary-value">≈ ${formatNumber(quickAnalysis.equivalentRent)}</span>
                    </div>
                    <div class="plan-summary-row">
                        <span class="plan-summary-label">💡 Daňová úleva:</span>
                        <span class="plan-summary-value">± ${formatNumber(quickAnalysis.taxSavings)}/měs</span>
                    </div>
                </div>
                ` : ''}
                
                <!-- Rychlé akce -->
                <div style="margin-top: 12px;">
                    <button class="plan-action-compact" data-quick-question="Chci změnit výši úvěru">
                        <span class="plan-action-icon">💰</span>
                        <span>Změnit výši úvěru</span>
                    </button>
                    
                    <button class="plan-action-compact" data-quick-question="Chci jinou fixaci">
                        <span class="plan-action-icon">🔧</span>
                        <span>Změnit fixaci</span>
                    </button>
                    
                    <button class="plan-action-compact" data-quick-question="Udělej mi stress test">
                        <span class="plan-action-icon">🛡️</span>
                        <span>Stress testy</span>
                    </button>
                    
                    <button class="plan-action-compact" data-quick-question="Ukaž mi dlouhodobý plán">
                        <span class="plan-action-icon">📅</span>
                        <span>Dlouhodobý plán</span>
                    </button>
                </div>
                
                <button class="nav-btn" onclick="document.querySelector('[data-action=\\'show-lead-form\\']').click()" 
                        style="width: 100%; margin-top: 16px; background: linear-gradient(135deg, #10b981, #059669); font-size: 13px; padding: 10px; justify-content: center;">
                    📞 Domluvit se specialistou
                </button>
            </div>
        `;
        
        document.body.appendChild(sidebar);
        
        // Adjust chat wrapper margin
        const chatWrapper = document.getElementById('ai-chat-wrapper');
        if (chatWrapper && window.innerWidth >= 1024 && !state.sidebarMinimized) {
            chatWrapper.style.marginRight = '380px';
        }
    };
    
    // Global funkce pro toggle sidebaru
    window.toggleFloatingSidebar = () => {
        state.sidebarMinimized = !state.sidebarMinimized;
        const sidebar = document.getElementById('floating-sidebar');
        const chatWrapper = document.getElementById('ai-chat-wrapper');
        
        if (sidebar) {
            sidebar.classList.toggle('minimized');
        }
        
        if (chatWrapper && window.innerWidth >= 1024) {
            chatWrapper.style.marginRight = state.sidebarMinimized ? '0' : '380px';
        }
        
        // Uložit stav
        localStorage.setItem('sidebarMinimized', state.sidebarMinimized);
    };
    
    const getSidebarHTML = () => { 
        // Tato funkce je deprecated - používáme plovoucí sidebar
        return '';
    };
    
    const getExpressHTML = () => getCalculatorLayout(`
        <div id="express-form" class="space-y-4" style="max-width: 100%; overflow: hidden;">
            ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000)}
            ${createSlider('loanAmount','Chci si půjčit',state.formData.loanAmount,200000,20000000,100000)}
            ${createSlider('income','Měsíční čistý příjem',state.formData.income,15000,300000,1000)}
            <div class="flex justify-center" style="padding-top: 1rem;">
                <button class="nav-btn" style="width: 100%; max-width: 20rem; font-size: 1rem; padding: 0.75rem 1.5rem;" data-action="calculate">
                    <span style="margin-right: 0.5rem;">Spočítat a najít nabídky</span>
                    <div class="loading-spinner-white hidden"></div>
                </button>
            </div>
        </div>
        <div id="results-container" class="hidden" style="margin-top: 2rem;"></div>`);
    
    const getGuidedHTML = () => {
        const purposes = { 'koupě': 'Koupě', 'výstavba': 'Výstavba', 'rekonstrukce': 'Rekonstrukce', 'refinancování': 'Refinancování' };
        const propertyTypes = { 'byt': 'Byt', 'rodinný dům': 'Rodinný dům', 'pozemek': 'Pozemek' };
        const employments = { 'zaměstnanec': 'Zaměstnanec', 'osvc': 'OSVČ', 'jednatel': 'Jednatel s.r.o.'};
        const educations = { 'základní': 'Základní', 'středoškolské': 'SŠ s maturitou', 'vysokoškolské': 'VŠ' };

        return getCalculatorLayout(`<div id="guided-form" style="max-width: 100%; overflow: hidden;">
            <div style="margin-bottom: 2rem;">
                <h3 class="form-section-heading">Parametry úvěru a nemovitosti</h3>
                <div class="form-grid" style="${isMobile() ? 'display: flex; flex-direction: column; gap: 1rem;' : ''}">
                    ${createSelect('purpose', 'Účel hypotéky', purposes, state.formData.purpose)}
                    ${createSelect('propertyType', 'Typ nemovitosti', propertyTypes, state.formData.propertyType)}
                    ${createSlider('propertyValue','Hodnota nemovitosti po dokončení',state.formData.propertyValue,500000,30000000,100000, '')}
                    ${createSlider('reconstructionValue','Rozsah rekonstrukce',state.formData.reconstructionValue,0,10000000,50000, 'hidden')}
                    ${createSlider('landValue','Hodnota pozemku (u výstavby)',state.formData.landValue,0,10000000,50000, 'hidden')}
                    ${createSlider('loanAmount','Požadovaná výše úvěru',state.formData.loanAmount,200000,20000000,100000, '')}
                    <div style="${isMobile() ? 'width: 100%;' : 'grid-column: span 2;'} text-align: center; font-weight: bold; font-size: 1rem; color: #10b981;" id="ltv-display">
                        Aktuální LTV: ${Math.round((state.formData.loanAmount / state.formData.propertyValue) * 100)}%
                    </div>
                    ${createSlider('loanTerm','Délka splatnosti',state.formData.loanTerm,5,30,1)}
                    ${createSlider('fixation','Délka fixace',state.formData.fixation,3,10,1)}
                </div>
            </div>
            <div style="margin-bottom: 2rem;">
                <h3 class="form-section-heading">Vaše bonita a osobní údaje</h3>
                <div class="form-grid" style="${isMobile() ? 'display: flex; flex-direction: column; gap: 1rem;' : ''}">
                    ${createSelect('employment', 'Typ příjmu', employments, state.formData.employment)}
                    ${createSelect('education', 'Nejvyšší dosažené vzdělání', educations, state.formData.education)}
                    ${createSlider('income','Čistý měsíční příjem',state.formData.income,15000,300000,1000)}
                    ${createSlider('liabilities','Měsíční splátky jiných úvěrů',state.formData.liabilities,0,100000,500)}
                    ${createSlider('age','Věk nejstaršího žadatele',state.formData.age,18,70,1)}
                    ${createSlider('children','Počet dětí',state.formData.children,0,10,1)}
                </div>
            </div>
            <div class="flex justify-center" style="padding-top: 1rem;">
                <button class="nav-btn" style="width: 100%; max-width: 20rem; font-size: 1rem; padding: 0.75rem 1.5rem;" data-action="calculate">
                    <span style="margin-right: 0.5rem;">Spočítat a najít nabídky</span>
                    <div class="loading-spinner-white hidden" style="margin-left: 0.5rem;"></div>
                </button>
            </div>
        </div>
        <div id="results-container" class="hidden" style="margin-top: 2rem;"></div>`);
    };

    const getAdditionalTips = (approvability) => {
        const tips = [];
        
        if (approvability.ltv > 90) {
            tips.push({
                icon: "🏠",
                text: "Snižte LTV pod 90% pro lepší podmínky"
            });
        } else if (approvability.ltv > 80) {
            tips.push({
                icon: "💰",
                text: "LTV pod 80% = úspora až 0.3% na úroku"
            });
        }
        
        if (approvability.dsti < 70) {
            tips.push({
                icon: "⚠️",
                text: "Vaše DSTI je na hraně, zvažte delší splatnost"
            });
        } else if (approvability.dsti > 85) {
            tips.push({
                icon: "✅",
                text: "Výborné DSTI, máte prostor pro vyjednávání"
            });
        }
        
        if (approvability.bonita < 60) {
            tips.push({
                icon: "📈",
                text: "Zvyšte příjem nebo snižte splátky pro lepší bonitu"
            });
        }
        
        if (approvability.total >= 85) {
            tips.push({
                icon: "🎯",
                text: "Top klient! Vyjednejte si VIP podmínky"
            });
        } else if (approvability.total >= 70) {
            tips.push({
                icon: "💡",
                text: "Dobré skóre, zkuste vyjednat slevu 0.1-0.2%"
            });
        } else if (approvability.total >= 50) {
            tips.push({
                icon: "🤝",
                text: "Doporučujeme konzultaci se specialistou"
            });
        } else {
            tips.push({
                icon: "📞",
                text: "Složitější případ - volejte specialistu"
            });
        }
        
        return tips;
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
                            data-action="select-offer" data-offer="${o.id}">
                        Vybrat tuto nabídku →
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
        
        const additionalTips = getAdditionalTips(approvability);
        const quickTipsHTML = additionalTips.map(tip => `
            <div class="flex items-center bg-white p-2 rounded-lg">
                <span class="text-lg mr-2">${tip.icon}</span>
                <span class="text-xs text-gray-700">${tip.text}</span>
            </div>
        `).join('');

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
                            
                            <!-- Rychlé tipy -->
                            <div class="mt-4 space-y-2">
                                <p class="text-xs font-semibold text-gray-700">Rychlé tipy pro vás:</p>
                                ${quickTipsHTML}
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
                                <span class="text-2xl mr-2">📊</span> Informace o fixaci
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

    // UPRAVENÁ FUNKCE - Přidává zprávy pomocí appendChild, ne innerHTML
    const addChatMessage = (message, sender) => {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        if (sender !== 'ai-typing') {
            state.chatHistory.push({ text: message, sender: sender, timestamp: Date.now() });
        }
        
        const bubble = document.createElement('div');
        
        if (sender === 'ai-typing') {
            bubble.className = 'chat-bubble-ai';
            bubble.innerHTML = '<div class="loading-spinner-blue" style="margin: 0;"></div>';
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
            state.calculation = { ...state.calculation, ...(await response.json()), isFromOurCalculator: true };
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
            
            requestAnimationFrame(() => {
                if (type === 'range') {
                    const input = document.getElementById(`${baseId}-input`);
                    if(input && input !== document.activeElement) {
                        input.value = formatNumber(parsedValue, false);
                    }
                } else if (type !== 'select-one') {
                    const slider = document.getElementById(baseId);
                    if(slider && slider !== document.activeElement) {
                        slider.value = parsedValue;
                    }
                }
            });
            
            if (['loanAmount', 'propertyValue'].includes(baseId)) {
                updateLTVDisplay();
            }
            if (baseId === 'purpose') {
                handleGuidedFormLogic();
            }
        }
    };

    const handleClick = async (e) => {
        let target = e.target.closest('[data-action], .offer-card, .suggestion-btn, [data-mode], .scroll-to, [data-quick-question]');
        if (!target) return;
        
        const { action, mode, suggestion, target: targetId } = target.dataset;
        const quickQuestion = target.dataset.quickQuestion;

        if (quickQuestion) {
            const chatInput = document.getElementById('permanent-chat-input');
            if (chatInput) {
                chatInput.value = quickQuestion;
                handleChatMessageSend(quickQuestion);
                chatInput.value = '';
            }
            return;
        }

        if (targetId) {
            e.preventDefault();
            if (action === 'show-lead-form' || action === 'show-lead-form-direct') {
                DOMElements.leadFormContainer.classList.remove('hidden');
                scrollToTarget('#kontakt');
            } else {
                scrollToTarget(targetId);
            }
            if (DOMElements.mobileMenu && !DOMElements.mobileMenu.classList.contains('hidden')) {
                DOMElements.mobileMenu.classList.add('hidden');
            }
        }
        else if (mode) {
            switchMode(mode);
            setTimeout(() => {
                const targetElement = mode === 'express' ? document.getElementById('express-form') : 
                                     mode === 'guided' ? document.getElementById('guided-form') : 
                                     document.getElementById('chat-messages');
                if (targetElement) {
                    const yOffset = isMobile() ? -20 : -80;
                    const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }, 100);
        }
        else if (action === 'calculate') calculateRates(target);
        else if (action === 'go-to-calculator') {
            switchMode('express');
        }
        else if (action === 'show-lead-form') {
            DOMElements.leadFormContainer.classList.remove('hidden');
            scrollToTarget('#kontakt');
        }
        else if (action === 'select-offer') {
            const offerId = target.dataset.offer;
            const offer = state.calculation.offers.find(o => o.id === offerId);
            if (offer) {
                document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
                const card = document.querySelector(`[data-offer-id="${offerId}"]`);
                if (card) card.classList.add('selected');
                state.calculation.selectedOffer = offer;
                
                // Update plovoucí sidebar
                createFloatingSidebar();
                
                setTimeout(renderResultsChart, 0);
                const resultsSection = document.querySelector('#results-container .grid');
                if (resultsSection) {
                    const yOffset = -80;
                    const y = resultsSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }
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
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) chatMessages.innerHTML = '';
            addChatMessage('Jsem váš hypoteční poradce s AI nástroji. Jak vám mohu pomoci?', 'ai');
            generateAISuggestions();
        }
        else if (action === 'download-summary') {
            alert('Funkce bude brzy dostupná. Mezitím si můžete udělat screenshot nebo zkopírovat data.');
        }
        else if (suggestion) {
            const input = document.getElementById('permanent-chat-input');
            const message = suggestion || input?.value.trim();
            if (!message || state.isAiTyping) return;
            if (input) input.value = '';
            handleChatMessageSend(message);
        }
        else if (target.matches('.offer-card')) {
            document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
            target.classList.add('selected');
            state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === target.dataset.offerId);
            
            // Update plovoucí sidebar
            createFloatingSidebar();
            
            setTimeout(renderResultsChart, 0);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target, btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '📤 Odesílám...';
        try {
            await fetch("/", { 
                method: "POST", 
                headers: { "Content-Type": "application/x-form-urlencoded" }, 
                body: new URLSearchParams(new FormData(form)).toString() 
            });
            form.style.display = 'none';
            document.getElementById('form-success').style.display = 'block';
        } catch (error) {
            alert('Odesílání se nezdařilo. Zkuste to prosím znovu.');
            btn.disabled = false;
            btn.textContent = '📞 Odeslat nezávazně';
        }
    };
    
    const handleChatMessageSend = async (message) => {
        if (!message || message.trim() === '') return;
        
        if (state.chatFormState !== 'idle') {
            handleChatFormInput(message);
            return;
        }

        // ========================================
        // QUICK RESPONSE CHECK - NOVÉ V4.0
        // ========================================
        const quickResp = findQuickResponse(message);
        if (quickResp && quickResp.instant) {
            addChatMessage(message, 'user');
            state.isAiTyping = true;
            addChatMessage('', 'ai-typing');
            
            // Simulace "myšlení" pro lepší UX
            await new Promise(resolve => setTimeout(resolve, 800));
            
            document.getElementById('typing-indicator')?.remove();
            addChatMessage(quickResp.response, 'ai');
            state.isAiTyping = false;
            
            // Cache response
            responseCache.set(message.toLowerCase(), quickResp.response);
            
            generateAISuggestions();
            return; // Quick response handled, nepokračuj na AI
        }
        // ========================================

        const suggestionMap = {
            "📊 Rychlá analýza": "Proveď rychlou analýzu mé situace.",
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
        
        const contextToSend = {
            ...state,
            isDataFromOurCalculator: state.calculation.isFromOurCalculator,
            messageCount: state.chatHistory.filter(h => h.sender === 'user').length
        };
        
        const { chart, chatHistory, mobileSidebarOpen, sidebarMinimized, ...cleanContext } = contextToSend;
        
        const timeoutId = setTimeout(() => {
            if (state.isAiTyping) {
                document.getElementById('typing-indicator')?.remove();
                addChatMessage('Omlouvám se, zpracování trvá déle než obvykle. Zkuste to prosím znovu nebo se spojte s naším specialistou.', 'ai');
                state.isAiTyping = false;
            }
        }, 15000);
        
        try {
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ message: finalMessage, context: cleanContext }) 
            });
            clearTimeout(timeoutId);
            document.getElementById('typing-indicator')?.remove();
            
            if (!response.ok) throw new Error((await response.json()).error || 'Chyba serveru');
            const data = await response.json();

            if (data.tool === 'modelScenario') {
                state.formData = {...state.formData, ...(data.params || {})};
                addChatMessage('Rozumím, počítám scénář...', 'ai');
                const success = await calculateRates(null, true);
                if (success && state.calculation.selectedOffer) {
                    addChatMessage(`Výborně! Pro **${formatNumber(state.formData.loanAmount)}** na **${state.formData.loanTerm} let** vychází splátka **${formatNumber(state.calculation.selectedOffer.monthlyPayment)}**.`, 'ai');
                    
                    // Vytvořit plovoucí sidebar
                    createFloatingSidebar();
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
            else if (data.tool === 'showBanksList') {
                const banksList = `
                **Spolupracujeme s těmito bankami a institucemi:**
                
                **Největší banky:**
                • Česká spořitelna
                • ČSOB
                • Komerční banka
                • Raiffeisenbank
                • UniCredit Bank
                
                **Hypoteční specialisté:**
                • Hypoteční banka (ČSOB)
                • Modrá pyramida (KB)
                • ČMSS
                • Raiffeisen stavební spořitelna
                • Stavební spořitelna České spořitelny (Buřinka)
                
                **Moderní banky:**
                • MONETA Money Bank
                • mBank
                • Fio banka
                • Air Bank
                • Banka CREDITAS
                
                **Další partneři:**
                • Wüstenrot
                • TRINITY BANK
                • Sberbank
                • Hello bank!
                • Partners Banka
                
                Celkem pracujeme s **19+ institucemi**, což nám umožňuje najít nejlepší řešení pro každého klienta.`;
                
                addChatMessage(banksList, 'ai');
            }
            else {
                addChatMessage(data.response, 'ai');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            document.getElementById('typing-indicator')?.remove();
            addChatMessage(`Omlouvám se, došlo k chybě. Zkuste to prosím znovu nebo volejte přímo na 800 123 456.`, 'ai');
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
    
    // UPRAVENÁ switchMode funkce
    const switchMode = (mode, fromResults = false) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        
        // Odstranit plovoucí sidebar pokud není AI mód
        if (mode !== 'ai') {
            const existingSidebar = document.getElementById('floating-sidebar');
            if (existingSidebar) existingSidebar.remove();
            
            const chatWrapper = document.getElementById('ai-chat-wrapper');
            if (chatWrapper) chatWrapper.style.marginRight = '0';
        }
        
        if (mode === 'express') {
            DOMElements.contentContainer.innerHTML = getExpressHTML();
        }
        else if (mode === 'guided') {
            DOMElements.contentContainer.innerHTML = getGuidedHTML();
            handleGuidedFormLogic();
        }
        else if (mode === 'ai') {
            if (!fromResults) {
                state.chatHistory = [];
            }
            
            // Vytvoření základního layoutu
            DOMElements.contentContainer.innerHTML = getAiLayout();
            
            // KRITICKÉ - vytvoření permanentního inputu
            createPermanentChatInput();
            
            // Přidání úvodní zprávy
            if (!fromResults) {
                addChatMessage('Jsem váš hypoteční poradce s přístupem k datům z 19+ bank. Pomohu vám najít nejlepší řešení pro vaši situaci. Co vás zajímá?', 'ai');
            } else if (state.calculation.selectedOffer) {
                addChatMessage(`Mám vaši analýzu z naší kalkulačky. Splátka **${formatNumber(state.calculation.selectedOffer.monthlyPayment)}** při sazbě **${state.calculation.selectedOffer.rate.toFixed(2)}%** je ${state.calculation.approvability.total > 80 ? 'velmi dobrá nabídka' : 'solidní nabídka'}. Co vás zajímá nejvíc?`, 'ai');
            }
            
            // Obnovení historie zpráv pokud existuje
            if (fromResults && state.chatHistory.length > 0) {
                const container = document.getElementById('chat-messages');
                if (container) {
                    container.innerHTML = '';
                    state.chatHistory.forEach(msg => {
                        const bubble = document.createElement('div');
                        bubble.className = msg.sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user';
                        let processedMessage = msg.text
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br>');
                        bubble.innerHTML = processedMessage;
                        container.appendChild(bubble);
                    });
                }
            }
            
            generateAISuggestions();
            
            // Vytvořit plovoucí sidebar pokud jsou data
            if (state.calculation.selectedOffer) {
                createFloatingSidebar();
            }
            
            if (!fromResults || state.mode === 'ai') {
                scrollToTarget('#content-container');
            }
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
        
        DOMElements.contentContainer.addEventListener('input', (e) => {
            if (e.target.matches('input[type="range"], input[type="text"], select')) {
                handleInput(e);
            }
        });
        
        if (DOMElements.leadForm) DOMElements.leadForm.addEventListener('submit', handleFormSubmit);

        DOMElements.mobileMenuButton?.addEventListener('click', () => {
            DOMElements.mobileMenu?.classList.toggle('hidden');
        });

        // Resize handler
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (state.mode === 'ai' && state.calculation.selectedOffer) {
                    createFloatingSidebar();
                }
            }, 250);
        });

        // Restore sidebar stav
        const savedState = localStorage.getItem('sidebarMinimized');
        if (savedState !== null) {
            state.sidebarMinimized = savedState === 'true';
        }

        handleCookieBanner();
        switchMode(state.mode);
        updateActiveUsers();
    };

    init();
});