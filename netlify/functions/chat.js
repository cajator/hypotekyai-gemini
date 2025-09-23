// netlify/functions/chat.js - v16.0 - AI Integration Build
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
        const responseText = response.text();

        if (!response.candidates || response.candidates.length === 0 || !responseText) {
             const blockReason = response.promptFeedback?.blockReason;
             if (blockReason) throw new Error(`Požadavek byl zablokován z důvodu: ${blockReason}. Zkuste přeformulovat dotaz.`);
             throw new Error("AI nevrátila žádnou platnou odpověď.");
        }
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) {
                // Not a valid JSON tool call, continue to send as plain text
            }
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

    let prompt = `Jsi Hypoteční Ai, přátelský a profesionální asistent. Tvoje služby i služby našich lidských specialistů jsou pro klienta **zcela zdarma**. Naší odměnu platí banka, ne klient. 
    
    AKTUÁLNÍ KONTEXT: ${contextString}
    UŽIVATELŮV AKTUÁLNÍ DOTAZ: "${userMessage}"`;

    if (userMessage === "Proveď úvodní analýzu mé situace.") {
        return `Uživatel si právě zobrazil výsledky své hypotéky a chce od tebe úvodní analýzu. Vytvoř shrnutí jeho situace.
        - Začni s titulkem "**Analýza vaší situace**".
        - Zhodnoť jeho celkové skóre ("approvability.total") a co znamená.
        - Okometuj nejlepší nabídku ("selectedOffer"), zejména měsíční splátku a sazbu.
        - Pokud existuje chytrý tip ("smartTip"), vysvětli ho.
        - Pokud existují další tipy ("tips"), stručně je shrň.
        - Buď pozitivní, ale věcný. Vše naformuluj do souvislého textu o 2-4 odstavcích.
        - Odpověz POUZE JSON objektem ve formátu: {"tool":"initialAnalysis","response":"Tvůj vygenerovaný text v HTML/markdown formátu."}`;
    }

    prompt += `
        TVOJE ÚKOLY:
        1.  **Běžná konverzace:** Pokud se uživatel ptá na obecné téma, odpověz stručně (1-3 věty) a přátelsky. Vždy využij kontext! 
        2.  **Rozpoznání modelování:** Pokud dotaz obsahuje parametry hypotéky (např. "splátka na 5 milionů na 20 let"), odpověz POUZE JSON objektem. Odhadni hodnotu nemovitosti jako 125 % výše úvěru. Příklad: {"tool":"modelScenario","params":{"loanAmount":5500000,"propertyValue":6875000,"loanTerm":30}}
        3.  **Rozpoznání žádosti o specialistu:** Pokud se uživatel ptá na "kontakt", "specialistu", spusť konverzační formulář. Odpověz POUZE JSON objektem: {"tool":"startContactForm","response":"Ráda vás spojím s naším specialistou. Naše služby jsou pro vás zcela zdarma. Můžete mi prosím napsat vaše celé jméno a telefonní číslo? <br><br> (Nebo můžete využít <a href='#kontakt' data-action='show-lead-form' class='font-bold text-blue-600 underline'>standardní formulář</a>.)"}
        
        Ve všech ostatních případech odpovídej běžným textem.`;
    
    return prompt;
}

export { handler };

