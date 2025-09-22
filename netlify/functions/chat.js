// netlify/functions/chat.js - v14.0 - Final Build
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler = async (event) => {
    // Standard CORS headers
    const headers = { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS' 
    };

    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    // Ensure the request is a POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { message, context } = JSON.parse(event.body);
        
        // --- CRITICAL: API Key Check ---
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('CRITICAL ERROR: GEMINI_API_KEY environment variable is not set.');
            return { 
                statusCode: 500, 
                headers, 
                body: JSON.stringify({ error: 'Konfigurace AI na serveru chybí. API klíč nebyl nalezen. Kontaktujte prosím správce webu.' }) 
            };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = createSystemPrompt(context);
        const fullPrompt = `${systemPrompt}\n\nUŽIVATELŮV DOTAZ: "${message}"`;
        
        const result = await model.generateContent(fullPrompt);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ response: result.response.text() }),
        };

    } catch (error) {
        console.error('Gemini API Error:', error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: `Došlo k chybě při komunikaci s AI: ${error.message}` }) 
        };
    }
};

function createSystemPrompt(context) {
    const hasContext = context && context.calculation && (context.calculation.loanAmount > 0 || (context.formData && context.formData.propertyValue > 0));
    
    return `Jsi přátelský a profesionální hypoteční poradce jménem Hypoteky Ai. Tvůj cíl je pomoci uživateli s hypotékou. Vždy jednej, jako bys měl přístup k interním metodikám bank, ale nikdy nezmiňuj jména konkrétních bank. Používej Markdown pro formátování (odrážky, tučný text).

    KLÍČOVÉ POKYNY PRO ODPOVĚĎ:
    1.  **BUĎ EXTRÉMNĚ STRUČNÝ:** Odpovídej maximálně ve 2-3 krátkých větách. Uživatelé chtějí rychlé a jasné odpovědi.
    2.  **POUŽIJ KONTEXT:** Pokud máš data z kalkulačky, VŽDY je použij. Neodpovídej obecně, pokud můžeš být konkrétní.
        * ŠPATNĚ: "LTV je poměr úvěru k hodnotě nemovitosti."
        * SPRÁVNĚ: "LTV je poměr úvěru k hodnotě nemovitosti. **Vaše LTV teď vychází na 85 %**, což je pro banky stále v pořádku."
    3.  **POKLÁDEJ OTÁZKY:** Každou odpověď zakonči otázkou, abys udržel konverzaci. Např. "Pomohlo vám to takto?", "Chcete se podívat na něco dalšího?"
    4.  **CÍL JE LEAD:** Vždy směřuj konverzaci k tomu, že finální a nejlepší nabídku zajistí až lidský kolega-specialista. Podporuj uživatele v dokončení kalkulačky.

    AKTUÁLNÍ KONTEXT Z KALKULAČKY:
    ${hasContext ? JSON.stringify(context.formData, null, 2) : 'Uživatel zatím nic nezadal do kalkulačky.'}

    Odpověz na dotaz uživatele.`;
}

export { handler };

