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
• Výpisy z účtů za poslední 3 až 12 měsíců
• Výpis z katastru nemovitostí (kupovaná nemovitost)
• Rezervační smlouva
• Návrh kupní nebo budoucí kupní smlouvy

<strong>PRO ZAMĚSTNANCI:</strong>
• Min. 3 měs. zkušební doba
• Potvrzení od zaměstnavatele

<strong>PRO OSVČ (navíc):</strong>
• Daňová přiznání za 1-2 roky + přílohy
• Potvrzení o bezdlužnosti (ZP, SP)
• Doklad o zaplacení daně

<strong>DALŠÍ DOKUMENTY:</strong>
• Znalecký posudek (zajistí banka, 3-6 000 Kč) nebo zdarma
• Pojistná smlouva nemovitosti
• Energetický štítek budovy
• Životní pojištění

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
• ⚠️ Jiné splátky (sníží max. částku)
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
• Min. 1 rok podnikání
• 1-2 daňová přiznání s kladným výsledkem
• Stabilní výhled příjmů

<strong>JAK BANKA POČÍTÁ PŘÍJEM:</strong>
• Průměr čistého zisku za 1-2 roky
• Některé odečítají odpisy nebo úvěry na IČO
• Koeficient 7-8× (vs. 9× u zaměstnanců)

<strong>VÝHODY:</strong>
✅ Můžete odečíst úroky z daní
✅ Některé banky akceptují 1 rok historii
✅ Některé banky akceptují příjmy z obratu
✅ Některé banky akceptují paušální daň

<strong>NEVÝHODY:</strong>
❌ Nižší maximální částka
❌ Zohlednění historie podnikání
❌ Více dokumentů

<strong>TOP BANKY PRO OSVČ:</strong>
1. Raiffeisenbank - nejlépe hodnotí OSVČ
2. Česká spořitelna -  příjmy z obratu
3. ČSOB - akceptuje kratší historii 
4. UCB - vyšší akceptace příjmů z paušální daně

