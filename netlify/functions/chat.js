// netlify/functions/chat.js

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const isFromOurCalculator = context?.isDataFromOurCalculator || context?.calculation?.isFromOurCalculator;
    const messageCount = context?.chatHistory?.length || 0;
    
    const contextData = hasContext ? {
        loanAmount: context.formData?.loanAmount,
        propertyValue: context.formData?.propertyValue,
        loanTerm: context.formData?.loanTerm,
        fixation: context.formData?.fixation,
        income: context.formData?.income,
        age: context.formData?.age,
        children: context.formData?.children,
        liabilities: context.formData?.liabilities,
        monthlyPayment: context.calculation?.selectedOffer?.monthlyPayment,
        rate: context.calculation?.selectedOffer?.rate,
        totalScore: context.calculation?.approvability?.total,
        ltv: Math.round((context.formData?.loanAmount / context.formData?.propertyValue) * 100),
        dsti: context.calculation?.selectedOffer?.dsti,
        fixationDetails: context.calculation?.fixationDetails,
    } : null;

    let prompt = `Jsi PREMIUM hypoteční stratég s AI analytickými nástroji. Tvůj cíl není jen prodat hypotéku, ale vytvořit DLOUHODOBOU STRATEGII pro klienta. Buď stručný, věcný a vždy nabízej konkrétní čísla a akční kroky. Odpovídej v češtině.

KLÍČOVÉ PRINCIPY:
1. VŽDY konkrétní čísla (ne "může", ale "ušetříte 127 000 Kč")
2. SCÉNÁŘE "co kdyby" (ztráta práce, růst sazeb, dítě...)
3. SROVNÁNÍ alternativ (refinancování vs. předčasné splácení)
4. AKČNÍ PLÁN (co dělat teď, za rok, za 5 let)
5. ${messageCount > 1 ? 'NEPOZDRAV znovu, jsi v konverzaci.' : 'Krátký úvod při prvním kontaktu.'}
6. Používej **tučné písmo** pro zdůraznění, nepoužívej emoji.
`;

    if (hasContext) {
        prompt += `
AKTUÁLNÍ SITUACE KLIENTA:
- Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
- Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč (${contextData.rate}% p.a.)
- Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč/měs
- LTV: ${contextData.ltv}% | DSTI: ${contextData.dsti}%
- Věk: ${contextData.age} let

ANALÝZA FIXACE (${context.formData?.fixation} let):
- Celkem zaplatí na úrocích: ${contextData.fixationDetails.totalInterestForFixation?.toLocaleString('cs-CZ')} Kč
- Po fixaci zbude dluh: ${contextData.fixationDetails.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč
- Predikce nové splátky při poklesu sazeb: ${contextData.fixationDetails.futureScenario?.optimistic?.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč
`;
    } else {
        prompt += 'Klient zatím nemá spočítanou hypotéku. Vyzvi ho, aby vyplnil údaje v kalkulačce, abys mu mohl dát přesné odpovědi.';
    }

    prompt += `\n\nDOTAZ UŽIVATELE: "${userMessage}"\n\nINSTRUKCE PRO ODPOVĚĎ:\n`;
    
    // --- SPECIALIZOVANÉ ANALÝZY ---
    
    if (userMessage.toLowerCase().match(/rizik|co kdyby|ztratím|přijdu o|nemoc|krize|problém|zvládnu/)) {
        if (!hasContext) return prompt + 'Odpověz: "Pro analýzu rizik potřebuji znát vaši situaci. Spočítejte si prosím hypotéku v kalkulačce a já vám ukážu přesné dopady různých scénářů."';
        
        const emergencyFund = contextData.monthlyPayment * 6;
        const stressPayment = calculateMonthlyPayment(contextData.loanAmount, contextData.rate + 2, contextData.loanTerm);

        let response = `**Analýza rizik pro vaši situaci:**\n\n`;
        response += `**1. Ztráta příjmu:**\nPro pokrytí splátek na 6 měsíců doporučuji vytvořit finanční rezervu ve výši **${emergencyFund.toLocaleString('cs-CZ')} Kč**.\n\n`;
        response += `**2. Růst sazeb o 2 %:**\nPo skončení fixace by se vaše splátka mohla zvýšit na cca **${Math.round(stressPayment).toLocaleString('cs-CZ')} Kč**. To je nárůst o **${Math.round(stressPayment - contextData.monthlyPayment).toLocaleString('cs-CZ')} Kč** měsíčně.\n\n`;
        response += `**AKČNÍ PLÁN:**\n- **HNED:** Začněte budovat rezervu. Odkládejte měsíčně alespoň 10 % příjmu.\n- **POJIŠTĚNÍ:** Zvažte pojištění schopnosti splácet, které vás kryje pro případ nemoci či ztráty zaměstnání.`;
        return prompt + `Stručně odpověz na dotaz ohledně rizik. Použij tento formát:\n"${response}"`;
    }

    if (userMessage.toLowerCase().match(/refinanc|lepší.*nabídka|nižší.*úrok|ušetřit/)) {
        if (!hasContext) return prompt + 'Odpověz: "Abych mohl porovnat refinancování, potřebuji znát vaši současnou hypotéku. Zadejte prosím údaje do kalkulačky."';

        const bestMarketRate = 4.09; // Simulovaná nejlepší sazba na trhu
        const rateDiff = contextData.rate - bestMarketRate;
        if (rateDiff < 0.2) return prompt + `Odpověz: "Vaše sazba ${contextData.rate}% je velmi dobrá. Refinancování by se vám v tuto chvíli pravděpodobně nevyplatilo kvůli poplatkům. Lepší strategií je zkusit vyjednat slevu u stávající banky."`;

        const newPayment = calculateMonthlyPayment(contextData.fixationDetails.remainingBalanceAfterFixation, bestMarketRate, contextData.loanTerm - contextData.fixation);
        const monthlySaving = contextData.monthlyPayment - newPayment;

        let response = `**Analýza refinancování po konci fixace:**\n\n`;
        response += `Při přechodu na sazbu **${bestMarketRate}%** by vaše nová splátka byla cca **${Math.round(newPayment).toLocaleString('cs-CZ')} Kč**.\n\n`;
        response += `**Měsíční úspora:** **${Math.round(monthlySaving).toLocaleString('cs-CZ')} Kč**\n`;
        response += `**Roční úspora:** **${Math.round(monthlySaving * 12).toLocaleString('cs-CZ')} Kč**\n\n`;
        response += `**DOPORUČENÍ:** Refinancování se vám vyplatí. Doporučuji začít řešit 3-6 měsíců před koncem fixace. Náš specialista vám s tím pomůže.`;
        return prompt + `Stručně odpověz na dotaz ohledně refinancování. Použij tento formát:\n"${response}"`;
    }

    if (userMessage.toLowerCase().match(/investovat|splácet|mimořádná splátka/)) {
        if (!hasContext) return prompt + 'Odpověz: "Pro srovnání investic a splácení potřebuji znát parametry vaší hypotéky. Vyplňte prosím kalkulačku."';
        
        const investmentReturnRate = 0.07; // Průměrný roční výnos 7 %
        const mortgageRate = contextData.rate / 100;
        
        let response = `**Srovnání: Mimořádná splátka vs. Investice**\n\n`;
        response += `**Úrok na hypotéce:** **${contextData.rate}%**\n`;
        response += `**Očekávaný výnos z investice:** **7 %**\n\n`;
        response += `**VÝSLEDEK:** Jelikož je očekávaný výnos z investice (7 %) vyšší než úrok na vaší hypotéce (${contextData.rate} %), **matematicky je výhodnější volné prostředky investovat.**\n\n`;
        response += `**POZOR:** Investice s sebou nesou riziko, zatímco splátka hypotéky je jistota. Bezpečnou strategií je rozdělit prostředky - část na splátku a část do investic.`;
        return prompt + `Stručně odpověz na dotaz ohledně investic vs. splácení. Použij tento formát:\n"${response}"`;
    }
    
    // --- ZÁKLADNÍ ODPOVĚDI ---
    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit|schůzka/)) {
        return prompt + `Klient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"Rozumím. Spojení s odborníkem je nejlepší krok. Rád vám s tím pomohu. Otevírám formulář pro spojení se specialistou."}`;
    }

    return prompt + 'Odpověz na dotaz stručně a věcně na základě poskytnutého kontextu. Pokud nemáš dost informací, požádej o vyplnění kalkulačky. Na konci vždy nabídni pomoc specialisty.';
}

const calculateMonthlyPayment = (p, r, t) => { 
    const mR = r / 1200, n = t * 12; 
    if (mR === 0) return p / n; 
    return (p * mR * Math.pow(1 + mR, n)) / (Math.pow(1 + mR, n) - 1); 
};


const handler = async (event) => {
    const headers = { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error('Chybí GEMINI_API_KEY.');

        const prompt = createSystemPrompt(message, context);

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 250,
                temperature: 0.4,
            }
        };
        
        const modelName = "gemini-1.5-flash-latest";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('API Error Body:', errorBody); 
            throw new Error(`Chyba API: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        
        if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts) {
            throw new Error("AI nevrátila validní odpověď: " + JSON.stringify(data));
        }

        const responseText = data.candidates[0].content.parts[0].text;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            try {
                return { statusCode: 200, headers, body: jsonMatch[0] };
            } catch (e) { /* ignore and fall through */ }
        }
        
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ response: responseText.trim() }) 
        };

    } catch (error) {
        console.error('Chyba ve funkci chat.js:', error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: `Došlo k chybě při komunikaci s AI. (Detail: ${error.message})` }) 
        };
    }
};

module.exports = { handler };
