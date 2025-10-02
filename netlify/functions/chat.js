// Diagnostický test pro ověření spojení s Google Gemini API

export const handler = async (event) => {
    const headers = { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: 'Chybí GEMINI_API_KEY v Netlify.' })
        };
    }

    // Technicky správná a jediná možná adresa pro Gemini modely s API klíčem
    const modelName = "gemini-pro"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: "Hello, world!" }]
        }]
    };

    try {
        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const responseBody = await apiResponse.text();

        if (!apiResponse.ok) {
            console.error('API Error Body:', responseBody); 
            throw new Error(`Chyba API: ${apiResponse.status} ${apiResponse.statusText}`);
        }
        
        // Pokud test projde, vrátí úspěšnou odpověď
        return { 
            statusCode: 200, 
            headers, 
            body: responseBody
        };

    } catch (error) {
        console.error('Chyba ve funkci chat.js:', error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: error.message })
        };
    }
};

