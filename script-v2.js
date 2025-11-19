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
const scoreHTML = (label, value, color, icon, explanation) => {
    // Kontrola, zda hodnota existuje a je číslo
    const displayValue = (typeof value === 'number' && !isNaN(value)) ? Math.round(value) : 0; // Zaokrouhlíme pro jistotu
    const safeExplanation = explanation || ''; // Zajistíme, že explanation není undefined

    // Správné sestavení HTML bez komentářů
    return `
    <div class="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
       <div class="flex items-center justify-between mb-1">
           <span class="text-sm font-semibold flex items-center">
               <span class="text-lg mr-1">${icon}</span> ${label}
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
        calculatorInteracted: false // <-- NOVÁ PROMĚNNÁ
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
        if (!targetElement) return;

        // Najdeme výšku fixního headeru
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 0;
        
        // Vypočítáme cílovou pozici s odsazením o výšku headeru a malou rezervou (např. 20px)
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

        // Plynule posuneme na vypočítanou pozici
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    };
    
    const isMobile = () => window.innerWidth < 768;
    const isTablet = () => window.innerWidth >= 768 && window.innerWidth < 1024;
    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // --- COMPONENT FACTORIES ---
    const createSlider = (id, label, value, min, max, step, containerClass = '', infoText = '') => {
    let suffix = ' Kč';
    if (id.includes('Term') || id.includes('age') || id.includes('fixation')) {
        suffix = ' let';
    } else if (id.includes('children')) {
        suffix = '';
    }

    const isMobileDevice = isMobile(); // Získáme informaci, zda je to mobil
    const infoIcon = infoText ? `<span class="info-icon" data-info-key="${id}" data-info-text="${infoText}">?</span>` : '';

    // --- Změna layoutu pro mobil ---
    // Na mobilu: Label a Input pod sebou (flex-col). Na desktopu: Vedle sebe (sm:flex-row).
    const topRowClasses = isMobileDevice
        ? "flex flex-col items-start mb-2 gap-1" // Mobil: Pod sebou, zarovnání doleva, mezera 1
        : "flex flex-row justify-between items-center mb-2 gap-2"; // Desktop: Vedle sebe, mezery mezi, zarovnání na střed

    const labelClasses = isMobileDevice
        ? "form-label text-sm m-0 flex items-center gap-1.5" // Mobil: Menší text
        : "form-label m-0 flex-shrink-0 flex items-center gap-1.5"; // Desktop

    const inputWrapperClasses = isMobileDevice
        ? "flex items-center gap-1 w-full justify-end" // Mobil: Input zabere celou šířku, zarovnání doprava
        : "flex items-center gap-1 relative z-10"; // Desktop: Původní styl

    const inputClasses = isMobileDevice
        ? "slider-value-input text-base max-w-[140px]" // Mobil: Větší písmo, mírně větší šířka
        : "slider-value-input max-w-[140px]"; // Desktop: Původní styl

    const suffixClasses = isMobileDevice
        ? "font-semibold text-gray-500 text-sm flex-shrink-0" // Mobil: Menší text
        : "font-semibold text-gray-500 text-sm flex-shrink-0"; // Desktop: Původní styl (upravena velikost)

    // Sestavení HTML s novými třídami
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
    
    // --- DYNAMIC CONTENT & LAYOUTS ---
    // ZAČÁTEK BLOKU K VLOŽENÍ (Pomocné funkce)

    // === ZKOPÍROVANÉ FUNKCE Z rates.js (vložte do script.js) ===
    const calculateMonthlyPayment = (p, r, t) => { 
        const mR = r / 1200, n = t * 12; 
        if (mR === 0) return p / n; 
        // Přidána kontrola pro t=0, aby nedošlo k dělení nulou nebo NaN
        if (n === 0) return Infinity; 
        const powerTerm = Math.pow(1 + mR, n);
        // Přidána kontrola pro případ, že powerTerm je 1 (např. r=0 nebo n=0)
        if (powerTerm === 1) return p / n; 
        return (p * mR * powerTerm) / (powerTerm - 1); 
    };

    const calculateFixationAnalysis = (loanAmount, propertyValue, rate, loanTerm, fixation) => {
        // Přidána kontrola pro případ, že loanTerm nebo fixation jsou neplatné
        if (loanTerm <= 0 || fixation <= 0 || fixation > loanTerm) {
            console.warn("Neplatný loanTerm nebo fixation v calculateFixationAnalysis");
            return null; // Vracíme null, pokud jsou data nekonzistentní
        }
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
        // Pokud je splátka neplatná (např. nekonečno), vrátíme null
        if (!isFinite(monthlyPayment)) {
            console.warn("Neplatná měsíční splátka v calculateFixationAnalysis");
            return null;
        }

        const monthlyRate = rate / 100 / 12; 
        let remainingBalance = loanAmount;
        let totalInterest = 0;
        let totalPrincipal = 0;
        const numberOfFixationPayments = fixation * 12;

        for (let i = 0; i < numberOfFixationPayments; i++) {
            // Kontrola, zda remainingBalance má smysl
            if (remainingBalance <= 0) break; 
            const interestPayment = remainingBalance * monthlyRate;
            const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance); // Ochrana proti zápornému zůstatku
            
            totalInterest += interestPayment;
            totalPrincipal += principalPayment;
            remainingBalance -= principalPayment;
        }
        
        // Zajistíme, že zůstatek není záporný (kvůli zaokrouhlovacím chybám)
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
            taxSavings: numberOfFixationPayments > 0 ? Math.round(totalInterest * 0.15 / numberOfFixationPayments) : 0, // Ochrana proti dělení nulou
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
    // ==========================================================

    // KONEC BLOKU K VLOŽENÍ

    const getCalculatorLayout = (formHTML) => 
        `<div class="bg-white p-4 md:p-6 lg:p-12 rounded-2xl shadow-xl border">${formHTML}</div>`;
    
    // KRITICKÁ ZMĚNA - Chat layout s permanentním inputem
    const getAiLayout = () => {
        const isMobileDevice = isMobile() || window.innerWidth < 1024;
        
        if (isMobileDevice) {
            // MOBILNÍ VERZE - input je fixní dole, zprávy mají padding-bottom
            const inputFooterHeight = '68px'; // Odhadovaná výška inputu + padding
            const suggestionsHeight = '45px'; // Odhadovaná výška suggestions
            return `
                <div id="ai-chat-wrapper" style="position: relative; width: 100%; height: calc(100vh - 8rem); display: flex; flex-direction: column; overflow: hidden;">

                    <div id="chat-messages" style="flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 12px; padding-bottom: calc(${inputFooterHeight} + ${suggestionsHeight} + 12px); background: #f9fafb; border: 1px solid #e5e7eb; border-bottom: none; border-radius: 8px 8px 0 0;">
                    </div>

                     <div id="ai-suggestions" style="padding: 8px 12px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; background: white; overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap; height: ${suggestionsHeight}; box-sizing: border-box;">
                     </div>

                    <div id="chat-input-footer" style="position: fixed; bottom: 0; left: 0; right: 0; padding: 12px; background: white; border-top: 2px solid #2563eb; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); z-index: 1000; height: ${inputFooterHeight}; box-sizing: border-box;">
                    </div>

                    ${state.calculation.selectedOffer ? `
                    <button id="mobile-sidebar-toggle"
                            style="position: fixed; bottom: calc(${inputFooterHeight} + 20px); right: 20px; width: 56px; height: 56px; background: #2563eb; color: white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 900; border: none; cursor: pointer;"
                            data-action="toggle-mobile-sidebar">
                        <span style="font-size: 24px;">📊</span>
                    </button>
                    ` : ''}
                </div>`;
        }
        
        // DESKTOP VERZE - Přepnuto na grid layout
        return `
            <div class="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
                <div id="ai-chat-desktop-wrapper" class="lg:col-span-8 bg-white rounded-2xl shadow-xl border flex flex-col" style="min-height: calc(85vh - 100px);">
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
                    
                    <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4"></div>
                    
                    <div id="ai-suggestions" class="p-4 border-t bg-gray-50"></div>
                    
                    <div id="chat-input-footer" class="p-4 border-t bg-white rounded-b-2xl">
                        </div>
                </div>
                <div id="sidebar-container" class="lg:col-span-4 lg:sticky top-28"></div>
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
        
        // Sidebar overlay pro mobil
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
                    <h3 class="text-xl font-bold mb-4 flex items-center">
                        <span class="text-2xl mr-2">💼</span> Váš hypoteční plán
                    </h3>
                    
                    <div class="bg-white p-4 rounded-xl mb-4 shadow-sm">
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Úvěr:</span>
                                <strong>${formatNumber(loanAmount)}</strong>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Nemovitost:</span>
                                <strong>${formatNumber(effectivePropertyValue)}</strong> 
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
                    <div class="bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-200">
                        <p class="text-xs font-semibold text-yellow-800 mb-2">⚡ Rychlá analýza</p>
                        <div class="text-xs text-gray-700 space-y-1">
                            <div>📅 Denně platíte: <strong>${formatNumber(quickAnalysis.dailyCost)}</strong></div>
                            <div>🏠 Splátka vs. odhad nájmu: 
                                ${monthlyPayment <= quickAnalysis.estimatedRent 
                                    ? `Vaše splátka je o <strong>${formatNumber(quickAnalysis.estimatedRent - monthlyPayment)} Kč nižší</strong>` 
                                    : `Vaše splátka je o <strong>${formatNumber(monthlyPayment - quickAnalysis.estimatedRent)} Kč vyšší</strong>`
                                }
                            </div>
                            <div>💰 Daňová úleva: až <strong>${formatNumber(quickAnalysis.taxSavings)}/měs</strong></div>
                        </div>
                    </div>
                    ` : ''}

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
                    
                    </div>`;
        } else {
            // ... (Kód pro "Rychlý start" zůstává stejný) ...
            // Tento kód se nemění
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
                                data-quick-question="Jaký je rozdíl mezi fixací na 3, 5 a 10 let?">
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
                        📢 Spočítat hypotéku
                    </button>
                    <button class="nav-btn bg-green-600 hover:bg-green-700 w-full" 
                            data-action="show-lead-form">
                        📞 Domluvit se specialistou
                    </button>
                </div>`;
        }
    };
    
    const getExpressHTML = () => getCalculatorLayout(`
        <div id="express-form" class="space-y-8" style="max-width: 100%; overflow: hidden;">
            ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000, '', 'Cena nemovitosti, kterou kupujete.')}
            ${createSlider('loanAmount','Chci si půjčit',state.formData.loanAmount,200000,20000000,100000, '', 'Částka, kterou si potřebujete půjčit.')}
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

    // ZAČÁTEK KOMPLETNÍ A OPRAVENÉ FUNKCE renderResults

