// netlify/functions/chat.js - OPTIMIZED VERSION v4.0
// Rychlejší odpovědi + lepší error handling

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

    let prompt = `Jsi AI hypoteční asistent. Tvůj cíl: RYCHLÉ, KONKRÉTNÍ a UŽITEČNÉ odpovědi.

🎯 TVOJE ROLE:
- Odpovídej STRUČNĚ (max 150 slov, pokud není složité)
- KONKRÉTNÍ čísla, ne obecnosti
- Pokud nemáš data → navrhni kalkulačku nebo kontakt
- Pro složité dotazy → doporuč lidského specialistu

⚡ STYL ODPOVĚDÍ:
1. Začni ROVNOU odpovědí (${messageCount > 0 ? 'BEZ pozdravu' : 'krátký ahoj'})
2. Používej **tučný text** pro klíčová čísla
3. Krátké odstavce (2-3 věty max)
4. Bullet pointy pro přehlednost
5. Vždy nabídni NEXT STEP (tlačítko/akce)

${hasContext ? `
📊 DATA KLIENTA:

ZÁKLADNÍ:
- Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
- Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč (${contextData.rate}% p.a.)
- Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč/měs
- LTV: ${contextData.ltv}% | DSTI: ${contextData.dsti}%

BONITA: ${contextData.totalScore}%

