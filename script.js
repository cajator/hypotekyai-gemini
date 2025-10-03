'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/api/chat',
        API_RATES_ENDPOINT: '/api/rates',
        FAST_RESPONSE_TIMEOUT: 3000, // 3 sekundy pro rychlé odpovědi
        AI_TIMEOUT: 30000, // 30 sekund max pro AI
    };

    // --- PŘEDPŘIPRAVENÉ RYCHLÉ ODPOVĚDI (bez AI) ---
    const FAST_ANSWERS = {
        'aktuální sazby': {
            response: `**📊 Aktuální úrokové sazby (říjen 2025)**

**Top nabídky:**
• **3 roky fixace**: od 4.09% p.a.
• **5 let fixace**: od 4.14% p.a.
• **7 let fixace**: od 4.59% p.a.
• **10 let fixace**: od 4.69% p.a.

**Faktory ovlivňující sazbu:**
• LTV (poměr úvěru k hodnotě) - nižší = lepší sazba
• DSTI (poměr splátky k příjmu) - nižší = lepší podmínky
• Vaše bonita (příjem, zaměstnání, věk)

Chcete spočítat přesnou nabídku pro vaši situaci?`,
            suggestions: ['🔢 Spočítat hypotéku', '📋 Co potřebuji?', '📞 Kontakt specialista']
        },
        'dokumenty': {
            response: `**📋 Checklist dokumentů k hypotéce**

**Základní dokumenty (všichni):**
✅ Občanský průkaz
✅ Potvrzení o příjmu (výplatní pásky 3 měsíce)
✅ Výpis z účtu (3-6 měsíců)
✅ Potvrzení o pracovním poměru

**Pro OSVČ navíc:**
✅ Daňová přiznání (2-3 roky)
✅ Výpis z účtu (6 měsíců)
✅ Živnostenský list

**K nemovitosti:**
✅ Kupní smlouva / rezervační smlouva
✅ Znalecký posudek (zajistí banka)
✅ Výpis z katastru nemovitostí

**Tip:** Banka často vyžaduje i další dokumenty podle situace. Náš specialista vám připraví kompletní seznam na míru.`,
            suggestions: ['🔢 Spočítat hypotéku', '💼 Podmínky pro OSVČ', '📞 Kontakt specialista']
        },
        'osvč': {
            response: `**💼 Hypotéka pro OSVČ - podmínky**

**Základní info:**
• **Podnikání min. 2 roky** (některé banky 3 roky)
• **Prokázání příjmu** - daňová přiznání za 2-3 roky
• **Nižší bonita** než zaměstnanec (banka zprůměruje příjmy)
• **LTV často max 80%** (některé banky až 90%)

**Klíčové dokumenty:**
✅ Daňová přiznání (2-3 roky včetně příloh)
✅ Výpis z účtu (6 měsíců)
✅ Živnostenský list
✅ Výpis z obchodního rejstříku (pokud s.r.o.)

**Tipy pro lepší schválení:**
• Mít stabilní příjmy (ne velké výkyvy mezi roky)
• Nízký poměr dluhů
• Dobrá platební morálka
• Spolužadatel se stabilním příjmem (výhoda)

**Úspěšnost:** Cca 70% OSVČ získá hypotéku, pokud splní podmínky.`,
            suggestions: ['🔢 Spočítat jako OSVČ', '📋 Dokumenty OSVČ', '📞 Kontakt specialista']
        },
        'kolil si můžu půjčit': {
            response: `**💰 Kolik si můžete půjčit?**

**Rychlý vzorec:**
Max. úvěr ≈ **Čistý měsíční příjem × 9-10**

**Příklady:**
• Příjem 40 000 Kč → úvěr cca **3.6 mil. Kč**
• Příjem 50 000 Kč → úvěr cca **4.5 mil. Kč**
• Příjem 70 000 Kč → úvěr cca **6.3 mil. Kč**
• Příjem 100 000 Kč → úvěr cca **9 mil. Kč**

**Faktory snižující max. úvěr:**
❌ Jiné splátky (auta, spotřebitelské úvěry)
❌ Vyšší věk (nad 50 let)
❌ Více vyživovaných dětí
❌ OSVČ nebo DPČ

**Chcete přesný výpočet?** Použijte naši kalkulačku - zabere to 30 sekund!`,
            suggestions: ['🔢 Přesný výpočet', '📊 S mým příjmem', '📞 Kontakt specialista']
        },
        'fixace': {
            response: `**🔒 Jak vybrat délku fixace?**

**Krátká fixace (3-5 let):**
✅ Nižší úrok (o 0.3-0.5% než dlouhá)
✅ Flexibilita - dřívější refinancování
❌ Riziko růstu sazeb po skončení

**Dlouhá fixace (7-10 let):**
✅ Jistota stabilní splátky
✅ Ochrana před růstem sazeb
❌ Vyšší úrok (o 0.3-0.5%)
❌ Penále při předčasném splacení

**Doporučení:**
• **Mladí / růst příjmu** → kratší (3-5 let)
• **Rodina / stabilita** → střední (5-7 let)  
• **Senior / konzervativní** → delší (7-10 let)

**Současná situace (říjen 2025):**
Sazby jsou stabilní, očekává se mírný pokles. Pro většinu klientů doporučujeme **5 let** jako zlatou střední cestu.`,
            suggestions: ['🔢 Porovnat fixace', '💡 Doporučení pro mě', '📞 Kontakt specialista']
        },
        'refinancování': {
            response: `**💰 Kdy se vyplatí refinancování?**

**Refinancování dává smysl, když:**
✅ Váš úrok je **o 0.5%+ vyšší** než aktuální trh
✅ Zbývá vám splatit **500k+ Kč**
✅ Do konce fixace zbývá **max 1 rok** (jinak penále)

**Příklad úspory:**
• Úvěr: 3 mil. Kč, zbývá 20 let
• Současný úrok: 5.2%
• Nový úrok: 4.2%
• **Měsíční úspora: cca 2 100 Kč**
• **Roční úspora: 25 200 Kč**
• **Celková úspora: 504 000 Kč**

**Náklady refinancování:**
• Znalecký posudek: 5-8 tis. Kč
• Poplatky bance: 0-5 tis. Kč
• Celkem: **cca 10-15 tis. Kč**
• Návratnost: **6-12 měsíců**

**Tip:** 3-6 měsíců před koncem fixace začněte vyjednávat - můžete získat slevu i od stávající banky!`,
            suggestions: ['🔢 Spočítat úsporu', '💡 Strategie refinancování', '📞 Kontakt specialista']
        },
        'kontakt': {
            response: `**📞 Kontakt na naše specialisty**

Jsme tu pro vás každý pracovní den **8:00 - 20:00**.

**Telefonní linka:**
📱 **800 123 456** (zdarma)

**E-mail:**
✉️ info@hypoteky-ai.cz

**Odpovídáme do:**
• Telefon: okamžitě
• E-mail: do 4 hodin (pracovní doba)
• Formulář: do 24 hodin

Chcete, abychom vás kontaktovali? Klikněte na tlačítko níže.`,
            suggestions: ['📞 Zavolat mi', '✉️ Napsat email', '🔢 Spočítat hypotéku']
        }
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'express',
        isAiTyping: false,
        chatFormState: 'idle', 
        chatFormData: {},
        chatHistory: [],
        fastAnswerCache: new Map(), // Cache pro rychlé odpovědi
        activeUsers: Math.floor(Math.random() * 30) + 120,
        formData: {
            propertyValue: 5000000, loanAmount: 4000000,
            income: 50000, liabilities: 0, age: 35, children: 0,
            loanTerm: 25, fixation: 3,
            purpose: 'koupě', propertyType: 'byt', landValue: 0, reconstructionValue: 0,
            employment: 'zaměstnanec', education: 'středoškolské'
        },
        calculation: { 
            offers: [], 
            selectedOffer: null, 
            approvability: { total: 0 }, 
            smartTip: null, 
            tips: [], 
            fixationDetails: null, 
            isFromOurCalculator: false 
        },
        chart: null,
    };

    // Simulace aktivních uživatelů
    const updateActiveUsers = () => {
        const hour = new Date().getHours();
        let baseUsers = 120;
        if (hour >= 8 && hour <= 18) baseUsers = 140;
        else if (hour >= 19 && hour <= 22) baseUsers = 130;
        else if (hour >= 6 && hour <= 7) baseUsers = 125;
        
        state.activeUsers = baseUsers + Math.floor(Math.random() * 10) - 5;
        const footerCounter = document.getElementById('active-users-counter');
        if (footerCounter) footerCounter.textContent = `${state.activeUsers} lidí právě používá naše nástroje`;
    };
    setInterval(updateActiveUsers, 30000);

    // --- DOM ELEMENTS CACHE ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        aiChatContainer: document.getElementById('ai-chat-container'),
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
        if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const isMobile = () => window.innerWidth < 768;

    // --- FUNKCE PRO DETEKCI RYCHLÝCH ODPOVĚDÍ ---
    const findFastAnswer = (query) => {
        const normalizedQuery = query.toLowerCase().trim();
        
        // Přesná shoda
        for (const [key, value] of Object.entries(FAST_ANSWERS)) {
            if (normalizedQuery.includes(key)) return value;
        }
        
        // Klíčová slova
        const keywords = {
            'sazby|úrok|úroky|kolik%': 'aktuální sazby',
            'dokument|papír|doklad|co potřebuj': 'dokumenty',
            'osvč|podnikatel|živnost|firma': 'osvč',
            'kolik.*půjčit|maximální.*úvěr|max.*hypotéka': 'kolik si můžu půjčit',
            'fixace|fixovat|na.*let': 'fixace',
            'refinanc|přefinanc|změna.*bank': 'refinancování',
            'kontakt|telefon|email|zavolat|spojit.*specialist': 'kontakt'
        };
        
        for (const [pattern, key] of Object.entries(keywords)) {
            if (new RegExp(pattern, 'i').test(normalizedQuery)) {
                return FAST_ANSWERS[key];
            }
        }
        
        return null;
    };

    // --- NOVÝ AI CHAT UI ---
    const initAiChat = () => {
        if (!DOMElements.aiChatContainer) return;
        
        DOMElements.aiChatContainer.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl border-2 border-blue-100 overflow-hidden">
                <!-- Chat header -->
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center">
                            <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                                <span class="text-2xl">🤖</span>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold">AI Hypoteční Asistent</h3>
                                <p class="text-sm text-blue-100">Odpovídám do 3 sekund • Data z 19+ bank</p>
                            </div>
                        </div>
                        <button class="hidden lg:block bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-all"
                                data-action="reset-chat">
                            🔄 Nový chat
                        </button>
                    </div>
                    
                    <!-- Quick stats -->
                    ${state.calculation.selectedOffer ? `
                    <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 mt-4">
                        <div class="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p class="text-2xl font-bold">${formatNumber(state.calculation.selectedOffer.monthlyPayment)}</p>
                                <p class="text-xs text-blue-100">Měsíční splátka</p>
                            </div>
                            <div>
                                <p class="text-2xl font-bold">${state.calculation.selectedOffer.rate.toFixed(2)}%</p>
                                <p class="text-xs text-blue-100">Úroková sazba</p>
                            </div>
                            <div>
                                <p class="text-2xl font-bold">${state.calculation.approvability.total}%</p>
                                <p class="text-xs text-blue-100">Šance schválení</p>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Chat messages -->
                <div id="chat-messages-area" class="p-6 space-y-4 overflow-y-auto bg-gray-50" 
                     style="min-height: 400px; max-height: 60vh;">
                </div>

                <!-- Quick suggestions -->
                <div id="chat-suggestions" class="px-6 py-3 bg-white border-t border-gray-200">
                    <div class="flex flex-wrap gap-2">
                        ${generateSuggestionButtons()}
                    </div>
                </div>

                <!-- Input area -->
                <div class="p-6 bg-white border-t-2 border-blue-100">
                    <div class="flex gap-3">
                        <input type="text" 
                               id="chat-input-field" 
                               placeholder="Napište dotaz... (např. 'Kolik si můžu půjčit s příjmem 50k?')"
                               class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-all text-base"
                               style="font-size: 16px;">
                        <button id="chat-send-btn" 
                                class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2"
                                data-action="send-chat-message">
                            <span>Odeslat</span>
                            <span>→</span>
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-2 text-center">
                        💡 Tip: Ptejte se konkrétně s čísly pro nejrychlejší odpověď
                    </p>
                </div>
            </div>`;

        // Přidat úvodní zprávu
        if (state.chatHistory.length === 0) {
            addChatMessage(
                state.calculation.selectedOffer 
                    ? `Vidím, že jste si spočítali hypotéku. Skvělé! Vaše splátka **${formatNumber(state.calculation.selectedOffer.monthlyPayment)}** při sazbě **${state.calculation.selectedOffer.rate.toFixed(2)}%** vypadá dobře. Co vás zajímá nejvíc?`
                    : 'Ahoj! 👋 Jsem váš AI asistent. Pomůžu vám s čímkoliv ohledně hypotéky. **Odpovídám do 3 sekund** na časté otázky, složitější věci konzultujte s naším specialistou. Na co jste zvědaví?',
                'ai'
            );
        }

        // Event listenery
        const chatInput = document.getElementById('chat-input-field');
        const sendBtn = document.getElementById('chat-send-btn');

        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', sendChatMessage);
        }
    };

    // --- GENEROVÁNÍ SUGGESTION TLAČÍTEK ---
    const generateSuggestionButtons = () => {
        const suggestions = state.calculation.selectedOffer 
            ? ['💡 Rychlá analýza', '💰 Lepší úrok?', '⏱️ Změnit fixaci', '📞 Specialista']
            : ['🔢 Kolik si půjčit?', '📊 Aktuální sazby', '📋 Co potřebuji?', '💼 Podmínky OSVČ'];
        
        return suggestions.map(s => 
            `<button class="suggestion-chip" data-suggestion="${s}">${s}</button>`
        ).join('');
    };

    // --- PŘIDÁNÍ ZPRÁVY DO CHATU ---
    const addChatMessage = (message, sender, isTemporary = false) => {
        const container = document.getElementById('chat-messages-area');
        if (!container) return;
        
        if (!isTemporary && sender !== 'typing') {
            state.chatHistory.push({ text: message, sender, timestamp: Date.now() });
        }
        
        const bubble = document.createElement('div');
        bubble.className = sender === 'ai' || sender === 'typing' ? 'chat-message-ai' : 'chat-message-user';
        
        if (sender === 'typing') {
            bubble.id = 'typing-indicator';
            bubble.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="loading-dots">
                        <div></div><div></div><div></div>
                    </div>
                    <span class="text-sm text-gray-500">AI píše odpověď...</span>
                </div>`;
        } else {
            let processedMessage = message
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            bubble.innerHTML = processedMessage;
        }
        
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    };

    // --- ODESLÁNÍ ZPRÁVY ---
    const sendChatMessage = async () => {
        const input = document.getElementById('chat-input-field');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message || state.isAiTyping) return;
        
        input.value = '';
        addChatMessage(message, 'user');
        
        // Rychlé odpovědi - kontrola cache nebo předpřipraven responses
        const fastAnswer = findFastAnswer(message);
        if (fastAnswer) {
            // Simulace "přemýšlení" pro lepší UX
            state.isAiTyping = true;
            addChatMessage('', 'typing', true);
            
            setTimeout(() => {
                document.getElementById('typing-indicator')?.remove();
                addChatMessage(fastAnswer.response, 'ai');
                updateSuggestions(fastAnswer.suggestions);
                state.isAiTyping = false;
            }, 800); // Rychlá odpověď za 0.8s
            return;
        }
        
        // AI odpověď pro složitější dotazy
        await handleAiResponse(message);
    };

    // --- AI ODPOVĚĎ (s timeoutem) ---
    const handleAiResponse = async (message) => {
        state.isAiTyping = true;
        addChatMessage('', 'typing', true);
        
        const timeoutId = setTimeout(() => {
            if (state.isAiTyping) {
                document.getElementById('typing-indicator')?.remove();
                addChatMessage(
                    `⏱️ Zpracování trvá déle než obvykle. Mohu vám nabídnout:\n\n` +
                    `• **Spočítat hypotéku** v kalkulačce (30 sekund)\n` +
                    `• **Zavolat specialistu** - ten odpoví během 5 minut\n\n` +
                    `Nebo zkuste přeformulovat dotaz jednodušeji.`,
                    'ai'
                );
                state.isAiTyping = false;
                updateSuggestions(['🔢 Spočítat hypotéku', '📞 Zavolat specialistu', '🔄 Nový dotaz']);
            }
        }, CONFIG.AI_TIMEOUT);
        
        try {
            const contextToSend = {
                ...state,
                isDataFromOurCalculator: state.calculation.isFromOurCalculator,
                messageCount: state.chatHistory.filter(h => h.sender === 'user').length
            };
            
            const { chart, chatHistory, ...cleanContext } = contextToSend;
            
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ message, context: cleanContext }) 
            });
            
            clearTimeout(timeoutId);
            document.getElementById('typing-indicator')?.remove();
            
            if (!response.ok) throw new Error((await response.json()).error || 'Chyba serveru');
            const data = await response.json();

            // Zpracování různých typů odpovědí
            if (data.tool === 'showLeadForm') {
                DOMElements.leadFormContainer.classList.remove('hidden');
                scrollToTarget('#kontakt');
                addChatMessage(data.response || 'Otevírám formulář pro spojení se specialistou...', 'ai');
            } else if (data.tool === 'modelScenario') {
                state.formData = {...state.formData, ...(data.params || {})};
                addChatMessage('Rozumím, počítám scénář...', 'ai');
                const success = await calculateRates(null, true);
                if (success && state.calculation.selectedOffer) {
                    addChatMessage(
                        `Výborně! Pro **${formatNumber(state.formData.loanAmount)}** na **${state.formData.loanTerm} let** vychází splátka **${formatNumber(state.calculation.selectedOffer.monthlyPayment)}** při sazbě **${state.calculation.selectedOffer.rate.toFixed(2)}%**.`,
                        'ai'
                    );
                    initAiChat(); // Refresh s novými daty
                }
            } else {
                addChatMessage(data.response, 'ai');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            document.getElementById('typing-indicator')?.remove();
            addChatMessage(
                `Omlouvám se, došlo k chybě. Můžete:\n\n` +
                `• **Zkusit znovu** (klikněte na návrh níže)\n` +
                `• **Zavolat přímo** na 800 123 456`,
                'ai'
            );
            updateSuggestions(['🔄 Zkusit znovu', '📞 Zavolat', '🔢 Spočítat hypotéku']);
        } finally {
            state.isAiTyping = false;
        }
    };

    // --- UPDATE SUGGESTIONS ---
    const updateSuggestions = (suggestions) => {
        const container = document.getElementById('chat-suggestions');
        if (!container) return;
        
        container.innerHTML = `
            <div class="flex flex-wrap gap-2">
                ${suggestions.map(s => `<button class="suggestion-chip" data-suggestion="${s}">${s}</button>`).join('')}
            </div>`;
    };

    // --- COMPONENT FACTORIES ---
    const createSlider = (id, label, value, min, max, step, containerClass = '') => {
        const suffix = (id.includes('Term') || id.includes('age') || id.includes('children') || id.includes('fixation')) ? ' let' : ' Kč';
        const isMobileDevice = isMobile();
        return `<div class="${containerClass}" id="${id}-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <label for="${id}" class="form-label" style="margin: 0; font-size: ${isMobileDevice ? '0.875rem' : '0.9375rem'};">${label}</label>
                <div style="display: flex; align-items: center; gap: 0.25rem;">
                    <input type="text" id="${id}-input" value="${formatNumber(value, false)}" 
                           class="slider-value-input" 
                           style="max-width: ${isMobileDevice ? '100px' : '140px'}; font-size: ${isMobileDevice ? '0.9375rem' : '1rem'};">
                    <span style="font-weight: 600; color: #6b7280; font-size: ${isMobileDevice ? '0.875rem' : '0.9375rem'};">${suffix}</span>
                </div>
            </div>
            <div class="slider-container" style="padding: 0.5rem 0;">
                <input type="range" id="${id}" name="${id}" min="${min}" max="${max}" value="${value}" step="${step}" class="slider-input">
            </div>
        </div>`;
    };
    
    const createSelect = (id, label, options, selectedValue, containerClass = '') => {
        const optionsHTML = Object.entries(options).map(([key, val]) => 
            `<option value="${key}" ${key === selectedValue ? 'selected' : ''}>${val}</option>`
        ).join('');
        return `<div class="${containerClass}">
            <label for="${id}" class="form-label" style="font-size: ${isMobile() ? '0.875rem' : '0.9375rem'};">${label}</label>
            <select id="${id}" name="${id}" class="modern-select" style="font-size: ${isMobile() ? '1rem' : '0.9375rem'};">${optionsHTML}</select>
        </div>`;
    };
    
    // --- DYNAMIC CONTENT & LAYOUTS ---
    const getCalculatorLayout = (formHTML) => 
        `<div class="bg-white p-4 md:p-6 lg:p-12 rounded-2xl shadow-xl border">${formHTML}</div>`;
    
    const getExpressHTML = () => getCalculatorLayout(`
        <div id="express-form" class="space-y-4">
            ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000)}
            ${createSlider('loanAmount','Chci si půjčit',state.formData.loanAmount,200000,20000000,100000)}
            ${createSlider('income','Měsíční čistý příjem',state.formData.income,15000,300000,1000)}
            <div class="flex justify-center pt-4">
                <button class="nav-btn w-full max-w-sm text-base px-6 py-3" data-action="calculate">
                    <span class="mr-2">Spočítat a najít nabídky</span>
                    <div class="loading-spinner-white hidden"></div>
                </button>
            </div>
        </div>
        <div id="results-container" class="hidden mt-8"></div>`);
    
    const getGuidedHTML = () => {
        const purposes = { 'koupě': 'Koupě', 'výstavba': 'Výstavba', 'rekonstrukce': 'Rekonstrukce', 'refinancování': 'Refinancování' };
        const propertyTypes = { 'byt': 'Byt', 'rodinný dům': 'Rodinný dům', 'pozemek': 'Pozemek' };
        const employments = { 'zaměstnanec': 'Zaměstnanec', 'osvc': 'OSVČ', 'jednatel': 'Jednatel s.r.o.'};
        const educations = { 'základní': 'Základní', 'středoškolské': 'SŠ s maturitou', 'vysokoškolské': 'VŠ' };

        return getCalculatorLayout(`<div id="guided-form">
            <div style="margin-bottom: 2rem;">
                <h3 class="form-section-heading">Parametry úvěru a nemovitosti</h3>
                <div class="form-grid">
                    ${createSelect('purpose', 'Účel hypotéky', purposes, state.formData.purpose)}
                    ${createSelect('propertyType', 'Typ nemovitosti', propertyTypes, state.formData.propertyType)}
                    ${createSlider('propertyValue','Hodnota nemovitosti',state.formData.propertyValue,500000,30000000,100000)}
                    ${createSlider('reconstructionValue','Rozsah rekonstrukce',state.formData.reconstructionValue,0,10000000,50000, 'hidden')}
                    ${createSlider('landValue','Hodnota pozemku',state.formData.landValue,0,10000000,50000, 'hidden')}
                    ${createSlider('loanAmount','Požadovaná výše úvěru',state.formData.loanAmount,200000,20000000,100000)}
                    <div style="grid-column: span 2; text-align: center; font-weight: bold; color: #10b981;" id="ltv-display">
                        Aktuální LTV: ${Math.round((state.formData.loanAmount / state.formData.propertyValue) * 100)}%
                    </div>
                    ${createSlider('loanTerm','Délka splatnosti',state.formData.loanTerm,5,30,1)}
                    ${createSlider('fixation','Délka fixace',state.formData.fixation,3,10,1)}
                </div>
            </div>
            <div style="margin-bottom: 2rem;">
                <h3 class="form-section-heading">Vaše bonita a osobní údaje</h3>
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
                <button class="nav-btn w-full max-w-sm text-base px-6 py-3" data-action="calculate">
                    <span class="mr-2">Spočítat a najít nabídky</span>
                    <div class="loading-spinner-white hidden ml-2"></div>
                </button>
            </div>
        </div>
        <div id="results-container" class="hidden mt-8"></div>`);
    };

    // --- RESULTS RENDERING ---
    const getAdditionalTips = (approvability) => {
        const tips = [];
        if (approvability.ltv > 90) tips.push({ icon: "🏠", text: "Snižte LTV pod 90% pro lepší podmínky" });
        else if (approvability.ltv > 80) tips.push({ icon: "💰", text: "LTV pod 80% = úspora až 0.3% na úroku" });
        if (approvability.dsti < 70) tips.push({ icon: "⚠️", text: "Vaše DSTI je na hraně, zvažte delší splatnost" });
        else if (approvability.dsti > 85) tips.push({ icon: "✅", text: "Výborné DSTI, máte prostor pro vyjednávání" });
        if (approvability.bonita < 60) tips.push({ icon: "📈", text: "Zvyšte příjem nebo snižte splátky pro lepší bonitu" });
        if (approvability.total >= 85) tips.push({ icon: "🎯", text: "Top klient! Vyjednejte si VIP podmínky" });
        else if (approvability.total >= 70) tips.push({ icon: "💡", text: "Dobré skóre, zkuste vyjednat slevu 0.1-0.2%" });
        return tips;
    };
    
    const renderResults = () => {
        const { offers, approvability, fixationDetails } = state.calculation;
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
                            ${o.highlights.map(h => `<span class="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">${h}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <div class="text-right mt-4">
                    <div class="text-2xl font-extrabold text-gray-900">${formatNumber(o.monthlyPayment)}</div>
                    <div class="text-sm font-semibold text-gray-500">Úrok ${o.rate.toFixed(2)} %</div>
                    <button class="text-xs text-blue-600 underline mt-1" data-action="select-offer" data-offer="${o.id}">
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
                            
                            <div class="mt-4 space-y-2">
                                <p class="text-xs font-semibold text-gray-700">Rychlé tipy:</p>
                                ${quickTipsHTML}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <div class="text-center space-y-3">
                        <button class="nav-btn bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg w-full" 
                                data-action="discuss-with-ai">
                            <span class="mr-2">💬</span> Zeptat se AI na detaily
                        </button>
                        <button class="nav-btn bg-green-600 hover:bg-green-700 text-lg w-full" 
                                data-action="show-lead-form">
                            <span class="mr-2">📞</span> Domluvit se specialistou
                        </button>
                    </div>
                </div>
            </div>`;

        const firstCard = container.querySelector('.offer-card'); 
        if (firstCard) { 
            firstCard.classList.add('selected'); 
            state.calculation.selectedOffer = offers.find(o => o.id === firstCard.dataset.offerId); 
        }
        scrollToTarget('#results-container');
    };

    // --- RATE CALCULATION ---
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
    
    // --- EVENT HANDLERS ---
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
                    if(input && input !== document.activeElement) input.value = formatNumber(parsedValue, false);
                } else if (type !== 'select-one') {
                    const slider = document.getElementById(baseId);
                    if(slider && slider !== document.activeElement) slider.value = parsedValue;
                }
            });
            
            if (['loanAmount', 'propertyValue'].includes(baseId)) updateLTVDisplay();
            if (baseId === 'purpose') handleGuidedFormLogic();
        }
    };

    const handleClick = async (e) => {
        let target = e.target.closest('[data-action], .offer-card, .suggestion-chip, [data-mode], .scroll-to, [data-suggestion]');
        if (!target) return;
        
        const { action, mode, suggestion, target: targetId } = target.dataset;

        // Suggestion handling
        if (suggestion) {
            const input = document.getElementById('chat-input-field');
            
            // Map suggestions to actions or queries
            const suggestionMap = {
                '🔢 Spočítat hypotéku': () => { switchMode('express'); scrollToTarget('#kalkulacka'); },
                '🔢 Kolik si půjčit?': () => { if (input) input.value = 'Kolik si můžu půjčit?'; sendChatMessage(); },
                '📊 Aktuální sazby': () => { if (input) input.value = 'Jaké jsou aktuální sazby?'; sendChatMessage(); },
                '📋 Co potřebuji?': () => { if (input) input.value = 'Jaké dokumenty potřebuji?'; sendChatMessage(); },
                '💼 Podmínky OSVČ': () => { if (input) input.value = 'Můžu dostat hypotéku jako OSVČ?'; sendChatMessage(); },
                '💡 Rychlá analýza': () => { if (input) input.value = 'Proveď rychlou analýzu mé situace'; sendChatMessage(); },
                '💰 Lepší úrok?': () => { if (input) input.value = 'Můžu dostat lepší úrok?'; sendChatMessage(); },
                '⏱️ Změnit fixaci': () => { if (input) input.value = 'Chci změnit délku fixace'; sendChatMessage(); },
                '📞 Specialista': () => { DOMElements.leadFormContainer.classList.remove('hidden'); scrollToTarget('#kontakt'); },
                '📞 Zavolat specialistu': () => { DOMElements.leadFormContainer.classList.remove('hidden'); scrollToTarget('#kontakt'); },
                '📞 Zavolat': () => { window.location.href = 'tel:800123456'; },
                '🔄 Nový dotaz': () => { if (input) input.value = ''; input.focus(); },
                '🔄 Zkusit znovu': () => { if (input) input.focus(); },
            };
            
            const handler = suggestionMap[suggestion];
            if (handler) {
                handler();
            } else if (input) {
                input.value = suggestion.replace(/[🔢📊📋💼💡💰⏱️📞]/g, '').trim();
                sendChatMessage();
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
            setTimeout(() => scrollToTarget('#content-container'), 100);
        }
        else if (action === 'calculate') calculateRates(target);
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
            }
        }
        else if (action === 'discuss-with-ai') {
            scrollToTarget('#ai-asistent');
            setTimeout(() => {
                const input = document.getElementById('chat-input-field');
                if (input) input.focus();
            }, 500);
        }
        else if (action === 'reset-chat') {
            state.chatHistory = [];
            initAiChat();
        }
        else if (action === 'send-chat-message') {
            sendChatMessage();
        }
        else if (target.matches('.offer-card')) {
            document.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
            target.classList.add('selected');
            state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === target.dataset.offerId);
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

    const switchMode = (mode) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        
        if (mode === 'express') {
            DOMElements.contentContainer.innerHTML = getExpressHTML();
        }
        else if (mode === 'guided') {
            DOMElements.contentContainer.innerHTML = getGuidedHTML();
            handleGuidedFormLogic();
        }
        else if (mode === 'ai') {
            scrollToTarget('#ai-asistent');
            setTimeout(() => {
                const input = document.getElementById('chat-input-field');
                if (input) input.focus();
            }, 500);
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

        handleCookieBanner();
        switchMode(state.mode);
        initAiChat(); // Init AI chat immediately
        updateActiveUsers();
    };

    init();
});