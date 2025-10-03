// netlify/functions/chat.js - OPTIMALIZOVANÁ VERZE
// Hybridní systém: Rychlé FAQ odpovědi (0.1s) + AI analýza (28s)

// ===== FAQ SYSTÉM - OKAMŽITÉ ODPOVĚDI =====
const QUICK_FAQ = {
    banks: {
        triggers: ['bank', 'které banky', 'seznam bank', 'partner', 's kým'],
        response: {
            tool: 'quickResponse',
            response: `**🏦 Spolupracujeme s 19+ finančními institucemi:**

**Top banky:** Česká spořitelna • ČSOB • Komerční banka • Raiffeisenbank • UniCredit

**Hypoteční specialisté:** Hypoteční banka • Modrá pyramida • ČMSS • Raiffeisen stavební • Buřinka

**Moderní banky:** MONETA • mBank • Fio • Air Bank • CREDITAS

**A další:** Wüstenrot • TRINITY BANK • Partners Banka

Naše AI analyzuje všechny denně a vybírá nejlepší pro vaši situaci.`
        }
    },
    documents: {
        triggers: ['dokument', 'co potřebuj', 'checklist', 'papíry', 'doklady'],
        response: {
            tool: 'quickResponse',
            response: `**📋 Checklist dokumentů:**

**ZÁKLAD (vždy):**
✓ Občanský průkaz
✓ Doklad o příjmu (3 výplatní pásky / daňové přiznání)
✓ Výpis z účtu (3 měsíce)

**O NEMOVITOSTI:**
✓ Kupní/Rezervační smlouva
✓ Výpis z katastru
✓ Znalecký posudek (zajistí banka)

**OSVČ/Jednatel navíc:**
✓ Daňové přiznání 2 roky
✓ Přehled příjmů a výdajů
✓ Výpis účtu firmy

Chcete přesný seznam pro vaši situaci? Spočítejte hypotéku v kalkulačce ⬆️`
        }
    },
    timeline: {
        triggers: ['jak dlouho', 'kdy schvál', 'doba', 'jak rychle'],
        response: {
            tool: 'quickResponse',
            response: `**⏱️ Časová osa hypotéky:**

**1. Předschválení** (3-5 dní)
→ Základní dokumenty → banka řekne ANO/NE

**2. Schválení** (7-14 dní)
→ Kompletní dokumenty + znalecký posudek

**3. Čerpání** (5-10 dní)
→ Podpis u notáře → vklad do katastru → peníze

**CELKEM: 3-6 týdnů**
💡 S našimi specialisty: urychlíme o 30%`
        }
    },
    osvc: {
        triggers: ['osvč', 'živnost', 'podnikat', 'jsem podnikatel'],
        response: {
            tool: 'quickResponse',
            response: `**🏢 Hypotéka pro OSVČ - ANO, je to možné!**

**Podmínky:**
• Daňová přiznání 2 roky
• Průměrný zisk 300k+ ročně
• Živnost 2+ roky

**Strategie:**
1. Vyšší akonto (LTV <70%)
2. Spolužadatel se stálým příjmem
3. Vykazovat vyšší zisk (35-40k/měs)

**Friendly banky:** ČSOB • ČS • MONETA • mBank

Chcete spočítat, kolik si můžete půjčit?`
        }
    },
    rates: {
        triggers: ['sazby', 'aktuální', 'kolik procent', 'jaký úrok'],
        response: {
            tool: 'quickResponse',
            response: `**📊 Aktuální sazby (${new Date().toLocaleDateString('cs-CZ')}):**

**3 roky:** 4.09-4.29% (dle LTV)
**5 let:** 4.14-4.34% ⭐ Nejčastější
**7-10 let:** 4.59-4.79%

💡 **Rozdíl 0.3% = úspora 100k+ za 20 let**

Chcete přesnou nabídku? Kalkulačka vám ji spočítá za 30 sekund ⬆️`
        }
    },
    contact: {
        triggers: ['kontakt', 'specialista', 'poradit', 'zavolat', 'domluvit'],
        response: {
            tool: 'showLeadForm',
            response: `**📞 Skvělé rozhodnutí!**

Náš PREMIUM tým hypotečních stratégů vám vytvoří:
• Kompletní finanční strategii na míru
• Vyjednání TOP podmínek
• Dlouhodobý plán (ne jen jednorázovou nabídku)
• Přístup ke skrytým nabídkám

Ozveme se do 4 hodin. Otevírám formulář...`
        }
    }
};

