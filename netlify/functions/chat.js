// netlify/functions/chat.js - v20.0 - Final Polish & Robust Parsing
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
        
        // Try to find a JSON object within the response text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    // It's a pure tool call, return it directly
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) {
                // Not a valid JSON, or not a tool call. Fall through to send as plain text.
            }
        }
        
        // If no valid tool call was found, send the whole response as text.
        return { statusCode: 200, headers, body: JSON.stringify({ response: responseText }) };

    } catch (error) {
        console.error('Gemini API Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Došlo k chybě při komunikaci s AI: ${error.message}` }) };
    }
};

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.offers && context.calculation.offers.length > 0;
    const contextString = hasContext ? `Uživatel MÁ namodelovanou hypotéku. Jeho data: ${JSON.stringify(context.calculation, null, 2)}` : 'Uživatel zatím nic nepočítal a nemá žádná data.';

    let prompt = `Jsi Hypoteční Ai, přátelský a profesionální asistent. Tvoje odpovědi jsou **stručné, jasné a věcné**. 
    
    AKTUÁLNÍ KONTEXT: ${contextString}
    UŽIVATELŮV DOTAZ: "${userMessage}"`;

    if (userMessage === "Proveď úvodní analýzu mé situace.") {
        return `Uživatel si zobrazil výsledky hypotéky a chce úvodní analýzu do panelu. Vytvoř krátké shrnutí.
        - Titulek: **Analýza vaší situace**
        - Zhodnoť celkové skóre ("approvability.total") jednou větou.
        - Okometuj nejlepší nabídku ("selectedOffer") jednou větou.
        - Pokud existuje chytrý tip ("smartTip"), stručně ho vysvětli.
        - Odpověz POUZE JSON objektem: {"tool":"initialAnalysis","response":"Tvůj vygenerovaný text."}`;
    }

    if (userMessage === "přepočítej hypotéku") {
        return `Uživatel změnil parametry v mini-kalkulačce a chce tichý přepočet. Odpověz POUZE JSON: {"tool":"modelScenario"}`;
    }

    prompt += `
        TVOJE ÚKOLY:
        1.  **Běžná konverzace:** Pokud se uživatel ptá na obecné téma, odpověz stručně (1-2 věty). Pokud nemá data, povzbuď ho, ať si hypotéku namodeluje v panelu vpravo.
        2.  **Rozpoznání modelování:** Pokud dotaz obsahuje parametry hypotéky (např. "splátka na 5 mega na 20 let"), ale UŽIVATEL NEMÁ ŽÁDNÁ DATA, odpověz textem: "Ráda vám s výpočtem pomohu! Nejprve ale potřebovala bych znát některé podrobnosti, například výši úvěru, délku splatnosti a případně úrokovou sazbu.". Pokud UŽIVATEL MÁ DATA, odpověz POUZE JSON objektem pro přepočet. Příklad: {"tool":"modelScenario","params":{"loanAmount":5000000,"propertyValue":6250000,"loanTerm":20}}
        3.  **Rozpoznání žádosti o specialistu:** Pokud se uživatel ptá na "kontakt", "specialistu", odpověz POUZE JSON: {"tool":"startContactForm","response":"Ráda vás spojím s naším specialistou. Naše služby jsou pro vás zcela zdarma. Můžete mi prosím napsat vaše celé jméno a telefonní číslo? <br><br> (Nebo můžete využít <a href='#kontakt' data-action='show-lead-form' class='font-bold text-blue-600 underline'>standardní formulář</a>.)"}
        
        Ve všech ostatních případech odpovídej běžným textem.`;
    
    return prompt;
}

export { handler };

