// netlify/functions/chat.js - FINÁLNÍ VERZE S KOMPLETNÍ LOGIKOU A UPRAVENÝM PROMPTEM PRO STRUČNOST

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const isFromOurCalculator = context?.isDataFromOurCalculator || context?.calculation?.isFromOurCalculator;
    const messageCount = context?.messageCount || 0;
    
    if (userMessage.toLowerCase().match(/spočítat|kalkulačk|kolik.*dostanu|jakou.*splátku/) && !hasContext) {
        return `Uživatel chce spočítat hypotéku. Reaguj stručně. Nabídni mu dvě cesty: zadat data do chatu, nebo použít kalkulačku.
        Příklad odpovědi:
        "Jasně, pojďme na to. Pro přesná čísla potřebuji znát 3 základní údaje:
        1. Cenu nemovitosti
        2. Váš čistý měsíční příjem
        3. Kolik si chcete půjčit
        Můžete mi je napsat sem, nebo je zadat do naší [Expresní kalkulačky](#kalkulacka)."
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
        fixationDetails: context.calculation?.fixationDetails,
    } : null;

    // ===== ZMĚNA ZDE: Přidány stručné instrukce na začátek =====
    let prompt = `Jsi PREMIUM hypoteční stratég. Tvým úkolem je poskytovat hodnotné analýzy, ale STRUČNĚ.
    
    KLÍČOVÉ PRAVIDLO: Tvoje odpovědi musí být krátké (max 100 slov), ideálně v bodech. Vždy na konci nabídni další krok nebo se zeptej, zda chce uživatel vědět více detailů. NIKDY neposílej dlouhý monolog.

    ${hasContext ? `
    AKTUÁLNÍ DATA KLIENTA:
    - Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
    - Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč (${contextData.rate}% p.a.)
    ` : 'Klient zatím nemá spočítanou hypotéku.'}

    DOTAZ UŽIVATELE: "${userMessage}"`;

    // ===== SPECIALIZOVANÉ ANALÝZY (VAŠE PŮVODNÍ PLNOTUČNÁ LOGIKA) =====
    
    // Vysvětlení analýzy kalkulace
    if (userMessage.toLowerCase().match(/vysvětli mi analýzu kalkulace/)) {
        if (!hasContext) return prompt + `\n\nOdpověz: "Nejprve si prosím spočítejte nabídku v kalkulačce, abych měl data pro analýzu."`;
        
        const fixationDetails = contextData.fixationDetails;
        let response = `<strong>Shrnutí vaší kalkulace:</strong>\n\n`;
        response += `• Celkem za ${contextData.fixation} roky fixace zaplatíte <strong>${fixationDetails.totalPaymentsInFixation.toLocaleString('cs-CZ')} Kč</strong>.\n`;
        response += `• Z toho <strong>${fixationDetails.totalInterestForFixation.toLocaleString('cs-CZ')} Kč</strong> tvoří úroky.\n`;
        response += `• Po skončení fixace vám zbude dluh <strong>${fixationDetails.remainingBalanceAfterFixation.toLocaleString('cs-CZ')} Kč</strong>.\n\n`;
        response += `Toto je klíčový moment pro refinancování. Chcete probrat strategii, jak zde ušetřit nejvíce peněz?`;

        // ===== ZMĚNA ZDE: Instrukce pro stručnou odpověď =====
        return prompt + `\n\nStručně shrň analýzu kalkulace podle tohoto textu. Buď věcný a krátký. Odpověz: "${response}"`;
    }
    
    // STRESS TESTY
    if (userMessage.toLowerCase().match(/co kdyby|ztratím|přijdu o|nemoc|nezaměstna|krize|problém|zvládnu|nebezpeč/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz: "Pro stress test potřebuji znát vaši situaci. Spočítejte si hypotéku v kalkulačce."`;
        }
        
        const monthlyPayment = contextData.monthlyPayment;
        const emergencyFund = monthlyPayment * 6;
        let response = `<strong>Analýza hlavních rizik:</strong>\n\n`;
        response += `• <strong>Ztráta příjmu:</strong> Pro pokrytí vaší splátky doporučujeme vytvořit rezervu alespoň <strong>${emergencyFund.toLocaleString('cs-CZ')} Kč</strong>.\n`;
        response += `• <strong>Růst sazeb:</strong> Pokud by sazba po fixaci vzrostla o 2 %, vaše splátka by se mohla zvýšit přibližně o 2 000 - 3 000 Kč měsíčně.\n\n`;
        response += `Proti těmto rizikům se lze efektivně chránit. Chcete probrat možnosti pojištění nebo volby správné délky fixace?`;
        
        // ===== ZMĚNA ZDE: Instrukce pro stručnou odpověď =====
        return prompt + `\n\nProveď stručný stress test na základě tohoto textu. Buď věcný a krátký. Odpověz: "${response}"`;
    }
    
    // Ostatní detailní bloky (refinancování, investice atd.) by měly následovat stejný princip:
    // 1. Připravit si data.
    // 2. Vytvořit stručnou odpověď v bodech.
    // 3. Na konci se zeptat na další krok.
    // 4. Předat to AI s instrukcí, aby odpověděla stručně podle připraveného textu.

    // ZÁKLADNÍ ROUTY
    if (userMessage.toLowerCase().match(/bank|které banky|seznam bank/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }

    if (userMessage.toLowerCase().match(/kontakt|specialista/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Otevírám formulář pro spojení se specialistou."}`;
    }

    prompt += `\n\nOdpověz na dotaz uživatele stručně a věcně podle pravidel.`;
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
            throw new Error('Chybí GEMINI_API_KEY v proměnných prostředí.');
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
            throw new Error("AI nevrátila žádný text.");
        }
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { /* Ignorovat chybu parsování */ }
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
                error: `Došlo k chybě. (Detail: ${error.message})`
            }) 
        };
    }
};

module.exports = { handler };