function checkQuickResponse(message) {
    const lower = message.toLowerCase();
    
    for (const [key, data] of Object.entries(QUICK_FAQ)) {
        if (data.triggers.some(t => lower.includes(t))) {
            console.log(`✅ Quick response match: ${key}`);
            return data.response;
        }
    }
    
    return null;
}

// ===== AI PROMPT (pro složité dotazy) =====
function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const isFromOurCalculator = context?.isDataFromOurCalculator || context?.calculation?.isFromOurCalculator;
    const messageCount = context?.messageCount || 0;
    
    const contextData = hasContext ? {
        loanAmount: context.formData?.loanAmount,
        propertyValue: context.formData?.propertyValue,
        loanTerm: context.formData?.loanTerm,
        fixation: context.formData?.fixation,
        income: context.formData?.income,
        age: context.formData?.age,
        children: context.formData?.children,
        employment: context.formData?.employment,
        liabilities: context.formData?.liabilities,
        monthlyPayment: context.calculation?.selectedOffer?.monthlyPayment,
        rate: context.calculation?.selectedOffer?.rate,
        totalScore: context.calculation?.approvability?.total,
        ltv: Math.round((context.formData?.loanAmount / context.formData?.propertyValue) * 100),
        ltvScore: context.calculation?.approvability?.ltv,
        dsti: context.calculation?.selectedOffer?.dsti,
        dstiScore: context.calculation?.approvability?.dsti,
        bonita: context.calculation?.approvability?.bonita,
        fixationDetails: context.calculation?.fixationDetails,
        marketInfo: context.calculation?.marketInfo,
        quickAnalysis: context.calculation?.fixationDetails?.quickAnalysis,
        detailedCalculation: context.calculation?.detailedCalculation,
        isFromOurCalculator: isFromOurCalculator
    } : null;

    let prompt = `Jsi PREMIUM hypoteční stratég s AI analytickými nástroji. Tvůj cíl není jen prodat hypotéku, ale vytvořit DLOUHODOBOU STRATEGII pro klienta.

🎯 TVOJE MISE:
- Ukazuj KONKRÉTNÍ scénáře budoucnosti (ne obecnosti!)
- Varuj před riziky a ukaž jak se chránit
- Najdi skryté příležitosti k úspoře
- Vytvoř akční plán s čísly a termíny
- Propoj AI analýzu s lidským expertním poradenstvím

⚡ KLÍČOVÉ PRINCIPY:
1. VŽDY konkrétní čísla (ne "může", ale "ušetříte 127 000 Kč")
2. SCÉNÁŘE "co kdyby" (ztráta práce, růst sazeb, dítě...)
3. SROVNÁNÍ alternativ (refinancování vs. předčasné splácení)
4. ČASOVÁ OSA (co dělat teď, za rok, za 5 let)
5. ${messageCount > 0 ? 'NEPOZDRAV znovu' : 'Krátký úvod při prvním kontaktu'}

🦾 NÁSTROJE K DISPOZICI:
- Metodiky 19+ bank v reálném čase
- ČNB stress testy a predikce
- Historická data sazeb (10 let zpět)
- Demografické trendy a životní události

${hasContext ? `
📊 AKTUÁLNÍ SITUACE KLIENTA:

ZÁKLADNÍ DATA:
- Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
- Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč (${contextData.rate}% p.a.)
- Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč/měs
- Zbývá po splátce: ${contextData.detailedCalculation?.remainingAfterPayment?.toLocaleString('cs-CZ')} Kč
- LTV: ${contextData.ltv}% | DSTI: ${contextData.dsti}%
- Věk: ${contextData.age} let | Děti: ${contextData.children}

