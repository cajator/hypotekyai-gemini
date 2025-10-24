// netlify/functions/chat.js
// VERZE S INTELIGENTNÍ MATICÍ SCÉNÁŘŮ A EXPERTNÍMI ODPOVĚĎMI

// === NOVÁ SEKCE: EXPERTNÍ ODPOVĚDI ===
// Tyto odpovědi AI použije, pokud detekuje klíčové slovo.
const EXPERT_RESPONSES = {
    'odhad|kupní cena|proč.*víc peněz': {
        title: "Klíčová informace: Odhad vs. Kupní cena",
        response: `To je zásadní dotaz a nejčastější problém v praxi.<br><br>
        Banka vám VŽDY počítá LTV (procento úvěru) z **ceny odhadní**, nikoli z ceny kupní.<br><br>
        <strong>PŘÍKLAD Z PRAXE:</strong><br>
        <ul>
            <li>Kupujete byt za <strong>5 000 000 Kč</strong> (Kupní cena).</li>
            <li>Chcete 80% hypotéku, tj. <strong>4 000 000 Kč</strong> (Máte 1M vlastních zdrojů).</li>
            <li>Bankovní odhadce ale ocení byt jen na <strong>4 800 000 Kč</strong> (Odhadní cena).</li>
            <li>Banka vám půjčí 80 % ze 4,8M = <strong>3 840 000 Kč</strong>.</li>
            <li>Najednou potřebujete vlastní zdroje ve výši <strong>1 160 000 Kč</strong> (o 160 000 Kč víc, než jste čekal).</li>
        </ul>
        <strong>💡 Expertní tip:</strong> Náš specialista má přístup k interním kalkulačkám bank a často umí odhadnout cenu ještě před podáním žádosti, nebo ví, která banka má pro daný typ nemovitosti lepšího odhadce.`
    },
    'obrat|obratu|paušál': {
        title: "Hypotéka pro OSVČ (obrat vs. zisk)",
        response: `Ano, toto je naše silná stránka. Pro OSVČ (živnostníky) je klíčové, jak banka počítá příjem.<br><br>
        <ul>
            <li><strong>Standardní banky:</strong> Berou jen daňový základ (zisk). Pokud optimalizujete daně, vaše bonita je nízká.</li>
            <li><strong>Naši partneři:</strong> Některé banky (např. Česká spořitelna, Raiffeisenbank) umí počítat bonitu z **OBRATU** (např. 15-25 % z celkového obratu, bez ohledu na zisk).</li>
        </ul>
        <strong>💡 Expertní tip:</strong> Naši specialisté přesně vědí, kterou banku zvolit podle vašeho oboru a výše obratů, abyste dosáhli na co nejvyšší hypotéku, i když máte "oficiálně" nízký zisk.`
    },
    'jednatel|sro|s.r.o.': {
        title: "Hypotéka pro Jednatele s.r.o.",
        response: `Ano, řešíme to denně. Pro jednatele a majitele s.r.o. máme speciální metodiky.<br><br>
        I když si nevyplácíte mzdu nebo máte nízký zisk kvůli optimalizaci, některé banky (např. UniCredit, Komerční banka) umí vypočítat váš "fiktivní" příjem na základě:<br>
        <ul>
            <li><strong>Obratu firmy:</strong> Např. 10 % z ročního obratu.</li>
            <li><strong>Zisku firmy:</strong> I z nezdaněného zisku před rozdělením.</li>
        </ul>
        <strong>💡 Expertní tip:</strong> Je klíčové správně připravit podklady (výkazy, cashflow) a vybrat banku, která vaši situaci chápe. Náš specialista to zařídí.`
    },
    'dozajištění|jiná nemovitost|ručitel|zástava': {
        title: "Využití dozajištění (druhá nemovitost)",
        response: `Dozajištění druhou nemovitostí je vynikající strategie, jak výrazně ušetřit.<br><br>
        <strong>Jak to funguje:</strong><br>
        Když ručíte dvěma nemovitostmi (např. kupovanou a bytem rodičů), banka sečte jejich odhadní ceny. Tím se dramaticky sníží vaše LTV (poměr úvěru k hodnotě zástavy).<br><br>
        <ul>
            <li><strong>Standardní LTV 90 %</strong> = sazba např. 5,09 %</li>
            <li><strong>LTV po dozajištění (např. 60 %)</strong> = sazba např. 4,19 %</li>
        </ul>
        <strong>💡 Expertní tip:</strong> Úspora na úrocích může být i 0,8 % ročně, což jsou statisíce. Druhou nemovitost lze navíc po částečném splacení z hypotéky kdykoliv vyvázat.`
    },
    'budoucí pronájem|pronájmu': {
        title: "Příjem z budoucího pronájmu",
        response: `Ano, některé banky (např. Česká spořitelna, Air Bank) umí započítat i budoucí příjem z pronájmu nemovitosti, kterou teprve kupujete.<br><br>
        <strong>Jak to funguje:</strong><br>
        Banka si nechá zpracovat odhad tržního nájemného. Z této částky pak započítá cca 50-70 % do vaší bonity (příjmů).<br><br>
        <strong>Příklad:</strong> Odhad nájmu je 20 000 Kč/měs. Banka vám připočte k příjmu 12 000 Kč, což vám může zvýšit maximální výši hypotéky o více než 1 milion Kč.<br><br>
        <strong>💡 Expertní tip:</strong> Je to ideální pro investiční byty. Naši specialisté vědí, které banky to umí a jaké k tomu vyžadují podklady.`
    }
};

