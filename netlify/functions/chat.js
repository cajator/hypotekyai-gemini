// netlify/functions/chat.js - VAŠE KOMPLETNÍ LOGIKA S VAŠÍ API KONFIGURACÍ

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const isFromOurCalculator = context?.isDataFromOurCalculator || context?.calculation?.isFromOurCalculator;
    const messageCount = context?.messageCount || 0;

    // ===== LOGIKA PRO ZJEDNODUŠENÍ PRVNÍHO DOTAZU NA VÝPOČET =====
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

    // ===== SPECIALIZOVANÉ ANALÝZY (VAŠE PŮVODNÍ PLNOTUČNÁ LOGIKA) =====
    
    if (userMessage.toLowerCase().match(/co kdyby|ztratím|přijdu o|nemoc|nezaměstna|krize|problém|zvládnu|nebezpeč/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz: "Pro stress test potřebuji znát vaši situaci. Spočítejte si hypotéku rychlou kalkulačkou (30 sekund) a já vám ukážu přesně co se stane při různých scénářích."`;
        }
        
        const monthlyPayment = contextData.monthlyPayment;
        const remainingAfter = contextData.detailedCalculation?.remainingAfterPayment;
        const emergencyFund = monthlyPayment * 6;
        
        const stressAnalysis = `<strong>🛡️ STRESS TEST - Co kdyby nastaly problémy?</strong>\n\n`;
        
        let response = stressAnalysis;
        
        response += `<strong>SCÉNÁŘ 1: Ztráta příjmu (nezaměstnanost, nemoc)</strong>\n`;
        response += `• Podpora od úřadu práce: cca 15 000 Kč/měs (60% průměru)\n`;
        response += `• Vaše splátka: ${monthlyPayment.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Chybí vám: ${Math.max(0, monthlyPayment - 15000).toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `• Doporučená rezerva: ${emergencyFund.toLocaleString('cs-CZ')} Kč (6 měsíců)\n`;
        response += `• ${remainingAfter >= emergencyFund / 6 ? '✅ Máte prostor vytvořit rezervu' : '⚠️ Rezervu vytváříte obtížně'}\n\n`;
        
        response += `<strong>SCÉNÁŘ 2: Růst sazeb o 2% (pesimistický)</strong>\n`;
        const stressPayment = contextData.fixationDetails?.futureScenario?.pessimistic?.newMonthlyPayment || (monthlyPayment * 1.15);
        const stressIncrease = stressPayment - monthlyPayment;
        response += `• Nová splátka po ${contextData.fixation} letech: ${Math.round(stressPayment).toLocaleString('cs-CZ')} Kč\n`;
        response += `• Navýšení: ${Math.round(stressIncrease).toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `• Nové DSTI: cca ${Math.round((stressPayment / contextData.income) * 100)}%\n`;
        response += `• Zbude vám: ${Math.round(contextData.income - stressPayment).toLocaleString('cs-CZ')} Kč\n\n`;
        
        response += `<strong>SCÉNÁŘ 3: Přibude dítě</strong>\n`;
        const childCost = 10000;
        response += `• Průměrné náklady na dítě: ${childCost.toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `• Rodičovský příspěvek: 350 000 Kč (max, postupně)\n`;
        response += `• Jeden příjem (mateřská): disponibilní ${Math.round((contextData.income * 0.7 + 15000) - monthlyPayment - childCost).toLocaleString('cs-CZ')} Kč\n`;
        response += `• ${remainingAfter >= childCost ? '✅ Zvládnete i s dítětem' : '⚠️ Bude to napjaté, zvažte delší splatnost'}\n\n`;
        
        response += `<strong>💡 AKČNÍ PLÁN - Ochrana před riziky:</strong>\n`;
        response += `1. HNED: Vytvořte rezervu ${emergencyFund.toLocaleString('cs-CZ')} Kč (odkládejte ${Math.round(emergencyFund/12).toLocaleString('cs-CZ')} Kč/měs po rok)\n`;
        response += `2. POJIŠTĚNÍ: Zvažte pojištění neschopnosti (800-1500 Kč/měs)\n`;
        response += `3. FIXACE: ${contextData.fixation <= 5 ? 'Dobrá volba - krátká fixace = flexibilita' : 'Dlouhá fixace vás chrání před růstem sazeb'}\n`;
        response += `4. REZERVA V DSTI: Máte ${Math.round(100 - contextData.dsti)}% příjmu volných = ${remainingAfter < 15000 ? 'MALÁ rezerva ⚠️' : remainingAfter < 25000 ? 'STŘEDNÍ rezerva ✓' : 'VELKÁ rezerva ✅'}\n\n`;
        
        response += `Chcete projednat konkrétní strategii s naším specialistou? Ten najde řešení i pro složité situace.`;
        
        return prompt + `\n\nVytvoř stress test analýzu. Odpověz: "${response}"`;
    }
    
    if (userMessage.toLowerCase().match(/refinanc|přefinanc|změn.*banku|lepší.*nabídka|nižší.*úrok|uš(e|ě)tř/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz: "Pro analýzu refinancování potřebuji znát vaši současnou situaci. Spočítejte si aktuální hypotéku v kalkulačce a já vám ukážu PŘESNĚ kolik ušetříte refinancováním."`;
        }
        
        const currentRate = contextData.rate;
        const bestMarketRate = contextData.marketInfo?.bestAvailableRate || 4.09;
        const rateDiff = currentRate - bestMarketRate;
        
        if (rateDiff <= 0.3) {
            return prompt + `\n\nOdpověz: "Vaše sazba ${currentRate}% je velmi dobrá. Refinancování by přineslo minimální úsporu. Lepší strategie: vyjednejte slevu u stávající banky."`;
        }
        
        const monthlySaving = Math.round((currentRate - bestMarketRate) * contextData.loanAmount * 0.01 / 12);
        let response = `<strong>💰 ANALÝZA REFINANCOVÁNÍ</strong>\n\n`;
        response += `• S vaší sazbou ${currentRate}% a nejlepší nabídkou na trhu ${bestMarketRate}% je potenciál úspory cca <strong>${monthlySaving.toLocaleString('cs-CZ')} Kč měsíčně</strong>.\n`;
        response += `• To je <strong>${(monthlySaving * 12).toLocaleString('cs-CZ')} Kč ročně</strong>.\n\n`;
        response += `<strong>💡 STRATEGIE:</strong>\n1. Vyjednejte slevu u stávající banky s naší nabídkou jako argumentem.\n2. Pokud neuspějete, náš specialista zařídí refinancování.\n\nChcete připravit konkrétní nabídky?`;
        
        return prompt + `\n\nVytvoř refinancovací analýzu. Odpověz: "${response}"`;
    }

    // ZÁKLADNÍ ROUTY
    if (userMessage.toLowerCase().match(/bank|které banky|seznam bank|s kým spoluprac|partner/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }

    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit|konzultace|telefon|schůzka|sejít|zavolat|domluvit/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Připojím vás k našemu PREMIUM týmu hypotečních stratégů. Otevírám formulář..."}`;
    }

    if (userMessage.match(/\d+/)) {
        const numbers = userMessage.match(/\d+/g);
        const text = userMessage.toLowerCase();
        let params = {};
        if (text.match(/mil|mega|milion/)) {
            const amount = parseInt(numbers[0]) * 1000000;
            if (text.match(/půjčit|úvěr|hypotéka/)) params.loanAmount = amount;
            else params.propertyValue = amount;
        } else if (text.match(/tisíc|tis\.|příjem/)) {
            params.income = parseInt(numbers[0]) * 1000;
        }
        if (text.match(/let|rok/)) {
            params.loanTerm = parseInt(numbers.find(n => n >= 5 && n <= 30));
        }
        if (Object.keys(params).length > 0) {
            return prompt + `\n\nKlient modeluje scénář. Odpověz POUZE JSON: {"tool":"modelScenario","params":${JSON.stringify(params)}}`;
        }
    }

    prompt += `\n\n📋 INSTRUKCE: Odpověz stručně a věcně. Používej <strong> a navrhni další krok.`;
    return prompt;
}


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
            throw new Error('Chybí GEMINI_API_KEY v proměnných prostředí na Netlify.');
        }

        const prompt = createSystemPrompt(message, context);

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };
        
        // ===== VAŠE PŮVODNÍ, SPECIFICKÁ KONFIGURACE =====
        const modelName = "gemini-2.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
        // ===============================================

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
            } catch (e) { /* Pokračujeme, i když se JSON nepodaří naparsovat */ }
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
                error: `Došlo k chybě při komunikaci s AI. (Detail: ${error.message})`
            }) 
        };
    }
};

module.exports = { handler };