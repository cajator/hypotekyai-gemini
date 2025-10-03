// netlify/functions/chat.js
// Logika zůstává silná, ale bude volána méně často pro lepší výkon.

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
        dsti: context.calculation?.selectedOffer?.dsti,
    } : null;

    let prompt = `Jsi PREMIUM hypoteční stratég s AI. Tvůj cíl je vytvořit pro klienta DLOUHODOBOU STRATEGII. Buď stručný, ale věcný. Vždy používej konkrétní čísla.

    KLÍČOVÉ PRINCIPY:
    1. VŽDY konkrétní čísla (ne "může", ale "ušetříte 127 000 Kč").
    2. SCÉNÁŘE "co kdyby" (ztráta práce, růst sazeb).
    3. SROVNÁNÍ alternativ (refinancování vs. splácení).
    4. Vždy nabídni pomoc experta pro realizaci.
    5. Nepozdravuj, jdi rovnou k věci.

    ${hasContext ? `
    AKTUÁLNÍ SITUACE KLIENTA (pokud je relevantní k dotazu):
    - Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
    - Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč (${contextData.rate}% p.a.)
    - Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč/měs
    - Skóre bonity: ${contextData.totalScore}% (LTV: ${contextData.ltv}%)
    ` : 'Klient zatím nemá spočítanou hypotéku. Nejdříve ho odkaž na kalkulačku na webu, pokud se ptá na konkrétní čísla.'}

    DOTAZ UŽIVATELE: "${userMessage}"

    Odpověz stručně, maximálně na 150 slov, ale s vysokou informační hodnotou. Používej **tučné písmo** pro důležité termíny a čísla.`;
    
    // Zjednodušená logika pro specializované analýzy - AI si poradí s obecným promptem.
    if (userMessage.toLowerCase().match(/co kdyby|rizik|zvládnu|problém/)) {
        prompt += "\n\nSPECIÁLNÍ INSTRUKCE: Zaměř se na STRESS TEST. Vytvoř 2-3 konkrétní negativní scénáře (ztráta příjmu, růst sazeb) a ukaž dopad v číslech. Navrhni akční plán (rezerva, pojištění)."
    }
    
    if (userMessage.toLowerCase().match(/refinanc|lepší.*nabídka|ušetřit/)) {
        prompt += "\n\nSPECIÁLNÍ INSTRUKCE: Zaměř se na REFINANCOVÁNÍ. Porovnej současný stav s potenciální tržní nabídkou. Vypočítej měsíční, roční a celkovou úsporu. Navrhni strategii (vyjednávání vs. změna banky)."
    }
    
    if (userMessage.toLowerCase().match(/investov|splácet|co.*s.*penězi/)) {
         prompt += "\n\nSPECIÁLNÍ INSTRUKCE: Zaměř se na srovnání INVESTICE vs. SPLÁCENÍ. Matematicky porovnej výnos z investice (cca 7% p.a.) s úsporou na úrocích z hypotéky. Navrhni vyváženou strategii 50/50."
    }

    return prompt;
}

const fetch = require('node-fetch');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' } };
    }
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error('Chybí GEMINI_API_KEY.');
        
        // Zde může být fallback pro jednoduché dotazy, pokud by je frontend propustil
        if (message.toLowerCase().match(/kontakt|specialista|mluvit|poradit|schůzka/)) {
            return { statusCode: 200, headers, body: JSON.stringify({ tool: 'showLeadForm', response: "📞 Výborně! Připojím vás k našemu PREMIUM týmu. Otevírám formulář..." }) };
        }

        const prompt = createSystemPrompt(message, context);
        const modelName = "gemini-1.5-flash-latest"; 
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('API Error Body:', errorBody);
            throw new Error(`Chyba API: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) throw new Error("AI nevrátila žádný text.");
        
        return { statusCode: 200, headers, body: JSON.stringify({ response: responseText.trim() }) };

    } catch (error) {
        console.error('Chyba ve funkci chat.js:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Došlo k chybě: ${error.message}` }) };
    }
};