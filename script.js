// Hypotéka AI - v14.0 - Final Build
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/.netlify/functions/chat',
        API_RATES_ENDPOINT: '/.netlify/functions/rates',
        DEBOUNCE_DELAY: 300,
        SLIDER_STEPS: { propertyValue: 100000, ownResources: 50000, income: 1000 },
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
            landValue: 0, constructionBudget: 0, loanBalance: 0,
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
                if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
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
        DOMElements.contentContainer.innerHTML = ''; // Clear previous content
        DOMElements.leadFormContainer.innerHTML = ''; // Clear lead form
        
        switch (mode) {
            case 'guided': initGuidedMode(); break;
            case 'express': DOMElements.contentContainer.innerHTML = getExpressModeHTML(); initExpressMode(); break;
            case 'ai': DOMElements.contentContainer.innerHTML = getAiModeHTML(); initAiMode(); break;
        }
    };
    
    // =================================================================================
    // ALL MODES HTML & INIT FUNCTIONS
    // =================================================================================

    const initGuidedMode = () => {
        state.currentStep = 1;
        renderGuidedView();
    };

    const initExpressMode = () => {
        const calculateBtn = DOMElements.contentContainer.querySelector('#express-calculate-btn');
        calculateBtn.addEventListener('click', async () => {
            syncExpressFormData();
            await generateAnalysis(DOMElements.contentContainer.querySelector('#express-analysis-container'));
        });
    };

    const initAiMode = () => {
        const ui = {
            window: DOMElements.contentContainer.querySelector('#chat-window'),
            input: DOMElements.contentContainer.querySelector('#chat-input'),
            sendBtn: DOMElements.contentContainer.querySelector('#chat-send'),
            suggestions: DOMElements.contentContainer.querySelector('#ai-suggestions'),
        };
        ui.sendBtn.addEventListener('click', () => sendChatMessage(ui));
        ui.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(ui); });
        addChatMessage('Dobrý den! Jsem Hypotéka AI. Ptejte se na cokoliv, nebo si vyberte z témat níže.', 'ai', ui.window);
        generateAISuggestions(ui);
    };

    // =================================================================================
    // SHARED LOGIC - ANALYSIS, FORMS, UTILITIES
    // =================================================================================
    
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

        state.calculation.offers.forEach(offer => {
            container.querySelector(`[data-offer-id="${offer.id}"]`)?.addEventListener('click', () => {
                state.calculation.selectedOffer = offer;
                renderAnalysis(container); 
            });
        });
        
        const showFormBtn = container.querySelector('#show-lead-form-btn');
        if (showFormBtn) {
            showFormBtn.addEventListener('click', () => {
                renderContactForm();
                showFormBtn.style.display = 'none';
            });
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
        
        // Append analysis data to the form
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
            DOMElements.leadFormContainer.innerHTML = `
                <div class="text-center bg-green-100 p-8 rounded-lg">
                    <h3 class="text-2xl font-bold text-green-800">Děkujeme!</h3>
                    <p class="text-green-700 mt-2">Vaše poptávka byla úspěšně odeslána. Náš specialista se vám brzy ozve.</p>
                </div>`;
        })
        .catch((error) => {
            DOMElements.leadFormContainer.innerHTML = `
                 <div class="text-center bg-red-100 p-8 rounded-lg">
                    <h3 class="text-2xl font-bold text-red-800">Chyba!</h3>
                    <p class="text-red-700 mt-2">Při odesílání formuláře nastala chyba: ${error}. Zkuste to prosím znovu.</p>
                </div>`;
        });
    };

    // --- UTILITY & HELPER FUNCTIONS ---
    const renderPartnerLogos = () => {
        if (!DOMElements.partnerLogosContainer) return;
        DOMElements.partnerLogosContainer.innerHTML = CONFIG.PARTNER_LOGOS
            .map(url => `<img src="${url}" alt="Partnerské logo" class="partner-logo">`).join('');
    };
    const startLiveCounter = () => {
        let count = 147;
        setInterval(() => {
            const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            count += change;
            if (count < 130) count = 130;
            if (DOMElements.liveUsersCounter) {
                DOMElements.liveUsersCounter.textContent = `${count} lidí právě počítá hypotéku`;
            }
        }, 3000);
    };
    // ... all other helper functions are included below ...

    function renderGuidedView() {
        const step = state.currentStep;
        DOMElements.contentContainer.innerHTML = `
            <div class="text-center mb-4">
                <h2 class="text-2xl font-bold">Profesionální analýza</h2>
            </div>
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
            </div>
        `;
        renderGuidedStep(step);
    }

    function renderGuidedStep(step) {
        const formContainer = DOMElements.contentContainer.querySelector('#form-container');
        formContainer.innerHTML = getGuidedStepHTML(step);
        setupGuidedListenersForStep();
        updateGuidedUI();
    }

    function setupGuidedListenersForStep() {
        DOMElements.contentContainer.querySelector('#next-btn')?.addEventListener('click', () => navigateStep(1));
        DOMElements.contentContainer.querySelector('#prev-btn')?.addEventListener('click', () => navigateStep(-1));
        
        DOMElements.contentContainer.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', syncGuidedFormData);
        });

        DOMElements.contentContainer.querySelectorAll('input[type="range"]').forEach(slider => {
            const textInput = document.getElementById(slider.dataset.sync);
            if (textInput) {
                slider.addEventListener('input', () => {
                    textInput.value = formatNumber(slider.value, false);
                    syncGuidedFormData();
                });
            }
        });
        DOMElements.contentContainer.querySelectorAll('.slider-sync-input').forEach(textInput => {
             textInput.addEventListener('input', debounce(() => {
                const slider = document.querySelector(`[data-sync="${textInput.id}"]`);
                if (slider) {
                    slider.value = parseNumber(textInput.value);
                }
                syncGuidedFormData();
            }, CONFIG.DEBOUNCE_DELAY));
        });
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
        if (state.currentStep === 4) {
             await generateAnalysis(DOMElements.contentContainer.querySelector('#analysis-container'));
        }
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

    function syncGuidedFormData() {
        const formContainer = DOMElements.contentContainer.querySelector('#form-container');
        if(!formContainer) return;

        formContainer.querySelectorAll('[data-key]').forEach(el => {
            const key = el.dataset.key;
            state.formData[key] = (el.type === 'number' || el.tagName === 'SELECT' && !isNaN(parseInt(el.value))) 
                ? parseInt(el.value) 
                : (el.type === 'range' ? parseInt(el.value) : (parseNumber(el.value) || el.value));
        });
        formContainer.querySelectorAll('input[type="radio"]:checked').forEach(el => {
            state.formData[el.name] = isNaN(parseInt(el.value)) ? el.value : parseInt(el.value);
        });

        if (state.currentStep === 3) {
            updateDSTIIndicator();
        }
    }

    function syncExpressFormData() {
        DOMElements.contentContainer.querySelectorAll('[data-key]').forEach(el => {
             state.formData[el.dataset.key] = parseNumber(el.value) || el.value;
        });
    }

    function validateStep(step) { return true; }

    function updateDSTIIndicator() {
        const container = document.getElementById('dsti-indicator');
        if (!container) return;
        const { income, liabilities } = state.formData;
        const tempPayment = calculateMonthlyPayment(5000000, 5, 25); // Placeholder
        const dsti = income > 0 ? ((tempPayment + liabilities) / income) * 100 : 0;
        
        let color = 'bg-green-500';
        if (dsti > 40) color = 'bg-yellow-500';
        if (dsti > 45) color = 'bg-red-500';

        container.innerHTML = `
            <p class="text-sm font-semibold mb-2">Odhad DSTI (poměr dluhu k příjmům): <span class="font-bold">${dsti.toFixed(1)}%</span></p>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="${color} h-2.5 rounded-full" style="width: ${Math.min(100, dsti*2)}%"></div>
            </div>
            <p class="text-xs text-gray-500 mt-1">Regulatorní limit je 50 %.</p>
        `;
    }

    function updateLoanChart() {
        if (state.chart) state.chart.destroy();
        const ctx = document.getElementById('loanChart')?.getContext('2d');
        if (!ctx) return;
        
        const { loanAmount } = state.calculation;
        const { loanTerm, fixation } = state.formData;
        const { rate } = state.calculation.selectedOffer;
        
        let balance = loanAmount;
        const labels = Array.from({length: loanTerm + 1}, (_, i) => i);
        const data = [loanAmount];

        for (let i = 0; i < loanTerm; i++) {
            let totalInterest = 0;
            for(let j=0; j<12; j++) {
                totalInterest += balance * (rate/100/12);
                balance -= (calculateMonthlyPayment(loanAmount, rate, loanTerm) - (balance * (rate/100/12)));
            }
            data.push(balance > 0 ? balance : 0);
        }

        state.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Zůstatek jistiny', data: data, borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    function addChatMessage(message, sender, container) {
        if (!container) return;
        const bubble = document.createElement('div');
        bubble.classList.add(sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai');
        bubble.innerHTML = sender === 'ai' ? marked.parse(message) : message;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    }

    function updateLastMessage(message, sender, container) {
        if (!container) return;
        const lastBubble = container.querySelector('.chat-bubble-ai-typing');
        if(lastBubble){
            lastBubble.classList.remove('chat-bubble-ai-typing');
            lastBubble.innerHTML = marked.parse(message);
        }
    }

    async function sendChatMessage(ui) {
        const message = ui.input.value.trim();
        if (!message) return;
        
        addChatMessage(message, 'user', ui.window);
        ui.input.value = '';
        
        const typingBubble = document.createElement('div');
        typingBubble.classList.add('chat-bubble-ai', 'chat-bubble-ai-typing');
        typingBubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        ui.window.appendChild(typingBubble);
        ui.window.scrollTop = ui.window.scrollHeight;

        try {
            const res = await fetch(CONFIG.API_CHAT_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context: { formData: state.formData, calculation: state.calculation } })
            });
            if (!res.ok) {
                 const err = await res.json();
                 throw new Error(err.error);
            }
            const data = await res.json();
            updateLastMessage(data.response, 'ai', ui.window);
        } catch (e) {
            updateLastMessage(`Omlouvám se, mám dočasně technický problém: ${e.message}`, 'ai', ui.window);
        }
    }

    function generateAISuggestions(ui) {
        let html = '';
        for (const category in CONFIG.AI_SUGGESTIONS) {
            html += `<div class="mb-2"><p class="text-xs font-bold text-gray-500 uppercase">${category}</p><div class="flex flex-wrap gap-2 mt-1">`;
            CONFIG.AI_SUGGESTIONS[category].forEach(q => {
                html += `<button class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-full transition-colors">${q}</button>`;
            });
            html += `</div></div>`;
        }
        ui.suggestions.innerHTML = html;
        ui.suggestions.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                ui.input.value = btn.textContent;
                sendChatMessage(ui);
            });
        });
    }

    function renderContactForm() {
        DOMElements.leadFormContainer.innerHTML = getLeadFormHTML();
        DOMElements.leadFormContainer.scrollIntoView({ behavior: 'smooth' });
        DOMElements.leadFormContainer.querySelector('form').addEventListener('submit', handleFormSubmit);
    }
    
    // --- HTML SNIPPET GETTERS ---
    function getExpressModeHTML() {
        return `
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold">Expresní scoring</h2>
                <p class="text-gray-600">Zadejte základní údaje a získejte okamžitý přehled.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                 <div><label class="form-label">Cena nemovitosti</label><input type="text" data-key="propertyValue" class="modern-input" value="5 000 000"></div>
                <div><label class="form-label">Vlastní zdroje</label><input type="text" data-key="ownResources" class="modern-input" value="1 000 000"></div>
                <div><label class="form-label">Čistý příjem</label><input type="text" data-key="income" class="modern-input" value="60 000"></div>
                <div><label class="form-label">Fixace</label><select data-key="fixation" class="modern-select">${createSelectOptions([3,5,7,10], 5)}</select></div>
                <button id="express-calculate-btn" class="nav-btn w-full h-[51px]">Spočítat</button>
            </div>
            <div id="express-analysis-container" class="mt-8 min-h-[200px]"></div>`;
    }

    function getAiModeHTML() {
        return `
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold">AI Hypoteční stratég</h2>
                <p class="text-gray-600">Zeptejte se na cokoliv. Naše AI vám poradí.</p>
            </div>
            <div class="bg-gray-100 rounded-lg overflow-hidden flex flex-col h-[70vh] max-h-[600px]">
                <div id="chat-window" class="flex-1 p-6 overflow-y-auto space-y-4"></div>
                <div id="ai-suggestions" class="p-4 border-t bg-white space-y-2"></div>
                <div class="p-4 bg-white border-t">
                    <div class="flex gap-4">
                        <input type="text" id="chat-input" class="modern-input flex-1" placeholder="Napište svůj dotaz...">
                        <button id="chat-send" class="nav-btn">Odeslat</button>
                    </div>
                </div>
            </div>`;
    }

    function getGuidedStepHTML(step) {
        const data = state.formData;
        switch(step) {
            case 1: 
                const purposeSpecificFields = {
                    'koupě': createSliderInput('propertyValue', 'Cena nemovitosti', data.propertyValue, 1000000, 20000000) + createSliderInput('ownResources', 'Vlastní zdroje', data.ownResources, 0, data.propertyValue),
                    'výstavba': createSliderInput('landValue', 'Hodnota pozemku', data.landValue, 0, 10000000) + createSliderInput('constructionBudget', 'Rozpočet na stavbu', data.constructionBudget, 1000000, 20000000),
                    'rekonstrukce': createSliderInput('propertyValue', 'Hodnota nemovitosti před', data.propertyValue, 1000000, 20000000) + createSliderInput('constructionBudget', 'Rozpočet na rekonstrukci', data.constructionBudget, 100000, 5000000),
                    'refinancování': createSliderInput('propertyValue', 'Aktuální hodnota nemovitosti', data.propertyValue, 1000000, 20000000) + createSliderInput('loanBalance', 'Zůstatek úvěru', data.loanBalance, 100000, 20000000),
                };
                return `
                <div class="form-section active grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label class="form-label">Účel hypotéky</label>
                        <div class="radio-group">${createRadioGroup('purpose', ['koupě', 'výstavba', 'rekonstrukce', 'refinancování'], data.purpose)}</div>
                    </div>
                    <div class="space-y-6">${purposeSpecificFields[data.purpose]}</div>
                </div>`;
            case 2: return `
                <div class="form-section active grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label class="form-label">Kolik vás bude o hypotéku žádat?</label>
                        <div class="radio-group">${createRadioGroup('applicants', [1, 2, 'více'], data.applicants)}</div>
                    </div>
                    <div><label class="form-label">Věk nejstaršího žadatele</label><input type="number" data-key="age" class="modern-input" value="${data.age || ''}" placeholder="např. 35"></div>
                    <div>
                        <label class="form-label">Nejvyšší dosažené vzdělání</label>
                        <select data-key="education" class="modern-select">${createSelectOptions(['základní', 'vyučen', 'středoškolské bez maturity', 'středoškolské s maturitou', 'vysokoškolské'], data.education)}</select>
                    </div>
                 </div>`;
            case 3: return `
                <div class="form-section active grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label class="form-label">Typ vašeho hlavního příjmu</label>
                        <select data-key="employment" class="modern-select">${createSelectOptions(['zaměstnanec', 'OSVČ', 's.r.o.', 'jiné'], data.employment)}</select>
                    </div>
                    <div class="space-y-6">
                        ${createSliderInput('income', 'Celkový čistý měsíční příjem', data.income, 20000, 250000)}
                        ${createSliderInput('liabilities', 'Celkové měsíční splátky', data.liabilities, 0, 100000)}
                    </div>
                    <div class="md:col-span-2 mt-4" id="dsti-indicator"></div>
                </div>`;
            case 4: return `<div class="form-section active" id="analysis-container"></div>`;
        }
        return '';
    }

    function getAnalysisHTML() {
        const { offers, approvability, dsti, loanAmount, ltv, selectedOffer } = state.calculation;
        const totalPaid = selectedOffer.monthlyPayment * state.formData.loanTerm * 12;
        const overpayment = totalPaid - loanAmount;
        return `
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold">Vaše osobní analýza</h2>
                <p class="text-gray-600">Na základě zadaných údajů jsme pro vás připravili 3 nejlepší varianty.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                ${offers.map(offer => `
                    <div class="offer-card p-6 rounded-lg ${offer.id === selectedOffer.id ? 'selected' : ''}" data-offer-id="${offer.id}">
                        <h4 class="font-bold text-lg">${offer.title}</h4>
                        <p class="text-3xl font-bold my-2">${formatNumber(offer.monthlyPayment)}</p>
                        <p class="text-sm text-gray-500 mb-4">s úrokem od ${offer.rate.toFixed(2)} %</p>
                        <p class="text-xs text-gray-600">${offer.description}</p>
                    </div>
                `).join('')}
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center bg-gray-50 p-6 rounded-lg">
                <div class="lg:col-span-3 h-80"><canvas id="loanChart"></canvas></div>
                <div class="lg:col-span-2 space-y-4">
                    <div class="bg-green-100 border border-green-200 p-4 rounded-lg text-center">
                        <p class="text-sm text-green-800 font-semibold">Pravděpodobnost schválení</p>
                        <p class="text-4xl font-bold text-green-900">${approvability}%</p>
                    </div>
                    <div class="text-sm space-y-2 text-gray-600">
                        <div class="flex justify-between"><p>Výše úvěru (LTV)</p><p class="font-semibold">${formatNumber(loanAmount)} (${ltv.toFixed(1)}%)</p></div>
                        <div class="flex justify-between"><p>Doba splatnosti</p><p class="font-semibold">${state.formData.loanTerm} let</p></div>
                        <div class="flex justify-between"><p>DSTI (zatížení příjmu)</p><p class="font-semibold">${dsti.toFixed(1)}%</p></div>
                        <div class="flex justify-between border-t mt-2 pt-2"><p>Celkem zaplatíte</p><p class="font-semibold">${formatNumber(totalPaid)}</p></div>
                        <div class="flex justify-between"><p>Přeplatek na úrocích</p><p class="font-semibold">${formatNumber(overpayment)}</p></div>
                    </div>
                </div>
            </div>
            <div class="text-center mt-12">
                 <p class="text-sm text-gray-500 mb-4">Toto je první odhad naší AI. Přesnou nabídku a finální podmínky pro vás zdarma vyjedná náš lidský specialista.</p>
                <button id="show-lead-form-btn" class="nav-btn text-lg">Získat nabídku od specialisty</button>
            </div>`;
    }

    function getLeadFormHTML() {
        return `
        <div class="bg-blue-50 p-8 rounded-2xl mt-12">
            <h3 class="text-2xl font-bold text-center mb-2">Spojte se s naším specialistou</h3>
            <p class="text-gray-600 text-center mb-6">Vyplňte své údaje a my se vám ozveme s konkrétní nabídkou připravenou na míru.</p>
            <form name="lead-form" method="POST" data-netlify="true" class="max-w-xl mx-auto space-y-4">
                <input type="hidden" name="form-name" value="lead-form" />
                <div>
                    <label class="form-label">Jméno a příjmení</label>
                    <input type="text" name="name" class="modern-input" required>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="form-label">E-mail</label><input type="email" name="email" class="modern-input" required></div>
                    <div><label class="form-label">Telefon</label><input type="tel" name="phone" class="modern-input" required></div>
                </div>
                <div>
                    <label class="form-label">Poznámka nebo specifický dotaz (volitelné)</label>
                    <textarea name="notes" class="modern-input" rows="3"></textarea>
                </div>
                <div class="text-center pt-4">
                    <button type="submit" class="nav-btn text-lg">Odeslat poptávku</button>
                </div>
            </form>
        </div>`;
    }

    function createRadioGroup(name, options, selectedValue) { return options.map(opt => `<label class="radio-label"><input type="radio" name="${name}" value="${opt}" ${opt == selectedValue ? 'checked' : ''}><span>${String(opt).charAt(0).toUpperCase() + String(opt).slice(1)}</span></label>`).join(''); }
    function createSelectOptions(options, selectedValue) { return options.map(opt => `<option value="${opt}" ${opt == selectedValue ? 'selected' : ''}>${String(opt).charAt(0).toUpperCase() + String(opt).slice(1)}</option>`).join(''); }
    function createSliderInput(key, label, value, min, max) {
        const step = CONFIG.SLIDER_STEPS[key] || 1000;
        return `
        <div class="slider-container">
            <label for="${key}-text" class="form-label">${label}</label>
            <input type="text" id="${key}-text" data-key="${key}" class="modern-input slider-sync-input" value="${formatNumber(value, false)}">
            <input type="range" data-key="${key}" data-sync="${key}-text" class="w-full mt-2" min="${min}" max="${max}" value="${value}" step="${step}">
            <div class="range-labels"><span>${formatNumber(min, true)}</span><span>${formatNumber(max, true)}</span></div>
        </div>`;
    }
    const formatNumber = (n, isLabel = false) => {
        const num = Number(n);
        if (isLabel) {
            if (num >= 1000000) return `${num/1000000} mil.`;
            if (num >= 1000) return `${num/1000} tis.`;
        }
        return num.toLocaleString('cs-CZ');
    }
    const parseNumber = (s) => {
        const cleaned = String(s).toLowerCase().replace(/,/g, '.').replace(/\s/g, '').replace('kč','');
        if (cleaned.endsWith('m') || cleaned.endsWith('mil')) return parseFloat(cleaned) * 1000000;
        if (cleaned.endsWith('k') || cleaned.endsWith('tis')) return parseFloat(cleaned) * 1000;
        return parseFloat(cleaned) || 0;
    };
    const debounce = (fn, d) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), d);
        }
    };
    const calculateMonthlyPayment = (p, r, t) => p <= 0 ? 0 : (p * (r/100/12) * Math.pow(1 + (r/100/12), t*12)) / (Math.pow(1 + (r/100/12), t*12) - 1);
});

