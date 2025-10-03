// netlify/functions/chat.js - Optimalizovaná verze v2.0
// Zkrácený prompt pro rychlejší odpovědi

function createSystemPrompt(userMessage, context) {
    const hasCalculation = context?.hasCalculation || false;
    const calc = context?.calculation;
    const messageCount = context?.messageCount || 0;
    
    // Základní prompt - mnohem kratší než původní
    let prompt = `Jsi hypoteční stratég s AI nástroji. ${messageCount === 0 ? 'Představ se stručně.' : 'Pokračuj v konverzaci bez pozdravu.'}

🎯 TVOJE ROLE:
- Dávej KONKRÉTNÍ čísla v Kč (ne "může", ale "ušetříte 127 000 Kč")
- Ukazuj SCÉNÁŘE "co kdyby" s přesnými dopady
- Srovnávej alternativy (A vs. B s čísly)
- Navrhuj AKČNÍ kroky s termíny

`;

    // Přidat kontext pouze pokud existuje výpočet
    if (hasCalculation && calc) {
        prompt += `📊 KLIENTOVA SITUACE:
- Hypotéka: ${calc.loanAmount?.toLocaleString('cs-CZ')} Kč
- Splátka: ${calc.monthlyPayment?.toLocaleString('cs-CZ')} Kč (${calc.rate}% p.a.)
- DSTI: ${calc.dsti}%

`;
    }

    prompt += `DOTAZ: "${userMessage}"

`;

    // Specializované scénáře - jen ty nejdůležitější
    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit|telefon|schůzka|zavolat|domluvit/)) {
        return prompt + `\nOdpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Připojím vás k našemu týmu specialistů. Otevírám formulář..."}`;
    }

    if (userMessage.toLowerCase().match(/bank|které banky|seznam bank|partneri/)) {
        return prompt + `\nVyjmenuj stručně 15-20 bank se kterými spolupracujeme. Uveď hlavní kategorie.`;
    }

    // Když obsahuje čísla, může jít o modelování
    if (userMessage.match(/\d+/)) {
        const text = userMessage.toLowerCase();
        if (text.match(/příjem|vydělávám|plat|tisíc|kolik.*půjčit/)) {
            return prompt + `\nKlient se ptá na kalkulaci. Odpověz stručně s orientačními čísly a doporuč použít kalkulačku pro přesný výpočet.`;
        }
    }

    // Default instrukce
    prompt += `
INSTRUKCE:
1. Max 200 slov
2. KONKRÉTNÍ čísla
3. Používej <strong> pro důležité, ne emoji
4. Když nevíš přesně, doporuč kalkulačku nebo specialistu
5. ${hasCalculation ? 'Odkazuj na jejich výpočet' : 'Nabídni kalkulačku'}

Odpovídej jako premium stratég s konkrétními čísly.`;

    return prompt;
}

const handler = async (event) => {
    const headers = { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('Chybí GEMINI_API_KEY v environment variables.');
        }

        const prompt = createSystemPrompt(message, context);

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024, // Omezit délku odpovědi pro rychlost
            }
        };
        
        const modelName = "gemini-2.0-flash-exp"; // Rychlejší model
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('API Error:', errorBody); 
            throw new Error(`API Error: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error("AI nevrátila žádný text.");
        }
        
        // Zkusit parsovat JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { 
                // Pokračujeme s text odpovědí
            }
        }
        
        const cleanResponse = responseText.replace(/```json\n?|```\n?/g, "").trim();
        
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ response: cleanResponse }) 
        };

    } catch (error) {
        console.error('Chat Error:', error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                error: 'Došlo k chybě při komunikaci s AI. Zkuste to prosím znovu.'
            }) 
        };
    }
};

module.exports = { handler };