${contextData.fixationDetails ? `
FIXACE (${context.formData?.fixation} let):
- Celkem zaplatí: ${contextData.fixationDetails.totalPaymentsInFixation?.toLocaleString('cs-CZ')} Kč
- Z toho úroky: ${contextData.fixationDetails.totalInterestForFixation?.toLocaleString('cs-CZ')} Kč
- Po fixaci zbude: ${contextData.fixationDetails.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč
` : ''}
` : 'Klient ještě nemá spočítanou hypotéku. Nabídni rychlou kalkulačku.'}

DOTAZ: "${userMessage}"`;

    // SPECIALIZOVANÉ ODPOVĚDI - STRUČNĚJŠÍ VERZE
    
    // STRESS TESTY
    if (userMessage.toLowerCase().match(/co kdyby|ztratím|přijdu o|nemoc|nezaměstna|krize|problém|zvládnu|nebezpeč/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověď: "Pro stress test potřebuji znát vaši situaci. Spočítejte si hypotéku rychlou kalkulačkou (30 sekund) a já vám ukážu přesné scénáře co se stane."`;
        }
        
        const monthlyPayment = contextData.monthlyPayment;
        const remainingAfter = contextData.detailedCalculation?.remainingAfterPayment;
        const emergencyFund = monthlyPayment * 6;
        
        let response = `**🛡️ STRESS TEST**\n\n`;
        
        response += `**Ztráta příjmu:**\n`;
        response += `• Podpora úřadu: cca 15k Kč\n`;
        response += `• Vaše splátka: ${monthlyPayment.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Chybí: ${Math.max(0, monthlyPayment - 15000).toLocaleString('cs-CZ')} Kč\n`;
        response += `• Potřebná rezerva: ${emergencyFund.toLocaleString('cs-CZ')} Kč (6 měsíců)\n\n`;
        
        response += `**Růst sazeb o 2%:**\n`;
        const stressPayment = contextData.fixationDetails?.futureScenario?.pessimistic?.newMonthlyPayment || (monthlyPayment * 1.15);
        response += `• Nová splátka: ${Math.round(stressPayment).toLocaleString('cs-CZ')} Kč\n`;
        response += `• Navýšení: +${Math.round(stressPayment - monthlyPayment).toLocaleString('cs-CZ')} Kč\n\n`;
        
        response += `**💡 AKČNÍ PLÁN:**\n`;
        response += `1. Vytvořte rezervu ${emergencyFund.toLocaleString('cs-CZ')} Kč\n`;
        response += `2. Zvažte pojištění neschopnosti\n`;
        response += `3. ${contextData.fixation <= 5 ? 'Krátká fixace = flexibilita ✓' : 'Dlouhá fixace = ochrana před růstem ✓'}\n\n`;
        
        response += `Chcete projednat konkrétní strategii se specialistou?`;
        
        return prompt + `\n\nOdpověď: "${response}"`;
    }
    
    // REFINANCOVÁNÍ
    if (userMessage.toLowerCase().match(/refinanc|přefinanc|změn.*banku|lepší.*nabídka|nižší.*úrok|ušet/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověď: "Pro analýzu refinancování potřebuji znát vaši současnou situaci. Spočítejte aktuální hypotéku a já vám ukážu PŘESNĚ kolik ušetříte."`;
        }
        
        const currentRate = contextData.rate;
        const bestMarketRate = contextData.marketInfo?.bestAvailableRate || 4.09;
        const rateDiff = currentRate - bestMarketRate;
        
        if (rateDiff <= 0.3) {
            return prompt + `\n\nOdpověď: "Vaše sazba ${currentRate}% je velmi dobrá, jen ${rateDiff.toFixed(2)}% nad top nabídkou. Refinancování by přineslo minimální úsporu. NEDOPORUČUJI kvůli nákladům (znalecký posudek 5-8k). Lepší: vyjednejte slevu u stávající banky."`;
        }
        
        const monthlySaving = Math.round((currentRate - bestMarketRate) * contextData.loanAmount * 0.01 / 12);
        const yearlySaving = monthlySaving * 12;
        
        let response = `**💰 REFINANCOVÁNÍ**\n\n`;
        
        response += `**Současný stav:**\n`;
        response += `• Vaše sazba: ${currentRate}%\n`;
        response += `• Top trh: ${bestMarketRate}%\n`;
        response += `• Rozdíl: ${rateDiff.toFixed(2)}%\n\n`;
        
        response += `**Potenciál úspory:**\n`;
        response += `• Měsíčně: ${monthlySaving.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Ročně: ${yearlySaving.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Za ${contextData.loanTerm} let: ${(monthlySaving * contextData.loanTerm * 12).toLocaleString('cs-CZ')} Kč\n\n`;
        
        response += `**Doporučení:**\n`;
        response += `${rateDiff > 0.5 ? 
            '✅ REFINANCUJTE - vyplatí se!\n' + 
            'Náš specialista vám najde nejlepší nabídky.' : 
            '1. Zkuste vyjednat slevu u stávající banky\n' + 
            '2. Pokud odmítne, refinancujte'}\n\n`;
        
        response += `Chcete konkrétní nabídky od našich 19 partnerů?`;
        
        return prompt + `\n\nOdpověď: "${response}"`;
    }
    
    // DLOUHODOBÝ PLÁN
    if (userMessage.toLowerCase().match(/za.*let|budouc|dlouhodob|strategi|jak.*bude|plán|až.*splat/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověď: "Pro vytvoření strategie potřebuji znát vaši situaci. Spočítejte si hypotéku a já vám vytvořím plán na 5-20 let dopředu s konkrétními milníky."`;
        }
        
        const yearsRemaining = contextData.loanTerm;
        const currentAge = contextData.age;
        const fixationEnd = contextData.fixation;
        
        let response = `**🔮 STRATEGIE NA ${yearsRemaining} LET**\n\n`;
        
        response += `**📅 Dnes (${new Date().getFullYear()}):**\n`;
        response += `• Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Dluh: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Věk: ${currentAge} let\n\n`;
        
        response += `**📅 Za ${fixationEnd} let - KONEC FIXACE:**\n`;
        response += `• Zbývá splatit: ${contextData.fixationDetails?.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Splaceno: ${Math.round((1 - (contextData.fixationDetails?.remainingBalanceAfterFixation / contextData.loanAmount)) * 100)}%\n`;
        response += `• Věk: ${currentAge + fixationEnd} let\n`;
        response += `• AKCE: Refixace - šance ušetřit!\n\n`;
        
        const midPoint = Math.round(yearsRemaining / 2);
        response += `**📅 Za ${midPoint} let - POLOVINA:**\n`;
        response += `• Situace: ${currentAge + midPoint < 45 ? 'Děti ve škole, příjmy rostou' : currentAge + midPoint < 55 ? 'Peak příjmů, děti odrostly' : 'Blíží se důchod'}\n`;
        response += `• Doporučení: ${currentAge + midPoint < 45 ? 'Zvažte kratší splatnost' : 'Začněte budovat důchodovou rezervu'}\n\n`;
        
        response += `**📅 Za ${yearsRemaining} let - KONEC:**\n`;
        response += `• Nemovitost: VAŠE!\n`;
        response += `• Měsíčně ušetříte: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Věk: ${currentAge + yearsRemaining} let\n\n`;
        
        response += `Chcete detailní plán s konkrétními kroky?`;
        
        return prompt + `\n\nOdpověď: "${response}"`;
    }

    // ZÁKLADNÍ ROUTY
    
    if (userMessage.toLowerCase().match(/bank|které banky|seznam bank|s kým spoluprac|partner/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }

    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit|konzultace|telefon|schůzka|sejít|zavolat|domluvit/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Připojím vás k našemu týmu specialistů.\\n\\nSpecialista vás kontaktuje do 4 hodin."}`;
    }

    if (userMessage.match(/\d+/)) {
        const numbers = userMessage.match(/\d+/g);
        const text = userMessage.toLowerCase();
        
        let params = {};
        
        if (text.match(/mil|mega|milion/)) {
            const amount = parseInt(numbers[0]) * 1000000;
            if (text.match(/půjčit|úvěr|hypotéka|potřebuj|chtěl|chci/)) {
                params.loanAmount = amount;
                params.propertyValue = Math.round(amount * 1.25);
            } else if (text.match(/nemovitost|byt|dům|koupit/)) {
                params.propertyValue = amount;
                params.loanAmount = Math.round(amount * 0.8);
            }
        } else if (text.match(/tisíc|tis\.|příjem|vydělávám|plat/)) {
            const amount = parseInt(numbers[0]) * 1000;
            if (text.match(/příjem|vydělávám|mám|plat|výplat/)) {
                params.income = amount;
                const maxMonthlyPayment = amount * 0.45;
                const maxLoan = maxMonthlyPayment * 12 * 9;
                params.loanAmount = Math.round(maxLoan * 0.9);
                params.propertyValue = Math.round(maxLoan);
            }
        }
        
        if (text.match(/let|rok/)) {
            const years = numbers.find(n => parseInt(n) >= 5 && parseInt(n) <= 30);
            if (years) params.loanTerm = parseInt(years);
        }
        
        if (Object.keys(params).length > 0) {
            return prompt + `\n\nKlient modeluje scénář. Odpověz POUZE JSON: {"tool":"modelScenario","params":${JSON.stringify(params)}}`;
        }
    }

    prompt += `\n\n📋 INSTRUKCE:
1. ${messageCount > 0 ? 'BEZ pozdravu' : 'Krátký ahoj'}
2. STRUČNĚ (max 150 slov)
3. KONKRÉTNÍ čísla v Kč
4. Nabídni NEXT STEP
5. Pro složité → doporuč specialistu`;

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
            throw new Error('Chybí GEMINI_API_KEY. Nastavte ho v proměnných prostředí na Netlify.');
        }

        const prompt = createSystemPrompt(message, context);

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500, // Omezení délky pro rychlejší odpovědi
            }
        };
        
        const modelName = "gemini-2.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

        // Timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

        try {
            const apiResponse = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!apiResponse.ok) {
                const errorBody = await apiResponse.text();
                console.error('API Error:', errorBody); 
                throw new Error(`Chyba API: ${apiResponse.status}`);
            }

            const data = await apiResponse.json();
            const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                throw new Error("AI nevrátila text.");
            }
            
            // Try to parse JSON response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const jsonResponse = JSON.parse(jsonMatch[0]);
                    if (jsonResponse.tool) {
                        return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                    }
                } catch (e) { 
                    // Continue to text response
                }
            }
            
            const cleanResponse = responseText.replace(/```json\n?|```\n?/g, "").trim();
            
            return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify({ response: cleanResponse }) 
            };

        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                return { 
                    statusCode: 200, 
                    headers, 
                    body: JSON.stringify({ 
                        response: "⏱️ Zpracování trvá déle než obvykle. Pro rychlou pomoc můžete:\n\n" +
                                 "• **Zavolat** na 800 123 456\n" +
                                 "• **Spočítat hypotéku** v kalkulačce\n\n" +
                                 "Nebo zkuste přeformulovat dotaz jednodušeji."
                    }) 
                };
            }
            
            throw fetchError;
        }

    } catch (error) {
        console.error('Chyba ve funkci chat.js:', error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                error: `Došlo k chybě při komunikaci s AI. Zkuste to prosím znovu nebo zavolejte na 800 123 456.`
            }) 
        };
    }
};

module.exports = { handler };