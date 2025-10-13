// netlify/functions/chat.js - INTELIGENTNÍ VERZE S EXPERTNÍMI TIPY A ANONYMIZOVANÝMI METODIKAMI

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const messageCount = context?.messageCount || 0;
    
    // Zjednodušený start konverzace pro obecné dotazy na výpočet
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
        fixation: context.formData?.fixation,
        income: context.formData?.income,
        age: context.formData?.age,
        employment: context.formData?.employment,
        monthlyPayment: context.calculation?.selectedOffer?.monthlyPayment,
        rate: context.calculation?.selectedOffer?.rate,
        ltv: Math.round((context.formData?.loanAmount / context.formData?.propertyValue) * 100),
    } : null;

    // Hlavní systémový prompt
    let prompt = `Jsi PREMIUM AI hypoteční stratég. Tvým úkolem je poskytovat skutečné, stručné poradenství, které vede ke generování leadu.
    
    PRAVIDLA:
    1.  **Stručnost a hodnota:** Odpovídej krátce, v bodech. Max 120 slov. Každá odpověď musí obsahovat konkrétní radu.
    2.  **Kontext a poradenství:** VŽDY předpokládej, že data z kalkulačky jsou pro NOVOU hypotéku, ne refinancování. Vysvětluj pojmy (jako LTV) a upozorňuj na neveřejné tipy z praxe.
    3.  **Cíl je lead:** Vždy na konci nabídni další krok a směřuj ke kontaktu se specialistou, který zná tyto "kličky" a ušetří klientovi peníze.

    JAK ANALYZOVAT A RADIT:
    * **Vysvětli LTV:** Vždy stručně zmiň, že LTV je "poměr úvěru k ceně nemovitosti" a jak ovlivňuje sazbu.
    * **Zohledni věk:** Pokud je klient < 36 let, ZMIŇ VÝHODY (i při LTV do 90 % může dosáhnout na lepší sazby).
    * **Přidej expertní tip:** Na základě situace (OSVČ, zaměstnanec) přidej jeden konkrétní tip o metodikách bank, ale NIKDY NEJMENUJ KONKRÉTNÍ BANKU.

    ${hasContext ? `
    AKTUÁLNÍ DATA KLIENTA (PRO NOVOU HYPOTÉKU):
    - Splátka z kalkulace: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč
    - Orientační sazba: ${contextData.rate}%
    - LTV: ${contextData.ltv}%
    - Věk: ${contextData.age} let
    - Zaměstnání: ${contextData.employment}
    ` : 'Klient zatím nemá spočítanou hypotéku.'}

    DOTAZ UŽIVATELE: "${userMessage}"`;

    // Speciální inteligentní analýza pro první dotaz z kalkulačky
    if (userMessage.toLowerCase().match(/analyzuj|klíčové body mé kalkulace/)) {
        if (!hasContext) return prompt + `\n\nOdpověz: "Nejprve si prosím spočítejte nabídku v kalkulačce, abych měl data pro analýzu."`;
        
        let response = `<strong>Klíčové body vaší kalkulace:</strong>\n\n`;
        response += `• Vaše orientační splátka vychází na <strong>${contextData.monthlyPayment.toLocaleString('cs-CZ')} Kč</strong> při sazbě <strong>${contextData.rate}%</strong>.\n`;
        response += `• Tuto sazbu ovlivňuje především vaše LTV (poměr úvěru k ceně nemovitosti), které je <strong>${contextData.ltv}%</strong>. Cokoli pod 80 % je pro banky skvělý signál.\n\n`;
        
        // --- EXPERTNÍ TIP ---
        response += `<strong>💡 Expertní tip pro vás:</strong>\n`;
        if (contextData.employment === 'osvc') {
            response += `Jako OSVČ je pro vás klíčové, jak banka posuzuje příjem. **Některé banky** umí v určitých oborech počítat příjem z obratu, nikoliv jen z daňového přiznání, což může výrazně navýšit vaši bonitu. Náš specialista přesně ví, kde a jaké podklady předložit.\n\n`;
        } else if (contextData.age < 36) {
            response += `Protože je vám pod 36 let, banky jsou k vám vstřícnější a často získáte standardní sazbu i s vyšším LTV (až 90 %). Náš specialista zná neveřejné akce a podmínky pro mladé a umí je využít ve váš prospěch.\n\n`;
        } else {
            response += `U standardního zaměstnání je největší prostor pro **vyjednání individuální slevy**, která není v online kalkulačkách. Náš specialista díky objemu hypoték ví, která banka je ochotná slevit nejvíce (např. za aktivní účet) a ušetří vám tak desítky tisíc.\n\n`;
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