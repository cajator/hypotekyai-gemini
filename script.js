'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- KONFIGURACE ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/.netlify/functions/chat',
        API_RATES_ENDPOINT: '/.netlify/functions/rates',
    };

    // --- STAV APLIKACE ---
    const state = {
        mode: 'express',
        isAiTyping: false,
        chatOpen: false,
        chatHistory: [],
        formData: {
            propertyValue: 5000000, loanAmount: 4000000,
            income: 50000, liabilities: 0, age: 35, children: 0,
            loanTerm: 25, fixation: 3,
            purpose: 'koupě', propertyType: 'byt', landValue: 0,
            employment: 'zaměstnanec', education: 'středoškolské'
        },
        calculation: { offers: [], selectedOffer: null, approvability: { total: 0 }, fixationDetails: null, isFromOurCalculator: false },
        chart: null,
    };

    // --- CACHE DOM ELEMENTŮ ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        // ZMĚNA: Elementy pro nový chat
        chatFab: document.getElementById('chat-fab'),
        chatModal: document.getElementById('chat-modal'),
        chatContainer: document.getElementById('chat-container'),
        chatCloseBtn: document.getElementById('chat-close-btn'),
        chatMessages: document.getElementById('chat-messages'),
        aiSuggestions: document.getElementById('ai-suggestions'),
        chatForm: document.getElementById('chat-form'),
        chatInput: document.getElementById('chat-input'),
    };
    
    // --- ZMĚNA: Bleskové odpovědi na časté dotazy ---
    const cannedResponses = {
        'Domluvit se specialistou': {
            response: 'Rozumím. Nejlepší je vyplnit formulář, aby měl specialista všechny potřebné informace. Otevírám ho pro vás.',
            action: () => {
                document.getElementById('kontakt')?.classList.remove('hidden');
                scrollToTarget('#kontakt');
            }
        },
        'Jaké jsou aktuální sazby?': {
            response: 'Úrokové sazby se neustále mění. Nejlepší sazby se aktuálně pohybují okolo 4.09% pro hypotéky do 70% LTV. Pro přesný výpočet doporučuji použít naši kalkulačku.'
        },
        'Co potřebuji?': {
            response: 'Pro získání hypotéky budete obecně potřebovat:\n• **Doklady totožnosti** (občanský průkaz)\n• **Potvrzení o příjmu** od zaměstnavatele nebo daňové přiznání u OSVČ\n• **Podklady k nemovitosti** (kupní smlouva, odhad ceny)\nNáš specialista vám se všemi dokumenty pomůže.'
        },
        'Spočítat hypotéku': {
            response: 'Jistě, přejděte prosím do naší kalkulačky a zadejte základní údaje. Zabere to jen chvilku.',
            action: () => scrollToTarget('#kalkulacka')
        }
    };

    // --- POMOCNÉ FUNKCE ---
    const parseNumber = (s) => parseFloat(String(s).replace(/[^0-9]/g, '')) || 0;
    const formatNumber = (n, currency = true) => n.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });
    const scrollToTarget = (targetId) => document.querySelector(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // --- DYNAMICKÉ VYTVÁŘENÍ KOMPONENT ---
    const createSlider = (id, label, value, min, max, step) => `
        <div>
            <div class="flex justify-between items-center mb-2">
                <label for="${id}" class="form-label mb-0">${label}</label>
                <div class="flex items-center gap-1">
                    <input type="text" id="${id}-input" value="${formatNumber(value, false)}" class="slider-value-input">
                    <span>${(id.includes('Term') || id.includes('age') || id.includes('children') || id.includes('fixation')) ? ' let' : ' Kč'}</span>
                </div>
            </div>
            <input type="range" id="${id}" name="${id}" min="${min}" max="${max}" value="${value}" step="${step}" class="slider-input">
        </div>`;
        
    const createSelect = (id, label, options, selectedValue) => `
        <div>
            <label for="${id}" class="form-label">${label}</label>
            <select id="${id}" name="${id}" class="modern-select">
                ${Object.entries(options).map(([key, val]) => `<option value="${key}" ${key === selectedValue ? 'selected' : ''}>${val}</option>`).join('')}
            </select>
        </div>`;

    // --- VYKRESLOVACÍ FUNKCE (render) ---
    const renderCalculator = () => {
        const getExpressHTML = () => `
            <div class="bg-white p-6 md:p-8 rounded-2xl shadow-xl border space-y-4">
                ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000)}
                ${createSlider('loanAmount','Chci si půjčit',state.formData.loanAmount,200000,20000000,100000)}
                ${createSlider('income','Měsíční čistý příjem',state.formData.income,15000,300000,1000)}
                <div class="pt-4 flex justify-center">
                    <button class="nav-btn w-full max-w-sm text-lg py-3" data-action="calculate">
                        <span>Spočítat a najít nabídky</span>
                        <div class="loading-spinner-white hidden ml-2"></div>
                    </button>
                </div>
            </div>
            <div id="results-container" class="mt-8"></div>`;

        const getGuidedHTML = () => `
            <div class="bg-white p-6 md:p-8 rounded-2xl shadow-xl border">
                 <div class="space-y-6">
                    <div>
                        <h3 class="text-xl font-bold border-b pb-2 mb-4">Úvěr a nemovitost</h3>
                        <div class="form-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                            ${createSelect('purpose', 'Účel hypotéky', { 'koupě': 'Koupě', 'výstavba': 'Výstavba', 'rekonstrukce': 'Rekonstrukce' }, state.formData.purpose)}
                            ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000)}
                            ${createSlider('loanAmount','Výše úvěru',state.formData.loanAmount,200000,20000000,100000)}
                            ${createSlider('loanTerm','Délka splatnosti',state.formData.loanTerm,5,30,1)}
                        </div>
                    </div>
                     <div>
                        <h3 class="text-xl font-bold border-b pb-2 mb-4">Vaše bonita</h3>
                        <div class="form-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                           ${createSlider('income','Čistý měsíční příjem',state.formData.income,15000,300000,1000)}
                           ${createSlider('liabilities','Měsíční splátky jiných úvěrů',state.formData.liabilities,0,100000,500)}
                           ${createSlider('age','Věk nejstaršího žadatele',state.formData.age,18,70,1)}
                           ${createSlider('children','Počet dětí',state.formData.children,0,10,1)}
                        </div>
                    </div>
                    <div class="pt-4 flex justify-center">
                         <button class="nav-btn w-full max-w-sm text-lg py-3" data-action="calculate">
                            <span>Spočítat a najít nabídky</span>
                            <div class="loading-spinner-white hidden ml-2"></div>
                        </button>
                    </div>
                 </div>
            </div>
            <div id="results-container" class="mt-8"></div>`;
        
        DOMElements.contentContainer.innerHTML = state.mode === 'express' ? getExpressHTML() : getGuidedHTML();
    };
    
    // ZMĚNA: Funkce pro ovládání chatu
    const openChat = () => {
        state.chatOpen = true;
        DOMElements.chatModal.classList.add('visible');
        setTimeout(() => DOMElements.chatContainer.classList.remove('scale-95', 'opacity-0'), 10);
        
        if (state.chatHistory.length === 0) {
            let welcomeMessage = 'Jsem váš hypoteční poradce s přístupem k datům z 19+ bank. Co vás zajímá?';
            if (state.calculation.isFromOurCalculator && state.calculation.selectedOffer) {
                welcomeMessage = `Mám vaši analýzu z naší kalkulačky. Splátka **${formatNumber(state.calculation.selectedOffer.monthlyPayment)}** při sazbě **${state.calculation.selectedOffer.rate.toFixed(2)}%** je solidní nabídka. Jaké jsou vaše další otázky?`;
            }
            addChatMessage(welcomeMessage, 'ai');
        }
        generateAISuggestions();
        DOMElements.chatInput.focus();
    };

    const closeChat = () => {
        state.chatOpen = false;
        DOMElements.chatContainer.classList.add('scale-95', 'opacity-0');
        setTimeout(() => DOMElements.chatModal.classList.remove('visible'), 300);
    };

    const addChatMessage = (message, sender) => {
        if (sender !== 'ai-typing') {
            state.chatHistory.push({ text: message, sender });
        }
        
        const bubble = document.createElement('div');
        if (sender === 'ai-typing') {
            bubble.id = 'typing-indicator';
            bubble.className = 'chat-bubble-ai';
            bubble.innerHTML = '<div class="loading-spinner-blue"></div>';
        } else {
            bubble.className = sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user';
            bubble.innerHTML = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        }
        
        DOMElements.chatMessages.appendChild(bubble);
        DOMElements.chatMessages.scrollTop = DOMElements.chatMessages.scrollHeight;
    };

    const generateAISuggestions = () => {
        const suggestions = state.calculation.selectedOffer 
            ? ["Vysvětli mi analýzu fixace", "Jaká jsou rizika?", "Lepší úrok?", "Domluvit se specialistou"]
            : ["Spočítat hypotéku", "Aktuální sazby", "Co potřebuji?", "Domluvit se specialistou"];
        
        DOMElements.aiSuggestions.innerHTML = `<div class="flex gap-2 overflow-x-auto pb-1">${suggestions.map(s => 
            `<button class="suggestion-btn" data-suggestion="${s}">${s}</button>`
        ).join('')}</div>`;
    };

    // --- API & VÝPOČTY ---
    const calculateRates = async (button) => {
        button.disabled = true;
        const spinner = button.querySelector('.loading-spinner-white');
        spinner?.classList.remove('hidden');
        
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = `<div class="text-center p-8"><div class="loading-spinner-blue"></div><p>Počítám nejlepší nabídky...</p></div>`;
        
        try {
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${new URLSearchParams(state.formData).toString()}`);
            if (!response.ok) throw new Error(`HTTP chyba ${response.status}`);
            const data = await response.json();
            state.calculation = { ...state.calculation, ...data, isFromOurCalculator: true };
            renderResults();
        } catch (error) {
            console.error('Chyba při načítání sazeb:', error);
            resultsContainer.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg"><h3 class="font-bold text-red-800">Chyba při výpočtu. Zkuste to prosím znovu.</h3></div>`;
        } finally {
            button.disabled = false;
            spinner?.classList.add('hidden');
        }
    };

    const handleChatMessageSend = async (message) => {
        if (!message || state.isAiTyping) return;
        addChatMessage(message, 'user');
        
        // ZMĚNA: Kontrola "předpřipravených odpovědí"
        const canned = cannedResponses[message];
        if (canned) {
            setTimeout(() => {
                addChatMessage(canned.response, 'ai');
                if (canned.action) canned.action();
                closeChat();
            }, 500);
            return;
        }

        state.isAiTyping = true;
        addChatMessage('', 'ai-typing');
        generateAISuggestions();

        const timeout = setTimeout(() => {
             if (state.isAiTyping) {
                document.getElementById('typing-indicator')?.remove();
                addChatMessage('Omlouvám se, zpracování trvá déle než obvykle. Zkuste to prosím znovu nebo se spojte s naším specialistou.', 'ai');
                state.isAiTyping = false;
            }
        }, 20000); // Zkrácený timeout

        try {
            const context = {
                formData: state.formData,
                calculation: state.calculation,
                messageCount: state.chatHistory.filter(h => h.sender === 'user').length
            };
            
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context })
            });

            clearTimeout(timeout);
            document.getElementById('typing-indicator')?.remove();

            if (!response.ok) throw new Error('Chyba serveru při komunikaci s AI.');
            
            const data = await response.json();

            if (data.tool === 'showLeadForm' || data.tool === 'startContactForm') {
                addChatMessage(data.response, 'ai');
                cannedResponses['Domluvit se specialistou'].action();
                closeChat();
            } else {
                addChatMessage(data.response, 'ai');
            }

        } catch (error) {
            console.error('Chyba chatu:', error);
            clearTimeout(timeout);
            document.getElementById('typing-indicator')?.remove();
            addChatMessage('Omlouvám se, došlo k chybě. Zkuste to prosím znovu, nebo kontaktujte specialistu přímo.', 'ai');
        } finally {
            state.isAiTyping = false;
            generateAISuggestions();
        }
    };
    
    // --- EVENT LISTENERS & INICIALIZACE ---
    const setupEventListeners = () => {
        // Kliknutí na celém dokumentu
        document.body.addEventListener('click', e => {
            const target = e.target.closest('[data-action], [data-mode], [data-suggestion]');
            if (!target) return;

            const { action, mode, suggestion } = target.dataset;

            if (mode) {
                state.mode = mode;
                document.querySelectorAll('.mode-card').forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
                renderCalculator();
            }
            if (action === 'calculate') calculateRates(target);
            if (action === 'open-chat') openChat();
            if (suggestion) {
                DOMElements.chatInput.value = suggestion;
                handleChatMessageSend(suggestion);
                DOMElements.chatInput.value = '';
            }
        });

        // Ovládání chatu
        DOMElements.chatFab.addEventListener('click', openChat);
        DOMElements.chatCloseBtn.addEventListener('click', closeChat);
        DOMElements.chatModal.addEventListener('click', e => { if (e.target === DOMElements.chatModal) closeChat(); });
        DOMElements.chatForm.addEventListener('submit', e => {
            e.preventDefault();
            const message = DOMElements.chatInput.value.trim();
            if (message) handleChatMessageSend(message);
            DOMElements.chatInput.value = '';
        });

        // Dynamické listenery pro kalkulačku
        DOMElements.contentContainer.addEventListener('input', e => {
            const { id, value } = e.target;
            const baseId = id.replace('-input', '');
            if (state.formData.hasOwnProperty(baseId)) {
                const parsedValue = (e.target.type === 'range' || id.endsWith('-input')) ? parseNumber(value) : value;
                state.formData[baseId] = parsedValue;
                
                if (e.target.type === 'range') {
                    const input = document.getElementById(`${baseId}-input`);
                    if (input) input.value = formatNumber(parsedValue, false);
                } else if (!id.startsWith('select')) {
                     const slider = document.getElementById(baseId);
                     if (slider) slider.value = parsedValue;
                }
            }
        });
    };
    
    // Funkce renderResults zůstává téměř stejná, jen s drobnými úpravami
    const renderResults = () => {
        const { offers, approvability, fixationDetails } = state.calculation;
        const container = document.getElementById('results-container');
        if (!offers || offers.length === 0) {
            container.innerHTML = `<div class="text-center bg-red-50 p-8 rounded-lg mt-8"><h3 class="text-2xl font-bold text-red-800">Dle zadaných parametrů to nevychází.</h3><p class="text-red-700">Zkuste upravit parametry nebo se spojte s naším specialistou.</p></div>`;
            return;
        }

        const offersHTML = offers.map(o => `
            <div class="offer-card p-4" data-offer-id="${o.id}">
                <h4 class="font-bold text-blue-700">${o.title}</h4>
                <p class="text-sm text-gray-600 mb-2">${o.description}</p>
                <div class="text-right mt-auto">
                    <div class="text-2xl font-extrabold">${formatNumber(o.monthlyPayment)}</div>
                    <div class="text-sm font-semibold text-gray-500">Úrok ${o.rate.toFixed(2)} %</div>
                </div>
            </div>`).join('');
        
        container.innerHTML = `
            <div>
                <h3 class="text-3xl font-bold mb-6">Našli jsme pro vás tyto nabídky:</h3>
                <div class="results-grid">${offersHTML}</div>
            </div>
            <div class="mt-8 bg-white p-6 rounded-2xl shadow-lg border">
                <h3 class="text-xl font-bold mb-4">Analýza vaší žádosti</h3>
                <p>Celková šance na schválení: <strong class="text-xl text-green-600">${approvability.total}%</strong></p>
                <p class="text-sm text-gray-600">LTV: ${approvability.ltv}%, DSTI: ${approvability.dsti}%, Bonita: ${approvability.bonita}%</p>
                <div class="mt-4 flex flex-col md:flex-row gap-4">
                     <button class="nav-btn bg-blue-600 hover:bg-blue-700 flex-1 py-3" data-action="open-chat" data-prefill="Vysvětli mi analýzu fixace">
                        🤖 Probrat detaily s AI
                    </button>
                    <button class="nav-btn bg-green-600 hover:bg-green-700 flex-1 py-3" onclick="document.getElementById('kontakt').classList.remove('hidden'); scrollToTarget('#kontakt');">
                        📞 Spojit se specialistou
                    </button>
                </div>
            </div>
        `;
        
        const firstCard = container.querySelector('.offer-card');
        if (firstCard) firstCard.classList.add('selected');
        state.calculation.selectedOffer = offers.find(o => o.id === firstCard.dataset.offerId);
        
        scrollToTarget('#results-container');
    };

    const init = () => {
        renderCalculator();
        setupEventListeners();
    };

    init();
});