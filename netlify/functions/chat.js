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
        
        // --- Robustní zpracování odpovědi ---
        const response = result.response;
        if (!response.candidates || response.candidates.length === 0 || !response.text) {
             const blockReason = response.promptFeedback?.blockReason;
             if (blockReason) {
                 throw new Error(`Požadavek byl zablokován z důvodu: ${blockReason}. Zkuste prosím přeformulovat dotaz.`);
             }
             throw new Error("AI nevrátila žádnou platnou odpověď.");
        }

        let responseText = response.text();
        
        // Ochrana proti formátování JSONu do markdown bloku
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            responseText = jsonMatch[1];
        }

        try {
            // Pokus o parsování jako JSON (volání nástroje)
            const jsonResponse = JSON.parse(responseText);
            return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
        } catch (e) {
            // Pokud selže, je to běžná textová odpověď
            return { statusCode: 200, headers, body: JSON.stringify({ response: responseText }) };
        }

    } catch (error) {
        console.error('Gemini API Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Došlo k chybě při komunikaci s AI: ${error.message}` }) };
    }
};

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.loanAmount > 0;
    const contextString = hasContext ? JSON.stringify(context.formData, null, 2) : 'Uživatel zatím nic nezadal do kalkulačky.';

    return `Jsi přátelský a profesionální hypoteční AI asistent.

    AKTUÁLNÍ KONTEXT Z KALKULAČKY (použij ho pro co nejrelevantnější odpovědi):
    ${contextString}

    Máš k dispozici dva nástroje:
    1.  \`calculateMortgage\`: Použij, když uživatel chce výpočet splátky. Aktivně se ptej na chybějící parametry. Jakmile máš dostatek informací, odpověz POUZE JSON objektem ve formátu:
        \`\`\`json
        {
          "tool": "calculateMortgage",
          "params": { "propertyValue": 5000000, "ownResources": 1000000, "loanTerm": 25 }
        }
        \`\`\`
        Příklad: "kolik bude splátka na 3 miliony na 25 let?" -> \`{"tool": "calculateMortgage", "params": {"propertyValue": 3750000, "ownResources": 750000, "loanTerm": 25}}\`

    2.  \`redirectToContact\`: Použij, když uživatel souhlasí s konzultací. Odpověz POUZE JSON objektem ve formátu:
        \`\`\`json
        {
          "tool": "redirectToContact",
          "response": "Výborně! Níže můžete vyplnit své kontaktní údaje a kolega specialista se vám brzy ozve."
        }
        \`\`\`

    PRAVIDLA:
    - Pokud nevoláš nástroj, odpověz stručně (1-3 věty). Vždy využij kontext, pokud je k dispozici!
    - Vždy zakonči odpověď otázkou.
    - NIKDY neodpovídej JSONem a textem zároveň. Buď jedno, nebo druhé.

    UŽIVATELŮV DOTAZ: "${userMessage}"`;
}

export { handler };