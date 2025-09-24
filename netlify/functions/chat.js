// netlify/functions/chat.js - v28.0 - Final Polish & Robust AI Logic
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('API klíč pro AI nebyl nalezen.');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(createSystemPrompt(message, context));
        
        const response = result.response;
        const responseText = response.text();

        if (!response.candidates || !responseText) {
             return { statusCode: 200, headers, body: JSON.stringify({ response: "Omlouvám se, momentálně nemohu odpovědět. Zkuste to prosím později." }) };
        }
        
        // Robust JSON parsing
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { /* Not a valid JSON, fall through to text response */ }
        }
        
        // If no valid JSON tool is found, return the plain text response
        return { statusCode: 200, headers, body: JSON.stringify({ response: responseText.replace(/```json|```/g, "").trim() }) };

    } catch (error) {
        console.error('Gemini API Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Došlo k chybě: ${error.message}` }) };
    }
};

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.offers && context.calculation.offers.length > 0;
    const contextString = hasContext ? `Uživatel MÁ namodelovanou hypotéku. Jeho data: ${JSON.stringify(context.calculation, null, 2)}` : 'Uživatel zatím nic nepočítal.';

    let prompt = `Jsi Hypoteční Ai, přátelský, stručný a profesionální asistent.
    
    PRAVIDLA:
    - TVOJE ODPOVĚDI JSOU VŽDY EXTRÉMNĚ STRUČNÉ (MAX 1-2 VĚTY).
    - Vždy dodržuj požadovaný formát odpovědi (JSON nebo text).
    - Pokud je dotaz nesmyslný nebo mimo téma hypoték, odpověz jednou z těchto frází: "Tomuto dotazu bohužel nerozumím. Zkuste to prosím jinak." nebo "Specializuji se pouze na hypotéky. Rád vám pomohu s financováním bydlení."
    
    AKTUÁLNÍ KONTEXT: ${contextString}
    UŽIVATELŮV DOTAZ: "${userMessage}"`;

    if (userMessage === "Proveď úvodní analýzu mé situace.") {
        return `Uživatel si zobrazil výsledky a chce úvodní analýzu. Vytvoř **velmi stručné** shrnutí na **MAXIMÁLNĚ dvě věty**.
        Příklad: "Vaše celkové skóre je velmi dobré. Našli jsme pro vás nabídku s výbornou sazbou a měsíční splátkou 21 535 Kč."
        Odpověz POUZE JSON objektem: {"tool":"initialAnalysis","response":"Tvůj vygenerovaný text."}`;
    }

    prompt += `
        TVOJE ÚKOLY:
        1.  **Běžná konverzace:** Pokud uživatel nemá data, povzbuď ho, ať si hypotéku namodeluje v panelu vpravo. Příklad: "Jistě. Nejprve prosím zadejte základní parametry do panelu vpravo."
        2.  **Rozpoznání modelování:** Pokud dotaz obsahuje parametry hypotéky (např. "splátka na 5 mega na 20 let"), odpověz POUZE JSON pro přepočet. Příklad: {"tool":"modelScenario","params":{"loanAmount":5000000,"propertyValue":6250000,"loanTerm":20}}
        3.  **Rozpoznání žádosti o specialistu:** Pokud se uživatel ptá na "kontakt", "specialistu", odpověz POUZE JSON: {"tool":"startContactForm","response":"Rád vás spojím s naším specialistou. Můžete mi prosím napsat vaše celé jméno a telefonní číslo? <br><br> (Nebo můžete využít [standardní formulář](#kontakt).)"}
        
        Ve všech ostatních případech odpovídej běžným textem dle pravidel výše.`;
    
    return prompt;
}

export { handler };

