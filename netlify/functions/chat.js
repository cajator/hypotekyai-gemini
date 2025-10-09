// netlify/functions/chat.js - FINÁLNÍ VERZE S KOMPLETNÍ LOGIKOU A OPRAVOU API

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const isFromOurCalculator = context?.isDataFromOurCalculator || context?.calculation?.isFromOurCalculator;
    const messageCount = context?.messageCount || 0;

    // ===== NOVÁ LOGIKA PRO PŘÍMÝ VÝPOČET (ZŮSTÁVÁ) =====
    if (userMessage.toLowerCase().match(/spočítat|kalkulačk|kolik.*dostanu|jakou.*splátku/) && !hasContext) {
        return `Uživatel chce spočítat hypotéku, ale zatím nemáme žádná data. Reaguj stručně a veď ho k akci. Nepoužívej slova jako "strategie". Nabídni mu dvě jednoduché cesty: zadat data přímo do chatu, nebo použít kalkulačku.
        
        Příklad odpovědi:
        "Jasně, pojďme na to. Abych vám mohl dát přesná čísla, potřebuji znát 3 základní údaje:
        1. Cenu nemovitosti
        2. Váš čistý měsíční příjem
        3. Kolik si chcete půjčit
        
        Můžete mi je napsat sem, nebo je zadat do naší [Expresní kalkulačky](#kalkulacka) pro okamžitý výsledek."
        
        DOTAZ UŽIVATELE: "${userMessage}"`;
    }
    // ===========================================
    
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
- Růst +1.5%: splátka ${contextData.fixationDetails.futureScenario?.pessimistic?.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč
` : ''}

RYCHLÁ ANALÝZA:
- Denní náklady: ${contextData.quickAnalysis?.dailyCost?.toLocaleString('cs-CZ')} Kč
- Daňová úleva: ${(contextData.quickAnalysis?.taxSavings * 12)?.toLocaleString('cs-CZ')} Kč/rok
- Vs. nájem (75%): ${contextData.quickAnalysis?.equivalentRent?.toLocaleString('cs-CZ')} Kč
` : 'Klient zatím nemá spočítanou hypotéku. Nabídni rychlou kalkulačku.'}

