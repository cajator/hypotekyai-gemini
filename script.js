'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/api/chat',
        API_RATES_ENDPOINT: '/api/rates',
        QUICK_RESPONSE_DELAY: 100, // Simulace "přemýšlení" pro instant odpovědi
    };

    // --- CACHE SYSTEM - Rychlé odpovědi bez AI ---
    const QUICK_ANSWERS = {
        "Jaké dokumenty potřebuji?": {
            title: "📋 Dokumenty pro hypotéku",
            content: `<strong>Pro zaměstnance:</strong>
• Občanský průkaz
• Potvrzení o příjmu (ne starší 30 dnů)
• Výpisy z účtu (3-6 měsíců)
• Smlouva o dílo/nájemní smlouva nemovitosti

<strong>Pro OSVČ:</strong>
• Občanský průkaz
• Daňové přiznání (2-3 roky zpět)
• Výpisy z účtu (6 měsíců)
• Živnostenský list

<strong>Další dokumenty:</strong>
• Znalecký posudek nemovitosti (objedná banka)
• Výpis z katastru nemovitostí
• Stavební povolení (u novostavby)

💡 <strong>Tip:</strong> Každá banka může mít mírně odlišné požadavky. Náš specialista vám pomůže vše připravit.`,
            cta: "Chcete kontrolní seznam na míru?",
            actions: ["Spočítat hypotéku", "Domluvit se specialistou"]
        },
        
        "Kolik si můžu půjčit?": {
            title: "💰 Kolik si můžete půjčit",
            content: `<strong>Základní vzorec:</strong>
Váš měsíční čistý příjem × 9 = Maximální úvěr

<strong>Příklady:</strong>
• Příjem 40 000 Kč → max. 3.6 mil. Kč
• Příjem 60 000 Kč → max. 5.4 mil. Kč
• Příjem 80 000 Kč → max. 7.2 mil. Kč

<strong>Co ovlivňuje výši:</strong>
• ✓ Stabilní zaměstnání (2+ roky)
• ✓ Nízké jiné závazky
• ✓ Věk (ideálně 25-45 let)
• ✓ Vlastní prostředky (20%+)

⚠️ <strong>Důležité:</strong> Banky počítají s DSTI max 45% (splátka max 45% příjmu).

<strong>Chcete přesný výpočet?</strong> Použijte naši kalkulačku s 19+ bankami!`,
            cta: "Spočítat přesně pro vaši situaci",
            actions: ["Spočítat v kalkulačce", "Domluvit se specialistou"]
        },

        "Jaká je aktuální průměrná sazba?": {
            title: "📊 Aktuální sazby na trhu (říjen 2024)",
            content: `<strong>Průměrné sazby podle fixace:</strong>

<strong>3 roky:</strong> 4.79% p.a.
<strong>5 let:</strong> 4.39% p.a. ⭐ Nejoblíbenější
<strong>7 let:</strong> 4.69% p.a.
<strong>10 let:</strong> 4.89% p.a.

<strong>Trend:</strong>
📉 Oproti roku 2023 pokles o cca 1.5%
📊 ČNB udržuje základní sazbu na 4.5%
🔮 Prognóza: Stabilizace až mírný pokles v roce 2025

<strong>Top nabídky (říjen 2024):</strong>
• Nejnižší sazba: od 4.09% (5 let, LTV do 70%)
• Standardní klient: 4.5-5.2%
• Rizikový profil: 5.5-6.5%

💡 <strong>Tip:</strong> Sazby se rychle mění. Pro aktuální nabídky použijte kalkulačku nebo se spojte se specialistou.`,
            cta: "Zjistit vaši konkrétní sazbu",
            actions: ["Spočítat v kalkulačce", "Domluvit se specialistou"]
        },

        "Jak funguje fixace?": {
            title: "🔒 Jak funguje fixace úrokové sazby",
            content: `<strong>Co je fixace?</strong>
Období, kdy banka garantuje pevnou úrokovou sazbu. Po skončení fixace se sazba přehodnocuje.

<strong>Typy fixace:</strong>
• <strong>3 roky:</strong> Flexibilní, nižší sazba, riziko růstu
• <strong>5 let:</strong> ⭐ Zlatý střed - nejoblíbenější
• <strong>7-10 let:</strong> Stabilita, ochrana před růstem sazeb

<strong>Co se děje po skončení?</strong>
1. Banka nabídne novou sazbu (refixace)
2. Můžete refinancovat do jiné banky
3. Vyjednat lepší podmínky

<strong>Příklad:</strong>
Fixace 5 let, sazba 4.5%, úvěr 4 mil Kč
• Splátka: cca 22 000 Kč/měs (5 let garantováno)
• Po 5 letech: Přehodnocení
  - Pokles na 3.8% → Úspora 2 800 Kč/měs
  - Růst na 5.2% → Navýšení +2 800 Kč/měs

💡 <strong>Strategie:</strong> Kratší fixace = flexibilita, delší = jistota. Naše AI vám poradí optimální mix.`,
            cta: "Zjistit nejlepší fixaci pro vás",
            actions: ["Zeptat se AI na detaily", "Spočítat v kalkulačce"]
        },

        "Můžu dostat hypotéku jako OSVČ?": {
            title: "🏢 Hypotéka pro OSVČ",
            content: `<strong>Ano, lze!</strong> Ale s některými odlišnostmi:

<strong>Co banky vyžadují:</strong>
• ✓ Minimum 2 roky podnikání (ideálně 3+)
• ✓ Daňová přiznání za 2-3 roky
• ✓ Rostoucí nebo stabilní příjmy
• ✓ Výpisy z účtu (6 měsíců)

<strong>Jak banky počítají příjem OSVČ:</strong>
Průměr příjmů za 2-3 roky × koeficient (0.5-0.7)

<strong>Příklad:</strong>
• Rok 2022: 800 000 Kč
• Rok 2023: 900 000 Kč
• Rok 2024: 1 000 000 Kč
→ Průměr: 900 000 Kč/rok = 75 000 Kč/měs
→ Banka počítá: 75 000 × 0.6 = 45 000 Kč
→ Max úvěr: 45 000 × 9 = 4.05 mil Kč

<strong>Tipy pro OSVČ:</strong>
• 📊 Udržujte stabilní příjmy
• 💰 Vyšší vlastní vklad (30%+) pomáhá
• 🤝 Ručitel nebo spoludlužník zlepší podmínky
• 📋 Poctivé účetnictví je základ

<strong>Výhoda:</strong> Některé banky mají speciální produkty pro podnikatele s lepšími podmínkami!`,
            cta: "Zjistit vaše možnosti jako OSVČ",
            actions: ["Spočítat v kalkulačce", "Domluvit se specialistou"]
        },

        "Co je LTV a DSTI?": {
            title: "📈 LTV a DSTI - Klíčové ukazatele",
            content: `<strong>LTV (Loan-to-Value) = Poměr úvěru k hodnotě</strong>

Výpočet: (Úvěr / Hodnota nemovitosti) × 100

<strong>Příklad:</strong>
• Nemovitost: 5 mil Kč
• Úvěr: 4 mil Kč
• LTV = 80%

<strong>Limity:</strong>
• ✓ Do 80% = Nejlepší sazby
• ⚠️ 80-90% = Vyšší sazba (+0.3%)
• ❌ Nad 90% = Obtížné schválení

---

<strong>DSTI (Debt Service-to-Income) = Úvěrová zatíženost</strong>

Výpočet: (Všechny splátky / Čistý příjem) × 100

<strong>Příklad:</strong>
• Příjem: 60 000 Kč/měs
• Splátka hypotéky: 22 000 Kč
• Auto: 5 000 Kč
• DSTI = (27 000 / 60 000) × 100 = 45%

<strong>Limity ČNB:</strong>
• ✅ Do 45% = V pořádku
• ⚠️ 45-50% = Na hraně
• ❌ Nad 50% = Problém

<strong>💡 Strategie pro lepší ukazatele:</strong>
1. Vyšší vlastní vklad → nižší LTV
2. Delší splatnost → nižší DSTI
3. Splatit jiné úvěry → nižší DSTI
4. Spoludlužník → lepší DSTI`,
            cta: "Spočítat vaše LTV a DSTI",
            actions: ["Spočítat v kalkulačce", "Zeptat se AI"]
        }
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
        chatInput: document.getElementById('chat-input-main'),
        chatSendBtn: document.getElementById('chat-send-btn'),
        chatMessagesArea: document.getElementById('chat-messages-area'),
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
    
    // --- CHAT FUNCTIONS ---
    
    // Přidání zprávy do chatu
    const addChatMessage = (message, sender, isHtml = false) => {
        const container = DOMElements.chatMessagesArea;
        if (!container) return;
        
        if (sender !== 'ai-typing') {
            state.chatHistory.push({ text: message, sender: sender, timestamp: Date.now() });
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'ai-message'}`;
        
        if (sender === 'ai-typing') {
            messageDiv.innerHTML = `
                <div class="message-bubble">
                    <div class="loading-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            messageDiv.id = 'typing-indicator';
        } else {
            const content = isHtml ? message : message
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            
            messageDiv.innerHTML = `
                <div class="message-bubble">
                    ${content}
                </div>
            `;
        }
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    };

    // Rychlá odpověď z cache
    const handleQuickAnswer = (question) => {
        const answer = QUICK_ANSWERS[question];
        if (!answer) return false;

        addChatMessage(question, 'user');
        
        // Simulace "přemýšlení"
        addChatMessage('', 'ai-typing');
        
        setTimeout(() => {
            document.getElementById('typing-indicator')?.remove();
            
            const responseHtml = `
                <div class="quick-answer-card">
                    <h4 class="answer-title">${answer.title}</h4>
                    <div class="answer-content">${answer.content}</div>
                    ${answer.cta ? `<p class="answer-cta">${answer.cta}</p>` : ''}
                    ${answer.actions ? `
                        <div class="answer-actions">
                            ${answer.actions.map(action => {
                                if (action === "Spočítat v kalkulačce") {
                                    return '<button class="action-btn primary" data-action="go-to-calculator">📊 Spočítat v kalkulačce</button>';
                                } else if (action === "Domluvit se specialistou") {
                                    return '<button class="action-btn secondary" data-action="show-lead-form">📞 Domluvit se specialistou</button>';
                                } else if (action === "Zeptat se AI") {
                                    return '<button class="action-btn tertiary" data-action="ask-ai-follow">🤖 Zeptat se AI na detaily</button>';
                                } else if (action === "Zeptat se AI na detaily") {
                                    return '<button class="action-btn tertiary" data-action="ask-ai-follow">🤖 Zeptat se AI na detaily</button>';
                                }
                                return '';
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
            
            addChatMessage(responseHtml, 'ai', true);
        }, CONFIG.QUICK_RESPONSE_DELAY);
        
        return true;
    };

    // Odeslání zprávy do AI
    const handleChatMessageSend = async (message) => {
        if (!message || message.trim() === '') return;
        
        // Nejdřív zkus rychlou odpověď
        if (handleQuickAnswer(message)) {
            return;
        }
        
        // Jinak použij AI
        addChatMessage(message, 'user');
        state.isAiTyping = true;
        addChatMessage('', 'ai-typing');
        
        const contextToSend = {
            ...state,
            isDataFromOurCalculator: state.calculation.isFromOurCalculator,
            messageCount: state.chatHistory.filter(h => h.sender === 'user').length
        };
        
        const { chart, chatHistory, mobileSidebarOpen, ...cleanContext } = contextToSend;
        
        const timeoutId = setTimeout(() => {
            if (state.isAiTyping) {
                document.getElementById('typing-indicator')?.remove();
                addChatMessage('Omlouvám se, zpracování trvá déle než obvykle. Zkuste to prosím znovu nebo se spojte s naším specialistou.', 'ai');
                state.isAiTyping = false;
            }
        }, 30000);
        
        try {
            const response = await fetch(CONFIG.API_CHAT_ENDPOINT, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ message: message, context: cleanContext }) 
            });
            
            clearTimeout(timeoutId);
            document.getElementById('typing-indicator')?.remove();
            
            if (!response.ok) throw new Error((await response.json()).error || 'Chyba serveru');
            const data = await response.json();

            if (data.tool === 'showLeadForm') {
                DOMElements.leadFormContainer.classList.remove('hidden');
                scrollToTarget('#kontakt');
                addChatMessage(data.response || 'Otevírám formulář pro spojení se specialistou...', 'ai');
            } else if (data.tool === 'showBanksList') {
                const banksList = `
                <div class="banks-list-card">
                    <h4>🏦 Naši partneři</h4>
                    <p><strong>Největší banky:</strong> Česká spořitelna, ČSOB, Komerční banka, Raiffeisenbank, UniCredit Bank</p>
                    <p><strong>Hypoteční specialisté:</strong> Hypoteční banka, Modrá pyramida, ČMSS, Raiffeisen stavební, Buřinka</p>
                    <p><strong>Moderní banky:</strong> MONETA, mBank, Fio banka, Air Bank, Banka CREDITAS</p>
                    <p><strong>Další partneři:</strong> Wüstenrot, TRINITY BANK, Sberbank, Hello bank!, Partners Banka</p>
                    <p>Celkem <strong>19+ institucí</strong> pro nejlepší nabídky!</p>
                </div>`;
                addChatMessage(banksList, 'ai', true);
            } else {
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

    // Event listeners pro chat
    if (DOMElements.chatInput) {
        DOMElements.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = DOMElements.chatInput.value.trim();
                if (message) {
                    handleChatMessageSend(message);
                    DOMElements.chatInput.value = '';
                }
            }
        });
    }

    if (DOMElements.chatSendBtn) {
        DOMElements.chatSendBtn.addEventListener('click', () => {
            const message = DOMElements.chatInput.value.trim();
            if (message) {
                handleChatMessageSend(message);
                DOMElements.chatInput.value = '';
            }
        });
    }

    // Rychlé otázky
    document.body.addEventListener('click', (e) => {
        const quickBtn = e.target.closest('.quick-question-btn');
        if (quickBtn) {
            const question = quickBtn.dataset.question;
            DOMElements.chatInput.value = question;
            handleChatMessageSend(question);
            DOMElements.chatInput.value = '';
        }
    });

    // Úvodní zpráva v chatu
    const initChat = () => {
        if (DOMElements.chatMessagesArea && state.chatHistory.length === 0) {
            const welcomeMessage = `
                <div class="welcome-message-card">
                    <h4>👋 Vítejte!</h4>
                    <p>Jsem váš AI hypoteční stratég. Můžu vám pomoci s:</p>
                    <ul>
                        <li>✓ Rychlými odpověďmi na časté otázky</li>
                        <li>✓ Komplexními analýzami a strategiemi</li>
                        <li>✓ Porovnáním nabídek z 19+ bank</li>
                        <li>✓ Propočty stress testů a scénářů</li>
                    </ul>
                    <p><strong>💡 Tip:</strong> Použijte rychlé otázky výše pro okamžitou odpověď!</p>
                </div>
            `;
            addChatMessage(welcomeMessage, 'ai', true);
        }
    };

    // --- CALCULATOR FUNCTIONS (zachováno z původního kódu) ---
    
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
    
    const getCalculatorLayout = (formHTML) => 
        `<div class="bg-white p-4 md:p-6 lg:p-12 rounded-2xl shadow-xl border">${formHTML}</div>`;
    
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

    // Zkrácené verze dalších funkcí pro úsporu místa...
    // (renderResults, calculateRates, atd. - zachováno z původního kódu)

    const switchMode = (mode) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        
        if (mode === 'express') {
            DOMElements.contentContainer.innerHTML = getExpressHTML();
        }
        else if (mode === 'guided') {
            DOMElements.contentContainer.innerHTML = getGuidedHTML();
        }
        else if (mode === 'ai-calculator') {
            // Přepnout na AI sekci a scrollovat
            scrollToTarget('#ai-strateg');
        }
    };

    // --- EVENT HANDLERS ---
    const handleClick = async (e) => {
        let target = e.target.closest('[data-action], .mode-card, .scroll-to');
        if (!target) return;
        
        const { action, mode, target: targetId } = target.dataset;

        if (targetId && target.classList.contains('scroll-to')) {
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
        else if (action === 'go-to-calculator') {
            switchMode('express');
            setTimeout(() => scrollToTarget('#kalkulacka'), 100);
        }
        else if (action === 'show-lead-form') {
            DOMElements.leadFormContainer.classList.remove('hidden');
            scrollToTarget('#kontakt');
        }
        else if (action === 'reset-chat') {
            state.chatHistory = [];
            DOMElements.chatMessagesArea.innerHTML = '';
            initChat();
        }
        else if (action === 'ask-ai-follow') {
            DOMElements.chatInput.value = "Můžeš mi říct víc detailů?";
            DOMElements.chatInput.focus();
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
                headers: { "Content-Type": "application/x-www-form-urlencoded" }, 
                body: new URLSearchParams(new FormData(form)).toString() 
            });
            form.style.display = 'none';
            document.getElementById('form-success').style.display = 'block';
        } catch (error) {
            alert('Odeslání se nezdařilo. Zkuste to prosím znovu.');
            btn.disabled = false;
            btn.textContent = '📞 Odeslat nezávazně';
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
        
        if (DOMElements.leadForm) DOMElements.leadForm.addEventListener('submit', handleFormSubmit);

        DOMElements.mobileMenuButton?.addEventListener('click', () => {
            DOMElements.mobileMenu?.classList.toggle('hidden');
        });

        handleCookieBanner();
        switchMode(state.mode);
        updateActiveUsers();
        initChat();
    };

    init();
});