// netlify/functions/chat.js - OPTIMALIZOVANÁ VERZE v4.0
// Zkrácené prompty pro 5-10× rychlejší odpovědi

// ========================================
// SPECIALIZED HANDLERS (rychlé odpovědi)
// ========================================

const getStressTestPrompt = (contextData, userMessage) => {
    if (!contextData) {
        return `Pro stress test potřebuji vaši situaci. Použijte kalkulačku výše (30s).`;
    }
    
    const { monthlyPayment, income } = contextData;
    const emergencyFund = monthlyPayment * 6;
    const stressPayment = monthlyPayment * 1.15; // +2% sazba
    
    return `**🛡️ STRESS TEST**

**Ztráta příjmu:**
• Podpora od úřadu: ~15k Kč/měs
• Vaše splátka: ${monthlyPayment.toLocaleString()} Kč
• Chybí: ${(monthlyPayment - 15000).toLocaleString()} Kč
• Doporučená rezerva: ${emergencyFund.toLocaleString()} Kč (6 měsíců)

**Růst sazeb +2%:**
• Nová splátka: ${Math.round(stressPayment).toLocaleString()} Kč
• Navýšení: ${Math.round(stressPayment - monthlyPayment).toLocaleString()} Kč/měs

**Nové dítě:**
• Náklady: ~10k Kč/měs
• S mateřskou/rodičovskou: zvládnete

💡 **AKCE:** Vytvořte rezervu ${emergencyFund.toLocaleString()} Kč.`;
};

const getRefinancePrompt = (contextData) => {
    if (!contextData) {
        return `Pro analýzu refinancování potřebuji vaši současnou hypotéku. Použijte kalkulačku.`;
    }
    
    const { rate, loanAmount, monthlyPayment } = contextData;
    const bestRate = 4.09;
    const rateDiff = rate - bestRate;
    
    if (rateDiff <= 0.3) {
        return `Vaše sazba ${rate}% je velmi dobrá (jen ${rateDiff.toFixed(2)}% nad topem). Refinancování se nevyplatí kvůli nákladům (~15k Kč). Raději vyjednejte slevu u stávající banky.`;
    }
    
    const monthlySaving = Math.round((rateDiff * loanAmount * 0.01) / 12);
    const yearlySaving = monthlySaving * 12;
    
    return `**💰 REFINANCOVÁNÍ**

**Současnost:** ${rate}% = ${monthlyPayment.toLocaleString()} Kč/měs
**Top nabídka:** ${bestRate}% = úspora ${monthlySaving.toLocaleString()} Kč/měs

**Za rok:** ${yearlySaving.toLocaleString()} Kč
**Náklady:** ~15k Kč
**Návratnost:** ${Math.ceil(15000/monthlySaving)} měsíců

💡 **DOPORUČENÍ:** ${rateDiff > 0.5 ? 'REFINANCOVAT!' : 'Zkusit vyjednat u stávající banky.'}`;
};

// ========================================
// MAIN FUNCTION
// ========================================

