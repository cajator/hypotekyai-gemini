// netlify/functions/chat.js - v36.0 - Enhanced AI Logic with Flexible Responses
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('API klíč pro AI nebyl nalezen.');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(createSystemPrompt(message, context));
        
        const response = result.response;
        const responseText = response.text();

        if (!response.candidates || !responseText) {
             return { statusCode: 200, headers, body: JSON.stringify({ response: "Omlouvám se, momentálně nemohu odpovědět. Zkuste to prosím později." }) };
        }
        
        // Robust JSON parsing for tool calls
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { /* Not a valid JSON, fall through to text response */ }
        }
        
        // Return the plain text response
        return { statusCode: 200, headers, body: JSON.stringify({ response: responseText.replace(/```json|```/g, "").trim() }) };

    } catch (error) {
        console.error('Gemini API Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Došlo k chybě: ${error.message}` }) };
    }
};

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const contextData = hasContext ? {
        loanAmount: context.formData?.loanAmount,
        propertyValue: context.formData?.propertyValue,
        loanTerm: context.formData?.loanTerm,
        fixation: context.formData?.fixation,
        income: context.formData?.income,
        monthlyPayment: context.calculation?.selectedOffer?.monthlyPayment,
        rate: context.calculation?.selectedOffer?.rate,
        totalScore: context.calculation?.approvability?.total,
        ltv: context.calculation?.approvability?.ltv,
        dsti: context.calculation?.approvability?.dsti,
        bonita: context.calculation?.approvability?.bonita
    } : null;

    let prompt = `Jsi profesionální Hypoteční AI stratég. Jsi přátelský, empatický a odborný.
    
    ZÁKLADNÍ PRAVIDLA:
    - Odpovědi jsou STRUČNÉ ale UŽITEČNÉ (2-4 věty, maximálně 5 vět)
    - Vždy používej konkrétní čísla z kontextu, pokud jsou dostupná
    - Buď pozitivní a povzbuzující, ale realistický
    - Používej emoji pro přátelštější tón (👍 ✨ 💡 📊 🏡 💰)
    - Pokud dotaz nesouvisí s hypotékami, zdvořile přesměruj konverzaci zpět
    
    ${hasContext ? `
    AKTUÁLNÍ DATA KLIENTA:
    - Výše úvěru: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč
    - Hodnota nemovitosti: ${contextData.propertyValue?.toLocaleString('cs-CZ')} Kč
    - Splatnost: ${contextData.loanTerm} let, Fixace: ${contextData.fixation} let
    - Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč
    - Měsíční splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč
    - Úroková sazba: ${contextData.rate?.toFixed(2)}%
    - Celkové skóre: ${contextData.totalScore}%
    - LTV: ${contextData.ltv}%, DSTI: ${contextData.dsti}%, Bonita: ${contextData.bonita}%
    ` : 'Klient zatím nemá spočítanou hypotéku.'}
    
    UŽIVATELŮV DOTAZ: "${userMessage}"`;

    // Special case: Initial analysis
    if (userMessage === "Proveď úvodní analýzu mé situace.") {
        if (!hasContext) {
            return prompt + `\n\nOdpověz POUZE JSON: {"tool":"initialAnalysis","response":"Nejprve si prosím namodelujte hypotéku pomocí kalkulačky vpravo. 📊"}`;
        }
        const analysis = `📊 **Vaše hypoteční analýza:**\n\n` +
            `✅ Celkové skóre **${contextData.totalScore}%** ukazuje ${contextData.totalScore > 80 ? 'výbornou' : contextData.totalScore > 60 ? 'dobrou' : 'průměrnou'} šanci na schválení.\n` +
            `💰 Měsíční splátka **${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč** při sazbě **${contextData.rate?.toFixed(2)}%** je ${contextData.dsti < 35 ? 'velmi přijatelná' : contextData.dsti < 45 ? 'rozumná' : 'na hraně možností'}.\n` +
            `${contextData.ltv > 80 ? '⚠️ LTV je vyšší, zvažte navýšení vlastních zdrojů.' : '👍 LTV je v pořádku.'}\n` +
            `💡 **Tip:** ${contextData.loanTerm < 30 ? 'Prodloužení splatnosti by snížilo splátku.' : contextData.fixation < 7 ? 'Delší fixace zajistí stabilitu splátky.' : 'Parametry vypadají optimálně.'}`;
        return prompt + `\n\nVytvoř analýzu na 3-4 věty. Odpověz POUZE JSON: {"tool":"initialAnalysis","response":"${analysis}"}`;
    }

    // Detect contact/specialist request
    if (userMessage.toLowerCase().match(/kontakt|specialista|chci mluvit|poradit|konzultace|telefon/)) {
        return prompt + `\n\nKlient chce kontakt na specialistu. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Rád vás spojím s naším specialistou! Otevírám kontaktní formulář..."}`;
    }

    // Detect rate inquiries - be flexible and informative
    if (userMessage.toLowerCase().match(/sazba|sazbu|úrok|4[,.]09|nižší sazby|lepší úrok/)) {
        if (hasContext) {
            prompt += `\n\nKlient se ptá na sazby. BUĎ FLEXIBILNÍ A POZITIVNÍ!
            Příklad odpovědi: "📊 Vaše aktuální sazba ${contextData.rate?.toFixed(2)}% je konkurenceschopná. Skutečné sazby se pohybují od 3.89% do 5.49% podle bonity a LTV. S naším specialistou můžete dostat i lepší individuální nabídku! Někteří klienti s výbornou bonitou dosáhnou i na 4.09%."`;
        } else {
            prompt += `\n\nKlient se ptá na sazby bez kontextu.
            Příklad odpovědi: "📊 Aktuální sazby se pohybují od 3.89% do 5.49% podle vaší situace. Nejlepší klienti mohou dostat i 4.09%. Spočítejte si konkrétní nabídku v kalkulačce vpravo!"`;
        }
    }

    // Detect scenario modeling
    if (userMessage.match(/\d+\s*(mil|mega|milion|tisíc|tis|let|rok)/i)) {
        const numbers = userMessage.match(/\d+/g);
        if (numbers) {
            const isMillions = userMessage.toLowerCase().match(/mil|mega/);
            const isThousands = userMessage.toLowerCase().match(/tisíc|tis/);
            const isYears = userMessage.toLowerCase().match(/let|rok/);
            
            let params = {};
            if (isMillions && numbers[0]) {
                const amount = parseInt(numbers[0]) * 1000000;
                params.loanAmount = amount;
                params.propertyValue = Math.round(amount * 1.25); // Default 80% LTV
            }
            if (isThousands && numbers[0]) {
                params.income = parseInt(numbers[0]) * 1000;
            }
            if (isYears && numbers.length > 1) {
                params.loanTerm = parseInt(numbers[1]);
            } else if (isYears && numbers[0] && !isMillions) {
                params.loanTerm = parseInt(numbers[0]);
            }
            
            if (Object.keys(params).length > 0) {
                return prompt + `\n\nKlient chce modelovat scénář. Odpověz POUZE JSON: {"tool":"modelScenario","params":${JSON.stringify(params)}}`;
            }
        }
    }

    // Detect questions about process
    if (userMessage.toLowerCase().match(/jak dlouho|kolik to trvá|jak rychle|kdy dostanu|proces|schválení/)) {
        prompt += `\n\nKlient se ptá na proces.
        Odpověď: "⏱️ Schválení hypotéky trvá typicky 2-3 týdny. Předběžné schválení můžeme mít do 48 hodin, čerpání do 4-6 týdnů. S naší pomocí je to nejrychlejší cesta! 🚀"`;
    }

    // Detect questions about documents
    if (userMessage.toLowerCase().match(/dokument|doklad|papír|potřebuju|co musím/)) {
        prompt += `\n\nKlient se ptá na dokumenty.
        Odpověď: "📄 Základní dokumenty: občanka, výpisy z účtu (3 měsíce), potvrzení o příjmu, kupní smlouva. Náš specialista vám pošle přesný seznam podle vaší situace! 📋"`;
    }

    prompt += `\n\nINSTRUKCE PRO ODPOVĚĎ:
    1. Pokud má klient spočítanou hypotéku, vždy se odkazuj na konkrétní čísla
    2. Pokud nemá, povzbuď ho k použití kalkulačky
    3. Buď vstřícný ohledně sazeb - zdůrazni, že individuální nabídky mohou být lepší
    4. Vždy nabízej možnost spojení se specialistou jako bonus
    5. Používej emoji pro přátelštější komunikaci
    
    Odpověz přirozeně, stručně a užitečně.`;

    return prompt;
}

export { handler };