DOTAZ UŽIVATELE: "${userMessage}"`;

    // ===== OBNOVENÉ SPECIÁLNÍ ANALÝZY (VAŠE PŮVODNÍ LOGIKA) =====
    
    // STRESS TESTY
    if (userMessage.toLowerCase().match(/co kdyby|ztratím|přijdu o|nemoc|nezaměstna|krize|problém|zvládnu|nebezpeč/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz: "Pro stress test potřebuji znát vaši situaci. Spočítejte si hypotéku rychlou kalkulačkou (30 sekund) a já vám ukážu přesně co se stane při různých scénářích."`;
        }
        
        const monthlyPayment = contextData.monthlyPayment;
        const remainingAfter = contextData.detailedCalculation?.remainingAfterPayment;
        const emergencyFund = monthlyPayment * 6;
        
        let response = `<strong>🛡️ STRESS TEST - Co kdyby nastaly problémy?</strong>\n\n`;
        response += `<strong>SCÉNÁŘ 1: Ztráta příjmu (nezaměstnanost, nemoc)</strong>\n`;
        response += `• Vaše splátka: ${monthlyPayment.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Doporučená rezerva: ${emergencyFund.toLocaleString('cs-CZ')} Kč (6 měsíců)\n\n`;
        
        response += `<strong>SCÉNÁŘ 2: Růst sazeb o 2% (pesimistický)</strong>\n`;
        const stressPayment = calculateMonthlyPayment(contextData.loanAmount, contextData.rate + 2, contextData.loanTerm);
        const stressIncrease = stressPayment - monthlyPayment;
        response += `• Nová splátka by byla: ${Math.round(stressPayment).toLocaleString('cs-CZ')} Kč\n`;
        response += `• Navýšení: +${Math.round(stressIncrease).toLocaleString('cs-CZ')} Kč/měs\n\n`;
        
        response += `<strong>SCÉNÁŘ 3: Přibude dítě</strong>\n`;
        const childCost = 10000;
        response += `• Průměrné náklady na dítě: ${childCost.toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `• Zbude vám po splátce a nákladech na dítě: ${Math.round(contextData.income - monthlyPayment - childCost).toLocaleString('cs-CZ')} Kč\n\n`;

        response += `<strong>💡 AKČNÍ PLÁN - Ochrana před riziky:</strong>\n`;
        response += `1. HNED: Vytvořte rezervu ${emergencyFund.toLocaleString('cs-CZ')} Kč.\n`;
        response += `2. POJIŠTĚNÍ: Zvažte pojištění neschopnosti splácet.\n`;
        response += `3. FIXACE: ${contextData.fixation <= 5 ? 'Krátká fixace vám dává flexibilitu.' : 'Dlouhá fixace vás chrání před růstem sazeb.'}\n\n`;
        
        response += `Chcete projednat konkrétní strategii s naším specialistou? Ten najde řešení i pro složité situace.`;
        
        return prompt + `\n\nVytvoř stress test analýzu. Odpověz: "${response}"`;
    }
    
    // REFINANCOVÁNÍ A OPTIMALIZACE
    if (userMessage.toLowerCase().match(/refinanc|přefinanc|změn.*banku|lepší.*nabídka|nižší.*úrok|uš(e|ě)tř/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz: "Pro analýzu refinancování potřebuji znát vaši současnou situaci. Spočítejte si aktuální hypotéku v kalkulačce a já vám ukážu PŘESNĚ kolik ušetříte refinancováním."`;
        }
        
        const currentRate = contextData.rate;
        const bestMarketRate = 4.09;
        const rateDiff = currentRate - bestMarketRate;
        
        if (rateDiff <= 0.3) {
            return prompt + `\n\nOdpověz: "Vaše sazba ${currentRate}% je velmi dobrá. Refinancování by přineslo minimální úsporu. Lepší strategie: vyjednejte slevu u stávající banky nebo použijte rezervu na mimořádné splátky."`;
        }
        
        const monthlySaving = Math.round((calculateMonthlyPayment(contextData.loanAmount, currentRate, contextData.loanTerm) - calculateMonthlyPayment(contextData.loanAmount, bestMarketRate, contextData.loanTerm)));
        
        let response = `<strong>💰 ANALÝZA REFINANCOVÁNÍ - Konkrétní čísla</strong>\n\n`;
        response += `<strong>POTENCIÁL REFINANCOVÁNÍ:</strong>\n`;
        response += `• Současná sazba vs. top na trhu: ${currentRate}% vs ${bestMarketRate}%\n`;
        response += `• Měsíční úspora: ${monthlySaving.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Roční úspora: ${(monthlySaving * 12).toLocaleString('cs-CZ')} Kč\n`;
        response += `• Za ${contextData.fixation} let fixace: ${(monthlySaving * 12 * contextData.fixation).toLocaleString('cs-CZ')} Kč\n\n`;
        
        response += `<strong>💡 DOPORUČENÍ:</strong> Refinancování se vyplatí! Spojte se s naším specialistou pro konkrétní nabídky.`;
        
        return prompt + `\n\nVytvoř refinancovací analýzu. Odpověz: "${response}"`;
    }
    
    // ZÁKLADNÍ ROUTY
    if (userMessage.toLowerCase().match(/bank|které banky|seznam bank|s kým spoluprac|partner/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }

    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit|konzultace|telefon|schůzka|sejít|zavolat|domluvit/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Připojím vás k našemu PREMIUM týmu hypotečních stratégů. Otevírám formulář..."}`;
    }

    if (userMessage.match(/\d+/) && (!userMessage.toLowerCase().includes("kolik je") && !userMessage.toLowerCase().includes("co je"))) {
        const numbers = userMessage.match(/\d[\d\s]*/g).map(s => parseInt(s.replace(/\s/g, '')));
        const text = userMessage.toLowerCase();
        
        let params = {};
        
        if (text.match(/mil|mega|milion/)) {
            const amount = numbers[0] > 1000 ? numbers[0] : numbers[0] * 1000000;
            if (text.match(/půjčit|úvěr|hypotéka|potřebuj|chtěl|chci/)) {
                params.loanAmount = amount;
                params.propertyValue = Math.round(amount * 1.25);
            } else if (text.match(/nemovitost|byt|dům|koupit/)) {
                params.propertyValue = amount;
                params.loanAmount = Math.round(amount * 0.8);
            }
        } else if (text.match(/tisíc|tis\.|příjem|vydělávám|plat/)) {
            const amount = numbers[0] > 1000 ? numbers[0] : numbers[0] * 1000;
            if (text.match(/příjem|vydělávám|mám|plat|výplat/)) {
                params.income = amount;
            }
        }
        
        if (text.match(/let|rok/)) {
            const years = numbers.find(n => parseInt(n) >= 5 && parseInt(n) <= 40);
            if (years) params.loanTerm = parseInt(years);
        }
        
        if (Object.keys(params).length > 0) {
            return prompt + `\n\nKlient modeluje scénář. Odpověz POUZE JSON: {"tool":"modelScenario","params":${JSON.stringify(params)}}`;
        }
    }

    prompt += `\n\n
📋 INSTRUKCE PRO ODPOVĚĎ:
1. ${messageCount > 0 ? 'BEZ pozdravu - už jste v konverzaci' : 'Stručný úvod pouze při prvním kontaktu'}
2. KONKRÉTNÍ čísla v Kč (ne "může ušetřit", ale "ušetříte 127 000 Kč")
3. SCÉNÁŘE "co kdyby" s přesnými dopady
4. SROVNÁNÍ alternativ (A vs. B s čísly)
5. AKČNÍ kroky s termíny (ne "zvažte", ale "HNED/za měsíc/za rok")
6. Propoj AI analýzu s nabídkou lidského experta
7. Max 250 slov, ale s vysokou hodnotou
8. Používej <strong> pro důležité věci.
Odpovídej jako premium stratég, ne jako kalkulačka. Ukaž HODNOTU nad rámec čísel.`;

    return prompt;
}

// Dummy calculateMonthlyPayment pro použití v promptu
const calculateMonthlyPayment = (p, r, t) => { 
    const mR = r / 1200, n = t * 12; 
    if (mR === 0) return p / n; 
    return (p * mR * Math.pow(1 + mR, n)) / (Math.pow(1 + mR, n) - 1); 
};


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
        
        // ===== SPRÁVNÁ A FUNKČNÍ KONFIGURACE PRO GEMINI 1.5 FLASH =====
        const modelName = "gemini-1.5-flash-latest";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        // =============================================================

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
            console.error("AI nevrátila žádný text. Odpověď API:", JSON.stringify(data, null, 2));
            throw new Error("AI nevrátila žádný text.");
        }
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { 
                // Pokud se JSON nepodaří naparsovat, pokračujeme a vrátíme text.
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