function createOptimizedPrompt(userMessage, context) {
    const hasContext = context?.calculation?.selectedOffer;
    const messageCount = context?.messageCount || 0;
    
    // Extract only essential data
    const contextData = hasContext ? {
        loanAmount: context.formData?.loanAmount || 0,
        monthlyPayment: context.calculation?.selectedOffer?.monthlyPayment || 0,
        rate: context.calculation?.selectedOffer?.rate || 0,
        income: context.formData?.income || 0,
        ltv: Math.round((context.formData?.loanAmount / context.formData?.propertyValue) * 100) || 0,
        dsti: context.calculation?.selectedOffer?.dsti || 0,
        age: context.formData?.age || 0,
        loanTerm: context.formData?.loanTerm || 0,
        fixation: context.formData?.fixation || 0
    } : null;
    
    const msg = userMessage.toLowerCase();
    
    // ========================================
    // QUICK ROUTING (backend quick responses)
    // ========================================
    
    // Stress test
    if (msg.match(/co kdyby|ztratím|přijdu o|nemoc|nezaměstna|krize|problém|zvládnu/)) {
        return { type: 'direct', response: getStressTestPrompt(contextData, userMessage) };
    }
    
    // Refinancování
    if (msg.match(/refinanc|přefinanc|změn.*banku|lepší.*nabídka|nižší.*úrok|ušetř/)) {
        return { type: 'direct', response: getRefinancePrompt(contextData) };
    }
    
    // Banky
    if (msg.match(/které.*banky|seznam.*bank|s.*kým.*spoluprac|partner/)) {
        return { type: 'json', tool: 'showBanksList' };
    }
    
    // Kontakt
    if (msg.match(/kontakt|specialista|mluvit|poradit|konzultace|telefon|schůzka|sejít|zavolat|domluvit/)) {
        return { type: 'json', tool: 'showLeadForm' };
    }
    
    // Model scenario s čísly
    if (msg.match(/\d+/) && msg.match(/mil|tisíc|příjem|půjčit|úvěr/)) {
        const numbers = userMessage.match(/\d+/g);
        const text = msg;
        
        let params = {};
        
        if (text.match(/mil/)) {
            const amount = parseInt(numbers[0]) * 1000000;
            if (text.match(/půjčit|úvěr/)) {
                params.loanAmount = amount;
                params.propertyValue = Math.round(amount * 1.25);
            }
        } else if (text.match(/tisíc|příjem/)) {
            const amount = parseInt(numbers[0]) * 1000;
            if (text.match(/příjem/)) {
                params.income = amount;
                const maxLoan = amount * 0.45 * 12 * 9;
                params.loanAmount = Math.round(maxLoan * 0.9);
                params.propertyValue = Math.round(maxLoan);
            }
        }
        
        if (Object.keys(params).length > 0) {
            return { type: 'json', tool: 'modelScenario', params };
        }
    }
    
    // ========================================
    // GENERAL AI (pro složité dotazy)
    // ========================================
    
    // Build short prompt
    let prompt = `Jsi hypoteční AI asistent. KRÁTKÉ odpovědi (max 150 slov).

${messageCount > 0 ? 'Bez pozdravu.' : 'Ahoj!'} Odpovídej KONKRÉTNĚ s čísly.

${hasContext ? `KLIENT:
• Hypotéka: ${contextData.loanAmount.toLocaleString()} Kč za ${contextData.rate}%
• Splátka: ${contextData.monthlyPayment.toLocaleString()} Kč/měs
• Příjem: ${contextData.income.toLocaleString()} Kč
• LTV ${contextData.ltv}% | DSTI ${contextData.dsti}%
` : 'Klient nemá spočítanou hypotéku. Nabídni kalkulačku.'}

DOTAZ: "${userMessage}"

ODPOVĚĎ (max 150 slov):`;
    
    return { type: 'ai', prompt };
}

// ========================================
// HANDLER
// ========================================

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
            throw new Error('Chybí GEMINI_API_KEY');
        }

        // Get optimized prompt
        const result = createOptimizedPrompt(message, context);
        
        // Direct response (no AI needed)
        if (result.type === 'direct') {
            return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify({ response: result.response }) 
            };
        }
        
        // JSON tool response
        if (result.type === 'json') {
            const response = {
                tool: result.tool,
                ...(result.params && { params: result.params })
            };
            return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify(response) 
            };
        }

        // AI needed - optimized call
        const payload = {
            contents: [{
                parts: [{ text: result.prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500, // LIMIT OUTPUT for speed
                topP: 0.8,
                topK: 40
            }
        };
        
        const modelName = "gemini-2.0-flash-exp"; // Fastest model
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

        // Set timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s max

        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('API Error:', errorBody); 
            throw new Error(`API Error: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error("AI nevrátila text");
        }
        
        // Clean response
        const cleanResponse = responseText
            .replace(/```json\n?|```\n?/g, "")
            .replace(/^#.*$/gm, "") // Remove markdown headers
            .trim();
        
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ response: cleanResponse }) 
        };

    } catch (error) {
        console.error('Chat error:', error);
        
        // Timeout error
        if (error.name === 'AbortError') {
            return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify({ 
                    response: 'Omlouvám se, zpracování trvá déle. Zkuste to prosím znovu nebo se spojte s naším specialistou na 📞 800 123 456.'
                }) 
            };
        }
        
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                error: `Chyba AI. Zkuste znovu nebo volejte 800 123 456.`
            }) 
        };
    }
};

module.exports = { handler };