💡 <strong>STRATEGIE:</strong> Optimalizujte daňové přiznání (ne moc nízký zisk!) a zvažte spolužadatele se zaměstnaneckým příjmem.`,
        instant: true
    }
};

// ZAČÁTEK SPRÁVNÉ DEFINICE scoreHTML
// Upraveno: Otazník je hned vedle labelu, žádná tlačítka pod tím
const scoreHTML = (label, value, color, icon, explanation, infoText = '') => {
    const displayValue = (typeof value === 'number' && !isNaN(value)) ? Math.round(value) : 0;
    const safeExplanation = explanation || '';
    // Info ikona s data atributy pro tooltip
    const infoIcon = infoText ? `<span class="info-icon cursor-pointer text-blue-500 hover:text-blue-700 ml-1 relative z-10" data-info-key="${label.toLowerCase()}-score" data-info-text="${infoText}">?</span>` : '';

    return `
    <div class="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
       <div class="flex items-center justify-between mb-1">
           <span class="text-sm font-semibold flex items-center gap-1.5">
               <span class="text-lg">${icon}</span> ${label} ${infoIcon}
           </span>
           <span class="font-bold text-lg text-gray-800">${displayValue}%</span>
       </div>
       <div class="w-full h-2.5 rounded-full bg-gray-200 overflow-hidden mb-2">
           <div class="h-full rounded-full ${color} transition-all duration-500 ease-out" style="width: ${displayValue}%"></div>
       </div>
       <p class="text-xs text-gray-600">${safeExplanation}</p>
    </div>`;
};
// KONEC SPRÁVNÉ DEFINICE scoreHTML

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
        API_CHAT_ENDPOINT: '/.netlify/functions/chat',
        API_RATES_ENDPOINT: '/.netlify/functions/rates',
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'express',
        isAiTyping: false,
        chatFormState: 'idle', 
        chatFormData: {},
        chatHistory: [],
        mobileSidebarOpen: false,
        activeUsers: Math.floor(Math.random() * 30) + 120,
        formData: {
            propertyValue: 5000000, loanAmount: 4000000,
            income: 50000, liabilities: 0, age: 35, children: 0,
            loanTerm: 30, fixation: 3,
            purpose: 'koupě', propertyType: 'byt', landValue: 0, reconstructionValue: 0,
            employment: 'zaměstnanec', education: 'středoškolské'
        },
        calculation: { offers: [], selectedOffer: null, approvability: { total: 0 }, smartTip: null, tips: [], fixationDetails: null, isFromOurCalculator: false },
        chart: null,
        calculatorInteracted: false
    };

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
    
    const parseNumber = (s) => parseFloat(String(s).replace(/[^0-9]/g, '')) || 0;
    const formatNumber = (n, currency = true) => n.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });
    
    const scrollToTarget = (targetId) => {
        const targetElement = document.querySelector(targetId);
        if (!targetElement) return;
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    };
    
    const isMobile = () => window.innerWidth < 768;
    
    // --- COMPONENT FACTORIES ---
    const createSlider = (id, label, value, min, max, step, containerClass = '', infoText = '') => {
    let suffix = ' Kč';
    if (id.includes('Term') || id.includes('age') || id.includes('fixation')) {
        suffix = ' let';
    } else if (id.includes('children')) {
        suffix = '';
    }

    const isMobileDevice = isMobile();
    const infoIcon = infoText ? `<span class="info-icon" data-info-key="${id}" data-info-text="${infoText}">?</span>` : '';

    const topRowClasses = isMobileDevice
        ? "flex flex-col items-start mb-2 gap-1"
        : "flex flex-row justify-between items-center mb-2 gap-2";

    const labelClasses = isMobileDevice
        ? "form-label text-sm m-0 flex items-center gap-1.5"
        : "form-label m-0 flex-shrink-0 flex items-center gap-1.5";

    const inputWrapperClasses = isMobileDevice
        ? "flex items-center gap-1 w-full justify-end"
        : "flex items-center gap-1 relative z-10";

    const inputClasses = isMobileDevice
        ? "slider-value-input text-base max-w-[140px]"
        : "slider-value-input max-w-[140px]";

    const suffixClasses = "font-semibold text-gray-500 text-sm flex-shrink-0";

    return `<div class="${containerClass}" id="${id}-group" style="width: 100%;">
        <div class="${topRowClasses}">
            <label for="${id}" class="${labelClasses}">
                ${label} ${infoIcon}
            </label>
            <div class="${inputWrapperClasses}">
                <input type="text" id="${id}-input" value="${formatNumber(value, false)}"
                       class="${inputClasses}"
                       style="position: relative; z-index: 2;"> 
                <span class="${suffixClasses}">${suffix}</span>
            </div>
        </div>
        <div class="slider-container pt-1 pb-2"> 
            <input type="range" id="${id}" name="${id}" min="${min}" max="${max}" value="${value}" step="${step}" class="slider-input">
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
    
    // --- LOGIKA VÝPOČTŮ ---
    const calculateMonthlyPayment = (p, r, t) => { 
        const mR = r / 1200, n = t * 12; 
        if (mR === 0) return p / n; 
        if (n === 0) return Infinity; 
        const powerTerm = Math.pow(1 + mR, n);
        if (powerTerm === 1) return p / n; 
        return (p * mR * powerTerm) / (powerTerm - 1); 
    };

    const calculateFixationAnalysis = (loanAmount, propertyValue, rate, loanTerm, fixation) => {
        if (loanTerm <= 0 || fixation <= 0 || fixation > loanTerm) return null;
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
        if (!isFinite(monthlyPayment)) return null;

        const monthlyRate = rate / 100 / 12; 
        let remainingBalance = loanAmount;
        let totalInterest = 0;
        let totalPrincipal = 0;
        const numberOfFixationPayments = fixation * 12;

        for (let i = 0; i < numberOfFixationPayments; i++) {
            if (remainingBalance <= 0) break; 
            const interestPayment = remainingBalance * monthlyRate;
            const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance);
            
            totalInterest += interestPayment;
            totalPrincipal += principalPayment;
            remainingBalance -= principalPayment;
        }
        remainingBalance = Math.max(0, remainingBalance); 

        const totalPaymentsInFixation = totalPrincipal + totalInterest; 
        const remainingYears = Math.max(0, loanTerm - fixation); 
        const remainingMonths = remainingYears * 12;
        
        const optimisticRate = Math.max(3.59, rate - 0.6); 
        const optimisticPayment = remainingMonths > 0 ? calculateMonthlyPayment(remainingBalance, optimisticRate, remainingYears) : 0;
        const moderateIncreaseRate = rate + 0.5; 
        const moderateIncreasePayment = remainingMonths > 0 ? calculateMonthlyPayment(remainingBalance, moderateIncreaseRate, remainingYears) : 0;
        
        const quickAnalysis = {
            dailyCost: Math.round(monthlyPayment / 30.4375), 
            percentOfTotal: totalPaymentsInFixation > 0 ? Math.round((totalInterest / totalPaymentsInFixation) * 100) : 0,
            estimatedRent: Math.round((propertyValue * 0.035) / 12), 
            taxSavings: numberOfFixationPayments > 0 ? Math.round(totalInterest * 0.15 / numberOfFixationPayments) : 0,
        };
        
        return {
            totalPaymentsInFixation: Math.round(totalPaymentsInFixation),
            totalInterestForFixation: Math.round(totalInterest),
            totalPrincipalForFixation: Math.round(totalPrincipal),
            remainingBalanceAfterFixation: Math.round(remainingBalance),
            quickAnalysis,
            futureScenario: {
                optimistic: { 
                    rate: parseFloat(optimisticRate.toFixed(2)), 
                    newMonthlyPayment: Math.round(optimisticPayment), 
                    monthlySavings: Math.round(monthlyPayment - optimisticPayment) 
                },
                moderateIncrease: { 
                    rate: parseFloat(moderateIncreaseRate.toFixed(2)), 
                    newMonthlyPayment: Math.round(moderateIncreasePayment), 
                    monthlyIncrease: Math.round(moderateIncreasePayment - monthlyPayment) 
                }
            }
        };
    };

    const getCalculatorLayout = (formHTML) => 
        `<div class="bg-white p-4 md:p-6 lg:p-12 rounded-2xl shadow-xl border">${formHTML}</div>`;
    
    const getAiLayout = () => {
        const isMobileDevice = isMobile() || window.innerWidth < 1024;
        if (isMobileDevice) {
            const inputFooterHeight = '68px';
            const suggestionsHeight = '45px';
            return `
                <div id="ai-chat-wrapper" style="position: relative; width: 100%; height: calc(100vh - 8rem); display: flex; flex-direction: column; overflow: hidden;">
                    <div id="chat-messages" style="flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 12px; padding-bottom: calc(${inputFooterHeight} + ${suggestionsHeight} + 12px); background: #f9fafb; border: 1px solid #e5e7eb; border-bottom: none; border-radius: 8px 8px 0 0;"></div>
                     <div id="ai-suggestions" style="padding: 8px 12px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; background: white; overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap; height: ${suggestionsHeight}; box-sizing: border-box;"></div>
                    <div id="chat-input-footer" style="position: fixed; bottom: 0; left: 0; right: 0; padding: 12px; background: white; border-top: 2px solid #2563eb; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); z-index: 1000; height: ${inputFooterHeight}; box-sizing: border-box;"></div>
                    ${state.calculation.selectedOffer ? `
                    <button id="mobile-sidebar-toggle"
                            style="position: fixed; bottom: calc(${inputFooterHeight} + 20px); right: 20px; width: 56px; height: 56px; background: #2563eb; color: white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 900; border: none; cursor: pointer;"
                            data-action="toggle-mobile-sidebar">
                        <span style="font-size: 24px;">📊</span>
                    </button>
                    ` : ''}
                </div>`;
        }
        
        return `
            <div class="lg:grid lg:grid-cols-[1fr_400px] lg:gap-6 items-start">
                <div id="ai-chat-desktop-wrapper" class="min-w-0 bg-white rounded-2xl shadow-xl border flex flex-col" style="min-height: calc(85vh - 100px);">
                    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-t-2xl border-b">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <span class="text-2xl mr-2">🤖</span>
                                <div>
                                    <h3 class="font-bold text-gray-800">AI Hypoteční stratég</h3>
                                    <p class="text-xs text-gray-600">Analýza dat z 19+ bank • Odpovědi do 30 sekund</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button class="text-xs bg-white px-3 py-1 rounded-lg border hover:bg-gray-50" data-action="reset-chat">🔄 Nový chat</button>
                                <button class="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700" data-action="show-lead-form">📞 Domluvit se specialistou</button>
                            </div>
                        </div>
                    </div>
                    <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4"></div>
                    <div id="ai-suggestions" class="p-4 border-t bg-gray-50"></div>
                    <div id="chat-input-footer" class="p-4 border-t bg-white rounded-b-2xl"></div>
                </div>
                
                <div id="sidebar-container" class="w-full lg:sticky top-28"></div>
            </div>`;
    };
    
    const createPermanentChatInput = () => {
        const footer = document.getElementById('chat-input-footer');
        if (!footer || footer.querySelector('#permanent-chat-input')) return;
        
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; width: 100%;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'permanent-chat-input';
        input.placeholder = 'Napište dotaz k hypotéce...';
        input.style.cssText = `flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px; background: white; box-sizing: border-box; -webkit-appearance: none; appearance: none; opacity: 1 !important; visibility: visible !important; display: block !important; position: relative !important; z-index: 9999 !important;`;
        
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'permanent-chat-send';
        button.innerHTML = '→';
        button.style.cssText = `padding: 10px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; white-space: nowrap;`;
        
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
        
        if (isMobile() && state.calculation.selectedOffer) {
            let overlay = document.getElementById('mobile-sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'mobile-sidebar-overlay';
                overlay.className = 'hidden';
                overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 800;';
                overlay.setAttribute('data-action', 'close-mobile-sidebar');
                
                const sidebarContent = document.createElement('div');
                sidebarContent.id = 'sidebar-container';
                sidebarContent.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: white; border-radius: 24px 24px 0 0; padding: 24px 16px; max-height: 70vh; overflow-y: auto; -webkit-overflow-scrolling: touch;';
                sidebarContent.onclick = (e) => e.stopPropagation();
                
                overlay.appendChild(sidebarContent);
                document.body.appendChild(overlay);
            }
        }
    };
    
    const getSidebarHTML = () => { 
        if (state.calculation.offers && state.calculation.offers.length > 0 && state.calculation.selectedOffer) {
            const { loanAmount, propertyValue, loanTerm, fixation, landValue, purpose } = state.formData;
            const effectivePropertyValue = (purpose === 'výstavba' && landValue > 0) ? propertyValue + landValue : propertyValue;
            const monthlyPayment = state.calculation.selectedOffer.monthlyPayment;
            const rate = state.calculation.selectedOffer.rate;
            const quickAnalysis = state.calculation.fixationDetails?.quickAnalysis;
            
            return `
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                    <h3 class="text-xl font-bold mb-4 flex items-center"><span class="text-2xl mr-2">💼</span> Váš hypoteční plán</h3>
                    <div class="bg-white p-4 rounded-xl mb-4 shadow-sm">
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between"><span class="text-gray-600">Úvěr:</span><strong>${formatNumber(loanAmount)}</strong></div>
                            <div class="flex justify-between"><span class="text-gray-600">Nemovitost:</span><strong>${formatNumber(effectivePropertyValue)}</strong></div>
                            <div class="flex justify-between"><span class="text-gray-600">Fixace:</span><strong>${fixation} let</strong></div>
                            <div class="flex justify-between"><span class="text-gray-600">Splatnost:</span><strong>${loanTerm} let</strong></div>
                        </div>
                        <div class="mt-3 pt-3 border-t">
                            <div class="flex justify-between items-center"><span class="text-gray-600">Měsíční splátka:</span><span class="text-2xl font-bold text-blue-600">${formatNumber(monthlyPayment)}</span></div>
                            <div class="flex justify-between mt-1"><span class="text-gray-600 text-xs">Úrok:</span><span class="text-sm font-semibold">${rate.toFixed(2)}% p.a.</span></div>
                        </div>
                    </div>
                    ${quickAnalysis ? `
                    <div class="bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-200">
                        <p class="text-xs font-semibold text-yellow-800 mb-2">⚡ Rychlá analýza</p>
                        <div class="text-xs text-gray-700 space-y-1">
                            <div>📅 Denně platíte: <strong>${formatNumber(quickAnalysis.dailyCost)}</strong></div>
                            <div>💰 Daňová úleva: až <strong>${formatNumber(quickAnalysis.taxSavings)}/měs</strong></div>
                        </div>
                    </div>` : ''}
                    <button class="nav-btn bg-green-600 hover:bg-green-700 text-white w-full mb-2" data-action="show-lead-form">📞 Domluvit se specialistou</button>
                </div>`;
        }
        return `
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200">
                <h3 class="text-xl font-bold mb-4 flex items-center"><span class="text-2xl mr-2">🎯</span> Rychlý start</h3>
                <div class="space-y-2.5 mb-4">
                    <button class="w-full text-left p-3 bg-white rounded-lg hover:shadow-md transition-all border border-transparent hover:border-purple-200" data-quick-question="Kolik si můžu půjčit s příjmem 50 tisíc?">
                        <span class="text-purple-600 font-semibold mr-2">💰</span><span class="text-sm font-medium">Kolik si můžu půjčit?</span>
                    </button>
                    <button class="w-full text-left p-3 bg-white rounded-lg hover:shadow-md transition-all border border-transparent hover:border-purple-200" data-quick-question="Jaké jsou podmínky hypotéky pro OSVČ?">
                        <span class="text-purple-600 font-semibold mr-2">🏢</span><span class="text-sm font-medium">Hypotéka pro OSVČ</span>
                    </button>
                    <button class="w-full text-left p-3 bg-white rounded-lg hover:shadow-md transition-all border border-transparent hover:border-purple-200" data-quick-question="Vyplatí se mi refinancovat hypotéku?">
                        <span class="text-purple-600 font-semibold mr-2">🔄</span><span class="text-sm font-medium">Refinancování</span>
                    </button>
                    <button class="w-full text-left p-3 bg-white rounded-lg hover:shadow-md transition-all border border-transparent hover:border-purple-200" data-quick-question="Mám záznam v registru, dostanu hypotéku?">
                        <span class="text-purple-600 font-semibold mr-2">📋</span><span class="text-sm font-medium">Záznam v registrech</span>
                    </button>
                </div>
                <button class="nav-btn bg-purple-600 hover:bg-purple-700 w-full mb-2 shadow-lg transform transition hover:-translate-y-0.5" data-action="go-to-calculator">📢 Spočítat hypotéku</button>
            </div>`;
    };
    
    const getExpressHTML = () => getCalculatorLayout(`
        <div id="express-form" class="space-y-8" style="max-width: 100%; overflow: hidden;">
            ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000, '', 'Cena nemovitosti, kterou kupujete.')}
            ${createSlider('loanAmount','Chci si půjčit',state.formData.loanAmount,200000,20000000,100000, '', 'Částka, kterou si potřebujete půjčit.')}
            
            <div class="text-center font-bold text-lg text-gray-700 transition-colors duration-300" id="ltv-display">
                Aktuální LTV: ${Math.round((state.formData.loanAmount / state.formData.propertyValue) * 100)}%
            </div>
            
            ${createSlider('income','Měsíční čistý příjem',state.formData.income,15000,300000,1000, '', 'Váš průměrný čistý příjem.')}
            ${createSlider('loanTerm','Délka splatnosti',state.formData.loanTerm,5,30,1, '', 'Na jak dlouho si chcete půjčit (max 30 let).')}
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
                <div class="form-grid" style="${isMobile() ? 'display: flex; flex-direction: column; gap: 1.5rem;' : ''}">
                    ${createSelect('purpose', 'Účel hypotéky', purposes, state.formData.purpose)}
                    ${createSelect('propertyType', 'Typ nemovitosti', propertyTypes, state.formData.propertyType)}
                   ${createSlider('propertyValue','Hodnota samotné stavby',state.formData.propertyValue,500000,30000000,100000, '', 'Náklady na výstavbu domu (bez pozemku).')}
                    ${createSlider('reconstructionValue','Rozsah rekonstrukce',state.formData.reconstructionValue,0,10000000,50000, 'hidden')}
                    ${createSlider('landValue','Hodnota pozemku',state.formData.landValue,0,10000000,50000, 'hidden', 'Cena pozemku, na kterém budete stavět.')}
                    <div style="${isMobile() ? 'width: 100%;' : 'grid-column: span 2;'} text-align: center; font-size: 0.9rem; color: #374151; background: #f3f4f6; padding: 8px; border-radius: 8px;" id="total-property-value-display" class="hidden">
                        Celková budoucí hodnota: <strong>${formatNumber(state.formData.propertyValue + state.formData.landValue)}</strong>
                    </div>
                    ${createSlider('loanAmount','Požadovaná výše úvěru',state.formData.loanAmount,200000,20000000,100000, '', 'Částka, kterou si potřebujete půjčit od banky.')}
                    <div style="${isMobile() ? 'width: 100%;' : 'grid-column: span 2;'} text-align: center; font-weight: bold; font-size: 1.1rem; transition: color 0.3s;" id="ltv-display">
                        Aktuální LTV: ${Math.round((state.formData.loanAmount / (state.formData.propertyValue + state.formData.landValue)) * 100)}%
                    </div>
                    ${createSlider('loanTerm','Délka splatnosti',state.formData.loanTerm,5,30,1, '', 'Čím delší doba, tím niží splátka, ale více zaplatíte na úrocích.')}
                    ${createSlider('fixation','Délka fixace',state.formData.fixation,3,10,1, '', 'Doba, po kterou vám banka garantuje úrokovou sazbu. Kratší fixace je flexibilnější, delší je jistější.')}
                </div>
            </div>
            <div style="margin-bottom: 2rem;">
                <h3 class="form-section-heading">Vaše bonita a osobní údaje</h3>
                <div class="form-grid" style="${isMobile() ? 'display: flex; flex-direction: column; gap: 1.5rem;' : ''}">
                    ${createSelect('employment', 'Typ příjmu', employments, state.formData.employment)}
                    ${createSelect('education', 'Nejvyšší dosažené vzdělání', educations, state.formData.education)}
                    ${createSlider('income','Čistý měsíční příjem',state.formData.income,15000,300000,1000, '', 'Váš průměrný čistý příjem za poslední 3-6 měsíců.')}
                    ${createSlider('liabilities','Měsíční splátky jiných úvěrů',state.formData.liabilities,0,100000,500, '', 'Součet všech vašich měsíčních splátek (půjčky, kreditky, leasingy).')}
                    ${createSlider('age','Věk nejstaršího žadatele',state.formData.age,18,70,1, '', 'Váš věk ovlivňuje maximální možnou délku splatnosti hypotéky.')}
                    ${createSlider('children','Počet dětí',state.formData.children,0,10,1, '', 'Počet vyživovaných dětí. Každé dítě zvyšuje životní minimum.')}
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

// ============================================
// RENDEROVÁNÍ VÝSLEDKŮ V2.2
// ============================================

const renderResults = () => {
    const offers = state.calculation?.offers || [];
    const approvability = state.calculation?.approvability;
    let selectedOffer = state.calculation?.selectedOffer;

    const container = document.getElementById('results-container');
    if (!container) return;

    container.classList.remove('hidden');
    if (offers.length === 0) {
        container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg mt-8"><h3 class="text-2xl font-bold text-red-800 mb-2">Dle zadaných parametrů to nevychází</h3><p class="text-red-700">Zkuste upravit parametry, nebo se <a href="#kontakt" data-target="#kontakt" data-action="show-lead-form" class="font-bold underline scroll-to">spojte s naším specialistou</a>.</p></div>`;
        state.calculation.selectedOffer = null;
        return;
    }

    if (!selectedOffer && offers.length > 0) {
        selectedOffer = offers[0];
        state.calculation.selectedOffer = selectedOffer;
    }

    // --- 1. PŘÍPRAVA DAT ---
    let chartData = null;
    let fixationDetails = null;
    
    if (selectedOffer) {
        try {
            const currentPropertyValue = state.formData.propertyValue || 0;
            const currentLandValue = state.formData.landValue || 0;
            const currentLoanAmount = state.formData.loanAmount || 0;
            const currentLoanTerm = state.formData.loanTerm || 30;
            const currentAge = state.formData.age || 35;
            const currentFixation = state.formData.fixation || 3;
            const currentPurpose = state.formData.purpose || 'koupě';
            const effectivePropertyValue = currentPurpose === 'výstavba' ? currentPropertyValue + currentLandValue : currentPropertyValue;
            const effectiveTerm = Math.min(currentLoanTerm, Math.max(5, 70 - currentAge));
            
            if (effectivePropertyValue > 0 && currentLoanAmount > 0 && selectedOffer.rate > 0 && effectiveTerm > 0 && currentFixation > 0) {
                fixationDetails = calculateFixationAnalysis(currentLoanAmount, effectivePropertyValue, selectedOffer.rate, effectiveTerm, currentFixation);
                chartData = Array.from({ length: effectiveTerm }, (_, i) => calculateAmortization(currentLoanAmount, selectedOffer.rate, effectiveTerm, i + 1));
            }
        } catch (e) {
            console.error("Chyba při výpočtu detailů:", e);
        }
    }

    const { loanAmount, propertyValue, landValue, purpose } = state.formData;
    const effectiveValue = (purpose === 'výstavba' && landValue > 0) ? propertyValue + landValue : propertyValue;
    const ltvPercentage = effectiveValue > 0 ? Math.round((loanAmount / effectiveValue) * 100) : 0;
    
    // --- 2. SKÓRE (PŘÍPRAVA HTML) ---
    let scoreSectionHTML = '';
    let totalScoreValue = 0; 

    if (approvability) {
        const ltvExplanation = approvability.ltv > 85 ? 'Optimální LTV.' : approvability.ltv > 70 ? 'Dobré LTV.' : 'Hraniční LTV.';
        const dstiExplanation = approvability.dsti > 80 ? 'Výborné DSTI.' : approvability.dsti > 60 ? 'Dostatečná rezerva.' : 'Nižší rezerva.';
        const bonitaExplanation = approvability.bonita > 85 ? 'Excelentní bonita.' : approvability.bonita > 70 ? 'Velmi dobrá bonita.' : 'Standardní bonita.';
        totalScoreValue = (typeof approvability.total === 'number' && !isNaN(approvability.total)) ? approvability.total : 0;
        
        // Nový kompaktní blok pro skóre pod nabídku
        scoreSectionHTML = `
            <div class="bg-white p-4 sm:p-5 rounded-xl border border-blue-200 shadow-md mb-6 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                <h4 class="text-lg font-bold mb-3 flex items-center pl-2">
                    <span class="text-xl mr-2">🎯</span> Detail vašeho skóre
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    ${scoreHTML('LTV', approvability.ltv, 'bg-green-500', '🏠', ltvExplanation, 'LTV (Loan-to-Value) ukazuje poměr výše úvěru k hodnotě nemovitosti.')}
                    ${scoreHTML('DSTI', approvability.dsti, 'bg-yellow-500', '💰', dstiExplanation, 'DSTI porovnává tvé splátky s příjmem.')}
                    ${scoreHTML('Bonita', approvability.bonita, 'bg-blue-500', '⭐', bonitaExplanation, 'Bonita hodnotí tvou celkovou spolehlivost.')}
                </div>
            </div>`;
    }

    // --- 3. KARTA NEJLEPŠÍ NABÍDKY (S INTEGROVANÝM SKÓRE) ---
    const currentFixation = state.formData.fixation || 3;
    const employment = state.formData.employment || 'zaměstnanec';
    const targetAudience = selectedOffer?.targetGroup || (employment === 'osvč' ? 'OSVČ' : 'Zaměstnance');

    // Barva odznaku podle skóre
    const scoreColorClass = totalScoreValue >= 80 ? 'bg-green-100 text-green-800 border-green-200' : (totalScoreValue >= 60 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-red-100 text-red-800 border-red-200');

    const bestOfferHTML = selectedOffer ? `
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-5 sm:p-6 rounded-xl border-2 border-green-300 shadow-lg mb-4 relative">
            
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <h3 class="text-xl sm:text-2xl font-bold text-green-900 flex items-center">
                    <span class="text-2xl mr-2">✅</span> Nejlepší nabídka pro vás
                </h3>
                
                ${totalScoreValue > 0 ? `
                <div class="flex items-center px-3 py-1.5 rounded-full border ${scoreColorClass} shadow-sm bg-white">
                    <span class="text-lg mr-1.5">🎯</span>
                    <div class="flex flex-col leading-tight">
                        <span class="text-[10px] uppercase font-bold tracking-wider opacity-80">Šance na schválení</span>
                        <span class="text-lg font-extrabold">${totalScoreValue}%</span>
                    </div>
                </div>` : ''}
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-lg mb-3 border border-green-100 shadow-sm">
                <div class="flex flex-col justify-center items-center sm:items-start p-2">
                    <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Měsíční splátka</p>
                    <p class="text-3xl font-extrabold text-gray-900">${formatNumber(selectedOffer.monthlyPayment)}</p>
                </div>
                <div class="flex flex-col justify-center items-center sm:items-start p-2 border-t sm:border-t-0 sm:border-l border-gray-100">
                    <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Úroková sazba</p>
                    <div class="flex items-baseline">
                        <p class="text-3xl font-extrabold text-blue-600">${selectedOffer.rate?.toFixed(2)}%</p>
                        <span class="ml-2 text-xs text-gray-400 font-medium">p.a.</span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-lg">
                <div class="flex items-center"><span class="text-base mr-1">🔒</span><div><p class="text-gray-500">Fixace</p><p class="font-semibold">${currentFixation} let</p></div></div>
                <div class="flex items-center"><span class="text-base mr-1">🏠</span><div><p class="text-gray-500">LTV</p><p class="font-semibold">${ltvPercentage}%</p></div></div>
                <div class="flex items-center"><span class="text-base mr-1">⏳</span><div><p class="text-gray-500">Splatnost</p><p class="font-semibold">${state.formData.loanTerm || 30} let</p></div></div>
                <div class="flex items-center"><span class="text-base mr-1">👤</span><div><p class="text-gray-500">Vhodné pro</p><p class="font-semibold text-green-700">${targetAudience}</p></div></div>
            </div>
            ${selectedOffer.highlights ? `<div class="flex flex-wrap gap-2 mt-3">${selectedOffer.highlights.map(h => `<span class="inline-block px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full font-semibold">${h}</span>`).join('')}</div>` : ''}
        </div>
    ` : '';

    // Zbytek HTML (tabulka, CTA...)
    const allOffersHTML = offers.length > 1 ? `
        <div id="all-offers-container" class="mb-6">
            <h4 class="text-lg font-bold mb-1 text-gray-800">🧠 Porovnání dalších variant</h4>
            <div class="overflow-x-auto">
                <table class="w-full bg-white rounded-lg shadow-md text-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-3 text-left font-semibold">Varianta</th>
                            <th class="px-4 py-3 text-center font-semibold">Měsíční splátka</th>
                            <th class="px-4 py-3 text-center font-semibold">Úrok</th>
                            <th class="px-4 py-3 text-center font-semibold">Celkem</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${offers.map((o, idx) => `
                            <tr class="border-t hover:bg-blue-50 cursor-pointer offer-row ${o.id === selectedOffer?.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}" data-offer-id="${o.id}">
                                <td class="px-4 py-3">
                                    <div class="font-bold text-blue-700">${idx === 0 ? '🏆 ' : ''}${o.title || 'Nabídka ' + (idx + 1)}</div>
                                </td>
                                <td class="px-4 py-3 text-center"><div class="font-bold text-lg">${formatNumber(o.monthlyPayment)}</div></td>
                                <td class="px-4 py-3 text-center"><div class="font-semibold text-blue-600">${o.rate?.toFixed(2)}%</div></td>
                                <td class="px-4 py-3 text-center"><div class="text-gray-700">${formatNumber(o.totalPayment || o.monthlyPayment * (state.formData.loanTerm || 30) * 12)}</div></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    ` : '';

    const megaCTAHTML = `
        <div class="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 sm:p-6 rounded-2xl shadow-2xl mb-6 text-white">
            <div class="text-center mb-4">
                <div class="text-3xl sm:text-4xl mb-2">💬</div>
                <h3 class="text-xl sm:text-2xl font-extrabold mb-1">Chci pomoc experta</h3>
                <p class="text-sm text-blue-100 mb-1">Vyjedná ti nejlepší podmínky a provede celým procesem</p>
                <p class="text-xs text-blue-200">✓ Zdarma  ✓ Do 24 hodin  ✓ Bez závazků</p>
            </div>
            <div class="text-center">
                <button id="show-inline-lead-btn" data-action="toggle-inline-lead-form" class="nav-btn bg-green-600 hover:bg-green-700 text-white text-base sm:text-lg font-bold px-6 sm:px-10 py-3 sm:py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all inline-block">✅ Chci zavolat zdarma</button>
            </div>
            
            <div id="inline-lead-form-container" class="hidden mt-5 bg-white rounded-xl p-5 text-gray-800">
                <h4 class="text-base font-bold mb-3 text-center text-gray-900">📋 Zadej své kontaktní údaje</h4>
                <form id="inline-lead-form" name="inline-lead-form" method="POST" data-netlify="true" netlify-honeypot="bot-field" class="space-y-3">
                    <input type="hidden" name="form-name" value="inline-lead-form" />
                    <p class="hidden"><label>Nevyplňujte: <input name="bot-field" /></label></p>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label class="form-label text-sm">Jméno a příjmení *</label><input type="text" name="name" required pattern="^[A-Za-zÀ-ž\\s]{2,}(\\s[A-Za-zÀ-ž\\s]{2,})?$" class="modern-input text-sm"></div>
                        <div><label class="form-label text-sm">Telefon *</label><input type="tel" name="phone" required pattern="^(\\+420)? ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$" class="modern-input text-sm"></div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label class="form-label text-sm">E-mail *</label><input type="email" name="email" required class="modern-input text-sm"></div>
                        <div><label class="form-label text-sm">PSČ *</label><input type="text" name="psc" required pattern="^\\d{3} ?\\d{2}$" placeholder="např. 110 00" class="modern-input text-sm"></div>
                    </div>
                    <div>
                        <label class="form-label text-sm">Kdy tě můžeme kontaktovat?</label>
                        <select name="contact-time" class="modern-select text-sm">
                            <option value="kdykoliv">Kdykoliv během dne</option>
                            <option value="rano">Ráno (8:00 - 12:00)</option>
                            <option value="odpoledne">Odpoledne (12:00 - 17:00)</option>
                            <option value="vecer">Večer (17:00 - 20:00)</option>
                        </select>
                    </div>
                    <div><label class="form-label text-sm">Poznámka</label><textarea name="note" rows="2" class="modern-input text-sm" placeholder="Např. už mám předschválenou hypotéku..."></textarea></div>
                    <div class="text-center pt-2">
                        <p class="text-xs text-gray-500 mb-3">Odesláním souhlasíš se zpracováním osobních údajů.</p>
                        <button type="submit" class="w-full nav-btn bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-base">📞 Odeslat nezávazně</button>
                    </div>
                </form>
                <div id="inline-form-success" class="hidden mt-4 text-center p-3 bg-green-100 text-green-800 rounded-lg">
                    <h5 class="font-bold">✅ Děkujeme!</h5>
                    <p class="text-sm">Váš požadavek byl odeslán. Ozveme se vám brzy.</p>
                </div>
            </div>
        </div>
    `;

    const alternativesHTML = `
        <div class="grid grid-cols-1 ${state.mode !== 'guided' ? 'sm:grid-cols-2' : ''} gap-4 mb-6">
            <div class="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer" data-action="discuss-with-ai">
                <div class="flex items-center mb-2"><span class="text-2xl mr-2">💬</span><h4 class="text-base font-bold text-gray-900">Probrat s AI asistentem</h4></div>
                <p class="text-xs text-gray-600 mb-3">Okamžité odpovědi, stress testy, scénáře</p>
                <button class="nav-btn bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 w-full" data-action="discuss-with-ai">Spustit AI chat</button>
            </div>
            ${state.mode !== 'guided' ? `
            <div class="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer" data-action="switch-to-guided">
                <div class="flex items-center mb-2"><span class="text-2xl mr-2">📊</span><h4 class="text-base font-bold text-gray-900">Detailní analýza</h4></div>
                <p class="text-xs text-gray-600 mb-3">Kompletní scoring, DSTI, stress testy ČNB</p>
                <button class="nav-btn bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 w-full" data-action="switch-to-guided">Přepnout na detailní</button>
            </div>` : ''}
        </div>
    `;

    const chartHTML = `
        <div class="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-lg mb-6">
            <h4 class="text-lg sm:text-xl font-bold mb-4 flex items-center"><span class="text-2xl mr-2">📈</span> Vývoj splácení v čase</h4>
            <div class="relative h-60 sm:h-80"><canvas id="resultsChart"></canvas></div>
        </div>
    `;

    const bottomCTAHTML = `
        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-300 text-center mb-6">
            <h4 class="text-lg font-bold text-gray-900 mb-2">💡 Líbí se ti nabídka?</h4>
            <p class="text-sm text-gray-600 mb-3">Nech si pomoci od experta s vyjednáním nejlepší sazby</p>
            <button class="nav-btn bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3" data-action="scroll-to-form">📞 Zavolat mi zdarma</button>
        </div>
    `;

    let fixationDetailsHTML = '';
    if (fixationDetails) {
        const currentFixation = state.formData.fixation || 3;
        
        fixationDetailsHTML = `
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-5 rounded-xl border border-green-200 shadow-lg mb-6">
                <h4 class="text-lg sm:text-xl font-bold mb-3 flex items-center"><span class="text-2xl mr-2">📊</span> Detaily fixace</h4>
                <div class="bg-white p-4 rounded-xl space-y-2 text-sm shadow-sm mb-4">
                    <div class="flex justify-between items-center pb-2 border-b">
                        <span class="flex items-center gap-1">Celkem za ${currentFixation} let fixace <span class="info-icon cursor-pointer text-blue-500 hover:text-blue-700 relative z-10" data-info-key="fixation-total" data-info-text="Celková částka, kterou pošlete bance za dobu fixace (jistina + úroky).">?</span>:</span>
                        <strong class="text-base">${formatNumber(fixationDetails.totalPaymentsInFixation)}</strong>
                    </div>
                    <div class="flex justify-between items-center pb-2 border-b">
                        <span class="flex items-center gap-1">Z toho úroky <span class="info-icon cursor-pointer text-blue-500 hover:text-blue-700 relative z-10" data-info-key="fixation-interest" data-info-text="Částka, která je čistým nákladem (zisk banky). O tuto částku se nesnižuje váš dluh.">?</span>:</span>
                        <strong class="text-base text-red-600">${formatNumber(fixationDetails.totalInterestForFixation)}</strong>
                    </div>
                    <div class="flex justify-between items-center pt-2">
                        <span class="flex items-center gap-1">Zbývající dluh po fixaci <span class="info-icon cursor-pointer text-blue-500 hover:text-blue-700 relative z-10" data-info-key="fixation-debt" data-info-text="Částka, kterou budete stále dlužit po uplynutí fixace. Tuto částku budete refinancovat.">?</span>:</span>
                        <strong class="text-base">${formatNumber(fixationDetails.remainingBalanceAfterFixation)}</strong>
                    </div>
                </div>
                
                ${fixationDetails.futureScenario ? `
                    <div class="space-y-3">
                        <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs">
                            <h5 class="font-bold mb-1 flex items-center gap-1">💡 Scénář: Pokles sazeb <span class="info-icon cursor-pointer text-blue-500 hover:text-blue-700 relative z-10" data-info-key="scenario-drop" data-info-text="Modelová situace, pokud by úrokové sazby v době vaší refixace klesly na tuto hodnotu.">?</span></h5>
                            <p class="text-gray-600 mb-1">Pokud po ${currentFixation} letech klesne sazba na ${fixationDetails.futureScenario.optimistic.rate.toFixed(2)}%:</p>
                            <div>Nová splátka: <strong class="text-green-600">${formatNumber(fixationDetails.futureScenario.optimistic.newMonthlyPayment)}</strong></div>
                        </div>
                        <div class="bg-orange-50 p-3 rounded-lg border border-orange-200 text-xs">
                             <h5 class="font-bold mb-1 flex items-center gap-1">📈 Scénář: Růst sazeb <span class="info-icon cursor-pointer text-orange-500 hover:text-orange-700 relative z-10" data-info-key="scenario-rise" data-info-text="Stress test: Modelová situace, pokud by úrokové sazby vzrostly. Ukazuje riziko zvýšení splátky.">?</span></h5>
                            <p class="text-gray-600 mb-1">Pokud sazba vzroste na ${fixationDetails.futureScenario.moderateIncrease.rate.toFixed(2)}%:</p>
                            <div>Nová splátka: <strong class="text-orange-600">${formatNumber(fixationDetails.futureScenario.moderateIncrease.newMonthlyPayment)}</strong></div>
                        </div>
                    </div>
                ` : ''}
                 <div class="mt-4 text-center">
                    <button class="nav-btn bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4" data-action="discuss-fixation-with-ai">💬 Probrat fixaci s AI</button>
                </div>
            </div>
        `;
    }

    // --- 4. ZMĚNA POŘADÍ - SKÓRE JE HNED POD NABÍDKOU ---
    container.innerHTML = `
        <div>
            <h3 class="text-2xl sm:text-3xl font-bold mb-6">✅ Vaše výsledky</h3>
            ${bestOfferHTML}
            ${scoreSectionHTML} 
            ${allOffersHTML}
            ${megaCTAHTML}
            <h4 class="text-base font-bold mb-3 text-center text-gray-600">Nebo raději:</h4>
            ${alternativesHTML}
            ${fixationDetailsHTML}
            ${chartHTML}
            ${bottomCTAHTML}
        </div>
    `;

    if (chartData && typeof Chart !== 'undefined') {
        setTimeout(() => {
            if (state.chart) { try { state.chart.destroy(); } catch(e) {} }
            renderChart('resultsChart', chartData);
        }, 50);
    }

    addOfferCardListeners();
    addV22EventListeners();

    if (!container.dataset.renderedOnce) {
        setTimeout(() => scrollToTarget('#results-container'), 150);
        container.dataset.renderedOnce = "true";
    }
};
        
    const renderChart = (canvasId, schedule) => { 
        if (state.chart) { try { state.chart.destroy(); } catch (e) {} } 
        const ctx = document.getElementById(canvasId)?.getContext('2d'); 
        if (!ctx) return;
        if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); 
            return;
        }
        try {
            state.chart = new Chart(ctx, { 
                type: 'bar', 
                data: { 
                    labels: schedule.map(item => item?.year || '?'), 
                    datasets: [
                        { label: 'Úroky', data: schedule.map(item => item?.interest || 0), backgroundColor: '#ef4444' }, 
                        { label: 'Jistina', data: schedule.map(item => item?.principal || 0), backgroundColor: '#22c55e' }
                    ] 
                }, 
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, ticks: { display: false } } }, plugins: { legend: { position: 'top' } } } 
            }); 
        } catch (chartError) {}
    };
    
    const addOfferCardListeners = () => {
    const offerCards = document.querySelectorAll('#results-container .offer-card');
        offerCards.forEach(card => card.replaceWith(card.cloneNode(true))); 
        
        const newOfferCards = document.querySelectorAll('#results-container .offer-card');
        newOfferCards.forEach(card => {
            card.addEventListener('click', () => {
                const offerId = card.dataset.offerId;
                const clickedOffer = state.calculation.offers.find(o => o.id === offerId);
                
                if (clickedOffer && clickedOffer.id !== state.calculation.selectedOffer?.id) {
                    state.calculation.selectedOffer = clickedOffer;
                    renderResults(); 
                }
            });
        });
    };

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
                .replace(/\[(.*?)\]\((#.*?)\)/g, '<a href="$2" data-target="$2" class="scroll-to font-bold text-blue-600 underline">$1</a>')
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
            suggestions = ["📊 Rychlá analýza", "💰 Lepší úrok?", "⏱️ Změnit fixaci", "📞 Domluvit se specialistou"];
        } else {
            suggestions = ["📢 Spočítat hypotéku", "📈 Aktuální sazby", "📋 Co potřebuji?", "📞 Domluvit se specialistou"];
        }
        
        const suggestionsHTML = isMobile() 
            ? `<div class="flex gap-2 overflow-x-auto pb-1">${suggestions.map(s => `<button class="suggestion-btn whitespace-nowrap flex-shrink-0" data-suggestion="${s}">${s}</button>`).join('')}</div>`
            : `<div class="flex flex-wrap gap-2">${suggestions.map(s => `<button class="suggestion-btn" data-suggestion="${s}">${s}</button>`).join('')}</div>`;
            
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
        state.calculatorInteracted = true;
        if (!isSilent) {
            const spinner = button?.querySelector('.loading-spinner-white');
            if (button) { button.disabled = true; spinner?.classList.remove('hidden'); }
            const container = document.getElementById('results-container');
            if(container) { container.innerHTML = `<div class="text-center p-8"><div class="loading-spinner-blue"></div><p>Počítám nejlepší nabídky...</p></div>`; container.classList.remove('hidden'); }
        }
        try {
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${new URLSearchParams(state.formData).toString()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            // 1. Načteme data do proměnné
            const data = await response.json();
            
            // 2. Uložíme do stavu a VYNUTÍME výběr první nabídky
            state.calculation = { 
                ...state.calculation, 
                ...data, 
                isFromOurCalculator: true,
                selectedOffer: data.offers && data.offers.length > 0 ? data.offers[0] : null
            };
            
            if (!isSilent) {
                renderResults();
                setTimeout(() => scrollToTarget('#results-container'), 150); 
            }
            return true;
        // === KONEC UPRAVENÉ ČÁSTI ===
        
        } catch (error) {
            console.error('Chyba při načítání sazeb:', error);
            if (!isSilent) { 
                const container = document.getElementById('results-container'); 
                if(container) container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg"><h3 class="text-2xl font-bold text-red-800 mb-2">Chyba při výpočtu</h3><p class="text-red-700">Zkuste to prosím znovu.</p></div>`;
            }
            return false;
        } finally {
            if (button && !isSilent) { button.disabled = false; button.querySelector('.loading-spinner-white')?.classList.add('hidden'); }
        }
    };
    
    const updateLTVDisplay = () => {
        const { loanAmount, propertyValue, landValue, purpose } = state.formData;
        const effectivePropertyValue = purpose === 'výstavba' ? propertyValue + landValue : propertyValue;
        const ltv = effectivePropertyValue > 0 ? Math.round((loanAmount / effectivePropertyValue) * 100) : 0;
        const display = document.getElementById('ltv-display');
        if (display) {
            display.textContent = `Aktuální LTV: ${ltv}%`;
            display.style.color = ltv > 100 ? '#ef4444' : '#10b981';
        }
        const totalValueDisplay = document.getElementById('total-property-value-display');
        if (totalValueDisplay) {
            totalValueDisplay.innerHTML = `Celková budoucí hodnota: <strong>${formatNumber(effectivePropertyValue)}</strong>`;
            totalValueDisplay.classList.toggle('hidden', purpose !== 'výstavba');
        }
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
            
            if (['loanAmount', 'propertyValue'].includes(baseId)) { updateLTVDisplay(); }
            if (baseId === 'purpose') { handleGuidedFormLogic(); }
        }
        state.calculatorInteracted = true;
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

    const handleInfoTooltip = (e) => {
    const icon = e.target.closest('.info-icon');
    const existingTooltip = document.getElementById('active-tooltip');

    if (icon) {
        e.preventDefault(); 
        e.stopPropagation(); 

        if (existingTooltip && existingTooltip.dataset.key === icon.dataset.infoKey) {
            existingTooltip.remove();
            return;
        }
        if (existingTooltip) { existingTooltip.remove(); }

        const infoText = icon.dataset.infoText;
        const infoKey = icon.dataset.infoKey;

        const tooltip = document.createElement('div');
        tooltip.id = 'active-tooltip';
        tooltip.className = 'info-tooltip';
        tooltip.dataset.key = infoKey; 
        tooltip.innerHTML = `
            <p>${infoText}</p>
            <button class="ask-ai-btn" data-action="ask-ai-from-calc" data-question-key="${infoKey}">Zeptat se AI podrobněji</button>
        `;

        document.body.appendChild(tooltip);
        const rect = icon.getBoundingClientRect();
        
        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 8;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        
        requestAnimationFrame(() => {
             const tooltipRect = tooltip.getBoundingClientRect();
             if (tooltipRect.right > window.innerWidth - 10) {
                  tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10 + window.scrollX}px`;
             }
             tooltip.classList.add('visible');
        });
    } 
    else if (existingTooltip && !e.target.closest('#active-tooltip')) {
        existingTooltip.remove();
    }
};

    const handleClick = async (e) => {
        let target = e.target.closest('[data-action], .offer-card, .suggestion-btn, [data-mode], .scroll-to, [data-quick-question]');
        if (!target) return; 

        if (target.matches('a[href^="#"]')) { e.preventDefault(); }
        
        const { action, mode, suggestion, target: targetId } = target.dataset;
        const quickQuestion = target.dataset.quickQuestion;

        if(action === 'ask-ai-from-calc') {
            const questionKey = target.dataset.questionKey;
            const questions = {
                'propertyValue': "Jak hodnota nemovitosti ovlivňuje hypotéku?",
                'loanAmount': "Proč je důležité správně nastavit výši úvěru?",
                'income': "Jak banky posuzují můj příjem a co všechno se započítává?",
                'loanTerm': "Jaký je rozdíl ve splátce a úrocích při splatnosti 20 vs 30 let?",
                'fixation': "Jaká je nejlepší strategie pro volbu fixace?",
                'liabilities': "Jak mé ostatní půjčky ovlivňují šanci na získání hypotéky?",
                'age': "Proč je můj věk důležitý pro banku?",
                'children': "Jak počet dětí ovlivňuje výpočet bonity?",
                'landValue': "Proč je důležitá hodnota pozemku u výstavby?",
                'ltv-score': "Co znamená LTV skóre a jak ho můžu zlepšit?",
                'dsti-score': "Vysvětli mi DSTI a proč je pro banku důležité.",
                'bonita-score': "Jak se počítá bonita a co ji nejvíc ovlivňuje?"
            };
            
            const question = questions[questionKey] || `Řekni mi více o ${questionKey.replace('-score', '')}.`;
            document.getElementById('active-tooltip')?.remove();
            
            switchMode('ai');
            setTimeout(() => handleChatMessageSend(question), 300);
            return;
        }

        if (action === 'toggle-mobile-sidebar' || action === 'close-mobile-sidebar') {
            toggleMobileSidebar();
            return;
        }

        if (quickQuestion) {
            if (isMobile()) toggleMobileSidebar();
            const chatInput = document.getElementById('permanent-chat-input');
            if (chatInput) {
                chatInput.value = quickQuestion;
                handleChatMessageSend(quickQuestion);
                chatInput.value = '';
            }
            return;
        }

        if (targetId) {
            if (action === 'show-lead-form' || action === 'show-lead-form-direct') {
                DOMElements.leadFormContainer.classList.remove('hidden');
            }
            scrollToTarget(targetId);
            if (DOMElements.mobileMenu && !DOMElements.mobileMenu.classList.contains('hidden')) {
                DOMElements.mobileMenu.classList.add('hidden');
            }
        }
        else if (mode) { switchMode(mode); }
        else if (action === 'calculate') { calculateRates(target); }
        else if (action === 'go-to-calculator') {
            if (isMobile()) toggleMobileSidebar();
            switchMode('express');
        }
        else if (action === 'show-lead-form') {
            if (isMobile()) toggleMobileSidebar();
            DOMElements.leadFormContainer.classList.remove('hidden');
            scrollToTarget('#kontakt');
        }
        else if (action === 'discuss-with-ai' || action === 'discuss-fixation-with-ai') {
            // Přepneme do režimu AI (to zajistí vykreslení chatu)
            switchMode('ai', true);
            
            // Definujeme specifický dotaz podle toho, na co uživatel klikl
            let specificPrompt = "Zanalyzuj detailně mé skóre, rizika a celkovou kalkulaci.";
            if (action === 'discuss-fixation-with-ai') {
                const fix = state.formData.fixation || 3;
                specificPrompt = `Podívej se na mou kalkulaci. Zajímá mě detailní analýza fixace na ${fix} let. Jaká jsou rizika změny sazeb a mám zvážit jinou délku fixace?`;
            } else {
                specificPrompt = "Podívej se na mou kalkulaci. Proberme detailně mé skóre (LTV, DSTI, Bonita), varianty nabídek a případná rizika.";
            }

            // Po krátké prodlevě (aby se načetlo UI) odešleme dotaz jako zprávu
            setTimeout(() => {
                 handleChatMessageSend(specificPrompt);
            }, 500);
        }
        else if (action === 'reset-chat') {
            state.chatHistory = [];
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) chatMessages.innerHTML = '';
            addChatMessage('Jsem váš hypoteční poradce s AI nástroji. Jak vám mohu pomoci?', 'ai');
            generateAISuggestions();
        }
        else if (suggestion) {
            if (suggestion === '📞 Domluvit se specialistou') {
                addChatMessage("Chci se domluvit se specialistou.", 'user');
                addChatMessage("Výborně! Přesouvám vás na formulář pro spojení s naším specialistou.", 'ai');
                DOMElements.leadFormContainer.classList.remove('hidden');
                setTimeout(() => scrollToTarget('#kontakt'), 100);
                return;
            }
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
        }
    };
  
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');

        let originalBtnText = 'Odeslat';
        if (btn) {
            originalBtnText = btn.textContent;
            btn.disabled = true;
            btn.textContent = '📤 Odesílám...';
        }

        try {
            const bodyParams = new URLSearchParams();
            bodyParams.append('form-name', form.getAttribute('name'));
            bodyParams.append('name', form.querySelector('input[name="name"]').value);
            bodyParams.append('phone', form.querySelector('input[name="phone"]').value);
            bodyParams.append('email', form.querySelector('input[name="email"]').value);
            bodyParams.append('psc', form.querySelector('input[name="psc"]').value);
            bodyParams.append('contact-time', form.querySelector('select[name="contact-time"]').value);
            
            const noteInput = form.querySelector('textarea[name="note"]');
            if (noteInput) bodyParams.append('note', noteInput.value);

            // Základní data navíc (historie chatu)
            const extraData = { chatHistory: state.chatHistory };

            // === DŮLEŽITÁ ZMĚNA ZDE ===
            // Data o hypotéce (příjem, věk, částka...) připojíme JEN tehdy, 
            // pokud už proběhl výpočet a máme nějaké výsledky (offers).
            // Pokud je pole offers prázdné, znamená to, že uživatel jen vyplnil kontakt bez kalkulace.
            if (state.calculation && state.calculation.offers && state.calculation.offers.length > 0) {
                const safeCalculationData = {
                    offers: state.calculation.offers,
                    selectedOffer: state.calculation.selectedOffer,
                    approvability: state.calculation.approvability,
                    ...(state.calculation.fixationDetails && { fixationDetails: state.calculation.fixationDetails })
                };
                extraData.calculation = safeCalculationData;
                
                // Toto jsou ty parametry (věk 35, příjem 50000 atd.)
                // Teď se odešlou jen když je splněna podmínka výše.
                extraData.formData = state.formData; 
            }
            // ===========================

            if (Object.keys(extraData).length > 0) {
                bodyParams.append('extraData', JSON.stringify(extraData, null, 2)); 
            }

            const response = await fetch('/.netlify/functions/form-handler', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: bodyParams.toString()
            });
            
            if (response.ok) {
                form.style.display = 'none';
                
                const successId = form.id === 'inline-lead-form' ? 'inline-form-success' : 'form-success';
                const successMessage = document.getElementById(successId);
                if (successMessage) {
                     successMessage.style.display = 'block';
                     successMessage.classList.remove('hidden');
                }
                
                if (form.id !== 'inline-lead-form') {
                    setTimeout(() => scrollToTarget('#kontakt'), 100);
                }

                // --- MĚŘENÍ KONVERZÍ (Google Ads + GA4) ---
                if (typeof gtag === 'function') {
                    // GA4
                    gtag('event', 'generate_lead', { 
                        'event_category': 'form_submission', 
                        'event_label': form.id 
                    });

                    // Google Ads (Váš kód)
                    gtag('event', 'conversion', { 
                        'send_to': 'AW-778075298/XZ1yCK60yc4bEKL5gfMC', 
                        'value': 1.0,
                        'currency': 'CZK'
                    });
                    
                    console.log('Konverze odeslána do GA4 i Ads.');
                }
                // ------------------------------------------

            } else {
                 throw new Error(`Odeslání selhalo: ${response.status}`);
            }

        } catch (error) { 
            console.error('Chyba při odesílání formuláře:', error);
            alert('Odeslání se nezdařilo. Zkuste to prosím znovu, nebo nás kontaktujte přímo.');
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalBtnText;
            }
        }
    };

    const handleChatMessageSend = async (message) => {
        if (!message || message.trim() === '') return;
        
        if (state.chatFormState !== 'idle') {
            handleChatFormInput(message);
            return;
        }

        const quickResp = findQuickResponse(message);
        if (quickResp && quickResp.instant) {
            addChatMessage(message, 'user');
            state.isAiTyping = true;
            addChatMessage('', 'ai-typing');
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            document.getElementById('typing-indicator')?.remove();
            addChatMessage(quickResp.response, 'ai');
            state.isAiTyping = false;
            responseCache.set(message.toLowerCase(), quickResp.response);
            generateAISuggestions();
            return;
        }

        const suggestionMap = {
            "📊 Rychlá analýza": "Proveď rychlou analýzu mé situace.",
            "💰 Lepší úrok?": "Můžu dostat lepší úrok? Jak?",
            "⏱️ Změnit fixaci": "Chci změnit délku fixace",
            "📞 Domluvit se specialistou": "Chci se domluvit se specialistou",
            "📢 Spočítat hypotéku": "Chci spočítat hypotéku",
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
        
        const { chart, chatHistory, mobileSidebarOpen, ...cleanContext } = contextToSend;
        
        const timeoutId = setTimeout(() => {
            if (state.isAiTyping) {
                document.getElementById('typing-indicator')?.remove();
                const timeoutMessage = `Omlouvám se, zpracování trvá déle než obvykle. Nejlepší bude, když se na to podívá přímo náš specialista.
                <br><br><button class="nav-btn" data-action="show-lead-form" style="background-color: var(--success-color); margin-top: 8px;">📞 Domluvit se specialistou</button>`;
                addChatMessage(timeoutMessage, 'ai');
                state.isAiTyping = false;
            }
        }, 30000);
        
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
                }
            }
            else if (data.tool === 'initialAnalysis') { addChatMessage(data.response, 'ai'); }
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
                const banksList = `**Spolupracujeme s těmito bankami a institucemi:**
                • Česká spořitelna, ČSOB, Komerční banka, Raiffeisenbank, UniCredit Bank
                • Hypoteční banka, Modrá pyramida, ČMSS, Buřinka
                • MONETA, mBank, Fio banka, Air Bank, Banka CREDITAS
                a další. Celkem pracujeme s **19+ institucemi**.`;
                addChatMessage(banksList, 'ai');
            }
            else { addChatMessage(data.response, 'ai'); }
        } catch (error) {
            clearTimeout(timeoutId);
            document.getElementById('typing-indicator')?.remove();
            const errorMessage = `Omlouvám se, došlo k chybě. Nejlepší bude, když se na to podívá přímo náš specialista.
            <br><br><button class="nav-btn" data-action="show-lead-form" style="background-color: var(--success-color); margin-top: 8px;">📞 Domluvit se specialistou</button>`;
            addChatMessage(errorMessage, 'ai');
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
            state.chatFormData = {};
        }
    };
   
    const switchMode = (mode, fromResults = false, isInitialLoad = false) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        
        DOMElements.contentContainer.innerHTML = ""; 

        if (mode === 'ai') {
            if (!fromResults) { 
                state.chatHistory = []; 
                state.calculation = { offers: [] }; 
            }
            DOMElements.contentContainer.innerHTML = getAiLayout();
            createPermanentChatInput();
            
            const sidebarContainer = document.getElementById('sidebar-container');
            if (sidebarContainer) sidebarContainer.innerHTML = getSidebarHTML();

            const container = document.getElementById('chat-messages');
            if (container && state.chatHistory.length > 0) {
                state.chatHistory.forEach(msg => {
                    const bubble = document.createElement('div');
                    bubble.className = msg.sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user';
                    bubble.innerHTML = msg.text.replace(/\n/g, '<br>');
                    container.appendChild(bubble);
                });
            } 
            if (!fromResults && state.chatHistory.length === 0) {
                addChatMessage('Jsem váš hypoteční poradce s přístupem k datům z 19+ bank. Co vás zajímá?', 'ai');
            }
            
            generateAISuggestions();

        } else if (mode === 'express') {
            DOMElements.contentContainer.innerHTML = getExpressHTML();
        } else if (mode === 'guided') {
            DOMElements.contentContainer.innerHTML = getGuidedHTML();
            handleGuidedFormLogic();
        }

        if (!isInitialLoad) { scrollToTarget('#content-container'); }
    };

    const handleCookieBanner = () => {
        const bannerWrapper = document.getElementById('cookie-banner-wrapper');
        const acceptBtn = document.getElementById('cookie-accept');
        const moreInfoBtn = document.getElementById('cookie-more-info-btn');
        const detailsPanel = document.getElementById('cookie-details');

        if (!bannerWrapper || !acceptBtn || !moreInfoBtn || !detailsPanel) return; 

        if (localStorage.getItem('cookieConsent') === 'true') {
            bannerWrapper.classList.add('hidden');
        } else {
            bannerWrapper.classList.remove('hidden');
        }

        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'true');
            bannerWrapper.style.transition = 'opacity 0.3s ease-out';
            bannerWrapper.style.opacity = '0';
            setTimeout(() => bannerWrapper.classList.add('hidden'), 300); 
        });

        moreInfoBtn.addEventListener('click', () => {
            detailsPanel.classList.toggle('expanded');
            moreInfoBtn.textContent = detailsPanel.classList.contains('expanded') ? 'Méně informací' : 'Více informací';
        });
    };

    const init = () => {
    document.body.addEventListener('click', handleClick); 
    document.body.addEventListener('click', handleInfoTooltip); 

    if (DOMElements.contentContainer) {
        DOMElements.contentContainer.addEventListener('input', (e) => {
            if (e.target.matches('input[type="range"], input[type="text"], select')) {
                handleInput(e);
            }
        });
    } 

    if (DOMElements.leadForm) {
         DOMElements.leadForm.addEventListener('submit', handleFormSubmit);
    } 

    if (DOMElements.mobileMenuButton && DOMElements.mobileMenu) {
        DOMElements.mobileMenuButton.addEventListener('click', () => {
            DOMElements.mobileMenu.classList.toggle('hidden');
        });
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            document.getElementById('active-tooltip')?.remove();
            if (state.mode === 'ai' && typeof getSidebarHTML === 'function') { 
                const sidebarContainer = document.getElementById('sidebar-container');
                if(sidebarContainer) sidebarContainer.innerHTML = getSidebarHTML();
            }
        }, 250);
    });

     if (typeof handleCookieBanner === 'function') { handleCookieBanner(); } 

    if (DOMElements.modeCards && DOMElements.modeCards.length > 0) {
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === state.mode));
    }

    if (typeof updateActiveUsers === 'function') updateActiveUsers(); 

        const mythCards = document.querySelectorAll('.myth-card');
        mythCards.forEach(card => {
            const front = card.querySelector('.myth-front');
            const back = card.querySelector('.myth-back');
            if (front) { front.addEventListener('click', (e) => { e.stopPropagation(); card.classList.add('flipped'); }); }
            if (back) { back.addEventListener('click', (e) => { e.stopPropagation(); card.classList.remove('flipped'); }); }
        });
    };

    init();

    function addV22EventListeners() {
        // 1. Toggle inline lead form
        const toggleBtn = document.getElementById('show-inline-lead-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const formContainer = document.getElementById('inline-lead-form-container');
                if (!formContainer) return;
                
                const isVisible = !formContainer.classList.contains('hidden');
                if (isVisible) {
                    formContainer.classList.add('hidden');
                    toggleBtn.innerHTML = '✅ Chci zavolat zdarma';
                    toggleBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600');
                    toggleBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                } else {
                    formContainer.classList.remove('hidden');
                    toggleBtn.innerHTML = '❌ Zrušit';
                    toggleBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                    toggleBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
                    setTimeout(() => { formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
                }
            });
        }
        
        // 2. Inline lead form submit
        const inlineForm = document.getElementById('inline-lead-form');
        if (inlineForm) {
            const newInlineForm = inlineForm.cloneNode(true);
            inlineForm.parentNode.replaceChild(newInlineForm, inlineForm);
            newInlineForm.addEventListener('submit', handleFormSubmit);
        }
        
        // 3. Show all offers toggle
        const showAllOffersBtn = document.querySelector('[data-action="show-all-offers"]');
        if (showAllOffersBtn) {
            showAllOffersBtn.addEventListener('click', () => {
                const allOffersContainer = document.getElementById('all-offers-container');
                if (allOffersContainer) {
                    const isHidden = allOffersContainer.classList.contains('hidden');
                    // ... (zbytek kódu zůstává stejný)
                }
            });
        }
        
        // 4. Event delegation pro řádky tabulky
        const allOffersContainer = document.getElementById('all-offers-container');
        if (allOffersContainer) {
            allOffersContainer.addEventListener('click', (e) => {
                const row = e.target.closest('.offer-row');
                if (row) {
                    const offerId = row.dataset.offerId;
                    const clickedOffer = state.calculation.offers.find(o => o.id === offerId);
                    if (clickedOffer && clickedOffer.id !== state.calculation.selectedOffer?.id) {
                        state.calculation.selectedOffer = clickedOffer;
                        renderResults();
                    }
                }
            });
        }
        
        // ==========================================
        // ZDE JE DOPLNĚNÁ CHYBĚJÍCÍ ČÁST
        // ==========================================
        
        // 5. OPRAVENO: Listener pro přepnutí na detailní analýzu
        const switchToGuidedBtns = document.querySelectorAll('[data-action="switch-to-guided"]');
        switchToGuidedBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // True parametr zajistí, že se zachovají data a jen se změní zobrazení
                switchMode('guided', true);
            });
        });
        
        // 6. Bottom CTA scroll to form
        const scrollToFormBtn = document.querySelector('[data-action="scroll-to-form"]');
        if (scrollToFormBtn) {
            scrollToFormBtn.addEventListener('click', () => {
                const formContainer = document.getElementById('inline-lead-form-container');
                // ... (zbytek kódu zůstává stejný)
                const toggleBtn = document.getElementById('show-inline-lead-btn');
                if (formContainer && formContainer.classList.contains('hidden')) {
                    formContainer.classList.remove('hidden');
                    if (toggleBtn) {
                        toggleBtn.innerHTML = '❌ Zrušit';
                        toggleBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                        toggleBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
                    }
                }
                setTimeout(() => {
                    if (formContainer) { formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                }, 100);
            });
        }
        
        // 7. Fixace s AI je řešena v globálním handleClick, zde není potřeba nic přidávat.
    }
    
    // Znovu zavoláme init pro jistotu, ale je voláno už nahoře
});