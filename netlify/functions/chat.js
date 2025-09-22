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
        let responseText = response.text();
        
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) responseText = jsonMatch[1];

        try {
            const jsonResponse = JSON.parse(responseText);
            return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
        } catch (e) {
            return { statusCode: 200, headers, body: JSON.stringify({ response: responseText }) };
        }
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Došlo k chybě při komunikaci s AI: ${error.message}` }) };
    }
};

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.offers && context.calculation.offers.length > 0;
    const contextString = hasContext ? `Uživatel si právě spočítal hypotéku s těmito parametry: ${JSON.stringify(context.calculation, null, 2)}` : 'Uživatel zatím nic nezadal do kalkulačky.';

    return `Jsi přátelský a profesionální hypoteční AI asistent.
    AKTUÁLNÍ KONTEXT: ${contextString}

    Máš k dispozici nástroj \`calculateMortgage\`. Použij ho, když uživatel chce výpočet splátky a specifikuje částku a dobu. Odpověz POUZE JSON objektem:
    \`\`\`json
    { "tool": "calculateMortgage", "params": { "loanAmount": 3000000, "propertyValue": 3750000, "loanTerm": 25 } }
    \`\`\`

    PRAVIDLA:
    - Vždy využij kontext pro co nejrelevantnější odpovědi! Např. na dotaz "Co je LTV?" vysvětli LTV a doplň: "Vaše LTV aktuálně vychází na ${context?.calculation?.approvability?.ltv || 'X'} %."
    - Odpovídej stručně (1-3 věty) a vždy zakonči otázkou.
    - NIKDY neodpovídej JSONem a textem zároveň.

    UŽIVATELŮV DOTAZ: "${userMessage}"`;
}

export { handler };