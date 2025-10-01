// netlify/functions/chat.js
// Opravená verze s využitím stabilního názvu modelu

import { GoogleGenerativeAI } from "@google/generative-ai";

// Funkce pro vytvoření systémového promptu (zůstává stejná)
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

${hasContext ? `
📊 AKTUÁLNÍ SITUACE KLIENTA:
ZÁKLADNÍ DATA:
- Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
- Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč (${contextData.rate}% p.a.)
- Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč/měs
- LTV: ${contextData.ltv}% | DSTI: ${contextData.dsti}%
- Věk: ${contextData.age} let
SKÓRE BONITY:
- Celkové: ${contextData.totalScore}%
` : 'Klient zatím nemá spočítanou hypotéku. Nabídni rychlou kalkulačku.'}

DOTAZ UŽIVATELE: "${userMessage}"`;
    
    // ===== Routes for specific questions (simplified for brevity) =====
    if (userMessage.toLowerCase().match(/bank|které banky|seznam bank/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }

    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"Výborně! Náš specialista vám pomůže najít nejlepší řešení. Otevírám formulář..."}`;
    }
    
    if (userMessage.match(/\d+/) && userMessage.toLowerCase().match(/půjčit|příjem|let/)) {
        const numbers = userMessage.match(/\d+/g);
        const text = userMessage.toLowerCase();
        let params = {};
        if (text.includes('mil')) params.loanAmount = parseInt(numbers[0]) * 1000000;
        if (text.includes('tisíc')) params.income = parseInt(numbers[0]) * 1000;
        if (text.includes('let')) params.loanTerm = parseInt(numbers.find(n => n > 2 && n < 40));
        if (Object.keys(params).length > 0) {
             return prompt + `\n\nKlient modeluje scénář. Odpověz POUZE JSON: {"tool":"modelScenario","params":${JSON.stringify(params)}}`;
        }
    }

    prompt += `\n\n📋 INSTRUKCE PRO ODPOVĚĎ:
1. Odpovídej stručně, maximálně 3-4 věty.
2. Buď přátelský a nápomocný.
3. Pokud máš data od klienta, stručně na ně odkaž.
4. Vždy nabídni další krok (spojení se specialistou, spočítání v kalkulačce).
5. Používej <strong> pro důležité věci.`;

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

        // Initialize the SDK
        const genAI = new GoogleGenerativeAI(apiKey);
        // ZMĚNA ZDE: Použití stabilního názvu modelu
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = createSystemPrompt(message, context);
        
        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();

        if (!responseText) {
            return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify({ response: "Omlouvám se, na tento dotaz nemohu odpovědět. Zkuste to formulovat jinak." }) 
            };
        }
        
        // Check for JSON tool response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { 
                // Not a valid JSON, proceed with text response
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
            body: JSON.stringify({ error: `Došlo k chybě: ${error.message}` }) 
        };
    }
};

export { handler };

