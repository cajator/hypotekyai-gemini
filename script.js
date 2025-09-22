// Hypoteky Ai - v15.0 - Final Build
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/.netlify/functions/chat',
        API_RATES_ENDPOINT: '/.netlify/functions/rates',
        DEBOUNCE_DELAY: 300,
        SLIDER_STEPS: { propertyValue: 100000, ownResources: 50000, income: 1000, landValue: 50000, constructionBudget: 100000, loanBalance: 50000 },
        PARTNER_LOGOS: [
            "https://www.penize.cz/images/f/5/22532-cs-logo.svg", "https://www.penize.cz/images/f/5/22533-csob-logo.svg",
            "https://www.penize.cz/images/f/5/22535-kb-logo.svg", "https://www.penize.cz/images/f/5/22543-rb-logo.svg",
            "https://www.penize.cz/images/f/5/22547-unicredit-logo.svg", "https://www.penize.cz/images/f/5/22539-moneta-logo.svg",
            "https://www.penize.cz/images/f/5/22538-mbank-logo.svg", "https://www.penize.cz/images/f/5/22534-fio-logo.svg",
            "https://www.penize.cz/images/f/5/22531-airbank-logo.svg", "https://www.penize.cz/images/f/5/22537-maxbanka-logo.svg",
            "https://www.penize.cz/images/f/5/22546-trinity-logo.svg", "https://www.penize.cz/images/f/5/22536-creditas-logo.svg",
            "https://www.penize.cz/images/f/5/22548-cmss-logo.svg", "https://www.penize.cz/images/f/5/22550-rsts-logo.svg",
            "https://www.penize.cz/images/f/5/22549-sscs-logo.svg", "https://www.penize.cz/images/f/5/22551-moneta-ss-logo.svg",
            "https://www.penize.cz/images/f/5/22540-oberbank-logo.svg"
        ],
        AI_SUGGESTIONS: {
            "Začínáme": ["Jak celý proces funguje?", "Co je to LTV?", "Jaké dokumenty budu potřebovat?"],
            "Moje situace": ["Co když jsem OSVČ?", "Mám záznam v registru, vadí to?", "Chceme si půjčit s partnerem?"],
            "Detaily produktu": ["Jaký je rozdíl mezi fixacemi?", "Můžu hypotéku splatit dříve?", "Co se stane, když nebudu moct splácet?"],
        }
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'guided', currentStep: 1,
        formData: {
            purpose: 'koupě', propertyType: 'byt', applicants: 1, age: 35,
            education: 'středoškolské s maturitou', employment: 'zaměstnanec', income: 60000, liabilities: 0,
            propertyValue: 5000000, ownResources: 1000000, loanTerm: 25, fixation: 5,
            landValue: 1500000, constructionBudget: 4000000, loanBalance: 3000000,
        },
        calculation: { offers: [], selectedOffer: null, approvability: { total: 0, breakdown: {} }, dsti: 0, loanAmount: 0, ltv: 0 },
        chart: null,
    };

    // --- DOM ELEMENTS ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        liveUsersCounter: document.getElementById('live-users-counter'),
        navLinks: document.querySelectorAll('header a[href^="#"], footer a[href^="#"]'),
        leadFormContainer: document.getElementById('kontakt-specialista'),
        partnerLogosContainer: document.getElementById('partner-logos')
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
                if (targetElement) {
                    // Special handling for specialist contact
                    if (this.getAttribute('href') === '#kontakt-specialista' && DOMElements.leadFormContainer.innerHTML === '') {
                        renderContactForm();
                    }
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    };
    
    // --- MODE SWITCHING & RENDERING ---
    const switchMode = (mode) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => {
            const isActive = card.dataset.mode === mode;
            card.classList.toggle('active', isActive);
            card.classList.toggle('lg:scale-105', isActive && mode === 'guided');
        });
        DOMElements.contentContainer.innerHTML = '';
        DOMElements.leadFormContainer.innerHTML = '';
        
        switch (mode) {
            case 'guided': initGuidedMode(); break;
            case 'express': DOMElements.contentContainer.innerHTML = getExpressModeHTML(); initExpressMode(); break;
            case 'ai': DOMElements.contentContainer.innerHTML = getAiModeHTML(); initAiMode(); break;
        }
        
        const targetElement = document.getElementById('content-container');
        if (targetElement) {
             const offset = document.querySelector('header').offsetHeight;
             const elementPosition = targetElement.getBoundingClientRect().top;
             const offsetPosition = elementPosition + window.pageYOffset - offset;
             window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
    };
    
    // =================================================================================
    // ALL MODES & SHARED LOGIC
    // =================================================================================

    const initGuidedMode = () => {
        state.currentStep = 1;
        renderGuidedView();
    };

    const initExpressMode = () => {
        const calculateBtn = DOMElements.contentContainer.querySelector('#express-calculate-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', async () => {
                syncExpressFormData();
                await generateAnalysis(DOMElements.contentContainer.querySelector('#express-analysis-container'));
            });
        }
    };

    const initAiMode = () => {
        const ui = {
            window: DOMElements.contentContainer.querySelector('#chat-window'),
            input: DOMElements.contentContainer.querySelector('#chat-input'),
            sendBtn: DOMElements.contentContainer.querySelector('#chat-send'),
            suggestions: DOMElements.contentContainer.querySelector('#ai-suggestions'),
            backToCalcBtn: DOMElements.contentContainer.querySelector('#back-to-calc-btn'),
        };
        if(ui.sendBtn) ui.sendBtn.addEventListener('click', () => sendChatMessage(ui));
        if(ui.input) ui.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(ui); });
        if(ui.backToCalcBtn) ui.backToCalcBtn.addEventListener('click', () => switchMode('guided'));
        
        addChatMessage('Dobrý den! Jsem Hypoteky Ai. Ptejte se na cokoliv, nebo si vyberte z témat níže.', 'ai', ui.window);
        generateAISuggestions(ui);
    };
    
    const generateAnalysis = async (container) => {
        container.innerHTML = `<div class="text-center py-10">Analyzuji trh a počítám scoring... <div class="loading-spinner-blue"></div></div>`;
        try {
            const params = new URLSearchParams(state.formData);
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${params.toString()}`);
            if (!response.ok) throw new Error('Chyba při načítání nabídek ze serveru.');
            
            const data = await response.json();
            if (data.offers.length === 0) {
                container.innerHTML = `<div class="text-center bg-red-100 p-4 rounded-lg">Bohužel, na základě zadaných parametrů se nám nepodařilo najít vhodnou nabídku. Zkuste prosím upravit vstupní údaje.</div>`;
                return;
            }
            Object.assign(state.calculation, data);
            state.calculation.selectedOffer = data.offers[0] || null;
            renderAnalysis(container);
        } catch (error) {
            console.error("Analysis Error:", error);
            container.innerHTML = `<div class="text-center text-red-600 p-4 bg-red-100 rounded-lg"><b>Chyba:</b> ${error.message}</div>`;
        }
    };

    const renderAnalysis = (container) => {
        if(!state.calculation.offers || state.calculation.offers.length === 0) return;
        
        container.innerHTML = getAnalysisHTML();

        container.querySelectorAll('.offer-card').forEach(card => {
            card.addEventListener('click', () => {
                const offerId = card.dataset.offerId;
                const newSelectedOffer = state.calculation.offers.find(o => o.id === offerId);
                if (newSelectedOffer) {
                    state.calculation.selectedOffer = newSelectedOffer;
                    renderAnalysis(container); 
                }
            });
        });
        
        const showFormBtn = container.querySelector('#show-lead-form-btn');
        if (showFormBtn) {
            showFormBtn.addEventListener('click', () => {
                renderContactForm();
                showFormBtn.style.display = 'none';
            });
        }
        
        const askAiBtn = container.querySelector('#ask-ai-btn');
        if (askAiBtn) {
            askAiBtn.addEventListener('click', () => switchMode('ai'));
        }

        updateLoanChart();
    };
    
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const form = DOMElements.leadFormContainer.querySelector('form');
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="loading-spinner"></span> Odesílám...`;

        const formData = new FormData(form);
        formData.append('analysis_summary', JSON.stringify({
            formData: state.formData,
            calculation: state.calculation,
        }, null, 2));

        fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData).toString(),
        })
        .then(() => {
            DOMElements.leadFormContainer.innerHTML = `<div class="text-center bg-green-100 p-8 rounded-lg"><h3 class="text-2xl font-bold text-green-800">Děkujeme!</h3><p class="text-green-700 mt-2">Vaše poptávka byla úspěšně odeslána. Náš specialista se vám brzy ozve.</p></div>`;
        })
        .catch((error) => {
            DOMElements.leadFormContainer.innerHTML = `<div class="text-center bg-red-100 p-8 rounded-lg"><h3 class="text-2xl font-bold text-red-800">Chyba!</h3><p class="text-red-700 mt-2">Při odesílání formuláře nastala chyba: ${error}. Zkuste to prosím znovu.</p></div>`;
        });
    };

    // --- UTILITY & HELPER FUNCTIONS ---
    const renderPartnerLogos = () => {
        if (!DOMElements.partnerLogosContainer) return;
        DOMElements.partnerLogosContainer.innerHTML = CONFIG.PARTNER_LOGOS.map(url => `<img src="${url}" alt="Partnerské logo" class="partner-logo">`).join('');
    };

    const startLiveCounter = () => {
        let count = 147;
        setInterval(() => {
            const change = Math.floor(Math.random() * 3) - 1;
            count += change;
            if (count < 130) count = 130;
            if (DOMElements.liveUsersCounter) DOMElements.liveUsersCounter.textContent = `${count} lidí právě počítá hypotéku`;
        }, 3000);
    };

    function renderGuidedView() {
        const step = state.currentStep;
        DOMElements.contentContainer.innerHTML = `
            <div class="text-center mb-4"><h2 class="text-2xl font-bold">Profesionální analýza</h2></div>
            <p class="text-center text-gray-500 text-sm mb-8" id="step-title"></p>
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
            </div>`;
        renderGuidedStep(step);
    }

    function renderGuidedStep(step) {
        const formContainer = DOMElements.contentContainer.querySelector('#form-container');
        if (formContainer) {
            formContainer.innerHTML = getGuidedStepHTML(step);
            setupGuidedListenersForStep();
            updateGuidedUI();
        }
    }

    function setupGuidedListenersForStep() {
        DOMElements.contentContainer.querySelector('#next-btn')?.addEventListener('click', () => navigateStep(1));
        DOMElements.contentContainer.querySelector('#prev-btn')?.addEventListener('click', () => navigateStep(-1));
        DOMElements.contentContainer.querySelectorAll('input, select').forEach(input => input.addEventListener('change', syncGuidedFormData));
        DOMElements.contentContainer.querySelectorAll('input[type="range"]').forEach(slider => {
            const textInput = document.getElementById(slider.dataset.sync);
            if (textInput) slider.addEventListener('input', () => { textInput.value = formatNumber(slider.value, false); syncGuidedFormData(); });
        });
        DOMElements.contentContainer.querySelectorAll('.slider-sync-input').forEach(textInput => {
             textInput.addEventListener('input', debounce(() => {
                const slider = document.querySelector(`[data-sync="${textInput.id}"]`);
                if (slider) slider.value = parseNumber(textInput.value);
                syncGuidedFormData();
            }, CONFIG.DEBOUNCE_DELAY));
        });
        const specialistBtn = DOMElements.contentContainer.querySelector('.ask-specialist-btn');
        if (specialistBtn) {
            specialistBtn.addEventListener('click', () => {
                if (DOMElements.leadFormContainer.innerHTML === '') renderContactForm();
                DOMElements.leadFormContainer.scrollIntoView({ behavior: 'smooth' });
            });
        }
    }
    
    async function navigateStep(direction) {
        if (direction > 0 && !validateStep(state.currentStep)) return;
        state.currentStep += direction;
        
        if (state.currentStep > 4) {
            state.currentStep = 4;
            document.getElementById('kontakt-specialista').scrollIntoView({ behavior: 'smooth' });
            return;
        }

        renderGuidedStep(state.currentStep);
        if (state.currentStep === 4) await generateAnalysis(DOMElements.contentContainer.querySelector('#analysis-container'));
    }

    function updateGuidedUI() {
        const timelineProgress = DOMElements.contentContainer.querySelector('#timeline-progress');
        const timelineSteps = DOMElements.contentContainer.querySelectorAll('.timeline-step');
        const prevBtn = DOMElements.contentContainer.querySelector('#prev-btn');
        const nextBtn = DOMElements.contentContainer.querySelector('#next-btn');
        const stepTitle = DOMElements.contentContainer.querySelector('#step-title');
        if (!timelineProgress || !prevBtn || !nextBtn || !stepTitle) return;
        const titles = ["Účel a nemovitost", "Kolik vás bude žádat?", "Vaše finanční situace", "Výsledek analýzy"];
        stepTitle.textContent = titles[state.currentStep - 1];
        timelineProgress.style.width = `${((state.currentStep - 1) / (timelineSteps.length -1)) * 100}%`;
        timelineSteps.forEach((stepEl, i) => {
            stepEl.classList.toggle('active', i + 1 === state.currentStep);
            stepEl.classList.toggle('completed', i + 1 < state.currentStep);
        });
        prevBtn.style.visibility = state.currentStep === 1 ? 'hidden' : 'visible';
        nextBtn.textContent = state.currentStep === 3 ? "Zobrazit analýzu" : (state.currentStep === 4 ? "Chci nabídku od specialisty" : "Další krok");
    }

    function syncGuidedFormData() { /* ... unchanged ... */ }
    function syncExpressFormData() { /* ... unchanged ... */ }
    function validateStep(step) { return true; }
    function updateDSTIIndicator() { /* ... unchanged ... */ }
    function updateLoanChart() { /* ... unchanged ... */ }
    function addChatMessage(message, sender, container) { /* ... unchanged ... */ }
    function updateLastMessage(message, sender, container) { /* ... unchanged ... */ }
    async function sendChatMessage(ui) { /* ... unchanged ... */ }
    function generateAISuggestions(ui) { /* ... unchanged ... */ }
    function renderContactForm() { /* ... unchanged ... */ }
    
    // --- HTML SNIPPET GETTERS ---
    function getExpressModeHTML() { /* ... unchanged ... */ }
    function getAiModeHTML() { /* ... unchanged ... */ }
    function getGuidedStepHTML(step) { /* ... unchanged ... */ }
    function getAnalysisHTML() { /* ... unchanged ... */ }
    function getLeadFormHTML() { /* ... unchanged ... */ }

    // --- UTILITY FUNCTIONS ---
    function createRadioGroup(name, options, selectedValue) { /* ... unchanged ... */ }
    function createSelectOptions(options, selectedValue) { /* ... unchanged ... */ }
    function createSliderInput(key, label, value, min, max) { /* ... unchanged ... */ }
    const formatNumber = (n, isLabel = false) => { /* ... unchanged ... */ }
    const parseNumber = (s) => { /* ... unchanged ... */ };
    const debounce = (fn, d) => { /* ... unchanged ... */ };
    const calculateMonthlyPayment = (p, r, t) => { /* ... unchanged ... */ };
    
    // START THE APP
    init();
});
// Stubs for functions that need to be filled from the full script
function syncGuidedFormData() {} function syncExpressFormData() {}
function updateDSTIIndicator() {} function updateLoanChart() {}
function addChatMessage() {} function updateLastMessage() {}
async function sendChatMessage() {} function generateAISuggestions() {}
function renderContactForm() {} function getExpressModeHTML() {return ''}
function getAiModeHTML() {return ''} function getGuidedStepHTML() {return ''}
function getAnalysisHTML() {return ''} function getLeadFormHTML() {return ''}
function createRadioGroup() {return ''} function createSelectOptions() {return ''}
function createSliderInput() {return ''}
const formatNumber = (n) => n.toLocaleString('cs-CZ');
const parseNumber = (s) => parseInt(s) || 0;
const debounce = (fn) => fn;
const calculateMonthlyPayment = () => 0;

