// netlify/functions/chat.js - v6.1 - FULLY FIXED UTF-8
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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = createSystemPrompt(message, context);
        const result = await model.generateContent(prompt);
        
        const response = result.response;
        const responseText = response.text();

        console.log('AI response received, length:', responseText.length);

        if (!response.candidates || !responseText) {
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
        fixationDetails: context.calculation?.fixationDetails,
        marketInfo: context.calculation?.marketInfo,
        quickAnalysis: context.calculation?.fixationDetails?.quickAnalysis,
        detailedCalculation: context.calculation?.detailedCalculation,
        isFromOurCalculator: isFromOurCalculator
    } : null;

    let prompt = `Jsi profesionální hypoteční poradce s 15 lety zkušeností a AI analytické nástroje k dispozici. 
    Pracuješ pro platformu Hypoteky Ai, která analyzuje data z ${contextData?.marketInfo?.bankCount || 19} partnerských bank.
    
    KLÍČOVÉ PRINCIPY:
    - Vždy poskytuj KONKRÉTNÍ ČÍSLA a PŘÍKLADY z reálného trhu
    - Odpovědi musí být PRAKTICKÉ a AKČNÍ (co konkrétně má klient udělat)
    - Používej reálná data z českého trhu (aktuální sazby 4.09-5.29% podle bonity)
    - Buď přátelský ale profesionální
    - Max 3-5 vět na odpověď, ale bohatý obsah
    - ${messageCount > 0 ? 'NEPOZDRAV uživatele znovu, už jste v konverzaci' : 'Pozdrav uživatele pouze při prvním kontaktu'}
    
    ${hasContext ? `
    ${isFromOurCalculator ? 'DŮLEŽITÉ: Data jsou z NAŠÍ kalkulačky, ne od klienta! Negratuluj k sazbě, my jsme ji vypočítali!' : ''}
    
    AKTUÁLNÍ SITUACE KLIENTA:
    - Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
    - ${isFromOurCalculator ? 'Naše kalkulačka vypočítala' : 'Klient má'} splátku: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč
    - ${isFromOurCalculator ? 'Nabízená' : 'Aktuální'} úroková sazba: ${contextData.rate?.toFixed(2)}%
    - Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč
    - LTV: ${contextData.ltv}%
    - DSTI: ${contextData.dsti}% (jak velká část příjmu jde na splátku)
    - Zbývá po splátce: ${contextData.detailedCalculation?.remainingAfterPayment?.toLocaleString('cs-CZ')} Kč
    
    SKÓRE SCHVÁLENÍ:
    - Celkové skóre: ${contextData.totalScore}%
    - LTV skóre: ${contextData.ltvScore}% 
    - DSTI skóre: ${contextData.dstiScore}%
    - Bonita skóre: ${contextData.bonita}%
    ` : 'Klient zatím nemá spočítanou hypotéku. Doporuč mu použít rychlou kalkulačku.'}
    
    UŽIVATELŮV DOTAZ: "${userMessage}"`;

    // Special handlers for common queries
    
    // Seznam bank
    if (userMessage.toLowerCase().match(/bank|které banky|seznam bank|s kým spoluprac|partner/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }

    // Úvodní analýza
    if (userMessage === "Proveď úvodní analýzu mé situace." || userMessage === "Rychlá analýza" || userMessage === "📊 Rychlá analýza") {
        if (!hasContext) {
            return prompt + `\n\nOdpověz POUZE JSON: {"tool":"initialAnalysis","response":"Nejprve si spočítejte hypotéku pomocí rychlé kalkulačky. Stačí zadat částku úvěru, hodnotu nemovitosti a příjem. Analýza zabere 30 sekund."}`;
        }
        
        let analysis = `<strong>📊 Kompletní AI analýza ${isFromOurCalculator ? 'naší nabídky' : 'vaší hypotéky'}:</strong>\n\n`;
        
        if (isFromOurCalculator) {
            if (contextData.totalScore >= 85) {
                analysis += `✅ <strong>VÝBORNÁ NABÍDKA! Schválení téměř jisté (${contextData.totalScore}%)!</strong>\n`;
            } else if (contextData.totalScore >= 70) {
                analysis += `✅ <strong>Dobrá nabídka! Vysoká šance na schválení (${contextData.totalScore}%).</strong>\n`;
            } else if (contextData.totalScore >= 50) {
                analysis += `⚠️ <strong>Standardní nabídka. Šance na schválení ${contextData.totalScore}%.</strong>\n`;
            } else {
                analysis += `❌ <strong>Složitější případ. Šance ${contextData.totalScore}%. Doporučuji konzultaci.</strong>\n`;
            }
        }
        
        analysis += `\n<strong>💰 Vaše čísla:</strong>\n`;
        analysis += `• Měsíční splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč\n`;
        analysis += `• Úrok: ${contextData.rate}% (${contextData.marketInfo?.ratePosition === 'excellent' ? 'výborný' : contextData.marketInfo?.ratePosition === 'good' ? 'dobrý' : 'standardní'})\n`;
        analysis += `• DSTI: ${contextData.dsti}% (${contextData.dsti <= 25 ? 'výborné' : contextData.dsti <= 35 ? 'dobré' : contextData.dsti <= 45 ? 'hraniční' : 'vysoké'})\n`;
        analysis += `• Po splátce vám zbyde: ${contextData.detailedCalculation?.remainingAfterPayment?.toLocaleString('cs-CZ')} Kč\n`;
        
        return prompt + `\n\nVytvoř analýzu. Odpověz POUZE JSON: {"tool":"initialAnalysis","response":"${analysis}"}`;
    }

    // Kontakt/specialista
    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit|konzultace|telefon|schůzka/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Spojím vás s naším TOP hypotečním specialistou. Zavolá vám do 24 hodin a projedná všechny detaily včetně vyjednání nejlepších podmínek. Otevírám kontaktní formulář..."}`;
    }

    // Modelování scénářů s čísly
    if (userMessage.match(/\d+/)) {
        const numbers = userMessage.match(/\d+/g);
        const text = userMessage.toLowerCase();
        
        let params = {};
        
        // Parsování částek
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
        
        // Parse roky
        if (text.match(/let|rok/)) {
            const years = numbers.find(n => parseInt(n) >= 5 && parseInt(n) <= 30);
            if (years) params.loanTerm = parseInt(years);
        }
        
        if (Object.keys(params).length > 0) {
            return prompt + `\n\nKlient modeluje scénář. Odpověz POUZE JSON: {"tool":"modelScenario","params":${JSON.stringify(params)}}`;
        }
    }

    // Obecný prompt pro ostatní dotazy
    prompt += `\n\n
    INSTRUKCE PRO ODPOVĚĎ:
    1. ${messageCount > 0 ? 'NEPOZDRAV uživatele znovu' : 'Pozdrav pouze při prvním kontaktu'}
    2. ${isFromOurCalculator ? 'Data jsou z NAŠÍ kalkulačky - negratuluj, nabízej další kroky' : 'Pracuj s daty od klienta'}
    3. Vždy uveď konkrétní čísla, procenta nebo částky relevantní pro dotaz
    4. Dávej PRAKTICKÉ TIPY co může udělat hned teď
    5. Nabízej další kroky (spočítat detailně, probrat se specialistou)
    6. Max 3-5 vět, ale s vysokou informační hodnotou
    7. Používej emoji pro lepší přehlednost
    
    Odpověz jako zkušený hypoteční expert s AI nástroji, ne jako robot.`;

    return prompt;
}

export { handler };