SKÓRE BONITY:
- Celkové: ${contextData.totalScore}%
- LTV: ${contextData.ltvScore}% | DSTI: ${contextData.dstiScore}% | Bonita: ${contextData.bonita}%

${contextData.fixationDetails ? `
ANALÝZA FIXACE (${context.formData?.fixation} let):
- Celkem zaplatí: ${contextData.fixationDetails.totalPaymentsInFixation?.toLocaleString('cs-CZ')} Kč
- Z toho úroky: ${contextData.fixationDetails.totalInterestForFixation?.toLocaleString('cs-CZ')} Kč
- Po fixaci zbude: ${contextData.fixationDetails.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč

PREDIKCE PO FIXACI:
- Pokles sazby na ${contextData.fixationDetails.futureScenario?.optimistic?.rate?.toFixed(2)}%: splátka ${contextData.fixationDetails.futureScenario?.optimistic?.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč
- Růst +0.5%: splátka ${contextData.fixationDetails.futureScenario?.moderateIncrease?.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč
` : ''}

RYCHLÁ ANALÝZA:
- Denní náklady: ${contextData.quickAnalysis?.dailyCost?.toLocaleString('cs-CZ')} Kč
- Daňová úleva: ${(contextData.quickAnalysis?.taxSavings * 12)?.toLocaleString('cs-CZ')} Kč/rok
- Vs. nájem (75%): ${contextData.quickAnalysis?.equivalentRent?.toLocaleString('cs-CZ')} Kč
` : 'Klient zatím nemá spočítanou hypotéku. Nabídni rychlou kalkulačku.'}

DOTAZ UŽIVATELE: "${userMessage}"

📋 INSTRUKCE PRO ODPOVĚĎ:
1. ${messageCount > 0 ? 'BEZ pozdravu - už jste v konverzaci' : 'Stručný úvod pouze při prvním kontaktu'}
2. KONKRÉTNÍ čísla v Kč (ne "může ušetřit", ale "ušetříte 127 000 Kč")
3. SCÉNÁŘE "co kdyby" s přesnými dopady
4. SROVNÁNÍ alternativ (A vs. B s čísly)
5. AKČNÍ kroky s termíny (ne "zvažte", ale "HNED/za měsíc/za rok")
6. Propoj AI analýzu s nabídkou lidského experta
7. Max 250 slov, ale s vysokou hodnotou
8. Používej <strong> pro důležité věci, ne emoji

Odpovídej jako premium stratég, ne jako kalkulačka. Ukaž HODNOTU nad rámec čísel.`;

    return prompt;
}

// ===== MAIN HANDLER =====
const handler = async (event) => {
    const headers = { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { message, context } = JSON.parse(event.body);
        
        // ===== KROK 1: Zkontrolovat FAQ (RYCHLÉ ODPOVĚDI) =====
        const quickResponse = checkQuickResponse(message);
        if (quickResponse) {
            console.log('✅ Returning quick response (no AI needed)');
            return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify(quickResponse) 
            };
        }
        
        // ===== KROK 2: Použít AI pro složité dotazy =====
        console.log('🤖 Using AI for complex query...');
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('Chybí GEMINI_API_KEY. Nastavte ho v proměnných prostředí na Netlify.');
        }

        const prompt = createSystemPrompt(message, context);

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };
        
        const modelName = "gemini-2.0-flash-exp"; // Rychlejší model
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('API Error Body:', errorBody); 
            throw new Error(`Chyba API: ${apiResponse.status} ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error("AI nevrátila žádný text. Odpověď API byla: " + JSON.stringify(data));
        }
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { 
                // Pokračujeme
            }
        }
        
        const cleanResponse = responseText.replace(/```json\n?|```\n?/g, "").trim();
        
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ response: cleanResponse }) 
        };

    } catch (error) {
        console.error('Chyba ve funkci chat.js:', error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                error: `Došlo k chybě při komunikaci s AI. Zkuste to prosím znovu. (Detail: ${error.message})`
            }) 
        };
    }
};

module.exports = { handler };