// ============================================
// HLAVNÍ ZMĚNA V2: NOVÁ FUNKCE renderResults()
// ============================================
// OPRAVENÁ FUNKCE renderResults() - V2.1
// ============================================
// ZMĚNY V2.1:
// - Odstranit RPSN z nejlepší nabídky
// - Více informací (fixace, LTV, vhodné pro...)
// - Všechny nabídky na šířku s více detaily
// - Změněný text CTA (méně formální)
// - Zmenšený CTA box
// - Další CTA tlačítko pod grafem
// - Opravené event listenery
// ============================================

const renderResults = () => {
    const offers = state.calculation?.offers || [];
    const approvability = state.calculation?.approvability;
    let selectedOffer = state.calculation?.selectedOffer;

    const container = document.getElementById('results-container');
    if (!container) {
        console.error("Kontejner pro výsledky (#results-container) nebyl nalezen.");
        return;
    }

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

    // Výpočet LTV pro zobrazení
    const ltvPercentage = approvability?.ltv || 0;
    const currentFixation = state.formData.fixation || 3;
    const employment = state.formData.employment || 'zaměstnanec';

    // NOVÁ VERZE V2.1: Nejlepší nabídka s více informacemi
    const bestOfferHTML = selectedOffer ? `
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-5 sm:p-6 rounded-xl border-2 border-green-300 shadow-lg mb-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl sm:text-2xl font-bold text-green-900 flex items-center">
                    <span class="text-2xl mr-2">✅</span> Nejlepší nabídka pro vás
                </h3>
                ${offers.length > 1 ? `<button class="text-sm text-blue-600 hover:text-blue-800 font-semibold underline" data-action="show-all-offers">Zobrazit všech ${offers.length} nabídek ↓</button>` : ''}
            </div>
            
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 bg-white p-4 rounded-lg mb-3">
                <div>
                    <p class="text-xs text-gray-500 mb-1">💰 Měsíční splátka</p>
                    <p class="text-xl sm:text-2xl font-bold text-gray-900">${formatNumber(selectedOffer.monthlyPayment)}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 mb-1">📊 Úroková sazba</p>
                    <p class="text-xl sm:text-2xl font-bold text-blue-600">${selectedOffer.rate?.toFixed(2)}%</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 mb-1">💵 Celkem zaplatíte</p>
                    <p class="text-xl sm:text-2xl font-bold text-gray-700">${formatNumber(selectedOffer.totalPayment || selectedOffer.monthlyPayment * (state.formData.loanTerm || 30) * 12)}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-lg">
                <div class="flex items-center">
                    <span class="text-base mr-1">🔒</span>
                    <div>
                        <p class="text-gray-500">Fixace</p>
                        <p class="font-semibold">${currentFixation} let</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <span class="text-base mr-1">🏠</span>
                    <div>
                        <p class="text-gray-500">LTV</p>
                        <p class="font-semibold">${ltvPercentage}%</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <span class="text-base mr-1">⏳</span>
                    <div>
                        <p class="text-gray-500">Splatnost</p>
                        <p class="font-semibold">${state.formData.loanTerm || 30} let</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <span class="text-base mr-1">👤</span>
                    <div>
                        <p class="text-gray-500">Vhodné pro</p>
                        <p class="font-semibold">${employment === 'osvč' ? 'OSVČ' : 'Zaměstnance'}</p>
                    </div>
                </div>
            </div>
            
            ${selectedOffer.highlights ? `<div class="flex flex-wrap gap-2 mt-3">${selectedOffer.highlights.map(h => `<span class="inline-block px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full font-semibold">${h}</span>`).join('')}</div>` : ''}
        </div>
    ` : '';

    // NOVÁ VERZE V2.1: Všechny nabídky NA ŠÍŘKU s více informacemi
    const allOffersHTML = offers.length > 1 ? `
        <div id="all-offers-container" class="hidden mb-6">
            <h4 class="text-lg font-bold mb-3 text-gray-700">📋 Porovnání všech ${offers.length} nabídek:</h4>
            <div class="overflow-x-auto">
                <table class="w-full bg-white rounded-lg shadow-md text-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-3 text-left font-semibold">Nabídka</th>
                            <th class="px-4 py-3 text-center font-semibold">Měsíční splátka</th>
                            <th class="px-4 py-3 text-center font-semibold">Úrok</th>
                            <th class="px-4 py-3 text-center font-semibold">Celkem</th>
                            <th class="px-4 py-3 text-center font-semibold">Highlights</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${offers.map((o, idx) => `
                            <tr class="border-t hover:bg-blue-50 cursor-pointer offer-row ${o.id === selectedOffer?.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}" data-offer-id="${o.id}">
                                <td class="px-4 py-3">
                                    <div class="font-bold text-blue-700">${idx === 0 ? '🏆 ' : ''}${o.title || 'Nabídka ' + (idx + 1)}</div>
                                    <div class="text-xs text-gray-500">${o.description || ''}</div>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <div class="font-bold text-lg">${formatNumber(o.monthlyPayment)}</div>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <div class="font-semibold text-blue-600">${o.rate?.toFixed(2)}%</div>
                                </td>
                                <td class="px-4 py-3 text-center">
                                    <div class="text-gray-700">${formatNumber(o.totalPayment || o.monthlyPayment * (state.formData.loanTerm || 30) * 12)}</div>
                                </td>
                                <td class="px-4 py-3">
                                    ${o.highlights ? `<div class="flex flex-wrap gap-1 justify-center">${o.highlights.slice(0, 2).map(h => `<span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">${h}</span>`).join('')}</div>` : '<span class="text-xs text-gray-400">-</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    ` : '';

    // NOVÁ VERZE V2.1: Kompaktnější CTA box s přátelštějším textem
    const megaCTAHTML = `
        <div class="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 sm:p-6 rounded-2xl shadow-2xl mb-6 text-white">
            <div class="text-center mb-4">
                <div class="text-3xl sm:text-4xl mb-2">💬</div>
                <h3 class="text-xl sm:text-2xl font-extrabold mb-1">Chci pomoc experta</h3>
                <p class="text-sm text-blue-100 mb-1">Vyjedná ti nejlepší podmínky a provede celým procesem</p>
                <p class="text-xs text-blue-200">✓ Zdarma  ✓ Do 24 hodin  ✓ Bez závazků</p>
            </div>
            
            <div class="text-center">
                <button 
                    id="show-inline-lead-btn" 
                    data-action="toggle-inline-lead-form"
                    class="nav-btn bg-green-600 hover:bg-green-700 text-white text-base sm:text-lg font-bold px-6 sm:px-10 py-3 sm:py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all inline-block">
                    ✅ Chci zavolat zdarma
                </button>
            </div>
            
            <!-- INLINE LEAD FORM -->
            <div id="inline-lead-form-container" class="hidden mt-5 bg-white rounded-xl p-5 text-gray-800">
                <h4 class="text-base font-bold mb-3 text-center text-gray-900">📋 Zadej své kontaktní údaje</h4>
                <form id="inline-lead-form" name="inline-lead-form" method="POST" data-netlify="true" class="space-y-3">
                    <input type="hidden" name="form-name" value="inline-lead-form" />
                    <input type="hidden" name="extraData" id="inline-extra-data" />
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="form-label text-sm">Jméno a příjmení *</label>
                            <input type="text" name="name" required 
                                pattern="^[A-Za-zÀ-ž\\s]{2,}(\\s[A-Za-zÀ-ž\\s]{2,})?$"
                                class="modern-input text-sm">
                        </div>
                        <div>
                            <label class="form-label text-sm">Telefon *</label>
                            <input type="tel" name="phone" required
                                pattern="^(\\+420)? ?[1-9][0-9]{2} ?[0-9]{3} ?[0-9]{3}$"
                                class="modern-input text-sm">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="form-label text-sm">E-mail *</label>
                            <input type="email" name="email" required class="modern-input text-sm">
                        </div>
                        <div>
                            <label class="form-label text-sm">PSČ *</label>
                            <input type="text" name="psc" required 
                                pattern="^\\d{3} ?\\d{2}$"
                                placeholder="např. 110 00"
                                class="modern-input text-sm">
                        </div>
                    </div>
                    <div>
                        <label class="form-label text-sm">Kdy tě můžeme kontaktovat?</label>
                        <select name="contact-time" class="modern-select text-sm">
                            <option value="kdykoliv">Kdykoliv během dne</option>
                            <option value="rano">Ráno (8:00 - 12:00)</option>
                            <option value="odpoledne">Odpoledne (12:00 - 17:00)</option>
                            <option value="vecer">Večer (17:00 - 20:00)</option>
                            <option value="vikend">Pouze o víkendu</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label text-sm">Poznámka (nepovinné)</label>
                        <textarea name="note" rows="2" class="modern-input text-sm" placeholder="Např. už mám předschválenou hypotéku..."></textarea>
                    </div>
                    <div class="text-center pt-2">
                        <p class="text-xs text-gray-500 mb-3">Odesláním souhlasíš se zpracováním osobních údajů.</p>
                        <button type="submit" class="w-full nav-btn bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-base">
                            📞 Odeslat nezávazně
                        </button>
                    </div>
                </form>
                <div id="inline-form-success" class="hidden mt-4 text-center p-3 bg-green-100 text-green-800 rounded-lg">
                    <h5 class="font-bold">✅ Děkujeme!</h5>
                    <p class="text-sm">Váš požadavek byl odeslán. Ozveme se vám brzy.</p>
                </div>
            </div>
        </div>
    `;

    // Alternativní možnosti - V2.2: Podmíněné zobrazení
    const alternativesHTML = `
        <div class="grid grid-cols-1 ${state.mode !== 'guided' ? 'sm:grid-cols-2' : ''} gap-4 mb-6">
            <div class="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer" data-action="discuss-with-ai">
                <div class="flex items-center mb-2">
                    <span class="text-2xl mr-2">💬</span>
                    <h4 class="text-base font-bold text-gray-900">Probrat s AI asistentem</h4>
                </div>
                <p class="text-xs text-gray-600 mb-3">Okamžité odpovědi, stress testy, scénáře</p>
                <button class="nav-btn bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 w-full" data-action="discuss-with-ai">
                    Spustit AI chat
                </button>
            </div>
            
            ${state.mode !== 'guided' ? `
            <div class="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer" data-action="switch-to-guided">
                <div class="flex items-center mb-2">
                    <span class="text-2xl mr-2">📊</span>
                    <h4 class="text-base font-bold text-gray-900">Detailní analýza</h4>
                </div>
                <p class="text-xs text-gray-600 mb-3">Kompletní scoring, DSTI, stress testy ČNB</p>
                <button class="nav-btn bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-4 w-full" data-action="switch-to-guided">
                    Přepnout na detailní
                </button>
            </div>
            ` : ''}
        </div>
    `;

    // Skóre (pokud existuje)
    let scoreSectionHTML = '';
    if (approvability) {
        const ltvExplanation = approvability.ltv > 85 ? 'Optimální LTV.' : approvability.ltv > 70 ? 'Dobré LTV.' : 'Hraniční LTV.';
        const dstiExplanation = approvability.dsti > 80 ? 'Výborné DSTI.' : approvability.dsti > 60 ? 'Dostatečná rezerva.' : 'Nižší rezerva.';
        const bonitaExplanation = approvability.bonita > 85 ? 'Excelentní bonita.' : approvability.bonita > 70 ? 'Velmi dobrá bonita.' : 'Standardní bonita.';
        const totalScoreValue = (typeof approvability.total === 'number' && !isNaN(approvability.total)) ? approvability.total : 0;
        
        scoreSectionHTML = `
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-5 rounded-xl border border-blue-200 shadow-lg mb-6">
                <h4 class="text-lg sm:text-xl font-bold mb-4 flex items-center">
                    <span class="text-2xl mr-2">🎯</span> Skóre vaší žádosti
                </h4>
                <div class="space-y-3">
                    ${scoreHTML('LTV', approvability.ltv, 'bg-green-500', '🏠', ltvExplanation)}
                    ${scoreHTML('DSTI', approvability.dsti, 'bg-yellow-500', '💰', dstiExplanation)}
                    ${scoreHTML('Bonita', approvability.bonita, 'bg-blue-500', '⭐', bonitaExplanation)}
                </div>
                <div class="mt-5 p-4 bg-white rounded-xl text-center">
                    <h5 class="text-sm font-bold mb-2">Celková šance na schválení:</h5>
                    <div class="text-3xl sm:text-4xl font-bold text-green-600">${totalScoreValue}%</div>
                </div>
                
                <div class="mt-4 text-center">
                    <button class="nav-btn bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 flex items-center justify-center gap-2 mx-auto" data-action="discuss-score-with-ai">
                        <span>💬 Probrat skóre s AI</span>
                        <span class="info-icon" data-info-key="score-ai" data-info-text="AI asistent ti pomůže pochopit tvé skóre a poradí, jak ho zlepšit. Získáš personalizované tipy podle tvé konkrétní situace.">?</span>
                    </button>
                </div>
            </div>`;
    }

    // Graf splácení
    const chartHTML = `
        <div class="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-lg mb-6">
            <h4 class="text-lg sm:text-xl font-bold mb-4 flex items-center">
                <span class="text-2xl mr-2">📈</span> Vývoj splácení v čase
            </h4>
            <div class="relative h-60 sm:h-80">
                <canvas id="resultsChart"></canvas>
            </div>
        </div>
    `;

    // NOVÉ: Další CTA pod grafem
    const bottomCTAHTML = `
        <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-300 text-center mb-6">
            <h4 class="text-lg font-bold text-gray-900 mb-2">💡 Líbí se ti nabídka?</h4>
            <p class="text-sm text-gray-600 mb-3">Nech si pomoci od experta s vyjednáním nejlepší sazby</p>
            <button class="nav-btn bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3" data-action="scroll-to-form">
                📞 Zavolat mi zdarma
            </button>
        </div>
    `;

    // Detaily fixace
    let fixationDetailsHTML = '';
    if (fixationDetails) {
        const currentFixation = state.formData.fixation || 3;
        const currentLoanAmount = state.formData.loanAmount || 0;
        const effectiveTerm = Math.min(state.formData.loanTerm || 30, Math.max(5, 70 - (state.formData.age || 35)));
        
        fixationDetailsHTML = `
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-5 rounded-xl border border-green-200 shadow-lg mb-6">
                <h4 class="text-lg sm:text-xl font-bold mb-3 flex items-center">
                    <span class="text-2xl mr-2">📊</span> Detaily fixace
                </h4>
                <div class="bg-white p-4 rounded-xl space-y-2 text-sm shadow-sm mb-4">
                    <div class="flex justify-between items-center pb-2 border-b">
                        <span>Výše úvěru:</span>
                        <strong class="text-base">${formatNumber(currentLoanAmount)}</strong>
                    </div>
                    <div class="flex justify-between items-center pb-2 border-b">
                        <span>Splatnost:</span>
                        <strong class="text-base">${effectiveTerm} let</strong>
                    </div>
                    <div class="flex justify-between items-center pb-2 border-b">
                        <span>Celkem za ${currentFixation} let fixace:</span>
                        <strong class="text-base">${formatNumber(fixationDetails.totalPaymentsInFixation)}</strong>
                    </div>
                    <div class="flex justify-between items-center pb-2 border-b">
                        <span>Z toho úroky:</span>
                        <strong class="text-base text-red-600">${formatNumber(fixationDetails.totalInterestForFixation)}</strong>
                    </div>
                    <div class="flex justify-between items-center pt-2">
                        <span>Zbývající dluh po fixaci:</span>
                        <strong class="text-base">${formatNumber(fixationDetails.remainingBalanceAfterFixation)}</strong>
                    </div>
                </div>
                
                ${fixationDetails.futureScenario ? `
                    <div class="space-y-3">
                        <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs">
                            <h5 class="font-bold mb-1">💡 Scénář: Pokles sazeb</h5>
                            <p class="text-gray-600 mb-1">Pokud po ${currentFixation} letech klesne sazba na ${fixationDetails.futureScenario.optimistic.rate.toFixed(2)}%:</p>
                            <div>Nová splátka: <strong class="text-green-600">${formatNumber(fixationDetails.futureScenario.optimistic.newMonthlyPayment)}</strong></div>
                            <div>Úspora: <strong class="text-green-600">${formatNumber(fixationDetails.futureScenario.optimistic.monthlySavings)}/měs</strong></div>
                        </div>
                        
                        ${fixationDetails.futureScenario.moderateIncrease ? `
                            <div class="bg-orange-50 p-3 rounded-lg border border-orange-200 text-xs">
                                <h5 class="font-bold mb-1">📈 Scénář: Mírný růst sazeb</h5>
                                <p class="text-gray-600 mb-1">Pokud po ${currentFixation} letech vzroste sazba na ${fixationDetails.futureScenario.moderateIncrease.rate.toFixed(2)}%:</p>
                                <div>Nová splátka: <strong class="text-orange-600">${formatNumber(fixationDetails.futureScenario.moderateIncrease.newMonthlyPayment)}</strong></div>
                                <div>Navýšení: <strong class="text-orange-600">+${formatNumber(fixationDetails.futureScenario.moderateIncrease.monthlyIncrease)}/měs</strong></div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="mt-4 text-center">
                    <button class="nav-btn bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 flex items-center justify-center gap-2 mx-auto" data-action="discuss-fixation-with-ai">
                        <span>💬 Probrat fixaci s AI</span>
                        <span class="info-icon" data-info-key="fixation-ai" data-info-text="AI ti poradí s výběrem optimální délky fixace podle tvé situace. Proberete scénáře, co když sazby porostou nebo klesnou.">?</span>
                    </button>
                </div>
            </div>
        `;
    }

    // SESTAVENÍ FINÁLNÍHO HTML - V2.1
    container.innerHTML = `
        <div>
            <h3 class="text-2xl sm:text-3xl font-bold mb-6">✅ Vaše výsledky</h3>
            
            ${bestOfferHTML}
            ${allOffersHTML}
            
            ${megaCTAHTML}
            
            <h4 class="text-base font-bold mb-3 text-center text-gray-600">Nebo raději:</h4>
            ${alternativesHTML}
            
            ${scoreSectionHTML}
            ${fixationDetailsHTML}
            ${chartHTML}
            ${bottomCTAHTML}
        </div>
    `;

    if (chartData && typeof Chart !== 'undefined') {
        setTimeout(() => {
            if (state.chart) { 
                try { state.chart.destroy(); } catch(e) {}
            }
            renderChart('resultsChart', chartData);
        }, 50);
    }

    addOfferCardListeners();
    addV22EventListeners(); // NOVÁ VERZE event listenerů

    if (!container.dataset.renderedOnce) {
        setTimeout(() => scrollToTarget('#results-container'), 150);
        container.dataset.renderedOnce = "true";
    }
};
// KONEC OPRAVENÉ FUNKCE renderResults V2.1

// KONEC NOVÉ FUNKCE renderResults V2

        
    const renderChart = (canvasId, schedule) => { 
        if (state.chart) { 
            try { state.chart.destroy(); } catch (e) { console.warn("Nepodařilo se zničit starý graf:", e); }
        } 
        const ctx = document.getElementById(canvasId)?.getContext('2d'); 
        if (!ctx) {
            console.error(`Canvas element s ID "${canvasId}" nebyl nalezen.`);
            return;
        }
        // Kontrola, zda máme platná data pro graf
        if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
            console.warn("Chybí nebo jsou neplatná data pro graf.");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Vyčistíme plátno
            ctx.font = "14px Inter";
            ctx.fillStyle = "#6b7280";
            ctx.textAlign = "center";
            ctx.fillText("Data pro graf nejsou k dispozici.", ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }
        
        try {
            state.chart = new Chart(ctx, { 
                type: 'bar', 
                data: { 
                    labels: schedule.map(item => item?.year || '?'), // Bezpečný přístup k datům
                    datasets: [
                        { label: 'Úroky', data: schedule.map(item => item?.interest || 0), backgroundColor: '#ef4444' }, 
                        { label: 'Jistina', data: schedule.map(item => item?.principal || 0), backgroundColor: '#22c55e' }
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
        } catch (chartError) {
             console.error("Chyba při vytváření grafu:", chartError);
             ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
             ctx.font = "14px Inter";
             ctx.fillStyle = "red";
             ctx.textAlign = "center";
             ctx.fillText("Chyba při vykreslování grafu.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
    };
    
    const renderResultsChart = () => renderChart('resultsChart', state.calculation);
    const addOfferCardListeners = () => {
    const offerCards = document.querySelectorAll('#results-container .offer-card');
        offerCards.forEach(card => {
            // Nejprve odstraníme případné staré listenery, abychom předešli duplicitám
            card.replaceWith(card.cloneNode(true)); 
        });
        
        // Znovu najdeme karty (protože jsme je klonovali) a přidáme nové listenery
        const newOfferCards = document.querySelectorAll('#results-container .offer-card');
        newOfferCards.forEach(card => {
            card.addEventListener('click', () => {
                const offerId = card.dataset.offerId;
                const clickedOffer = state.calculation.offers.find(o => o.id === offerId);
                
                // Pokud jsme klikli na jinou kartu, než je aktuálně vybraná
                if (clickedOffer && clickedOffer.id !== state.calculation.selectedOffer?.id) {
                    console.log("Vybrána nabídka:", clickedOffer.title);
                    state.calculation.selectedOffer = clickedOffer;
                    // Překreslíme celou sekci výsledků, aby se aktualizovaly detaily a graf
                    renderResults(); 
                }
            });
        });
    };

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
            
            // ===== ZMĚNA ZDE =====
            // Původní verze negenerovala správné atributy pro posouvání.
            // Nová verze přidává class="scroll-to" a data-target="$2", aby se odkaz choval správně.
            let processedMessage = message
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\[(.*?)\]\((#.*?)\)/g, '<a href="$2" data-target="$2" class="scroll-to font-bold text-blue-600 underline">$1</a>')
                .replace(/\n/g, '<br>');
            // ======================

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
                "📢 Spočítat hypotéku", 
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
        state.calculatorInteracted = true;
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
            if (!isSilent) {
                renderResults();
                // Přidáno: Počkáme chvilku, než se výsledky vykreslí, a pak sjedeme
                setTimeout(() => scrollToTarget('#results-container'), 150); 
            }
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
    const { loanAmount, propertyValue, landValue, purpose } = state.formData;

    // Zjistíme celkovou budoucí hodnotu nemovitosti
    const effectivePropertyValue = purpose === 'výstavba' ? propertyValue + landValue : propertyValue;

    const ltv = effectivePropertyValue > 0 ? Math.round((loanAmount / effectivePropertyValue) * 100) : 0;
    const display = document.getElementById('ltv-display');
    if (display) {
        display.textContent = `Aktuální LTV: ${ltv}%`;
        // Změníme barvu textu, pokud je LTV příliš vysoké
        display.style.color = ltv > 100 ? '#ef4444' : '#10b981';
    }

    // Zobrazíme i celkovou hodnotu nemovitosti pro lepší přehlednost
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
            
            if (['loanAmount', 'propertyValue'].includes(baseId)) {
                updateLTVDisplay();
            }
            if (baseId === 'purpose') {
                handleGuidedFormLogic();
            }
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

    // script.js

    const handleInfoTooltip = (e) => {
    const icon = e.target.closest('.info-icon');
    const existingTooltip = document.getElementById('active-tooltip');

    // Kliknutí na ikonu?
    if (icon) {
        e.preventDefault(); // <-- TOTO JE KLÍČOVÁ OPRAVA
        e.stopPropagation(); // Zastavíme další zpracování kliknutí

        // Pokud už tooltip existuje a je pro tuto ikonu, zavřeme ho
        if (existingTooltip && existingTooltip.dataset.key === icon.dataset.infoKey) {
            existingTooltip.remove();
            return;
        }
        // Pokud existuje jiný, zavřeme ho
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // Vytvoříme nový tooltip
        const infoText = icon.dataset.infoText;
        const infoKey = icon.dataset.infoKey;

        const tooltip = document.createElement('div');
        tooltip.id = 'active-tooltip';
        tooltip.className = 'info-tooltip';
        tooltip.dataset.key = infoKey; // Uložíme si klíč pro identifikaci
        tooltip.innerHTML = `
            <p>${infoText}</p>
            <button class="ask-ai-btn" data-action="ask-ai-from-calc" data-question-key="${infoKey}">Zeptat se AI podrobněji</button>
        `;

        document.body.appendChild(tooltip);
        const rect = icon.getBoundingClientRect();
        
        // Výpočet pozice tooltipu (s ohledem na okraj obrazovky)
        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 8;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        
        // Zobrazíme s animací
        requestAnimationFrame(() => {
             // Zkontrolujeme, zda se vejde na šířku
             const tooltipRect = tooltip.getBoundingClientRect();
             if (tooltipRect.right > window.innerWidth - 10) {
                  tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10 + window.scrollX}px`;
             }
             tooltip.classList.add('visible');
        });
    } 
    // Kliknutí Mimo ikonu a Mimo tooltip? Zavřeme ho.
    else if (existingTooltip && !e.target.closest('#active-tooltip')) {
        existingTooltip.remove();
    }
    // Kliknutí uvnitř tooltipu nedělá nic (zpracuje ho handleClick)
};

    // ZAČÁTEK NOVÉHO BLOKU handleClick
    const handleClick = async (e) => {
        let target = e.target.closest('[data-action], .offer-card, .suggestion-btn, [data-mode], .scroll-to, [data-quick-question]');
        if (!target) return; // Pokud kliknutí není na interaktivní prvek, nic nedělej

        // e.preventDefault() je nyní voláno POUZE tam, kde je potřeba (u odkazů s #)
        if (target.matches('a[href^="#"]')) {
            e.preventDefault();
        }
        
        const { action, mode, suggestion, target: targetId } = target.dataset;
        const quickQuestion = target.dataset.quickQuestion;

        if(action === 'ask-ai-from-calc') {
            const questionKey = target.dataset.questionKey;

            // --- TENTO OBJEKT KOMPLETNĚ NAHRAĎTE ---
            const questions = {
                // Klíče z kalkulačky
                'propertyValue': "Jak hodnota nemovitosti ovlivňuje hypotéku?",
                'loanAmount': "Proč je důležité správně nastavit výši úvěru?",
                'income': "Jak banky posuzují můj příjem a co všechno se započítává?",
                'loanTerm': "Jaký je rozdíl ve splátce a úrocích při splatnosti 20 vs 30 let?",
                'fixation': "Jaká je nejlepší strategie pro volbu fixace?",
                'liabilities': "Jak mé ostatní půjčky ovlivňují šanci na získání hypotéky?",
                'age': "Proč je můj věk důležitý pro banku?",
                'children': "Jak počet dětí ovlivňuje výpočet bonity?",
                'landValue': "Proč je důležitá hodnota pozemku u výstavby?",
                
                // Klíče z výsledků (nově přidané)
                'quickAnalysis': "Co přesně znamenají položky v Rychlé analýze (denní náklady, úleva, nájem)?",
                'vsRent': "Jak přesně se počítá srovnání splátky s nájsem a jaké jsou výhody vlastnictví?",
                'optimisticScenario': "Vysvětli mi podrobněji ten optimistický scénář s poklesem sazeb.",
                'moderateScenario': "Co znamená ten scénář s mírným růstem sazeb?"
            };
            // --- KONEC NÁHRADY ---
            
            const question = questions[questionKey] || `Řekni mi více o poli ${questionKey}.`;
            document.getElementById('active-tooltip')?.remove();
            
            switchMode('ai');
            setTimeout(() => handleChatMessageSend(question), 300);
            return;
        }

        if (action === 'toggle-mobile-sidebar' || action === 'close-mobile-sidebar') {
            toggleMobileSidebar(); // Předpokládáme, že tato funkce existuje
            return;
        }

        if (quickQuestion) {
            if (isMobile()) toggleMobileSidebar(); // Předpokládáme, že tato funkce existuje
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
        else if (mode) {
            switchMode(mode);
        }
        else if (action === 'calculate') {
            calculateRates(target); // Předpokládáme, že tato funkce existuje
        }
        else if (action === 'go-to-calculator') {
            if (isMobile()) toggleMobileSidebar(); // Předpokládáme, že tato funkce existuje
            switchMode('express');
        }
        else if (action === 'show-lead-form') {
            if (isMobile()) toggleMobileSidebar(); // Předpokládáme, že tato funkce existuje
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
                // Zde by mohlo být volání renderResultsChart(), pokud existuje
            }
        }
        else if (action === 'discuss-with-ai' || action === 'discuss-fixation-with-ai') {
            switchMode('ai', true);
        }
        else if (action === 'reset-chat') {
            state.chatHistory = [];
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) chatMessages.innerHTML = '';
            addChatMessage('Jsem váš hypoteční poradce s AI nástroji. Jak vám mohu pomoci?', 'ai');
            generateAISuggestions(); // Předpokládáme, že tato funkce existuje
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
            handleChatMessageSend(message); // Předpokládáme, že tato funkce existuje
        }
        else if (target.matches('.offer-card')) {
            document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
            target.classList.add('selected');
            state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === target.dataset.offerId);
            // Zde by mohlo být volání renderResultsChart(), pokud existuje
        }
    };
    // KONEC NOVÉHO BLOKU handleClick
  // ZAČÁTEK KOMPLETNÍ FUNKCE handleFormSubmit
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        // ===== Hledáme tlačítko podle jeho ID =====
        const btn = document.getElementById('submit-lead-btn'); 

        // Přidáme kontrolu, zda bylo tlačítko nalezeno
        if (!btn) {
            console.error("Chyba: Odesílací tlačítko (submit-lead-btn) nebylo nalezeno!");
            // Můžeme zobrazit chybu uživateli, nebo jen logovat
            alert('Došlo k chybě při odesílání, zkuste to prosím znovu.');
            return; // Ukončíme funkci, pokud tlačítko není
        }
        // ======================================================
        
        btn.disabled = true;
        btn.textContent = '📤 Odesláno 👌'; // Změněn text po odeslání

        try {
            // 1. Ručně posbíráme data z viditelných polí formuláře
            const bodyParams = new URLSearchParams();
            bodyParams.append('form-name', form.getAttribute('name'));
            bodyParams.append('name', form.querySelector('#name').value);
            bodyParams.append('phone', form.querySelector('#phone').value);
            bodyParams.append('email', form.querySelector('#email').value);
            bodyParams.append('psc', form.querySelector('#psc').value);
            bodyParams.append('contact-time', form.querySelector('#contact-time').value);
            bodyParams.append('note', form.querySelector('#note').value);

            // 2. Připravíme bezpečná "extra data" bez komplexních objektů
            const extraData = {
                chatHistory: state.chatHistory // Historie chatu se posílá vždy
            };

            if (state.calculatorInteracted) {
                const safeCalculationData = {
                    offers: state.calculation.offers,
                    selectedOffer: state.calculation.selectedOffer,
                    approvability: state.calculation.approvability,
                    ...(state.calculation.fixationDetails && { fixationDetails: state.calculation.fixationDetails })
                };
                extraData.calculation = safeCalculationData;
                extraData.formData = state.formData; // Přidáme i vstupní data kalkulačky
                console.log("Přidávám data z kalkulačky."); // Log pro kontrolu
            } else {
                console.log("Kalkulačka nebyla použita, data nepřidávám."); // Log pro kontrolu
            }

            // 3. Přidáme extra data do těla požadavku (pokud nějaká jsou)
            if (Object.keys(extraData).length > 0) {
                // POZOR: Tento řádek byl duplicitní, ponecháme jen jeden
                bodyParams.append('extraData', JSON.stringify(extraData, null, 2)); 
            }

            // 4. Odešleme data na správný endpoint funkce
            const response = await fetch('/.netlify/functions/form-handler', { // Cíl je funkce
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: bodyParams.toString()
            });
            
            // 5. Zkontrolujeme, zda funkce odpověděla úspěšně
            if (response.ok) {
            form.style.display = 'none';
            const successMessage = document.getElementById('form-success');
            if (successMessage) successMessage.style.display = 'block';
             setTimeout(() => scrollToTarget('#kontakt'), 100);

             // ===== KONTROLA ZDE =====
             if (typeof gtag === 'function') {
                 // Původní GA4 event
                 gtag('event', 'generate_lead', {
                     'event_category': 'form_submission',
                     'event_label': 'hypoteka_kontakt',
                 });
                 console.log('GA4 event generate_lead sent.'); 

                 // ===== NOVÝ KÓD PRO GOOGLE ADS KONVERZI =====
                 gtag('event', 'conversion', {
                     'send_to': 'AW-778075298/UyVCMT9zpABEKLSgfgMC'
                 });
                 console.log('Google Ads conversion event sent.');
                 // ===========================================

             } else {
                 console.warn('gtag function not found. GA4 event not sent.');
             }
             // =======================

        } else {
             // Pokud funkce vrátí chybu (např. 500)
             throw new Error(`Odeslání selhalo: ${response.status} ${response.statusText}`);
        }

        } catch (error) { // Správně umístěný catch blok
            console.error('Chyba při odesílání formuláře:', error);
            alert('Odeslání se nezdařilo. Zkuste to prosím znovu, nebo nás kontaktujte přímo.');
            // Tlačítko povolíme, jen pokud ještě existuje (nebylo skryto)
            if (btn) {
                btn.disabled = false;
                btn.textContent = '📞 Odeslat nezávazně';
            }
        }
        // Není potřeba `finally`
    };
    // KONEC KOMPLETNÍ FUNKCE handleFormSubmit

    // ZAČÁTEK NOVÉHO BLOKU
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
        }, 30000); // Zvýšený timeout na 30 sekund
        
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
                • Česká spořitelna, ČSOB, Komerční banka, Raiffeisenbank, UniCredit Bank
                • Hypoteční banka, Modrá pyramida, ČMSS, Buřinka
                • MONETA, mBank, Fio banka, Air Bank, Banka CREDITAS
                a další. Celkem pracujeme s **19+ institucemi**.`;
                
                addChatMessage(banksList, 'ai');
            }
            else {
                addChatMessage(data.response, 'ai');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            document.getElementById('typing-indicator')?.remove();
            // ZMĚNA ZDE
            const errorMessage = `Omlouvám se, došlo k chybě. Nejlepší bude, když se na to podívá přímo náš specialista.
            <br><br><button class="nav-btn" data-action="show-lead-form" style="background-color: var(--success-color); margin-top: 8px;">📞 Domluvit se specialistou</button>`;
            addChatMessage(errorMessage, 'ai');
        } finally {
            state.isAiTyping = false;
        }
    };
    // KONEC NOVÉHO BLOKU

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
   
    const switchMode = (mode, fromResults = false, isInitialLoad = false) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        
        DOMElements.contentContainer.innerHTML = ""; // Vždy vyčistíme kontejner

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
            else if (fromResults) {
                setTimeout(() => handleChatMessageSend("Stručně zanalyzuj klíčové body mé kalkulace."), 100);
            } else {
                addChatMessage('Jsem váš hypoteční poradce s přístupem k datům z 19+ bank. Co vás zajímá?', 'ai');
            }
            
            generateAISuggestions();

        } else if (mode === 'express') {
            DOMElements.contentContainer.innerHTML = getExpressHTML();
        } else if (mode === 'guided') {
            DOMElements.contentContainer.innerHTML = getGuidedHTML();
            handleGuidedFormLogic();
        }

        // Provedeme skrolování pouze pokud to NENÍ první načtení stránky
        if (!isInitialLoad) {
            scrollToTarget('#content-container');
        }
    };

    const handleCookieBanner = () => {
        const bannerWrapper = document.getElementById('cookie-banner-wrapper');
        const acceptBtn = document.getElementById('cookie-accept');
        const moreInfoBtn = document.getElementById('cookie-more-info-btn');
        const detailsPanel = document.getElementById('cookie-details');

        if (!bannerWrapper || !acceptBtn || !moreInfoBtn || !detailsPanel) return; // Pokud prvky neexistují, nic nedělej

        if (localStorage.getItem('cookieConsent') === 'true') {
            bannerWrapper.classList.add('hidden');
        } else {
            bannerWrapper.classList.remove('hidden');
        }

        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'true');
            bannerWrapper.style.transition = 'opacity 0.3s ease-out'; // Přidáme fade-out efekt
            bannerWrapper.style.opacity = '0';
            setTimeout(() => bannerWrapper.classList.add('hidden'), 300); // Skryjeme po dokončení animace
        });

        moreInfoBtn.addEventListener('click', () => {
            detailsPanel.classList.toggle('expanded');
            // Změníme text tlačítka podle stavu
            moreInfoBtn.textContent = detailsPanel.classList.contains('expanded') ? 'Méně informací' : 'Více informací';
        });

        // Zajistíme, aby se starý banner nezobrazoval, pokud by tam náhodou zůstal
        DOMElements.cookieBanner?.classList.add('hidden');
    };

    const init = () => {
    // --- HLAVNÍ POSLUCHAČ UDÁLOSTÍ ---
    document.body.addEventListener('click', handleClick); // Hlavní listener pro kliknutí
    document.body.addEventListener('click', handleInfoTooltip); // <-- PŘIDANÝ LISTENER ZDE

    // --- OSTATNÍ LISTENERY S KONTROLOU ---
    // Listener pro změny v kalkulačce (POUZE POKUD EXISTUJE KONTEJNER)
    if (DOMElements.contentContainer) {
        DOMElements.contentContainer.addEventListener('input', (e) => {
            if (e.target.matches('input[type="range"], input[type="text"], select')) {
                handleInput(e);
            }
        });
    } // Jinak nic neděláme, protože kalkulačka na stránce není

    // Listener pro odeslání formuláře (POUZE POKUD EXISTUJE FORMULÁŘ)
    if (DOMElements.leadForm) {
         DOMElements.leadForm.addEventListener('submit', handleFormSubmit);
    } // Jinak nic neděláme

    // Listener pro mobilní menu (POUZE POKUD EXISTUJE TLAČÍTKO)
    if (DOMElements.mobileMenuButton && DOMElements.mobileMenu) {
        DOMElements.mobileMenuButton.addEventListener('click', () => {
            DOMElements.mobileMenu.classList.toggle('hidden');
        });
    }

    // Listener pro cookie lištu (POUZE POKUD EXISTUJÍ PRVKY)
    if (DOMElements.cookieAcceptBtn && DOMElements.cookieBannerWrapper) {
        DOMElements.cookieAcceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'true');
            DOMElements.cookieBannerWrapper.style.transition = 'opacity 0.3s ease-out';
            DOMElements.cookieBannerWrapper.style.opacity = '0';
            setTimeout(() => DOMElements.cookieBannerWrapper.classList.add('hidden'), 300);
        });
    }
    if (DOMElements.cookieMoreInfoBtn && DOMElements.cookieDetailsPanel && DOMElements.cookieBannerWrapper) {
        DOMElements.cookieMoreInfoBtn.addEventListener('click', () => {
            DOMElements.cookieDetailsPanel.classList.toggle('expanded');
            DOMElements.cookieMoreInfoBtn.textContent = DOMElements.cookieDetailsPanel.classList.contains('expanded') ? 'Méně informací' : 'Více informací';
        });
    }

    // --- OSTATNÍ INICIALIZAČNÍ KROKY ---
    // Resize handler
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            document.getElementById('active-tooltip')?.remove();
            if (state.mode === 'ai' && typeof getSidebarHTML === 'function') { // Ověření existence funkce
                const sidebarContainer = document.getElementById('sidebar-container');
                if(sidebarContainer) sidebarContainer.innerHTML = getSidebarHTML();
            }
        }, 250);
    });

    // Zobrazení cookie lišty (s kontrolou existence prvků)
     if (typeof handleCookieBanner === 'function') {
         handleCookieBanner();
     } else { // Záložní zobrazení
         if (DOMElements.cookieBannerWrapper) {
             if (localStorage.getItem('cookieConsent') === 'true') {
                 DOMElements.cookieBannerWrapper.classList.add('hidden');
             } else {
                 DOMElements.cookieBannerWrapper.classList.remove('hidden');
             }
         }
     }


    // Nastavení výchozího aktivního módu (POUZE POKUD KARTY EXISTUJÍ)
    if (DOMElements.modeCards && DOMElements.modeCards.length > 0) {
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === state.mode));
    }

    if (typeof updateActiveUsers === 'function') updateActiveUsers(); // Ověření existence

    // ===== NOVÝ KÓD PRO MÝTY A FAKTA =====
        const mythCards = document.querySelectorAll('.myth-card');
        mythCards.forEach(card => {
            const front = card.querySelector('.myth-front');
            const back = card.querySelector('.myth-back');

            // Kliknutí na přední stranu -> zobrazí zadní
            if (front) {
                front.addEventListener('click', (e) => {
                    e.stopPropagation(); // Zabráníme prokliku na kartu, pokud by tam byl listener
                    card.classList.add('flipped');
                });
            }

            // Kliknutí na zadní stranu (nebo text "Zpět") -> zobrazí přední
            if (back) {
                back.addEventListener('click', (e) => {
                     e.stopPropagation();
                    card.classList.remove('flipped');
                });
            }
        });
    };

    init();

    // ============================================
    // OPRAVENÉ EVENT LISTENERS - V2.3
    // Přesunuty DOVNITŘ DOMContentLoaded pro přístup k state a switchMode
    // ============================================
    
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
                    setTimeout(() => {
                        formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
            });
        }
        
        // 2. OPRAVENÝ Inline lead form submit V2.3
        const inlineForm = document.getElementById('inline-lead-form');
        if (inlineForm) {
            inlineForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('📝 Formulář se odesílá...');
                
                const extraData = JSON.stringify({
                    source: 'inline-form-v2.3',
                    calculation: {
                        loanAmount: state.formData.loanAmount,
                        propertyValue: state.formData.propertyValue,
                        monthlyPayment: state.calculation.selectedOffer?.monthlyPayment,
                        rate: state.calculation.selectedOffer?.rate
                    }
                });
                const extraDataField = document.getElementById('inline-extra-data');
                if (extraDataField) {
                    extraDataField.value = extraData;
                }
                
                const formData = new FormData(inlineForm);
                const submitBtn = inlineForm.querySelector('button[type="submit"]');
                
                try {
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = '⏳ Odesílám...';
                    }
                    
                    const response = await fetch('/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams(formData).toString()
                    });
                    
                    console.log('📡 Response status:', response.status);
                    
                    if (response.ok || response.status === 200) {
                        console.log('✅ Formulář odeslán!');
                        inlineForm.classList.add('hidden');
                        const successMsg = document.getElementById('inline-form-success');
                        if (successMsg) {
                            successMsg.classList.remove('hidden');
                        }
                        
                        if (typeof gtag !== 'undefined') {
                            gtag('event', 'form_submit', {
                                form_type: 'inline_lead_v2.3',
                                value: state.formData.loanAmount || 0
                            });
                        }
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } catch (error) {
                    console.error('❌ Chyba při odesílání:', error);
                    alert('Nastala chyba při odesílání formuláře. Zkuste to prosím znovu nebo nás kontaktujte přímo.');
                    
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '📞 Odeslat nezávazně';
                    }
                }
            });
        }
        
        // 3. Show all offers toggle
        const showAllOffersBtn = document.querySelector('[data-action="show-all-offers"]');
        if (showAllOffersBtn) {
            showAllOffersBtn.addEventListener('click', () => {
                const allOffersContainer = document.getElementById('all-offers-container');
                if (allOffersContainer) {
                    const isHidden = allOffersContainer.classList.contains('hidden');
                    if (isHidden) {
                        allOffersContainer.classList.remove('hidden');
                        showAllOffersBtn.innerHTML = 'Skrýt ostatní nabídky ↑';
                    } else {
                        allOffersContainer.classList.add('hidden');
                        showAllOffersBtn.innerHTML = `Zobrazit všech ${state.calculation.offers.length} nabídek ↓`;
                    }
                }
            });
        }
        
        // 4. OPRAVENO V2.3: Event delegation pro řádky tabulky
        const allOffersContainer = document.getElementById('all-offers-container');
        if (allOffersContainer) {
            allOffersContainer.addEventListener('click', (e) => {
                const row = e.target.closest('.offer-row');
                if (row) {
                    const offerId = row.dataset.offerId;
                    const clickedOffer = state.calculation.offers.find(o => o.id === offerId);
                    
                    if (clickedOffer && clickedOffer.id !== state.calculation.selectedOffer?.id) {
                        console.log("Vybrána nabídka:", clickedOffer.title);
                        state.calculation.selectedOffer = clickedOffer;
                        renderResults();
                    }
                }
            });
        }
        
        // 5. Discuss with AI button
        const discussAIBtns = document.querySelectorAll('[data-action="discuss-with-ai"]');
        discussAIBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                switchMode('ai', true);
            });
        });
        
        // 6. Switch to guided mode button
        const switchGuidedBtns = document.querySelectorAll('[data-action="switch-to-guided"]');
        switchGuidedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                switchMode('guided');
                setTimeout(() => scrollToTarget('#content-container'), 300);
            });
        });
        
        // 7. Bottom CTA scroll to form
        const scrollToFormBtn = document.querySelector('[data-action="scroll-to-form"]');
        if (scrollToFormBtn) {
            scrollToFormBtn.addEventListener('click', () => {
                const formContainer = document.getElementById('inline-lead-form-container');
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
                    if (formContainer) {
                        formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            });
        }
        
        // 8. NOVÉ V2.3: Probrat skóre s AI
        const discussScoreBtns = document.querySelectorAll('[data-action="discuss-score-with-ai"]');
        discussScoreBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('💬 Přepínám na AI chat (skóre)');
                switchMode('ai', true);
                setTimeout(() => {
                    const input = document.getElementById('permanent-chat-input');
                    if (input) {
                        input.value = "Vysvětli mi prosím mé skóre a jak ho můžu zlepšit.";
                        input.focus();
                    }
                }, 500);
            });
        });
        
        // 9. NOVÉ V2.3: Probrat fixaci s AI
        const discussFixationBtns = document.querySelectorAll('[data-action="discuss-fixation-with-ai"]');
        discussFixationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('💬 Přepínám na AI chat (fixace)');
                switchMode('ai', true);
                setTimeout(() => {
                    const input = document.getElementById('permanent-chat-input');
                    if (input) {
                        input.value = "Poraď mi prosím s výběrem délky fixace.";
                        input.focus();
                    }
                }, 500);
            });
        });
    }
    
    init();
}); // KONEC DOMContentLoaded