function findExpertResponse(userMessage) {
    const lowercaseMessage = userMessage.toLowerCase();
    for (const [pattern, response] of Object.entries(EXPERT_RESPONSES)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(lowercaseMessage)) {
            return response;
        }
    }
    return null;
}
// =======================================


function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const messageCount = context?.messageCount || 0;
    
    // 1. Zpracování expertních/rychlých odpovědí (pokud se uživatel ptá přímo)
    const expertResponse = findExpertResponse(userMessage);
    if (expertResponse) {
        let response = `<h3>${expertResponse.title}</h3>${expertResponse.response}<br><br>Chcete se zeptat na něco dalšího, nebo rovnou domluvit hovor se specialistou?`;
        // Vracíme pouze prompt pro AI, aby odpověděla na základě textu
        return `Uživatel se zeptal na komplexní téma. Odpověz mu srozumitelně na základě tohoto expertního textu. Udržuj formátování (nadpis, odrážky).
        ---
        TEXT PRO ODPOVĚĎ: "${response}"
        ---
        DOTAZ UŽIVATELE: "${userMessage}"`;
    }
    
    // 2. Zpracování úvodního dotazu na kalkulaci (zůstává stejné)
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
    
    // 3. Příprava dat pro AI (Nyní s více kontextem)
    const contextData = hasContext ? {
        loanAmount: context.formData?.loanAmount,
        propertyValue: context.formData?.propertyValue,
        loanTerm: context.formData?.loanTerm,
        income: context.formData?.income,
        age: context.formData?.age,
        employment: context.formData?.employment,
        education: context.formData?.education,
        purpose: context.formData?.purpose,
        propertyType: context.formData?.propertyType,
        monthlyPayment: context.calculation?.selectedOffer?.monthlyPayment,
        rate: context.calculation?.selectedOffer?.rate,
        ltv: Math.round((context.formData?.loanAmount / (context.formData?.propertyValue + (context.formData?.landValue || 0))) * 100),
    } : null;

    // 4. Hlavní systémový prompt (Nyní s novým expertním mozkem)
    let prompt = `Jsi PREMIUM AI hypoteční stratég. Tvým úkolem je poskytovat skutečné, stručné a kontextuální poradenství, které vede ke generování leadu.
    
    PRAVIDLA:
    1.  **Stručnost a hodnota:** Odpovídej krátce, v bodech. Max 150 slov. Každá odpověď musí obsahovat konkrétní "insider" tip.
    2.  **Nikdy si nevymýšlej data:** Vždy vycházej z expertních metodik.
    3.  **Cíl je lead:** Vždy na konci nabídni další krok.

    ===== KLÍČOVÝ KONTEXT TRHU (EXPERTNÍ MOZEK) =====
    -   **VIP FAKTORY:** VIP klienti dostanou slevu 0.1-0.2% a lepší DSTI (až 55%). VIP faktory jsou: Úvěr > 7M Kč NEBO Příjem > 80k Kč NEBO Vzdělání VŠ (vysokoškolské).
    -   **OSVČ:** Banky se liší. Některé berou jen zisk (daňový základ), jiné umí počítat z OBRATU (15-25%). To je klíčové pro optimalizující OSVČ.
    -   **Jednatel s.r.o.:** I bez mzdy lze získat hypotéku. Některé banky počítají bonitu z obratu nebo zisku firmy.
    -   **LTV & DOZAJIŠTĚNÍ:** LTV nad 80 % znamená vyšší sazbu. ŘEŠENÍ: Dozajištění druhou nemovitostí (např. rodičů) dramaticky sníží LTV a sazbu.
    -   **BUDOUCÍ PRONÁJEM:** U investičních bytů umí některé banky započítat budoucí nájem (50-70 % z odhadu) do příjmů žadatele.
    -   **PROBLÉM ODHADU:** LTV se počítá z ODHADNÍ ceny banky, která je často NIŽŠÍ než kupní cena. To zvyšuje nároky na vlastní zdroje. (Toto zmiňuj, jen pokud se ptá na LTV/zdroje, nebo je LTV > 85%).
    ==============================================

    ${hasContext ? `
    AKTUÁLNÍ DATA KLIENTA:
    - Účel: ${contextData.purpose} (${contextData.propertyType})
    - Částka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč
    - Hodnota: ${contextData.propertyValue?.toLocaleString('cs-CZ')} Kč
    - LTV: ${contextData.ltv}%
    - Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč
    - Zaměstnání: ${contextData.employment}
    - Vzdělání: ${contextData.education}
    - Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč
    - Sazba: ${contextData.rate}%
    ` : 'Klient zatím nemá spočítanou hypotéku.'}

    DOTAZ UŽIVATELE: "${userMessage}"`;

    // 5. INTELIGENTNÍ ANALÝZA (NOVÁ MATICE TIPŮ)
    if (userMessage.toLowerCase().match(/analyzuj|klíčové body mé kalkulace/)) {
        if (!hasContext) return prompt + `\n\nOdpověz: "Nejprve si prosím spočítejte nabídku v kalkulaci."`;
        
        // Detekce faktorů
        const isPremium = (contextData.loanAmount >= 7000000) || (contextData.income >= 80000) || (contextData.education === 'vysokoškolské');
        const isOsvc = contextData.employment === 'osvc';
        const isJednatel = contextData.employment === 'jednatel';
        const isHighLtv = contextData.ltv > 80;
        const isInvestment = contextData.purpose === 'koupě' && (contextData.propertyType === 'byt' || contextData.propertyType === 'rodinný dům');
        
        let tips = [];

        // Sestavení matice tipů
        if (isPremium) {
            tips.push(`Gratuluji, spadáte do **VIP kategorie** (díky vysokému úvěru, příjmu nebo VŠ vzdělání). Pro vás umíme vyjednat neveřejnou sazbu o cca 0.1-0.2 % níže a banky benevolentněji posuzují bonitu.`);
        }
        if (isOsvc) {
            tips.push(`Jste <strong>OSVČ</strong>. Klíčové je, že některé banky umí počítat bonitu z <strong>obratu</strong>, nejen ze zisku. Pokud optimalizujete daně, je to pro vás ideální cesta, jak dosáhnout na vyšší úvěr.`);
        }
        if (isJednatel) {
            tips.push(`Jste <strong>jednatel s.r.o.</strong> I pokud si nevyplácíte mzdu, umíme využít metodiku bank, které počítají příjem z obratu nebo zisku vaší firmy.`);
        }
        if (isHighLtv) {
            tips.push(`Vaše LTV je <strong>nad 80 %</strong>, což mírně zvyšuje sazbu. <strong>Insider tip:</strong> Pokud máte možnost <strong>dozajištění</strong> druhou nemovitostí (např. rodičů), snížíme LTV a dosáhneme na sazby i o 0,8 % nižší.`);
        }
        if (isInvestment && contextData.income < 70000) { // Navrhneme budoucí nájem jen pokud to "dává smysl"
            tips.push(`Kupujete nemovitost, kterou lze pronajímat. Pokud by vaše bonita nevycházela, některé banky umí započítat i <strong>budoucí příjem z pronájmu</strong>, což výrazně zvýší vaši šanci na schválení.`);
        }
        if (contextData.age < 36 && tips.length < 2) { // Přidáme jen jako doplňkový tip
            tips.push(`Protože je vám <strong>pod 36 let</strong>, některé banky jsou k vám vstřícnější (např. LTV až 90 % za lepších podmínek).`);
        }
        if (tips.length === 0) {
            tips.push(`U standardního zaměstnání je největší prostor pro vyjednání individuální slevy, která není v online kalkulačkách. Náš specialista díky objemu hypoték ví, která banka je ochotná slevit nejvíce.`);
        }

        // Sestavení finální odpovědi
        let response = `<strong>Klíčové body vaší kalkulace:</strong>\n`;
        response += `• Vaše orientační splátka je <strong>${contextData.monthlyPayment.toLocaleString('cs-CZ')} Kč</strong> při sazbě <strong>${contextData.rate}%</strong>.\n`;
        response += `• Vaše LTV (poměr úvěru k hodnotě) je <strong>${contextData.ltv}%</strong>.\n\n`;
        
        response += `<strong>💡 Expertní tipy pro vaši situaci:</strong>\n`;
        response += `<ul>`;
        tips.forEach(tip => { response += `<li>${tip}</li>`; });
        response += `</ul>\n`;
        response += `Toto jsou přesně ty detaily, které rozhodují o úspoře statisíců. Chcete, abychom pro vás našli tu nejlepší kombinaci metodik?`;
        
        return prompt + `\n\nOdpověz stručně a srozumitelně na základě tohoto textu: "${response}"`;
    }

    // 6. Ostatní routy (zůstávají stejné)
    if (userMessage.toLowerCase().match(/bank|které banky/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }
    if (userMessage.toLowerCase().match(/kontakt|specialista/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Otevírám formulář pro spojení se specialistou."}`;
    }
    
    // 7. Fallback
    prompt += `\n\nOdpověz na dotaz uživatele stručně a věcně podle pravidel.`;
    return prompt;
}


// ===== FUNKCE HANDLER (Zůstává beze změny) =====
// ... (Není třeba kopírovat, váš stávající kód handleru je v pořádku) ...
// ... (Zůstává stejný kód pro fetch, API klíč, zpracování odpovědi atd.) ...

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
        
        // Zpracování odpovědi pro Gemini 1.5
        let responseText = '';
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            responseText = data.candidates[0].content.parts.map(part => part.text).join('');
        }

        if (!responseText) {
            console.error("AI nevrátila žádný text. Plná odpověď:", JSON.stringify(data, null, 2));
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