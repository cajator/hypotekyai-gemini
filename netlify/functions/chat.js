// netlify/functions/chat.js - v15.0 - Final Build
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Konfigurace AI na serveru chybí. API klíč nebyl nalezen.');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(createSystemPrompt(message, context));
        
        const response = result.response;
        if (!response.candidates || response.candidates.length === 0 || !response.text) {
             const blockReason = response.promptFeedback?.blockReason;
             if (blockReason) throw new Error(`Požadavek byl zablokován z důvodu: ${blockReason}. Zkuste přeformulovat dotaz.`);
             throw new Error("AI nevrátila žádnou platnou odpověď.");
        }
        let responseText = response.text().trim();
        
        try {
            const jsonResponse = JSON.parse(responseText);
            if (jsonResponse.tool) {
                 return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
            }
        } catch (e) {
            // It's a regular text response, which is fine
        }
        
        return { statusCode: 200, headers, body: JSON.stringify({ response: responseText }) };

    } catch (error) {
        console.error('Gemini API Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Došlo k chybě při komunikaci s AI: ${error.message}` }) };
    }
};

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.offers && context.calculation.offers.length > 0;
    const contextString = hasContext ? `Uživatel má v panelu namodelovanou hypotéku s těmito výsledky: ${JSON.stringify(context.calculation, null, 2)}` : 'Uživatel zatím nic nepočítal.';

    return `Jsi Hypoteční Ai, přátelský a profesionální asistent. Tvoje služby i služby našich lidských specialistů jsou pro klienta **zcela zdarma**. Naší odměnu platí banka. Díky našemu objemu obchodů dokážeme klientům často vyjednat odpuštění poplatků. Tuto informaci VŽDY zdůrazni, pokud se uživatel ptá na cenu služeb.

    AKTUÁLNÍ KONTEXT: ${contextString}

    TVOJE ÚKOLY:
    1.  **Běžná konverzace:** Odpověz stručně (1-3 věty) a přátelsky. Vždy využij kontext! Pokud má uživatel v kontextu tipy (tips), proaktivně je vysvětli. Vždy zakonči otázkou.

    2.  **Rozpoznání modelování:** Pokud dotaz obsahuje parametry hypotéky (např. "splátka na 5 milionů na 20 let"), odpověz POUZE JSON objektem. Odhadni hodnotu nemovitosti jako 125 % výše úvěru. Příklad:
        Uživatel: "ukaž mi splátku na 5.5 milionu na 30 let"
        Tvoje odpověď: {"tool":"modelScenario","params":{"loanAmount":5500000,"propertyValue":6875000,"loanTerm":30}}

    3.  **Rozpoznání žádosti o specialistu:** Pokud se uživatel ptá na "kontakt", "specialistu", "chci mluvit s člověkem", spusť konverzační formulář. Odpověz POUZE JSON objektem:
        Uživatel: "chci to probrat s poradcem"
        Tvoje odpověď: {"tool":"startContactForm","response":"Rozumím. Rád vás spojím s naším specialistou. Jaké je vaše celé jméno?"}
    
    Ve všech ostatních případech odpovídej běžným textem.

    UŽIVATELŮV AKTUÁLNÍ DOTAZ: "${userMessage}"`;
}

export { handler };