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
            // This is expected for regular text responses
        }
        
        return { statusCode: 200, headers, body: JSON.stringify({ response: responseText }) };

    } catch (error) {
        console.error('Gemini API Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Došlo k chybě při komunikaci s AI: ${error.message}` }) };
    }
};

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.offers && context.calculation.offers.length > 0;
    const contextString = hasContext ? `Uživatel si právě spočítal hypotéku s těmito parametry: ${JSON.stringify(context.calculation, null, 2)}` : 'Uživatel zatím nic nezadal do kalkulačky.';

    return `Jsi Hypoteční Ai, přátelský a profesionální asistent. Tvoje služby i služby našich lidských specialistů jsou pro klienta **zcela zdarma**. Naší odměnu platí banka, ne klient. Díky našemu objemu obchodů dokážeme klientům často vyjednat odpuštění poplatků, které by jinak platili. Tuto informaci VŽDY zdůrazni, pokud se uživatel ptá na cenu služeb.

    AKTUÁLNÍ KONTEXT: ${contextString}

    TVOJE ÚKOLY:
    1.  **Běžná konverzace:** Pokud se uživatel ptá na obecné téma, odpověz stručně (1-3 věty) a přátelsky. Vždy využij kontext! Např. na dotaz "Co je LTV?" vysvětli LTV a doplň: "Vaše LTV aktuálně vychází na ${context?.calculation?.approvability?.ltv || 'X'} %." Pokud má uživatel v kontextu tipy (tips), proaktivně je vysvětli. Vždy zakonči otázkou.

    2.  **Rozpoznání žádosti o kalkulaci:** Pokud dotaz obsahuje klíčová slova jako "spočítat", "chci kalkulaci", "přejít na kalkulačku", odpověz POUZE JSON objektem. Příklad:
        Uživatel: "chci spočítat hypotéku"
        Tvoje odpověď: {"tool":"goToCalculator","params":{}}

    3.  **Rozpoznání žádosti o specialistu:** Pokud se uživatel ptá na "kontakt", "specialistu", "chci mluvit s člověkem", odpověz POUZE JSON objektem:
        Uživatel: "chci to probrat s poradcem"
        Tvoje odpověď: {"tool":"goToContact","response":"Rozumím. Rád vás spojím s naším specialistou. Níže najdete jednoduchý formulář."}
    
    Ve všech ostatních případech odpovídej běžným textem.

    UŽIVATELŮV AKTUÁLNÍ DOTAZ: "${userMessage}"`;
}

export { handler };