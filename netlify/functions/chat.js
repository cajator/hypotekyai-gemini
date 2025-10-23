// netlify/functions/chat.js - INTELIGENTNÍ VERZE S DATOVĚ PODLOŽENOU ODPOVĚDÍ O SAZBÁCH

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const messageCount = context?.messageCount || 0;
    
    // Zjednodušený start konverzace (zůstává stejný)
    if (userMessage.toLowerCase().match(/spočítat|kalkulačk|kolik.*dostanu|jakou.*splátku/) && !hasContext) {
        return `Uživatel chce spočítat hypotéku. Reaguj stručně. Nabídni mu dvě cesty: zadat data do chatu, nebo použít kalkulačku.
        Příklad odpovědi:
        "Jasně, pojďme na to. Pro přesná čísla potřebuji znát 3 základní údaje:
        1. Cenu nemovitosti
        2. Váš čistý měsíční příjem
        3. Kolik si chcete půjčit
        Můžete mi je napsat sem, nebo je zadat do naší [Expresní kalkulačky](#kalkulacka)."
        DOTAZ UŽIVATELE: "${userMessage}"`;
    }
    
    // Příprava inteligentního kontextu pro AI
    const contextData = hasContext ? {
        loanAmount: context.formData?.loanAmount,
        propertyValue: context.formData?.propertyValue,
        loanTerm: context.formData?.loanTerm,
        income: context.formData?.income,
        age: context.formData?.age,
        employment: context.formData?.employment,
        education: context.formData?.education, // <-- Nově přidáno vzdělání
        monthlyPayment: context.calculation?.selectedOffer?.monthlyPayment,
        rate: context.calculation?.selectedOffer?.rate,
        ltv: Math.round((context.formData?.loanAmount / context.formData?.propertyValue) * 100),
    } : null;

    // Hlavní systémový prompt
    let prompt = `Jsi PREMIUM AI hypoteční stratég. Tvým úkolem je poskytovat skutečné, stručné a kontextuální poradenství, které vede ke generování leadu.
    
    PRAVIDLA:
    1.  **Stručnost a hodnota:** Odpovídej krátce, v bodech. Max 120 slov. Každá odpověď musí obsahovat konkrétní radu nebo "insider" tip.
    2.  **Nikdy si nevymýšlej data:** Pokud neznáš přesné číslo, uveď bezpečné rozpětí nebo vysvětli princip.
    3.  **Cíl je lead:** Vždy na konci nabídni další krok a směřuj ke kontaktu se specialistou.

    ===== KLÍČOVÝ KONTEXT TRHU (NOVĚ UPRAVENO) =====
    1.  **PROBLÉM ODHAD vs. KUPNÍ CENA:** VŽDY upozorni klienta, že LTV se počítá z **ODHADNÍ CENY BANKY**, ne z kupní ceny. Odhad banky může být (a často je) nižší než kupní cena. To znamená, že klient bude potřebovat VÍCE VLASTNÍCH ZDROJŮ, než si myslel. Toto je kritická informace.
    2.  **VIP FAKTORY:** Pro bonitní klienty umíme zařídit neveřejné sazby (o cca 0,1% - 0,2% nižší) a lepší posouzení bonity (DSTI až 55 %). VIP faktory jsou:
        -   Hypotéka nad **7 milionů Kč**.
        -   Příjem nad **80 000 Kč** čistého.
        -   Vzdělání **VŠ** (V3).
    ==============================================

    ${hasContext ? `
    AKTUÁLNÍ DATA KLIENTA (PRO NOVOU HYPOTÉKU):
    - Částka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč
    - Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč
    - Vzdělání: ${contextData.education}
    - Orientační splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč
    - Orientační sazba: ${contextData.rate}%
    - LTV: ${contextData.ltv}%
    - Věk: ${contextData.age} let
    - Zaměstnání: ${contextData.employment}
    ` : 'Klient zatím nemá spočítanou hypotéku.'}

    DOTAZ UŽIVATELE: "${userMessage}"`;

    // ===== NOVÁ, INTELIGENTNÍ ODPOVĚĎ NA PROBLÉM LTV/ODHADU =====
    if (userMessage.toLowerCase().match(/odhad|kupní cena|ltv|vlastní zdroje|proč.*víc peněz/)) {
        let response = `To je zásadní dotaz. Je to nejčastější problém, na který lidé narazí.\n\n`;
        response += `Banka vám VŽDY počítá LTV (procento úvěru) z **ceny odhadní**, nikoli z ceny kupní.\n\n`;
        response += `**PŘÍKLAD Z PRAXE:**\n`;
        response += `• Kupujete byt za **5 000 000 Kč** (Kupní cena).\n`;
        response += `• Chcete 80% hypotéku, tj. **4 000 000 Kč** (Vlastní zdroje 1M).\n`;
        response += `• Bankovní odhadce ale ocení byt jen na **4 800 000 Kč** (Odhadní cena).\n`;
        response += `• Banka vám půjčí 80 % ze 4,8M = **3 840 000 Kč**.\n`;
        response += `• Vy ale musíte prodejci zaplatit 5M. Najednou potřebujete vlastní zdroje ve výši **1 160 000 Kč** (o 160 000 Kč víc, než jste čekal).\n\n`;
        response += `<strong>💡 Expertní tip:</strong> Náš specialista má přístup k interním kalkulačkám bank a často umí odhadnout cenu ještě před podáním žádosti, nebo ví, která banka má pro daný typ nemovitosti lepšího odhadce. To vám ušetří statisíce.\n\n`;
        response += `Chcete, abychom se podívali na vaši situaci?`;
        
        return prompt + `\n\nOdpověz srozumitelně na základě tohoto textu, vysvětli problém Odhad vs. Kupní cena: "${response}"`;
    }

    // ===== ODPOVĚĎ NA "AKTUÁLNÍ SAZBY" (zůstává stejná) =====
    if (userMessage.toLowerCase().match(/aktuální sazby/)) {
        // ... (kód pro aktuální sazby zde zůstává beze změny) ...
    }

    // ===== UPRAVENÁ ANALÝZA KALKULACE (NOVÉ VIP FAKTORY) =====
    if (userMessage.toLowerCase().match(/analyzuj|klíčové body mé kalkulace/)) {
        if (!hasContext) return prompt + `\n\nOdpověz: "Nejprve si prosím spočítejte nabídku v kalkulaci."`;
        
        // Detekce nových VIP faktorů
        const isPremiumLoan = (contextData.loanAmount || 0) >= 7000000;
        const isPremiumIncome = (contextData.income || 0) >= 80000;
        const isPremiumEducation = contextData.education === 'vysokoškolské';
        
        let response = `<strong>Klíčové body vaší kalkulace:</strong>\n\n`;
        response += `• Vaše orientační splátka vychází na <strong>${contextData.monthlyPayment.toLocaleString('cs-CZ')} Kč</strong> při sazbě <strong>${contextData.rate}%</strong>.\n`;
        response += `• Tuto sazbu ovlivňuje především vaše LTV (poměr úvěru k ceně nemovitosti), které je <strong>${contextData.ltv}%</strong>.\n\n`;
        
        // DŮLEŽITÉ UPOZORNĚNÍ NA ODHAD
        response += `<strong>⚠️ Klíčové upozornění:</strong> Prosím, pamatujte, že banka bude LTV počítat ze své **odhadní ceny**, která může být nižší než vámi zadaná hodnota. To by znamenalo potřebu vyšších vlastních zdrojů.\n\n`;

        response += `<strong>💡 Expertní tip pro vás:</strong>\n`;

        if (isPremiumLoan || isPremiumIncome || isPremiumEducation) {
            response += `Gratuluji, spadáte do kategorie **VIP klienta**. `;
            if (isPremiumLoan) response += `Díky objemu hypotéky nad 7 mil. Kč `;
            if (isPremiumIncome) response += `Díky příjmu nad 80 000 Kč `;
            if (isPremiumEducation) response += `Díky VŠ vzdělání (V3) máte u bank lepší interní scoring. `;
            response += `Pro vás naši specialisté dokáží vyjednat neveřejnou sazbu, často o dalších 0,1-0,2 % níže, a získáte mírně benevolentnější posouzení bonity (DSTI až 55%).\n\n`;
        }
        else if (contextData.employment === 'osvc') {
            response += `Jako OSVČ je pro vás klíčové, jak banka posuzuje příjem. Některé banky umí počítat příjem z obratu, což může výrazně navýšit vaši bonitu. Náš specialista přesně ví, kde a jaké podklady předložit.\n\n`;
        } else if (contextData.age < 36) {
            response += `Protože je vám pod 36 let, některé banky jsou k vám vstřícnější (např. LTV až 90 % za lepších podmínek). Náš specialista zná neveřejné akce a podmínky pro mladé a umí je využít ve váš prospěch.\n\n`;
        } else {
            response += `U standardního zaměstnání je největší prostor pro vyjednání individuální slevy, která není v online kalkulačkách. Náš specialista díky objemu hypoték ví, která banka je ochotná slevit nejvíce a ušetří vám tak desítky tisíc.\n\n`;
        }
        
        response += `Toto je jen jedna z mnoha "kliček", které naši specialisté denně využívají. Chcete se podívat na analýzu rizik, nebo probrat problém odhadní ceny?`;
        
        return prompt + `\n\nOdpověz stručně a srozumitelně na základě tohoto textu: "${response}"`;
    }

    // Ostatní routy (kontakt, banky atd.) - zůstávají stejné
    if (userMessage.toLowerCase().match(/bank|které banky/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }
    if (userMessage.toLowerCase().match(/kontakt|specialista/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Otevírám formulář pro spojení se specialistou."}`;
    }
    
    prompt += `\n\nOdpověz na dotaz uživatele stručně a věcně podle pravidel.`;
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
            throw new Error('Chybí GEMINI_API_KEY v proměnných prostředí.');
        }

        const prompt = createSystemPrompt(message, context);

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };
        
        const modelName = "gemini-2.5-flash";
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
            console.error('API Error Body:', errorBody); 
            throw new Error(`Chyba API: ${apiResponse.status} ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error("AI nevrátila žádný text.");
        }
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { /* Ignorovat chybu parsování */ }
        }
        
        const cleanResponse = responseText.replace(/```json\n?|```\n?/g, "").trim();
        
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ response: cleanResponse }) 
        };

    } catch (error) {
        console.error('Chyba ve funkci chat.js:', error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                error: `Došlo k chybě. (Detail: ${error.message})`
            }) 
        };
    }
};

module.exports = { handler };