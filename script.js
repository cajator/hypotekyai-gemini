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
            landValue: 50000
        },
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
            purpose: 'koupě',
            propertyType: 'byt',
            applicants: 1,
            age: 35,
            education: 'středoškolské s maturitou',
            employment: 'zaměstnanec',
            income: 60000,
            liabilities: 0,
            propertyValue: 5000000,
            ownResources: 1000000,
            loanTerm: 25,
            fixation: 5,
            landValue: 1500000,
            constructionBudget: 4000000,
            loanBalance: 3000000,
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
        leadForm: document.getElementById('lead-form'),
    };

    // --- INITIALIZATION ---
    const init = () => {
        setupEventListeners();
        switchMode(state.mode);
        startLiveCounter();
    };

    const setupEventListeners = () => {
        DOMElements.modeCards.forEach(card => card.addEventListener('click', () => switchMode(card.dataset.mode)));
        DOMElements.navLinks.forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetElement = document.querySelector(this.getAttribute('href'));
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        DOMElements.leadForm.addEventListener('submit', handleFormSubmit);
    };
    
    // --- MODE SWITCHING ---
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

    // =================================================================================
    // GUIDED MODE (PROFESSIONAL ANALYSIS)
    // =================================================================================
    const initGuidedMode = () => {
        state.currentStep = 1;
        renderGuidedView();
    };
    
    const renderGuidedView = () => {
        DOMElements.contentContainer.innerHTML = `
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold">Profesionální analýza</h2>
                <p class="text-gray-600">Provedeme vás krok za krokem k nejlepší nabídce.</p>
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
        renderGuidedStep(state.currentStep);
    };

    const renderGuidedStep = (step) => {
        const formContainer = DOMElements.contentContainer.querySelector('#form-container');
        formContainer.innerHTML = getGuidedStepHTML(step);
        setupGuidedListenersForStep();
        updateGuidedUI();
    };

    const setupGuidedListenersForStep = () => {
        DOMElements.contentContainer.querySelector('#next-btn')?.addEventListener('click', () => navigateStep(1));
        DOMElements.contentContainer.querySelector('#prev-btn')?.addEventListener('click', () => navigateStep(-1));
        
        DOMElements.contentContainer.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', syncGuidedFormData);
        });

        // Sliders
        DOMElements.contentContainer.querySelectorAll('input[type="range"]').forEach(slider => {
            const textInput = document.getElementById(slider.dataset.sync);
            slider.addEventListener('input', () => {
                textInput.value = formatNumber(slider.value, false);
                syncGuidedFormData();
            });
        });
        DOMElements.contentContainer.querySelectorAll('.slider-sync-input').forEach(textInput => {
             textInput.addEventListener('input', debounce(() => {
                const slider = document.querySelector(`[data-sync="${textInput.id}"]`);
                slider.value = parseNumber(textInput.value);
                syncGuidedFormData();
            }, CONFIG.DEBOUNCE_DELAY));
        });
    };
    
    const navigateStep = async (direction) => {
        if (direction > 0 && !validateStep(state.currentStep)) return;
        state.currentStep += direction;
        
        if (state.currentStep > 4) {
            state.currentStep = 4;
            document.getElementById('kontakt').scrollIntoView({ behavior: 'smooth' });
            return;
        }

        renderGuidedStep(state.currentStep);
        if (state.currentStep === 4) {
             await generateAnalysis(DOMElements.contentContainer.querySelector('#analysis-container'));
        }
    };

    const updateGuidedUI = () => {
        const timelineProgress = DOMElements.contentContainer.querySelector('#timeline-progress');
        const timelineSteps = DOMElements.contentContainer.querySelectorAll('.timeline-step');
        const prevBtn = DOMElements.contentContainer.querySelector('#prev-btn');
        const nextBtn = DOMElements.contentContainer.querySelector('#next-btn');

        if (!timelineProgress || !prevBtn || !nextBtn) return;

        timelineProgress.style.width = `${((state.currentStep - 1) / (timelineSteps.length -1)) * 100}%`;
        timelineSteps.forEach((stepEl, i) => {
            stepEl.classList.toggle('active', i + 1 === state.currentStep);
            stepEl.classList.toggle('completed', i + 1 < state.currentStep);
        });
        prevBtn.style.visibility = state.currentStep === 1 ? 'hidden' : 'visible';
        nextBtn.textContent = state.currentStep === 3 ? "Zobrazit analýzu" : (state.currentStep === 4 ? "Chci nabídku od specialisty" : "Další krok");
    };

    const syncGuidedFormData = () => {
        const formContainer = DOMElements.contentContainer.querySelector('#form-container');
        if(!formContainer) return;

        formContainer.querySelectorAll('[data-key]').forEach(el => {
            const key = el.dataset.key;
            state.formData[key] = (el.type === 'number' || el.tagName === 'SELECT' && !isNaN(parseInt(el.value))) 
                ? parseInt(el.value) 
                : parseNumber(el.value) || el.value;
        });
        formContainer.querySelectorAll('input[type="radio"]:checked').forEach(el => {
            state.formData[el.name] = isNaN(parseInt(el.value)) ? el.value : parseInt(el.value);
        });

        // Re-render DSTI indicator if on step 3
        if (state.currentStep === 3) {
            updateDSTIIndicator();
        }
        
        // Dynamically show/hide fields based on purpose
        const purpose = state.formData.purpose;
        formContainer.querySelectorAll('[data-purpose]').forEach(el => {
            el.style.display = el.dataset.purpose === purpose ? 'block' : 'none';
        });
    };

    const getGuidedStepHTML = (step) => {
        const data = state.formData;
        switch(step) {
            case 1: return `
                <div class="form-section active">
                    <h3 class="text-xl font-bold mb-6">1. Jaký je váš záměr?</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="form-label">Účel hypotéky</label>
                            <div class="radio-group">${createRadioGroup('purpose', ['koupě', 'výstavba', 'rekonstrukce', 'refinancování'], data.purpose)}</div>
                        </div>
                        <div>
                            <label class="form-label">Typ nemovitosti</label>
                            <div class="radio-group">${createRadioGroup('propertyType', ['byt', 'rodinný dům', 'pozemek', 'družstevní byt'], data.propertyType)}</div>
                        </div>
                    </div>
                    <div class="mt-8 space-y-6">
                        ${getPurposeSpecificFieldsHTML(data)}
                    </div>
                </div>`;
            case 2: return `
                <div class="form-section active">
                     <h3 class="text-xl font-bold mb-6">2. Něco o vás</h3>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="form-label">Počet žadatelů</label>
                            <div class="radio-group">${createRadioGroup('applicants', [1, 2], data.applicants)}</div>
                        </div>
                        <div><label class="form-label">Věk nejstaršího žadatele</label><input type="number" data-key="age" class="modern-input" value="${data.age || ''}" placeholder="např. 35"></div>
                        <div>
                            <label class="form-label">Nejvyšší dosažené vzdělání</label>
                            <select data-key="education" class="modern-select">${createSelectOptions(['základní', 'vyučen', 'středoškolské bez maturity', 'středoškolské s maturitou', 'vysokoškolské'], data.education)}</select>
                        </div>
                     </div>
                </div>`;
            case 3: return `
                <div class="form-section active">
                     <h3 class="text-xl font-bold mb-6">3. Vaše finance</h3>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="form-label">Typ vašeho hlavního příjmu</label>
                            <select data-key="employment" class="modern-select">${createSelectOptions(['zaměstnanec', 'OSVČ', 's.r.o.', 'jiné'], data.employment)}</select>
                        </div>
                         <div>
                           ${createSliderInput('income', 'Celkový čistý měsíční příjem', data.income, 10000, 200000, CONFIG.SLIDER_STEPS.income)}
                         </div>
                        <div><label class="form-label">Celkové měsíční splátky jiných úvěrů</label><input type="text" data-key="liabilities" class="modern-input" value="${formatNumber(data.liabilities, false)}" placeholder="např. 5 000"></div>
                     </div>
                     <div id="dsti-indicator-container" class="mt-8"></div>
                </div>`;
             case 4: return `<div class="form-section active" id="analysis-container"></div>`;
        }
        return '';
    };
    
    const getPurposeSpecificFieldsHTML = (data) => {
        return `
            <div data-purpose="koupě" style="display: ${data.purpose === 'koupě' ? 'block' : 'none'}">
                ${createSliderInput('propertyValue', 'Cena nemovitosti', data.propertyValue, 500000, 20000000, CONFIG.SLIDER_STEPS.propertyValue)}
                ${createSliderInput('ownResources', 'Vlastní zdroje', data.ownResources, 0, 10000000, CONFIG.SLIDER_STEPS.ownResources)}
            </div>
            <div data-purpose="výstavba" style="display: ${data.purpose === 'výstavba' ? 'block' : 'none'}">
                ${createSliderInput('landValue', 'Hodnota pozemku (pokud vlastníte)', data.landValue, 0, 10000000, CONFIG.SLIDER_STEPS.landValue)}
                ${createSliderInput('constructionBudget', 'Rozpočet na výstavbu', data.constructionBudget, 500000, 15000000, CONFIG.SLIDER_STEPS.constructionBudget)}
            </div>
            <div data-purpose="rekonstrukce" style="display: ${data.purpose === 'rekonstrukce' ? 'block' : 'none'}">
                ${createSliderInput('propertyValue', 'Aktuální hodnota nemovitosti', data.propertyValue, 500000, 20000000, CONFIG.SLIDER_STEPS.propertyValue)}
                ${createSliderInput('constructionBudget', 'Rozpočet na rekonstrukci', data.constructionBudget, 100000, 5000000, CONFIG.SLIDER_STEPS.constructionBudget)}
            </div>
            <div data-purpose="refinancování" style="display: ${data.purpose === 'refinancování' ? 'block' : 'none'}">
                ${createSliderInput('propertyValue', 'Aktuální hodnota nemovitosti', data.propertyValue, 500000, 20000000, CONFIG.SLIDER_STEPS.propertyValue)}
                <div><label class="form-label">Zůstatek stávajícího úvěru</label><input type="text" data-key="loanBalance" class="modern-input" value="${formatNumber(data.loanBalance, false)}"></div>
            </div>
        `;
    };

    const updateDSTIIndicator = async () => {
        const container = DOMElements.contentContainer.querySelector('#dsti-indicator-container');
        if (!container) return;
        
        container.innerHTML = `<div>Načítám odhad DSTI...</div>`;

        try {
            const params = new URLSearchParams(state.formData);
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${params.toString()}`);
            if (!response.ok) throw new Error();
            const data = await response.json();

            const dsti = data.dsti;
            let colorClass = 'dsti-green';
            if (dsti > 40) colorClass = 'dsti-orange';
            if (dsti > 45) colorClass = 'dsti-red';
            
            container.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="form-label">Odhad DSTI (poměr dluhu k příjmům)</span>
                    <span class="font-bold text-xl ${colorClass.replace('dsti-', 'text-')}">${dsti.toFixed(1)} %</span>
                </div>
                <div id="dsti-bar"><div id="dsti-progress" class="${colorClass}" style="width: ${Math.min(dsti, 100)}%;"></div></div>
                <p class="text-xs text-gray-500 mt-2">Banky obvykle vyžadují DSTI pod 50 %. Čím nižší, tím lepší.</p>
            `;
        } catch (e) {
            container.innerHTML = `<p class="text-xs text-gray-500">Odhad DSTI bude dostupný po zadání všech údajů.</p>`;
        }
    };
    
    // =================================================================================
    // EXPRESS & AI MODE HTML GETTERS
    // =================================================================================
    const getExpressModeHTML = () => `
        <div class="text-center mb-8">
            <h2 class="text-3xl font-bold">Expresní scoring</h2>
            <p class="text-gray-600">Zadejte základní údaje a získejte okamžitý přehled.</p>
        </div>
        <div id="express-form-container"></div>
        <div id="express-analysis-container" class="mt-8 min-h-[200px]"></div>
    `;

    const getAiModeHTML = () => `
         <div class="text-center mb-8">
            <h2 class="text-3xl font-bold">AI Hypoteční stratég</h2>
            <p class="text-gray-600">Zeptejte se na cokoliv. Naše AI vám poradí.</p>
        </div>
        <div class="bg-gray-100 rounded-lg overflow-hidden flex flex-col h-[70vh] max-h-[600px]">
            <div id="chat-window" class="flex-1 p-6 overflow-y-auto space-y-4"></div>
            <div id="ai-suggestions" class="p-4 border-t bg-white"></div>
            <div class="p-4 bg-white border-t">
                <div class="flex gap-4">
                    <input type="text" id="chat-input" class="modern-input flex-1" placeholder="Napište svůj dotaz...">
                    <button id="chat-send" class="nav-btn">Odeslat</button>
                </div>
            </div>
        </div>
    `;

    // =================================================================================
    // EXPRESS MODE LOGIC
    // =================================================================================
    const initExpressMode = () => {
        const ui = {
            formContainer: DOMElements.contentContainer.querySelector('#express-form-container'),
            analysisContainer: DOMElements.contentContainer.querySelector('#express-analysis-container'),
        };
        renderExpressForm(ui.formContainer);
        ui.formContainer.querySelector('#express-calculate-btn').addEventListener('click', async () => {
             syncExpressFormData();
             await generateAnalysis(ui.analysisContainer);
        });
    };

    const renderExpressForm = (container) => {
        const data = state.formData;
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div><label class="form-label">Cena nemovitosti</label><input type="text" data-key="propertyValue" class="modern-input" value="${formatNumber(data.propertyValue, false)}"></div>
                <div><label class="form-label">Vlastní zdroje</label><input type="text" data-key="ownResources" class="modern-input" value="${formatNumber(data.ownResources, false)}"></div>
                <div><label class="form-label">Čistý příjem</label><input type="text" data-key="income" class="modern-input" value="${formatNumber(data.income, false)}"></div>
                <div><label class="form-label">Fixace</label><select data-key="fixation" class="modern-select">${createSelectOptions([3,5,7,10], data.fixation)}</select></div>
                <button id="express-calculate-btn" class="nav-btn w-full h-[51px]">Spočítat</button>
            </div>`;
    };

    const syncExpressFormData = () => {
        DOMElements.contentContainer.querySelectorAll('[data-key]').forEach(el => {
             state.formData[el.dataset.key] = parseNumber(el.value) || el.value;
        });
    };

    // =================================================================================
    // AI MODE LOGIC
    // =================================================================================
    let aiUI = {};
    const initAiMode = () => {
        aiUI = {
            window: DOMElements.contentContainer.querySelector('#chat-window'),
            input: DOMElements.contentContainer.querySelector('#chat-input'),
            sendBtn: DOMElements.contentContainer.querySelector('#chat-send'),
            suggestions: DOMElements.contentContainer.querySelector('#ai-suggestions'),
        };
        
        aiUI.sendBtn.addEventListener('click', () => sendChatMessage());
        aiUI.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
        
        addChatMessage('Dobrý den! Jsem Hypotéka AI. Ptejte se na cokoliv, nebo si vyberte z témat níže.', 'ai');
        generateAISuggestions();
    };

    const sendChatMessage = async (messageText) => {
        const message = typeof messageText === 'string' ? messageText : aiUI.input.value.trim();
        if (!message) return;
        
        addChatMessage(message, 'user');
        if (typeof messageText !== 'string') aiUI.input.value = '';
        
        addChatMessage('...', 'ai-typing');

        try {
            const res = await fetch(CONFIG.API_CHAT_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context: { formData: state.formData, calculation: state.calculation } })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Chyba serveru AI.');
            updateLastMessage(data.response, 'ai');
        } catch (e) {
            updateLastMessage(`Omlouvám se, mám dočasně technický problém. (${e.message})`, 'ai');
        }
    };
    
    // --- SHARED FUNCTIONS (Analysis, Contact Form, Utilities) ---

    const generateAnalysis = async (container) => {
        container.innerHTML = `<div class="text-center py-10">Analyzuji trh a počítám scoring... <div class="loading-spinner-blue"></div></div>`;
        
        try {
            const params = new URLSearchParams(state.formData);
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${params.toString()}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Chyba při načítání nabídek.');
            
            if (data.offers.length === 0) {
                container.innerHTML = `<div class="text-center bg-red-100 p-4 rounded-lg text-red-700">Bohužel, na základě zadaných parametrů se nám nepodařilo najít vhodnou nabídku. Zkuste prosím upravit vstupní údaje.</div>`;
                return;
            }

            state.calculation = { ...state.calculation, ...data };
            state.calculation.selectedOffer = data.offers[0] || null;
            
            renderAnalysis(container);

        } catch (error) {
            console.error("Analysis Error:", error);
            container.innerHTML = `<div class="text-center text-red-600 p-4 bg-red-100 rounded-lg"><b>Chyba:</b> ${error.message}</div>`;
        }
    };
    
    const renderAnalysis = (container) => {
        const { offers, approvability, loanAmount, ltv } = state.calculation;
        
        container.innerHTML = `
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold">Vaše osobní analýza</h2>
                <p class="text-gray-600">Na základě zadaných údajů jsme pro vás připravili 3 nejlepší varianty.</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                ${offers.map((offer, index) => createOfferCard(offer, index)).join('')}
            </div>
            <div id="analysis-details"></div>
        `;

        // Select the first offer by default and render details
        const firstCard = container.querySelector('.offer-card');
        if(firstCard) {
            selectOffer(firstCard, offers[0]);
        }
    };

    const createOfferCard = (offer, index) => {
        const isSelected = index === 0;
        return `
            <div class="offer-card p-6 rounded-lg ${isSelected ? 'selected' : ''}" data-offer-id="${offer.id}">
                <h3 class="font-bold text-lg">${offer.bestFor}</h3>
                <p class="text-3xl font-extrabold text-blue-600 my-2">${formatNumber(offer.monthlyPayment)} Kč</p>
                <p class="text-sm text-gray-500">s úrokem od ${offer.rate.toFixed(2)} %</p>
            </div>
        `;
    };
    
    const selectOffer = (cardElement, offer) => {
        state.calculation.selectedOffer = offer;
        // Visually update selected card
        document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
        cardElement.classList.add('selected');
        // Render details
        renderAnalysisDetails(document.getElementById('analysis-details'));
    };
    
    const renderAnalysisDetails = (container) => {
        const { selectedOffer, approvability, loanAmount, ltv } = state.calculation;
        if(!selectedOffer) return;

        const totalPaid = selectedOffer.monthlyPayment * state.formData.loanTerm * 12;
        const overpayment = totalPaid - loanAmount;

        container.innerHTML = `
             <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div class="lg:col-span-3">
                    <div class="bg-gray-100 p-6 rounded-lg h-80"><canvas id="loanChart"></canvas></div>
                </div>
                <div class="lg:col-span-2 space-y-4">
                     <div class="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                        <p class="text-sm text-green-800 font-semibold">Pravděpodobnost schválení</p>
                        <p class="text-3xl font-bold text-green-900">${approvability}%</p>
                    </div>
                    <div class="text-sm space-y-2 text-gray-600 bg-gray-50 p-4 rounded-lg">
                        <div class="flex justify-between font-bold text-base border-b pb-2 mb-2"><p>Souhrn</p></div>
                        <div class="flex justify-between"><p>Výše úvěru (LTV)</p><p class="font-semibold">${formatNumber(loanAmount)} (${ltv.toFixed(1)}%)</p></div>
                        <div class="flex justify-between"><p>Celkem zaplatíte</p><p class="font-semibold">${formatNumber(totalPaid)}</p></div>
                        <div class="flex justify-between"><p>Přeplatek na úrocích</p><p class="font-semibold">${formatNumber(overpayment)}</p></div>
                    </div>
                </div>
            </div>`;
            
        updateLoanChart();

        document.querySelectorAll('.offer-card').forEach(card => {
            card.addEventListener('click', () => {
                const offerId = card.dataset.offerId;
                const newSelectedOffer = state.calculation.offers.find(o => o.id === offerId);
                selectOffer(card, newSelectedOffer);
            });
        });
    };
    
    const updateLoanChart = () => {
        const ctx = document.getElementById('loanChart')?.getContext('2d');
        if (!ctx) return;

        const { loanAmount, selectedOffer } = state.calculation;
        const { loanTerm } = state.formData;
        const rate = selectedOffer.rate;

        const labels = Array.from({length: loanTerm + 1}, (_, i) => i);
        const principalData = [];
        let remainingPrincipal = loanAmount;
        
        for (let year = 0; year <= loanTerm; year++) {
            principalData.push(remainingPrincipal);
            const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
            for (let month = 0; month < 12; month++) {
                const interestPayment = remainingPrincipal * (rate / 100 / 12);
                const principalPayment = monthlyPayment - interestPayment;
                remainingPrincipal -= principalPayment;
            }
        }

        if (state.chart) {
            state.chart.destroy();
        }

        state.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Zůstatek jistiny',
                    data: principalData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { ticks: { callback: value => formatNumber(value) } },
                    x: { ticks: { callback: value => `Rok ${value}` } }
                }
            }
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        try {
            await fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(formData).toString(),
            });
            form.style.display = 'none';
            document.getElementById('form-success').style.display = 'block';
        } catch (error) {
            alert("Došlo k chybě při odesílání formuláře.");
        }
    };
    
    // --- AI MODE HELPERS ---
    const addChatMessage = (message, sender) => {
        const bubble = document.createElement('div');
        if (sender === 'ai-typing') {
            bubble.classList.add('chat-bubble-ai-typing');
            bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        } else {
            bubble.classList.add(sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai');
            bubble.textContent = message;
        }
        aiUI.window.appendChild(bubble);
        aiUI.window.scrollTop = aiUI.window.scrollHeight;
    };
    const updateLastMessage = (message, sender) => {
        const lastBubble = aiUI.window.querySelector('.chat-bubble-ai-typing');
        if (lastBubble) {
            lastBubble.classList.remove('chat-bubble-ai-typing');
            lastBubble.classList.add('chat-bubble-ai');
            lastBubble.innerHTML = ''; // Clear typing dots
            lastBubble.textContent = message;
        } else {
            addChatMessage(message, sender);
        }
    };
    const generateAISuggestions = () => {
        let html = '';
        for (const [category, questions] of Object.entries(CONFIG.AI_SUGGESTIONS)) {
            html += `<div class="mb-2"><p class="text-xs font-bold text-gray-500 uppercase">${category}</p><div class="flex flex-wrap gap-2 mt-1">`;
            questions.forEach(q => {
                html += `<button class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-full transition-colors">${q}</button>`;
            });
            html += `</div></div>`;
        }
        aiUI.suggestions.innerHTML = html;
        aiUI.suggestions.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => sendChatMessage(btn.textContent));
        });
    };

    // --- UTILITIES ---
    const createRadioGroup = (name, options, selectedValue) => options.map(opt => `<label class="radio-label"><input type="radio" name="${name}" value="${opt}" ${opt == selectedValue ? 'checked' : ''}><span>${String(opt).charAt(0).toUpperCase() + String(opt).slice(1)}</span></label>`).join('');
    const createSelectOptions = (options, selectedValue) => options.map(opt => `<option value="${opt}" ${opt == selectedValue ? 'selected' : ''}>${String(opt).charAt(0).toUpperCase() + String(opt).slice(1)}</option>`).join('');
    const createSliderInput = (key, label, value, min, max, step) => `
        <div>
            <label class="form-label">${label}</label>
            <input type="text" id="${key}-text" data-key="${key}" class="modern-input slider-sync-input" value="${formatNumber(value, false)}">
            <div class="slider-container">
                <input type="range" data-key="${key}" data-sync="${key}-text" min="${min}" max="${max}" value="${value}" step="${step}">
            </div>
        </div>`;
    const startLiveCounter = () => {
        let count = 147;
        DOMElements.liveUsersCounter.textContent = `${count} lidí právě počítá hypotéku`;
        setInterval(() => {
            count += Math.random() > 0.5 ? 1 : -1;
            count = Math.max(120, Math.min(180, count));
            DOMElements.liveUsersCounter.textContent = `${count} lidí právě počítá hypotéku`;
        }, 3000);
    };
    const calculateMonthlyPayment = (p, r, t) => p <= 0 ? 0 : (p * (r/100/12) * Math.pow(1 + (r/100/12), t*12)) / (Math.pow(1 + (r/100/12), t*12) - 1);
    const parseNumber = (s) => {
        const cleaned = String(s).toLowerCase().replace(/,/g, '.').replace(/\s/g, '').replace('kč','');
        if (cleaned.endsWith('m')) return parseFloat(cleaned) * 1000000;
        if (cleaned.endsWith('k')) return parseFloat(cleaned) * 1000;
        return parseFloat(cleaned) || 0;
    };
    const formatNumber = (n, currency = true) => currency ? n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }) : n.toLocaleString('cs-CZ');
    const debounce = (fn, d) => {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => {
                fn.apply(this, args);
            }, d);
        }
    };
    const validateStep = (step) => {
        // Simple validation, can be expanded
        const data = state.formData;
        if (step === 1) {
            if (data.purpose === 'koupě' && (data.propertyValue <= 0 || data.ownResources < 0)) return false;
        }
        if (step === 3) {
            if(data.income <= 0) return false;
        }
        return true;
    };

    // --- START THE APP ---
    init();
});

