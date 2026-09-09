// netlify/functions/chat.js
exports.handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Chybí API klíč na serveru.' }) };
        
        const ltv = context.formData.propertyValue ? Math.round((context.formData.loanAmount / context.formData.propertyValue)*100) : 0;
        const dsti = context.calculation?.selectedOffer ? Math.round((context.calculation.selectedOffer.monthlyPayment / context.formData.income)*100) : 0;
        const totalDebt = context.formData.totalDebt || 0;
        const dti = context.formData.income ? ((context.formData.loanAmount + totalDebt) / (context.formData.income * 12)).toFixed(1) : 0;
        
        const isExpress = context.mode === 'express';
        const modeInstructions = isExpress 
            ? `DŮLEŽITÉ PRAVIDLO: Klient použil "Rychlou kalkulaci", takže nezadal svůj věk, účel ani detaily příjmu. Tyto údaje v datech níže JSOU POUZE TVŮJ MODELOVÝ PŘEDPOKLAD. Pokud na ně narazíš nebo se klient zeptá, ODPOVĚZ PŘESNĚ TAKTO: "Jelikož jste vyplnil pouze rychlou kalkulaci, počítám s předem definovanými modelovými parametry (věk 35 let, bez dluhů, účel koupě). Pro přesný výpočet na míru prosím přepněte na Detailní analýzu vlevo nahoře."` 
            : `Klient je v režimu "Detailní analýza", takže všechna zadaná data jsou reálná a přesná.`;

        const prompt = `Jsi profesionální hypoteční AI stratég pro Hypoteky Ai. Mluv stručně, v odstavcích, max 3 věty. 
        Pokud klient potřebuje pomoct s nabídkou, pobídni ho ať si vyžádá konzultaci. Pro spojení s expertem vrať POUZE: {"tool":"showLeadForm"}
        
        PRAVIDLA DTI: Běžný limit DTI je 8.5 (9.5 do 36 let). Pokud klient vlastní 2 a více nemovitostí, je limit přísnější, pouze 7.0!
        PRAVIDLO 70 LET: Splatnost hypotéky standardně končí max v 70 letech žadatele. (Pouze na výjimku lze do 72 nebo 75 let).
        ÚČEL: Pokud je účel "cokoliv", jedná se o americkou hypotéku, ta má max LTV 70%.
        
        ${modeInstructions}
        
        Aktuální parametry klienta: Účel: ${context.formData.purpose}, Typ: ${context.formData.propertyType}, Typ příjmu: ${context.formData.employment}, Věk: ${context.formData.age}, Štítek: ${context.formData.energyLabel === 'a_b' ? 'A/B' : 'C a horší'}, Vlastní nemovitostí: ${context.formData.ownedProperties === '2_plus' ? '2 a více' : '0 až 1'}. Úvěr ${context.formData.loanAmount} Kč, Celkové dluhy: ${totalDebt} Kč, LTV: ${ltv}%, DSTI: ${dsti}%, DTI: ${dti}. 
        Dotaz klienta: ${message}`;
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        if (!response.ok) { const errData = await response.json(); return { statusCode: response.status, headers, body: JSON.stringify({ error: errData.error?.message || "Neznámá chyba API" }) }; }
        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text.trim();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return { statusCode: 200, headers, body: jsonMatch[0] };
        return { statusCode: 200, headers, body: JSON.stringify({ response: responseText }) };
    } catch (e) { return { statusCode: 500, headers, body: JSON.stringify({ error: `Chyba: ${e.message}` }) }; }
};
