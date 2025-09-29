// netlify/functions/chat.js - v6.2 - FIXED MODEL NAME
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler = async (event) => {
    const headers = { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json; charset=utf-8'
    };
    
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        
        console.log('Chat request:', { message: message.substring(0, 50), hasContext: !!context });
        
        if (!apiKey) {
            console.error('GEMINI_API_KEY not found');
            throw new Error('API klíč pro AI nebyl nalezen.');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // OPRAVENO: Změna modelu z "gemini-1.5-flash" na "gemini-pro"
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = createSystemPrompt(message, context);
        const result = await model.generateContent(prompt);
        
        const response = result.response;
        const responseText = response.text();

        console.log('AI response received, length:', responseText.length);

        if (!responseText) {
            return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify({ 
                    response: "Omlouvám se, momentálně nemohu odpovědět. Zkuste to prosím později." 
                }) 
            };
        }
        
        // Check for tool calls
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    console.log('Tool call detected:', jsonResponse.tool);
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { 
                // Not a valid JSON tool call, continue with text response
            }
        }
        
        // Return plain text response
        const cleanResponse = responseText.replace(/```json|```/g, "").trim();
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ response: cleanResponse }) 
        };

    } catch (error) {
        console.error('Gemini API Error:', error.message);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                error: `Došlo k chybě: ${error.message}`
            }) 
        };
    }
};

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
        monthlyPayment: context.calculation?.selectedOffer?.monthlyPayment,
        rate: context.calculation?.selectedOffer?.rate,
        totalScore: context.calculation?.approvability?.total,
        ltv: Math.round((context.formData?.loanAmount / context.formData?.propertyValue) * 100),
        ltvScore: context.calculation?.approvability?.ltv,
        dsti: context.calculation?.selectedOffer?.dsti,
        dstiScore: context.calculation?.approvability?.dsti,
        bonita: context.calculation?.approvability?.bonita,
        isFromOurCalculator: isFromOurCalculator
    } : null;

    let prompt = `Jsi profesionální hypoteční poradce s 15 lety zkušeností. 
    Pracuješ pro platformu Hypoteky Ai, která analyzuje data z 19 partnerských bank.
    
    PRAVIDLA:
    - Poskytuj konkrétní čísla a příklady
    - Odpovědi musí být praktické a akční
    - Používej reálná data z českého trhu (sazby 4.09-5.29%)
    - Buď přátelský ale profesionální
    - Max 3-5 vět na odpověď
    - ${messageCount > 0 ? 'Nepozdravljuj znovu' : 'Pozdrav při prvním kontaktu'}
    
    ${hasContext ? `
    KLIENTOVA SITUACE:
    - Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
    - Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč
    - Úroková sazba: ${contextData.rate?.toFixed(2)}%
    - Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč
    - LTV: ${contextData.ltv}%
    - DSTI: ${contextData.dsti}%
    - Schválení: ${contextData.totalScore}%
    ` : 'Klient zatím nemá spočítanou hypotéku. Doporuč mu použít rychlou kalkulačku.'}
    
    UŽIVATELŮV DOTAZ: "${userMessage}"`;

    // Speciální handlery pro časté dotazy
    if (userMessage.toLowerCase().includes('bank')) {
        return prompt + `\n\nOdpověz s informacemi o bankách.`;
    }
    
    if (userMessage.toLowerCase().includes('kontakt') || userMessage.toLowerCase().includes('specialista')) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Spojím vás s naším TOP hypotečním specialistou. Zavolá vám do 24 hodin. Otevírám kontaktní formulář..."}`;
    }
    
    if (userMessage === "📊 Rychlá analýza" || userMessage === "Rychlá analýza") {
        if (!hasContext) {
            return prompt + `\n\nOdpověz: Nejprve si spočítejte hypotéku pomocí rychlé kalkulačky.`;
        }
        return prompt + `\n\nProveď rychlou analýzu situace klienta.`;
    }

    prompt += `\n\nOdpověz jako zkušený hypoteční expert, stručně a prakticky.`;

    return prompt;
}

export { handler };