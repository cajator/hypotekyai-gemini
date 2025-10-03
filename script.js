// Hypoteky AI - Nový JavaScript v2.0
// Hybridní systém: Quick Answers + AI Fallback

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const CONFIG = {
        API_CHAT_ENDPOINT: '/api/chat',
        API_RATES_ENDPOINT: '/api/rates',
        FAQ_TIMEOUT: 100, // Okamžitá odpověď pro FAQ
        AI_TIMEOUT: 30000, // 30s timeout pro AI
        ENABLE_FAQ: true, // Povolit rychlé odpovědi
    };

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    
    const state = {
        chatHistory: [],
        isAiTyping: false,
        activeUsers: Math.floor(Math.random() * 30) + 120,
        calculatorData: null,
        lastCalculation: null,
    };

    // ============================================
    // FAQ SYSTEM - Okamžité odpovědi
    // ============================================
    
    const FAQ = {
        // Otázky s pattern matching
        patterns: [
            {
                triggers: ['kolik.*příjem', 'příjem.*kolik', 'půjčit.*příjem'],
                answer: (match) => {
                    const amount = extractNumber(match);
                    if (amount >= 10000 && amount <= 500000) {
                        const maxPayment = amount * 0.45;
                        const maxLoan = Math.round(maxPayment * 12 * 9.5 * 0.9);
                        const monthlyPayment = calculateMonthlyPayment(maxLoan, 4.29, 25);
                        
                        return {
                            quick: true,
                            response: `**S příjmem ${formatMoney(amount)}/měs si můžete půjčit až ${formatMoney(maxLoan)}**\n\n` +
                                     `📊 Parametry:\n` +
                                     `• Měsíční splátka: ${formatMoney(monthlyPayment)}\n` +
                                     `• DSTI: 45% (zdravá hranice)\n` +
                                     `• Splatnost: 25 let\n` +
                                     `• Orientační sazba: 4.29%\n\n` +
                                     `💡 To je odhad. Pro přesnou nabídku použijte kalkulačku níže.`,
                            suggestions: ['🧮 Spočítat přesně', '📊 Jaké podmínky?', '📞 Domluvit schůzku']
                        };
                    }
                    return null;
                }
            },
            {
                triggers: ['jaké.*sazby', 'aktuální.*sazby', 'úrok.*kolik', 'kolik.*procent'],
                answer: () => ({
                    quick: true,
                    response: `**📈 Aktuální sazby hypotečního trhu (${new Date().toLocaleDateString('cs-CZ')})**\n\n` +
                             `**Top sazby podle fixace:**\n` +
                             `• 3 roky: od 4.09% p.a.\n` +
                             `• 5 let: od 4.14% p.a.\n` +
                             `• 7 let: od 4.59% p.a.\n` +
                             `• 10 let: od 4.69% p.a.\n\n` +
                             `⚠️ Konečná sazba závisí na:\n` +
                             `• Výši LTV (poměr úvěru k hodnotě)\n` +
                             `• Vaší bonitě\n` +
                             `• Bance a produktu\n\n` +
                             `💡 Spočítejte si přesnou nabídku v kalkulačce.`,
                    suggestions: ['🧮 Spočítat hypotéku', '📊 Jaká je má bonita?', '💰 Refinancování']
                })
            },
            {
                triggers: ['dokumenty', 'co.*potřebuj', 'jaké.*doklady', 'co.*musím.*mít'],
                answer: () => ({
                    quick: true,
                    response: `**📋 Dokumenty k žádosti o hypotéku**\n\n` +
                             `**Základní doklady:**\n` +
                             `• Občanský průkaz (oba žadatelé)\n` +
                             `• Doklad o příjmu (3 měsíce)\n` +
                             `• Výpis z účtu (3 měsíce)\n` +
                             `• Potvrzení o bezdlužnosti\n\n` +
                             `**K nemovitosti:**\n` +
                             `• Kupní smlouva nebo rezervační smlouva\n` +
                             `• Výpis z katastru nemovitostí\n` +
                             `• Znalecký posudek (zajistí banka)\n\n` +
                             `**Pro OSVČ navíc:**\n` +
                             `• Daňové přiznání (2-3 roky)\n` +
                             `• Výpis z živnostenského rejstříku\n\n` +
                             `💡 Náš specialista vám pomůže vše připravit.`,
                    suggestions: ['📞 Domluvit konzultaci', '🧮 Spočítat hypotéku', '❓ Mám další otázku']
                })
            },
            {
                triggers: ['osvč', 'živnost', 'podnikatel', 'jsem.*osvč'],
                answer: () => ({
                    quick: true,
                    response: `**🏢 Hypotéka pro OSVČ**\n\n` +
                             `**Ano, OSVČ může získat hypotéku!** Podmínky:\n\n` +
                             `• Minimálně 2 roky podnikání\n` +
                             `• Doložení příjmů z daňových přiznání\n` +
                             `• Výše příjmu = průměr za 2-3 roky\n` +
                             `• Možno kombinovat s příjmem ze zaměstnání\n\n` +
                             `**Specifika pro OSVČ:**\n` +
                             `• Banky počítají s nižším příjmem (60-80% zisku)\n` +
                             `• Vyšší nároky na rezervu\n` +
                             `• Delší proces schvalování\n\n` +
                             `💡 Spolupracujeme s bankami, které jsou OSVČ friendly.`,
                    suggestions: ['🧮 Spočítat jako OSVČ', '📞 Domluvit konzultaci', '📋 Jaké dokumenty?']
                })
            },
            {
                triggers: ['refinanc', 'přefinanc', 'změnit.*banku', 'lepší.*nabídka'],
                answer: () => ({
                    quick: true,
                    response: `**💰 Refinancování hypotéky**\n\n` +
                             `**Kdy se vyplatí?**\n` +
                             `• Rozdíl sazby min. 0.5% (úspora 2-3k Kč/měs)\n` +
                             `• Konec fixace nebo blíží se\n` +
                             `• Zlepšila se vaše bonita\n\n` +
                             `**Náklady refinancování:**\n` +
                             `• Znalecký posudek: 5-8k Kč\n` +
                             `• Poplatky bance: 0-10k Kč\n` +
                             `• Návratnost: obvykle 6-18 měsíců\n\n` +
                             `**Tip:** Nejprve vyjednejte slevu u stávající banky!\n\n` +
                             `💡 Zadejte data do kalkulačky a ukážu vám přesný potenciál.`,
                    suggestions: ['🧮 Spočítat refinancování', '📊 Stress testy', '📞 Domluvit konzultaci']
                })
            },
            {
                triggers: ['které.*banky', 'seznam.*bank', 'partneri', 'partner'],
                answer: () => ({
                    quick: true,
                    response: `**🏦 Naši partneři (19+ institucí)**\n\n` +
                             `**Velké banky:**\n` +
                             `Česká spořitelna • ČSOB • Komerční banka • Raiffeisenbank • UniCredit Bank\n\n` +
                             `**Hypoteční specialisté:**\n` +
                             `Hypoteční banka • Modrá pyramida • ČMSS • Raiffeisen stavební • Buřinka\n\n` +
                             `**Moderní banky:**\n` +
                             `MONETA • mBank • Fio banka • Air Bank • Banka CREDITAS\n\n` +
                             `...a další instituce.\n\n` +
                             `💡 Porovnáváme všechny najednou a najdeme tu nejlepší nabídku.`,
                    suggestions: ['🧮 Spočítat hypotéku', '📊 Jaké jsou sazby?', '📞 Domluvit konzultaci']
                })
            },
            {
                triggers: ['stress.*test', 'co.*kdyby', 'ztratím.*práci', 'rizika'],
                answer: () => ({
                    quick: true,
                    response: `**🛡️ Stress testy a ochrana**\n\n` +
                             `**Testujeme tyto scénáře:**\n` +
                             `• Ztráta příjmu (nemoc, nezaměstnanost)\n` +
                             `• Růst sazeb o 1-2%\n` +
                             `• Přibude dítě\n` +
                             `• Nečekané výdaje\n\n` +
                             `**Doporučení:**\n` +
                             `• Rezerva = 6× měsíční splátka\n` +
                             `• Pojištění neschopnosti\n` +
                             `• DSTI max. 45% (nechat rezervu)\n\n` +
                             `💡 Pro konkrétní stress test zadejte data do kalkulačky.`,
                    suggestions: ['🧮 Stress test mé situace', '💰 Jak vytvořit rezervu?', '📞 Domluvit konzultaci']
                })
            },
        ],
        
        // Hledání odpovědi v FAQ
        findAnswer: (userMessage) => {
            const normalized = userMessage.toLowerCase().trim();
            
            for (const item of FAQ.patterns) {
                for (const trigger of item.triggers) {
                    const regex = new RegExp(trigger, 'i');
                    if (regex.test(normalized)) {
                        const answer = item.answer(normalized);
                        if (answer) return answer;
                    }
                }
            }
            return null;
        }
    };

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    const extractNumber = (text) => {
        const match = text.match(/(\d+)\s*(tis|tisíc|mil|milion)?/);
        if (!match) return null;
        
        let num = parseInt(match[1]);
        const unit = match[2];
        
        if (unit && (unit.includes('tis') || unit.includes('tisíc'))) {
            num *= 1000;
        } else if (unit && (unit.includes('mil') || unit.includes('milion'))) {
            num *= 1000000;
        }
        
        return num;
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('cs-CZ', {
            style: 'currency',
            currency: 'CZK',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const calculateMonthlyPayment = (principal, rate, years) => {
        const monthlyRate = rate / 100 / 12;
        const numPayments = years * 12;
        if (monthlyRate === 0) return principal / numPayments;
        return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
               (Math.pow(1 + monthlyRate, numPayments) - 1);
    };

    const scrollToElement = (selector, offset = -100) => {
        const element = document.querySelector(selector);
        if (element) {
            const y = element.getBoundingClientRect().top + window.pageYOffset + offset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    // ============================================
    // CHAT UI FUNCTIONS
    // ============================================
    
    const addMessage = (text, sender) => {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper message-wrapper-${sender}`;

        const bubble = document.createElement('div');
        bubble.className = `message-bubble message-bubble-${sender}`;
        
        // Format text
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        bubble.innerHTML = formattedText;
        wrapper.appendChild(bubble);
        container.appendChild(wrapper);

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;

        // Add to history
        if (sender !== 'system') {
            state.chatHistory.push({ text, sender, timestamp: Date.now() });
        }
    };

    const showTypingIndicator = () => {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper message-wrapper-ai';
        wrapper.id = 'typing-indicator';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble message-bubble-ai';
        bubble.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        
        wrapper.appendChild(bubble);
        container.appendChild(wrapper);
        container.scrollTop = container.scrollHeight;
    };

    const hideTypingIndicator = () => {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    };

    const updateSuggestions = (suggestions = null) => {
        const container = document.getElementById('quick-suggestions');
        if (!container) return;

        const defaultSuggestions = state.lastCalculation 
            ? ['📊 Stress testy', '💰 Refinancování', '📅 Dlouhodobý plán', '📞 Specialista']
            : ['🧮 Spočítat hypotéku', '📈 Aktuální sazby', '📋 Jaké dokumenty?', '📞 Specialista'];

        const items = suggestions || defaultSuggestions;
        
        container.innerHTML = items.map(text => 
            `<button class="quick-suggestion-btn" data-suggestion="${text}">${text}</button>`
        ).join('');
    };

    const showAIAnswer = (content) => {
        const display = document.getElementById('ai-answer-display');
        const contentDiv = document.getElementById('ai-answer-content');
        
        if (!display || !contentDiv) return;

        contentDiv.innerHTML = content.replace(/\n/g, '<br>');
        display.classList.remove('hidden');
    };

    const closeAIAnswer = () => {
        const display = document.getElementById('ai-answer-display');
        if (display) display.classList.add('hidden');
    };

    // ============================================
    // MESSAGE HANDLING
    // ============================================
    
    const handleSendMessage = async () => {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send-btn');
        const sendIcon = document.getElementById('send-icon');
        const loadingIcon = document.getElementById('loading-icon');
        
        const message = input.value.trim();
        if (!message || state.isAiTyping) return;

        // Clear input
        input.value = '';
        
        // Add user message
        addMessage(message, 'user');

        // Check FAQ first
        if (CONFIG.ENABLE_FAQ) {
            const faqAnswer = FAQ.findAnswer(message);
            
            if (faqAnswer) {
                // Quick answer - immediate response
                setTimeout(() => {
                    addMessage(faqAnswer.response, 'ai');
                    if (faqAnswer.suggestions) {
                        updateSuggestions(faqAnswer.suggestions);
                    }
                }, CONFIG.FAQ_TIMEOUT);
                return;
            }
        }

        // No FAQ match - use AI
        state.isAiTyping = true;
        sendBtn.disabled = true;
        sendIcon.classList.add('hidden');
        loadingIcon.classList.remove('hidden');
        
        showTypingIndicator();

        try {
            const response = await Promise.race([
                fetchAIResponse(message),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('timeout')), CONFIG.AI_TIMEOUT)
                )
            ]);

            hideTypingIndicator();
            
            if (response.tool === 'showLeadForm') {
                addMessage(response.response || 'Otevírám formulář...', 'ai');
                setTimeout(() => showLeadForm(), 500);
            } else {
                addMessage(response.response, 'ai');
                if (response.suggestions) {
                    updateSuggestions(response.suggestions);
                }
            }

        } catch (error) {
            hideTypingIndicator();
            
            if (error.message === 'timeout') {
                addMessage(
                    'Omlouvám se, odpověď trvá déle než obvykle. Zkuste to prosím znovu nebo se spojte s naším specialistou na 📞 800 123 456.',
                    'ai'
                );
            } else {
                addMessage(
                    'Omlouvám se, došlo k chybě. Zkuste to prosím znovu nebo volejte přímo na 📞 800 123 456.',
                    'ai'
                );
            }
        } finally {
            state.isAiTyping = false;
            sendBtn.disabled = false;
            sendIcon.classList.remove('hidden');
            loadingIcon.classList.add('hidden');
        }
    };

    const fetchAIResponse = async (message) => {
        // Zkrácený kontext - pouze důležitá data
        const context = {
            hasCalculation: !!state.lastCalculation,
            calculation: state.lastCalculation ? {
                loanAmount: state.lastCalculation.loanAmount,
                monthlyPayment: state.lastCalculation.monthlyPayment,
                rate: state.lastCalculation.rate,
                dsti: state.lastCalculation.dsti
            } : null,
            messageCount: state.chatHistory.filter(m => m.sender === 'user').length
        };

        const response = await fetch(CONFIG.API_CHAT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, context })
        });

        if (!response.ok) {
            throw new Error('API Error');
        }

        return await response.json();
    };

    // ============================================
    // CALCULATOR
    // ============================================
    
    const renderCalculator = () => {
        const container = document.getElementById('calculator-container');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="form-label">Hodnota nemovitosti</label>
                        <input type="number" id="propertyValue" class="form-input" value="5000000" step="100000">
                    </div>
                    <div>
                        <label class="form-label">Požadovaný úvěr</label>
                        <input type="number" id="loanAmount" class="form-input" value="4000000" step="100000">
                    </div>
                    <div>
                        <label class="form-label">Měsíční příjem (čistý)</label>
                        <input type="number" id="income" class="form-input" value="50000" step="1000">
                    </div>
                    <div>
                        <label class="form-label">Délka splatnosti (let)</label>
                        <input type="number" id="loanTerm" class="form-input" value="25" min="5" max="30">
                    </div>
                </div>
                
                <button class="btn-submit" data-action="calculate">
                    🧮 Spočítat hypotéku
                </button>
            </div>
        `;
    };

    const calculateMortgage = async () => {
        const propertyValue = parseInt(document.getElementById('propertyValue').value);
        const loanAmount = parseInt(document.getElementById('loanAmount').value);
        const income = parseInt(document.getElementById('income').value);
        const loanTerm = parseInt(document.getElementById('loanTerm').value);

        if (!propertyValue || !loanAmount || !income) {
            alert('Prosím vyplňte všechny pole.');
            return;
        }

        const resultsContainer = document.getElementById('results-container');
        resultsContainer.classList.remove('hidden');
        resultsContainer.innerHTML = '<div class="text-center p-8"><div class="loading-spinner-blue"></div><p>Počítám nejlepší nabídky...</p></div>';

        try {
            const params = new URLSearchParams({
                propertyValue,
                loanAmount,
                income,
                loanTerm,
                liabilities: 0,
                age: 35,
                children: 0,
                fixation: 5,
                employment: 'zaměstnanec',
                education: 'středoškolské',
                purpose: 'koupě'
            });

            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${params}`);
            const data = await response.json();

            if (data.offers && data.offers.length > 0) {
                state.lastCalculation = {
                    loanAmount,
                    propertyValue,
                    income,
                    loanTerm,
                    monthlyPayment: data.offers[0].monthlyPayment,
                    rate: data.offers[0].rate,
                    dsti: data.offers[0].dsti
                };

                renderResults(data);
                updateSuggestions(['📊 Stress testy', '💰 Refinancování', '📞 Specialista']);
            } else {
                resultsContainer.innerHTML = `
                    <div class="text-center p-8 bg-red-50 rounded-lg">
                        <h3 class="text-xl font-bold text-red-800 mb-2">Podle zadaných parametrů to nevychází</h3>
                        <p class="text-red-700">Zkuste upravit parametry nebo se spojte s naším specialistou.</p>
                        <button class="btn-submit mt-4" data-action="show-lead-form">📞 Domluvit konzultaci</button>
                    </div>
                `;
            }
        } catch (error) {
            resultsContainer.innerHTML = `
                <div class="text-center p-8 bg-red-50 rounded-lg">
                    <h3 class="text-xl font-bold text-red-800 mb-2">Chyba při výpočtu</h3>
                    <p class="text-red-700">Zkuste to prosím znovu.</p>
                </div>
            `;
        }
    };

    const renderResults = (data) => {
        const container = document.getElementById('results-container');
        
        const offersHTML = data.offers.slice(0, 3).map(offer => `
            <div class="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all">
                <h4 class="text-lg font-bold text-blue-600 mb-2">${offer.title}</h4>
                <p class="text-sm text-gray-600 mb-4">${offer.description}</p>
                <div class="text-right">
                    <div class="text-3xl font-bold text-gray-900">${formatMoney(offer.monthlyPayment)}</div>
                    <div class="text-sm text-gray-500">Úrok ${offer.rate.toFixed(2)}%</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="space-y-6">
                <h3 class="text-2xl font-bold">Našli jsme pro vás tyto nabídky:</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${offersHTML}
                </div>
                
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
                    <h4 class="text-xl font-bold mb-4">💡 Chcete vědět víc?</h4>
                    <p class="mb-4">Zeptejte se AI na cokoliv o vaší hypotéce:</p>
                    <div class="flex flex-wrap gap-2">
                        <button class="quick-suggestion-btn" data-chat-question="Stress test - co když ztratím práci?">🛡️ Stress testy</button>
                        <button class="quick-suggestion-btn" data-chat-question="Vyplatí se mi refinancování?">💰 Refinancování</button>
                        <button class="quick-suggestion-btn" data-chat-question="Jaký je můj dlouhodobý plán?">📅 Dlouhodobý plán</button>
                    </div>
                </div>

                <div class="text-center">
                    <button class="btn-submit" data-action="show-lead-form">
                        📞 Domluvit konzultaci se specialistou
                    </button>
                </div>
            </div>
        `;

        scrollToElement('#results-container');
    };

    // ============================================
    // LEAD FORM
    // ============================================
    
    const showLeadForm = () => {
        const section = document.getElementById('lead-form-section');
        if (section) {
            section.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    };

    const closeLeadForm = () => {
        const section = document.getElementById('lead-form-section');
        if (section) {
            section.classList.add('hidden');
            document.body.style.overflow = '';
        }
    };

    const handleLeadFormSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.disabled = true;
        submitBtn.textContent = '📤 Odesílám...';

        try {
            await fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(new FormData(form)).toString()
            });

            form.style.display = 'none';
            document.getElementById('form-success').classList.remove('hidden');
        } catch (error) {
            alert('Odeslání se nezdařilo. Zkuste to prosím znovu.');
            submitBtn.disabled = false;
            submitBtn.textContent = '📞 Odeslat nezávazně';
        }
    };

    // ============================================
    // EVENT HANDLERS
    // ============================================
    
    const handleClick = (e) => {
        const target = e.target.closest('[data-action], [data-suggestion], [data-chat-question]');
        if (!target) return;

        const action = target.dataset.action;
        const suggestion = target.dataset.suggestion;
        const chatQuestion = target.dataset.chatQuestion;

        if (action === 'send-message') {
            handleSendMessage();
        } else if (action === 'show-lead-form') {
            showLeadForm();
        } else if (action === 'close-lead-form') {
            closeLeadForm();
        } else if (action === 'reset-chat') {
            state.chatHistory = [];
            document.getElementById('chat-messages').innerHTML = '';
            addMessage('Jsem váš hypoteční poradce. Jak vám mohu pomoci?', 'ai');
            updateSuggestions();
        } else if (action === 'close-ai-answer') {
            closeAIAnswer();
        } else if (action === 'scroll-to-chat') {
            scrollToElement('#ai-chat-section');
            document.getElementById('chat-input').focus();
        } else if (action === 'scroll-to-calculator') {
            scrollToElement('#kalkulacka');
        } else if (action === 'calculate') {
            calculateMortgage();
        } else if (suggestion) {
            document.getElementById('chat-input').value = suggestion;
            handleSendMessage();
        } else if (chatQuestion) {
            document.getElementById('chat-input').value = chatQuestion;
            handleSendMessage();
            scrollToElement('#ai-chat-section');
        }
    };

    // ============================================
    // COOKIE BANNER
    // ============================================
    
    const handleCookieBanner = () => {
        const banner = document.getElementById('cookie-banner');
        if (!banner) return;

        if (localStorage.getItem('cookieConsent') === 'true') {
            banner.classList.add('hidden');
        } else {
            banner.classList.remove('hidden');
        }

        document.getElementById('cookie-accept')?.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'true');
            banner.classList.add('hidden');
        });
    };

    // ============================================
    // ACTIVE USERS COUNTER
    // ============================================
    
    const updateActiveUsers = () => {
        const hour = new Date().getHours();
        let base = 120;
        
        if (hour >= 8 && hour <= 18) base = 140;
        else if (hour >= 19 && hour <= 22) base = 130;
        else if (hour >= 6 && hour <= 7) base = 125;
        
        state.activeUsers = base + Math.floor(Math.random() * 10) - 5;
        
        const counter = document.getElementById('active-users');
        if (counter) {
            counter.textContent = `${state.activeUsers} lidí právě používá naše nástroje`;
        }
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    
    const init = () => {
        // Event listeners
        document.body.addEventListener('click', handleClick);
        
        document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        const leadForm = document.getElementById('lead-form');
        if (leadForm) {
            leadForm.addEventListener('submit', handleLeadFormSubmit);
        }

        // Mobile menu
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            const menu = document.getElementById('mobile-menu');
            if (menu) menu.classList.toggle('hidden');
        });

        // Initialize
        addMessage('Jsem váš hypoteční poradce s přístupem k datům z 19+ bank. Jak vám mohu pomoci?', 'ai');
        updateSuggestions();
        renderCalculator();
        handleCookieBanner();
        updateActiveUsers();
        setInterval(updateActiveUsers, 30000);

        // Scroll handlers for links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href');
                if (target && target !== '#') {
                    scrollToElement(target);
                }
            });
        });
    };

    init();
});

// Loading spinner styles (add to CSS if missing)
const style = document.createElement('style');
style.textContent = `
    .loading-spinner-blue {
        margin: 1rem auto;
        width: 40px;
        height: 40px;
        border: 4px solid rgba(37, 99, 235, 0.2);
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);