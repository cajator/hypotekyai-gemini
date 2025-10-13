// netlify/functions/chat.js - INTELIGENTNÍ VERZE S DYNAMICKÝMI EXPERTNÍMI TIPY

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const messageCount = context?.messageCount || 0;
    
    // Zjednodušený start konverzace
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
        monthlyPayment: context.calculation?.selectedOffer?.monthlyPayment,
        rate: context.calculation?.selectedOffer?.rate,
        ltv: Math.round((context.formData?.loanAmount / context.formData?.propertyValue) * 100),
    } : null;

    // Hlavní systémový prompt
    let prompt = `Jsi PREMIUM AI hypoteční stratég. Tvým úkolem je poskytovat skutečné, stručné a kontextuální poradenství.
    
    PRAVIDLA:
    1.  **Naslouchej:** Vždy reaguj na to, co uživatel napsal jako poslední. Neopakuj staré informace.
    2.  **Stručnost a hodnota:** Odpovídej krátce, v bodech. Max 120 slov. Každá odpověď musí obsahovat konkrétní radu nebo "insider" tip.
    3.  **Cíl je lead:** Vždy na konci nabídni další krok a směřuj ke kontaktu se specialistou.

    JAK ANALYZOVAT A RADIT:
    * **Přizpůsob "Expertní tip":** Na základě profilu klienta (věk, zaměstnání, LTV) vygeneruj JEDEN relevantní tip. Pro OSVČ zmiň metodiky příjmu, pro mladé výhody LTV, pro zaměstnance neveřejné slevy. Buď kreativní a neopakuj se.
    * **Nikdy nejmenuj konkrétní banky.**

    ${hasContext ? `
    AKTUÁLNÍ DATA KLIENTA (PRO NOVOU HYPOTÉKU):
    - Orientační splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč
    - Orientační sazba: ${contextData.rate}%
    - LTV: ${contextData.ltv}%
    - Věk: ${contextData.age} let
    - Zaměstnání: ${contextData.employment}
    ` : 'Klient zatím nemá spočítanou hypotéku.'}

    DOTAZ UŽIVATELE: "${userMessage}"`;

    // ===== NOVÁ LOGIKA PRO SROVNÁNÍ S NÁJMEM =====
    if (userMessage.toLowerCase().match(/nájem|nájmu|platím za byt|porovnání/)) {
        if (!hasContext) return prompt + `\n\nOdpověz: "Rád porovnám vaši situaci s nájmem. Nejprve si prosím spočítejte orientační splátku v naší kalkulačce."`;
        
        const rentMatch = userMessage.match(/(\d[\d\s]*\d)/);
        const rentAmount = rentMatch ? parseInt(rentMatch[0].replace(/\s/g, '')) : 20000; // default pokud nenajde číslo

        let response = `Rozumím, porovnání s nájmem je klíčové rozhodnutí.\n\n`;
        response += `• Vaše orientační splátka <strong>${contextData.monthlyPayment.toLocaleString('cs-CZ')} Kč</strong> je velmi blízko vašemu nájmu (~${rentAmount.toLocaleString('cs-CZ')} Kč).\n`;
        response += `• Hlavní rozdíl je, že s hypotékou každý měsíc splácíte svůj majetek, zatímco nájem je čistý náklad.\n\n`;
        response += `<strong>💡 Expertní tip:</strong> Banky se na to dívají podobně. Pokud prokážete, že jste schopni dlouhodobě platit nájem, považují vás za spolehlivého klienta. Náš specialista to umí použít jako silný argument při vyjednávání lepších podmínek.\n\n`;
        response += `Chcete, abychom pro vás spočítali, jak velkou část první splátky budou tvořit úroky a kolik půjde na splacení jistiny?`;
        
        return prompt + `\n\nOdpověz stručně na základě tohoto textu, reaguj na uživatelovu zprávu o nájmu: "${response}"`;
    }

    // Speciální inteligentní analýza pro první dotaz z kalkulačky
    if (userMessage.toLowerCase().match(/analyzuj|klíčové body mé kalkulace/)) {
        if (!hasContext) return prompt + `\n\nOdpověz: "Nejprve si prosím spočítejte nabídku v kalkulačce."`;
        
        let response = `<strong>Klíčové body vaší kalkulace:</strong>\n\n`;
        response += `• Vaše orientační splátka vychází na <strong>${contextData.monthlyPayment.toLocaleString('cs-CZ')} Kč</strong> při sazbě <strong>${contextData.rate}%</strong>.\n`;
        response += `• Tuto sazbu ovlivňuje především vaše LTV (poměr úvěru k ceně nemovitosti), které je <strong>${contextData.ltv}%</strong>. Cokoli pod 80 % je pro banky skvělý signál.\n\n`;
        
        // --- DYNAMICKÝ EXPERTNÍ TIP ---
        response += `<strong>💡 Expertní tip pro vás:</strong>\n`;
        if (contextData.employment === 'osvc') {
            response += `Jako OSVČ je pro vás klíčové, jak banka posuzuje příjem. Některé banky umí počítat příjem z obratu, nikoliv jen z daňového přiznání, což může výrazně navýšit vaši bonitu. Náš specialista přesně ví, kde a jaké podklady předložit.\n\n`;
        } else if (contextData.age < 36) {
            response += `Protože je vám pod 36 let, některé banky jsou k vám vstřícnější a často získáte standardní sazbu i s vyšším LTV (až 90 %). Náš specialista zná neveřejné akce a podmínky pro mladé a umí je využít ve váš prospěch.\n\n`;
        } else {
            response += `U standardního zaměstnání je největší prostor pro vyjednání individuální slevy, která není v online kalkulačkách. Náš specialista díky objemu hypoték ví, která banka je ochotná slevit nejvíce (např. za aktivní účet) a ušetří vám tak desítky tisíc.\n\n`;
        }
        
        response += `Toto je jen jedna z mnoha "kliček", které naši specialisté denně využívají. Chcete, abychom pro vás našli tu nejvýhodnější cestu, nebo se chcete podívat na analýzu rizik?`;
        
        return prompt + `\n\nOdpověz stručně a srozumitelně na základě tohoto textu: "${response}"`;
    }

    // Ostatní routy (kontakt, banky atd.)
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
        
        // ===== VAŠE PŮVODNÍ, SPECIFICKÁ KONFIGURACE =====
        const modelName = "gemini-2.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
        // ===============================================

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