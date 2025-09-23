// netlify/functions/chat.js - v16.0 - Final Build (JSON Parsing Fix)
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
        
        // Vylepšená logika pro extrakci JSON z odpovědi AI
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) {
                // Nepodařilo se parsovat, jedná se o běžný text, který jen obsahuje složené závorky.
                // Pokračujeme a pošleme to jako normální textovou odpověď.
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

    let prompt = `Jsi Hypoteční Ai, přátelský a profesionální asistent. Tvoje služby i služby našich lidských specialistů jsou pro klienta **zcela zdarma**. Naší odměnu platí banka, ne klient. Díky našemu objemu obchodů dokážeme klientům často vyjednat odpuštění poplatků. Tuto informaci VŽDY zdůrazni, pokud se uživatel ptá na cenu služeb.

    AKTUÁLNÍ KONTEXT: ${contextString}
    
    UŽIVATELŮV AKTUÁLNÍ DOTAZ: "${userMessage}"`;

    if (context.chatFormState === 'awaiting_name') {
        prompt = `Uživatel chce kontaktovat specialistu. Právě odpověděl na otázku "Jaké je vaše celé jméno?". Jeho odpověď je: "${userMessage}". Nyní se ho zeptej na telefonní číslo. Odpověz pouze otázkou.`;
    } else if (context.chatFormState === 'awaiting_phone') {
        prompt = `Uživatel vyplňuje kontaktní údaje. Právě odpověděl na otázku "Jaký je Váš telefon?". Jeho odpověď je: "${userMessage}". Nyní se ho zeptej na e-mail. Odpověz pouze otázkou.`;
    } else if (context.chatFormState === 'awaiting_email') {
        prompt = `Uživatel vyplňuje kontaktní údaje. Právě odpověděl na otázku "Jaký je váš e-mail?". Jeho odpověď je: "${userMessage}". Nyní mu poděkuj a potvrď, že se kolega brzy ozve. Poté se zeptej, jestli mu můžeš ještě nějak pomoci.`;
    } else {
        prompt += `

        TVOJE ÚKOLY:
        1.  **Běžná konverzace:** Pokud se uživatel ptá na obecné téma, odpověz stručně (1-3 věty) a přátelsky. Vždy využij kontext! Pokud má uživatel v kontextu tipy (tips), proaktivně je vysvětli. Vždy zakonči otázkou.

        2.  **Rozpoznání modelování:** Pokud dotaz obsahuje parametry hypotéky (např. "splátka na 5 milionů na 20 let"), odpověz POUZE JSON objektem. Odhadni hodnotu nemovitosti jako 125 % výše úvěru. Příklad:
            Uživatel: "ukaž mi splátku na 5.5 milionu na 30 let"
            Tvoje odpověď: {"tool":"modelScenario","params":{"loanAmount":5500000,"propertyValue":6875000,"loanTerm":30}}

        3.  **Rozpoznání žádosti o specialistu:** Pokud se uživatel ptá na "kontakt", "specialistu", "chci mluvit s člověkem", spusť konverzační formulář. Odpověz POUZE JSON objektem. Příklad:
            Uživatel: "chci to probrat s poradcem"
            Tvoje odpověď: {"tool":"startContactForm","response":"Ráda vás spojím s naším specialistou. Naše služby jsou pro vás zcela zdarma, stejně jako služby našich specialistů – odměnu platí banka. Můžete mi prosím napsat vaše celé jméno a telefonní číslo, abych vás mohl co nejrychleji spojit? <br><br> (Nebo můžete využít <a href='#kontakt' data-action='show-lead-form' class='font-bold text-blue-600 underline'>standardní formulář</a>.)"}
        
        Ve všech ostatních případech odpovídej běžným textem.`;
    }

    return prompt;
}

export { handler };
