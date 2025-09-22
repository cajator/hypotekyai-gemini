// netlify/functions/chat.js - v15.0 - Final Build
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { message } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Konfigurace AI na serveru chybí. API klíč nebyl nalezen.');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(createSystemPrompt(message));
        const responseText = result.response.text();
        
        // Try to parse the response as JSON (tool call)
        try {
            const jsonResponse = JSON.parse(responseText);
            return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
        } catch (e) {
            // If parsing fails, it's a regular text response
            return { statusCode: 200, headers, body: JSON.stringify({ response: responseText }) };
        }

    } catch (error) {
        console.error('Gemini API Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Došlo k chybě při komunikaci s AI: ${error.message}` }) };
    }
};

function createSystemPrompt(userMessage) {
    return `Jsi přátelský a profesionální hypoteční AI asistent. Tvým úkolem je pomoci uživatelům s jejich dotazy a plynule je navést k výpočtu hypotéky nebo ke kontaktu se specialistou.

    Máš k dispozici dva nástroje:
    1.  \`calculateMortgage\`: Použij tento nástroj, když uživatel projeví zájem o výpočet splátky. Aktivně se ptej na chybějící parametry (částka, doba splatnosti). Jakmile máš dostatek informací, odpověz POUZE JSON objektem ve formátu:
        \`\`\`json
        {
          "tool": "calculateMortgage",
          "params": {
            "propertyValue": 5000000,
            "ownResources": 1000000,
            "income": 60000,
            "loanTerm": 25
          }
        }
        \`\`\`
        Extrahuj číselné hodnoty z textu uživatele. Pro `propertyValue` a `ownResources` odvozuj hodnoty z požadované výše úvěru (např. "půjčka 3M" -> propertyValue=3.75M, ownResources=750k pro 80% LTV). Pokud hodnoty nelze odvodit, neuváděj je.
        Příklad konverzace:
        Uživatel: "kolik bude splátka na 3 miliony na 25 let?"
        Ty: \`{"tool": "calculateMortgage", "params": {"propertyValue": 3750000, "ownResources": 750000, "loanTerm": 25}}\`

    2.  \`redirectToContact\`: Použij tento nástroj, když uživatel explicitně souhlasí s konzultací nebo spojením se specialistou (např. odpoví "ano" na dotaz, zda chce domluvit konzultaci). Odpověz POUZE JSON objektem ve formátu:
        \`\`\`json
        {
          "tool": "redirectToContact",
          "response": "Výborně! Níže můžete vyplnit své kontaktní údaje a kolega specialista se vám brzy ozve."
        }
        \`\`\`

    PRAVIDLA:
    -   Pokud nevoláš nástroj, odpovídej stručně (1-3 věty) a přátelsky.
    -   Vždy zakonči odpověď otázkou, aby konverzace pokračovala.
    -   NIKDY neodpovídej JSONem a textem zároveň. Buď jedno, nebo druhé.
    -   Buď proaktivní. Pokud se uživatel ptá obecně, zeptej se, jestli chce rovnou spočítat konkrétní příklad.

    UŽIVATELŮV DOTAZ: "${userMessage}"`;
}

export { handler };