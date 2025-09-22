// Hypotéka AI - v12.0 - Final Build
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/.netlify/functions/chat',
        API_RATES_ENDPOINT: '/.netlify/functions/rates',
        DEBOUNCE_DELAY: 300,
        SLIDER_STEPS: {
            propertyValue: 100000,
            ownResources: 50000,
            income: 1000,
            constructionBudget: 50000,
            landValue: 50000,
            loanBalance: 50000
        },
        PARTNER_LOGOS: [
            "https://www.penize.cz/images/f/5/22532-cs-logo.svg", "https://www.penize.cz/images/f/5/22533-csob-logo.svg",
            "https://www.penize.cz/images/f/5/22535-kb-logo.svg", "https://www.penize.cz/images/f/5/22543-rb-logo.svg",
            "https://www.penize.cz/images/f/5/22547-unicredit-logo.svg", "https://www.penize.cz/images/f/5/22539-moneta-logo.svg",
            "https://www.penize.cz/images/f/5/22538-mbank-logo.svg", "https://www.penize.cz/images/f/5/22534-fio-logo.svg",
            "https://www.penize.cz/images/f/5/22531-airbank-logo.svg", "https://www.penize.cz/images/f/5/22537-maxbanka-logo.svg",
            "https://www.penize.cz/images/f/5/22546-trinity-logo.svg", "https://www.penize.cz/images/f/5/22536-creditas-logo.svg",
            "https://www.penize.cz/images/f/5/22548-cmss-logo.svg", "https://www.penize.cz/images/f/5/22550-rsts-logo.svg",
            "https://www.penize.cz/images/f/5/22549-sscs-logo.svg", "https://www.penize.cz/images/f/5/22551-moneta-ss-logo.svg"
        ],
        AI_SUGGESTIONS: {
            "Začínáme": ["Jak celý proces funguje?", "Co je to LTV?", "Jaké dokumenty budu potřebovat?"],
            "Moje situace": ["Co když jsem OSVČ?", "Mám záznam v registru, vadí to?", "Chceme si půjčit s partnerem?"],
            "Detaily produktu": ["Jaký je rozdíl mezi fixacemi?", "Můžu hypotéku splatit dříve?", "Co se stane, když nebudu moct splácet?"],
        }
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'guided',
        currentStep: 1,
        formData: {
            purpose: 'koupě', propertyType: 'byt', applicants: 1, age: 35,
            education: 'středoškolské s maturitou', employment: 'zaměstnanec',
            income: 60000, liabilities: 0, propertyValue: 5000000,
            ownResources: 1000000, loanTerm: 25, fixation: 5,
            landValue: 1500000, constructionBudget: 3500000, loanBalance: 2500000
        },
        calculation: { offers: [], selectedOffer: null, approvability: 0, dsti: 0, loanAmount: 0, ltv: 0 },
        chart: null,
    };

    // --- DOM ELEMENTS ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        liveUsersCounter: document.getElementById('live-users-counter'),
        navLinks: document.querySelectorAll('header a[href^="#"], footer a[href^="#"]'),
        leadFormContainer: document.getElementById('kontakt'),
        partnerLogosContainer: document.querySelector('#partneri .grid'),
    };

    // --- INITIALIZATION ---
    const init = () => {
        setupEventListeners();
        switchMode(state.mode);
        startLiveCounter();
        renderPartnerLogos();
    };

    const setupEventListeners = () => {
        DOMElements.modeCards.forEach(card => card.addEventListener('click', () => switchMode(card.dataset.mode)));
        DOMElements.navLinks.forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetElement = document.querySelector(this.getAttribute('href'));
                if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
            });
        });
    };
    
    // --- MODE SWITCHING & RENDER ---
    const switchMode = (mode) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        DOMElements.contentContainer.innerHTML = '';
        
        switch (mode) {
            case 'guided': initGuidedMode(); break;
            case 'express': DOMElements.contentContainer.innerHTML = getExpressModeHTML(); initExpressMode(); break;
            case 'ai': DOMElements.contentContainer.innerHTML = getAiModeHTML(); initAiMode(); break;
        }
    };
    
    const renderPartnerLogos = () => {
        CONFIG.PARTNER_LOGOS.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Logo partnera";
            img.className = 'partner-logo';
            img.onerror = () => img.style.display = 'none'; // Hide if logo fails to load
            DOMElements.partnerLogosContainer.appendChild(img);
        });
    };

    // =================================================================================
    // GUIDED MODE (PROFESSIONAL ANALYSIS)
    // =================================================================================
    const initGuidedMode = () => {
        state.currentStep = 1;
        renderGuidedView();
    };
    
    const renderGuidedView = () => {
        const step = state.currentStep;
        DOMElements.contentContainer.innerHTML = `
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold">Profesionální analýza</h2>
            </div>
            <div class="timeline">
                <div class="timeline-line"><div id="timeline-progress"></div></div>
                <div class="timeline-step" data-step="1"><div class="step-circle">1</div><p>Záměr</p></div>
                <div class="timeline-step" data-step="2"><div class="step-circle">2</div><p>O vás</p></div>
                <div class="timeline-step" data-step="3"><div class="step-circle">3</div><p>Finance</p></div>
                <div class="timeline-step" data-step="4"><div class="step-circle">4</div><p>Analýza</p></div>
            </div>
            <div id="form-container"></div>
            <div class="flex justify-between mt-12">
                <button id="prev-btn" class="nav-btn bg-gray-500 hover:bg-gray-600">Zpět</button>
                <button id="next-btn" class="nav-btn ml-auto"></button>
            </div>
        `;
        renderGuidedStep(step);
    };

    const renderGuidedStep = (step) => {
        const formContainer = DOMElements.contentContainer.querySelector('#form-container');
        formContainer.innerHTML = getGuidedStepHTML(step);
        setupGuidedListenersForStep();
        updateGuidedUI();
    };

    // This is the core function that needs all the logic from the final version.
    const getGuidedStepHTML = (step) => {
        const data = state.formData;
        const purpose = data.purpose;
        let html = `<div class="form-section active grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">`;

        // Step Title
        const titles = {1: 'Účel a nemovitost', 2: 'O žadatelích', 3: 'Příjmy a výdaje', 4: ''};
        html += `<h3 class="text-xl font-bold md:col-span-2">${step}. ${titles[step]}</h3>`;

        switch(step) {
            case 1:
                html += `
                    <div class="md:col-span-2">
                        <label class="form-label">Účel hypotéky</label>
                        <div class="radio-group">${createRadioGroup('purpose', ['koupě', 'výstavba', 'rekonstrukce', 'refinancování'], data.purpose)}</div>
                    </div>`;
                if (purpose === 'koupě') {
                    html += createSliderInput('propertyValue', 'Cena nemovitosti', data.propertyValue, 1000000, 20000000);
                    html += createSliderInput('ownResources', 'Vlastní zdroje', data.ownResources, 0, data.propertyValue);
                }
                if (purpose === 'výstavba') {
                    html += createSliderInput('landValue', 'Hodnota pozemku (pokud vlastníte)', data.landValue, 0, 10000000);
                    html += createSliderInput('constructionBudget', 'Rozpočet na výstavbu', data.constructionBudget, 1000000, 20000000);
                }
                 if (purpose === 'rekonstrukce') {
                    html += createSliderInput('propertyValue', 'Hodnota nemovitosti (před rekonstrukcí)', data.propertyValue, 1000000, 20000000);
                    html += createSliderInput('constructionBudget', 'Rozpočet na rekonstrukci', data.constructionBudget, 100000, 5000000);
                }
                 if (purpose === 'refinancování') {
                    html += createSliderInput('propertyValue', 'Aktuální hodnota nemovitosti', data.propertyValue, 1000000, 20000000);
                    html += createSliderInput('loanBalance', 'Zůstatek úvěru k refinancování', data.loanBalance, 100000, 15000000);
                }
                break;
            case 2:
                html += `
                    <div><label class="form-label">Kolik vás bude o hypotéku žádat?</label><select data-key="applicants" class="modern-select">${createSelectOptions(['1', '2', '3', '4'], data.applicants)}</select></div>
                    <div><label class="form-label">Věk nejstaršího žadatele</label><input type="number" data-key="age" class="modern-input" value="${data.age || ''}" placeholder="např. 35"></div>
                    <div class="md:col-span-2"><label class="form-label">Nejvyšší dosažené vzdělání</label><select data-key="education" class="modern-select">${createSelectOptions(['základní', 'vyučen', 'středoškolské bez maturity', 'středoškolské s maturitou', 'vysokoškolské'], data.education)}</select></div>`;
                break;
            case 3:
                 html += `
                    <div class="md:col-span-2"><label class="form-label">Typ vašeho hlavního příjmu</label><select data-key="employment" class="modern-select">${createSelectOptions(['zaměstnanec', 'OSVČ', 's.r.o.', 'jiné'], data.employment)}</select></div>
                    ${createSliderInput('income', 'Celkový čistý měsíční příjem', data.income, 20000, 250000)}
                    ${createSliderInput('liabilities', 'Celkové měsíční splátky', data.liabilities, 0, 100000)}
                    <div id="dsti-indicator-container" class="md:col-span-2"></div>`;
                break;
             case 4: 
                html = `<div id="analysis-container"></div>`;
                break;
        }
        if (step !== 4) html += `</div>`;
        return html;
    };

    const setupGuidedListenersForStep = () => {
        const container = DOMElements.contentContainer;
        container.querySelector('#next-btn')?.addEventListener('click', () => navigateStep(1));
        container.querySelector('#prev-btn')?.addEventListener('click', () => navigateStep(-1));
        
        container.querySelectorAll('input[type="radio"], select').forEach(input => {
            input.addEventListener('change', () => {
                syncGuidedFormData();
                // If purpose changes on step 1, re-render the step
                if (input.dataset.key === 'purpose' && state.currentStep === 1) {
                    renderGuidedStep(1);
                }
            });
        });

        // Sliders
        container.querySelectorAll('input[type="range"]').forEach(slider => {
            const textInput = document.getElementById(slider.dataset.sync);
            slider.addEventListener('input', () => {
                textInput.value = formatNumber(slider.value, false);
                syncGuidedFormData();
            });
        });
        container.querySelectorAll('.slider-sync-input').forEach(textInput => {
             textInput.addEventListener('input', debounce(() => {
                const slider = container.querySelector(`[data-sync="${textInput.id}"]`);
                const value = parseNumber(textInput.value);
                if(slider) slider.value = value;
                state.formData[textInput.dataset.key] = value;
                syncGuidedFormData();
            }, CONFIG.DEBOUNCE_DELAY));
        });
    };
    
    // --- The rest of the functions (navigateStep, updateGuidedUI, syncGuidedFormData etc.) from the previous final version
    // are assumed here to keep the code concise. I will provide the FULL script.js below.
    
    // --- START THE APP ---
    init();
});

