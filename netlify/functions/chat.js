// netlify/functions/chat.js
// VERZE 5.0 - ROZŠÍŘENÁ ZNALOSTNÍ DATABÁZE
// Používá model "gemini-2.5-flash" a API "v1" dle vašeho požadavku.

// === EXPERTNÍ DATABÁZE ODPOVĚDÍ ===
// AI sem sáhne, pokud se uživatel zeptá na konkrétní klíčové slovo.
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
        <strong>💡 Expertní tip:</strong> Je to ideální pro investiční byty nebo pokud vám těsně nevychází bonita. Naši specialisté vědí, které banky to umí.`
    },
    'družstevní|družstvo': {
        title: "Financování družstevního bytu",
        response: `Družstevní byt je specifický, protože ho **nelze použít jako zástavu** pro klasickou hypotéku (nevlastníte nemovitost, ale podíl v družstvu).<br><br>
        <strong>Máme 2 hlavní řešení:</strong><br>
        <ol>
            <li><strong>Dozajištění jinou nemovitostí:</strong> Pokud můžete ručit jinou nemovitostí (svou, rodičů), získáte standardní hypotéku s nejlepší sazbou.</li>
            <li><strong>Předhypoteční/Nezajištěný úvěr:</strong> Speciální úvěr od stavební spořitelny nebo banky, který je dražší, ale nevyžaduje zástavu. Používá se na překlenutí doby, než byt přejde do osobního vlastnictví.</li>
        </ol>
        <strong>💡 Expertní tip:</strong> Vždy preferujeme variantu 1. Náš specialista vám pomůže najít nejlepší cestu.`
    },
    'registr|solus|brki|nrki': {
        title: "Záznam v registrech (SOLUS, BRKI)",
        response: `Záznam v registru je častá komplikace, ale ne vždy znamená konec.<br><br>
        <strong>Musíme rozlišit:</strong><br>
        <ul>
            <li><strong>Drobný prohřešek:</strong> Např. 1-2x opožděná splátka úvěru nebo faktury za telefon o pár dní. Pokud je to doplacené, většina bank to po vysvětlení akceptuje.</li>
            <li><strong>Velký prohřešek:</strong> Aktivní exekuce, insolvence, nebo nesplacený dluh "po splatnosti" 30+ dní. Toto je pro banky téměř vždy "stopka".</li>
        </ul>
        <strong>💡 Expertní tip:</strong> Klíčové je mít čerstvé výpisy z registrů (BRKI, NRKI, SOLUS). Náš specialista je s vámi projde a upřímně řekne, zda je situace řešitelná a u které banky.`
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
        Můžete mi je napsat sem, nebo je zadat do naší [Expresní kalkulačky](#kalkulačka)."
        DOTAZ UŽIVATELE: "${userMessage}"`;
    }
    
    // 3. Příprava dat pro AI
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

    // 4. Hlavní systémový prompt (S ROZŠÍŘENÝM MOZKEM)
    let prompt = `Jsi PREMIUM AI hypoteční stratég. Tvým úkolem je poskytovat skutečné, stručné a kontextuální poradenství, které vede ke generování leadu.
    
    PRAVIDLA:
    1.  **Stručnost a hodnota:** Odpovídej krátce, v bodech. Max 150 slov. Každá odpověď musí obsahovat konkrétní "insider" tip.
    2.  **Nikdy si nevymýšlej data:** Vždy vycházej z expertních metodik.
    3.  **Cíl je lead:** Vždy na konci nabídni další krok.

    ===== KLÍČOVÝ KONTEXT TRHU (EXPERTNÍ MOZEK v.2) =====
    
    **SEKCE 1: PŘÍJMY (Metodika bank)**
    * **OSVČ:** Zisk (daňový základ) je standard. KLÍČOVÉ: Některé banky umí počítat z OBRATU (15-25 %). To je řešení pro ty, co "optimalizují".
    * **Jednatel s.r.o.:** I bez mzdy lze. Některé banky počítají bonitu z OBRATU (cca 10-20 %) nebo ZISKU firmy (i nerozděleného).
    * **Zahraniční příjem:** DE, AT, SK = Akceptováno (s překladem). Ostatní (UK, USA) = Velmi problematické.
    * **Rodičovský příspěvek:** Akceptován VŽDY jen jako doplňkový příjem (např. k platu partnera).
    * **Diety:** Řidiči z povolání. Některé banky umí započítat až 100 % diet k základní mzdě.
    * **Pronájem:** Lze započítat současný (z daň. přiznání) i BUDOUCÍ (z odhadu nájmu, cca 50-70 %). Řešení pro těsnou bonitu u investičních bytů.

    **SEKCE 2: NEMOVITOST (Problémy a řešení)**
    * **KRITICKÝ PROBLÉM:** LTV se počítá z **ODHADNÍ CENY** banky, ne z kupní. Odhad je často nižší než cena. Klient pak potřebuje VÍCE vlastních zdrojů.
    * **Družstevní byt:** Nelze jím ručit. ŘEŠENÍ: 1) Dozajištění jinou nemovitostí (nejlepší sazba), nebo 2) Nezajištěný "předhypoteční" úvěr (dražší).
    * **Dřevostavby:** Některé banky dávají nižší odhad a kratší max. splatnost (např. 25 let). Je třeba pečlivě vybírat.
    * **Věcná břemena:** Břemeno chůze/dožití (problém, snižuje cenu). Břemeno sítí (ČEZ, RWE) (běžné, nevadí).
    * **Dozajištění:** Ručení druhou nemovitostí (i rodičů) dramaticky SNÍŽÍ LTV (např. z 90 % na 60 %) a tím zlepší sazbu (úspora až 0.8 % p.a.).

    **SEKCE 3: KLIENT (Status a výhody)**
    * **VIP Klient:** (Úvěr > 7M NEBO Příjem > 80k NEBO Vzdělání VŠ). Získá slevu 0.1-0.2 % a lepší DSTI (až 55 %).
    * **Věk < 36 let:** Výhoda pro LTV 90 %. Banky jsou mírnější.
    * **Registry (SOLUS, BRKI):** Drobný opožděný zápis (po telefonu) = řešitelný. Aktivní exekuce/insolvence = neřešitelné.
    * **Rozvod (SJM):** Nutné mít majetkové vypořádání (SJM) vyřešené PŘED žádostí o hypotéku.
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

    // 5. INTELIGENTNÍ ANALÝZA (PROVÁDÍ AI)
    if (userMessage.toLowerCase().match(/analyzuj|klíčové body mé kalkulace/)) {
        if (!hasContext) return prompt + `\n\nOdpověz: "Nejprve si prosím spočítejte nabídku v kalkulaci."`;
        
        // --- NOVÝ DIAGNOSTICKÝ POKYN ---
        let analysisPrompt = `
        Proveď expertní analýzu situace klienta na základě dat z kalkulačky a znalostí z "EXPERTNÍHO MOZKU".
        
        POSTUP:
        1.  Stručně shrň základní parametry (splátka, sazba, LTV).
        2.  **Diagnostikuj 1-2 NEJDŮLEŽITĚJŠÍ body** z klientských dat (např. je OSVČ, má vysoké LTV, je VIP, má těsnou bonitu).
        3.  **Navrhni konkrétní ŘEŠENÍ** nebo "insider tip" pro tyto body s využitím znalostí z "EXPERTNÍHO MOZKU".
        
        PŘÍKLADY DIAGNÓZ A ŘEŠENÍ:
        * Pokud je OSVČ a bonita těsná (splátka > 40% příjmu), zaměř se na řešení "metodika z OBRATU".
        * Pokud je LTV > 80 %, zaměř se na řešení "Dozajištění" nebo výhodu "Věk < 36 let".
        * Pokud je VIP, vždy to zmiň jako první tip (VIP sleva).
        * Pokud je bonita těsná a je to investiční byt, navrhni řešení "budoucí pronájem".
        * Pokud je Typ nemovitosti 'byt' a Účel 'koupě', mohlo by jít o 'Družstevní byt'? Zeptej se, zda to není družstevní, protože tam platí jiná pravidla (nelze ručit).
        * Pokud nejsou žádné zjevné problémy, zaměř se na obecné výhody (VIP sleva, pokud sedí) nebo na standardní vyjednání slevy.
        * Na konci VŽDY přidej stručné upozornění na problém "Odhadní vs. Kupní cena", protože to se týká všech.
        
        Cíl je ukázat maximální expertizu a relevanci.`;
        // --- KONEC POKYNU ---
        
        return prompt + `\n\n${analysisPrompt}`;
    }
    // =========================================================

    // 6. Ostatní routy (kontakt, banky atd.) - zůstávají stejné
    if (userMessage.toLowerCase().match(/bank|které banky/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }
    if (userMessage.toLowerCase().match(/kontakt|specialista/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Otevírám formulář pro spojení se specialistou."}`;
    }
    
    prompt += `\n\nOdpověz na dotaz uživatele stručně a věcně podle pravidel.`;
    return prompt;
}


// ===== FUNKCE HANDLER (VRÁCENO NA "gemini-2.5-flash" a "v1") =====
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
        
        // --- VRÁCENO ZPĚT DLE VAŠEHO POŽADAVKU ---
        const modelName = "gemini-2.5-flash"; // Vracím vámi specifikovaný model
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`; // Vracím verzi API v1
        // --- KONEC ZMĚNY ---

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
        
        // Zpracování odpovědi (zůstává stejné)
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