// netlify/functions/chat.js - v3.0 - Value-focused AI Assistant
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
        bonita: context.calculation?.approvability?.bonita,
        fixationDetails: context.calculation?.fixationDetails,
        marketInfo: context.calculation?.marketInfo
    } : null;

    let prompt = `Jsi profesionální hypoteční poradce s 15 lety zkušeností. Poskytuješ KONKRÉTNÍ, HODNOTNÉ a PRAKTICKÉ rady.
    
    KLÍČOVÉ PRINCIPY:
    - Vždy poskytuj KONKRÉTNÍ ČÍSLA a PŘÍKLADY
    - Odpovědi musí být PRAKTICKÉ a AKČNÍ
    - Používej reálná data z českého trhu
    - Buď přátelský ale profesionální
    - Max 3-5 vět na odpověď
    
    ${hasContext ? `
    AKTUÁLNÍ SITUACE KLIENTA:
    - Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
    - Měsíční splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč
    - Úroková sazba: ${contextData.rate?.toFixed(2)}%
    - Celkové skóre: ${contextData.totalScore}%
    - LTV: ${contextData.ltv}%
    ${contextData.fixationDetails ? `
    - Za fixaci ${context.formData?.fixation} let zaplatí: ${contextData.fixationDetails.totalPaymentsInFixation?.toLocaleString('cs-CZ')} Kč
    - Z toho úroky: ${contextData.fixationDetails.totalInterestForFixation?.toLocaleString('cs-CZ')} Kč
    - Po fixaci zbývá: ${contextData.fixationDetails.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč
    ` : ''}
    ${contextData.marketInfo ? `
    - Průměrná sazba na trhu: ${contextData.marketInfo.averageRate}%
    - Nejlepší dostupná: ${contextData.marketInfo.bestAvailableRate}%
    - Pozice klienta: ${contextData.marketInfo.ratePosition === 'excellent' ? 'výborná' : contextData.marketInfo.ratePosition === 'good' ? 'dobrá' : 'průměrná'}
    ` : ''}
    ` : 'Klient zatím nemá spočítanou hypotéku.'}
    
    UŽIVATELŮV DOTAZ: "${userMessage}"`;

    // Special case: Initial analysis
    if (userMessage === "Proveď úvodní analýzu mé situace.") {
        if (!hasContext) {
            return prompt + `\n\nOdpověz POUZE JSON: {"tool":"initialAnalysis","response":"Nejprve si spočítejte hypotéku pomocí rychlé kalkulačky v pravém panelu. Stačí zadat částku a příjem."}`;
        }
        
        let analysis = `<strong>Vaše pozice:</strong> `;
        if (contextData.rate <= contextData.marketInfo?.bestAvailableRate + 0.3) {
            analysis += `Výborná! Máte sazbu ${contextData.rate}%, což je jen ${(contextData.rate - contextData.marketInfo.bestAvailableRate).toFixed(2)}% nad nejlepší sazbou na trhu.\n\n`;
        } else {
            analysis += `Solidní. Vaše sazba ${contextData.rate}% je o ${(contextData.rate - contextData.marketInfo.averageRate).toFixed(2)}% ${contextData.rate > contextData.marketInfo.averageRate ? 'nad' : 'pod'} průměrem trhu.\n\n`;
        }
        
        analysis += `<strong>Klíčová čísla:</strong>\n`;
        analysis += `• Měsíčně zaplatíte ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč\n`;
        analysis += `• Za ${context.formData?.fixation} let fixace přeplatíte ${contextData.fixationDetails?.totalInterestForFixation?.toLocaleString('cs-CZ')} Kč na úrocích\n`;
        analysis += `• Po fixaci zbyde splatit ${contextData.fixationDetails?.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč\n\n`;
        
        if (contextData.fixationDetails?.futureScenario?.optimistic) {
            analysis += `<strong>💡 Tip:</strong> Pokud sazby klesnou na ${contextData.fixationDetails.futureScenario.optimistic.rate.toFixed(2)}%, ušetříte ${contextData.fixationDetails.futureScenario.optimistic.monthlySavings?.toLocaleString('cs-CZ')} Kč měsíčně!`;
        }
        
        return prompt + `\n\nVytvoř analýzu. Odpověz POUZE JSON: {"tool":"initialAnalysis","response":"${analysis}"}`;
    }

    // Detect contact/specialist request
    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit|konzultace|telefon|schůzka|sejít|zavolat/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Samozřejmě! Otevírám formulář pro rychlé spojení. Specialista vám zavolá do 24 hodin a projedná všechny detaily."}`;
    }

    // Detect rate inquiries - provide VALUE
    if (userMessage.toLowerCase().match(/sazb|úrok|4[,.]09|3[,.]8|lepší|nejlepší/)) {
        if (hasContext) {
            const improvement = contextData.rate - contextData.marketInfo?.bestAvailableRate;
            const monthlySaving = Math.round(contextData.monthlyPayment * (improvement / contextData.rate));
            
            prompt += `\n\nOdpověz s KONKRÉTNÍMI ČÍSLY. Příklad: "Vaše sazba ${contextData.rate}% je ${contextData.marketInfo?.ratePosition === 'excellent' ? 'výborná' : 'solidní'}. Nejlepší klienti dostávají ${contextData.marketInfo?.bestAvailableRate}%, což by vám ušetřilo ~${monthlySaving} Kč měsíčně. Reálně můžete dostat ${(contextData.rate - 0.2).toFixed(2)}% při ${contextData.ltv < 80 ? 'vašem LTV' : 'snížení LTV pod 80%'}."`;
        } else {
            prompt += `\n\nOdpověď: "Aktuální sazby: TOP klienti (LTV<70%, vysoký příjem) dostávají 3.69-3.89%. Standardní nabídky 4.09-4.49%. Vyšší LTV nebo nižší bonita 4.69-5.29%. Spočítejte si konkrétní nabídku vpravo!"`;
        }
    }

    // Detect scenario modeling with smart parsing
    if (userMessage.match(/\d+/)) {
        const numbers = userMessage.match(/\d+/g);
        const text = userMessage.toLowerCase();
        
        let params = {};
        
        // Parse amounts
        if (text.match(/mil|mega|milion/)) {
            const amount = parseInt(numbers[0]) * 1000000;
            if (text.match(/půjčit|úvěr|hypotéka|potřebuj/)) {
                params.loanAmount = amount;
                params.propertyValue = Math.round(amount * 1.25);
            }
        } else if (text.match(/tisíc|tis\.|příjem/)) {
            const amount = parseInt(numbers[0]) * 1000;
            if (text.match(/příjem|vydělávám|mám|plat/)) {
                params.income = amount;
            }
        }
        
        // Parse years
        if (text.match(/let|rok/)) {
            const years = numbers.find(n => parseInt(n) >= 5 && parseInt(n) <= 30);
            if (years) params.loanTerm = parseInt(years);
        }
        
        if (Object.keys(params).length > 0) {
            return prompt + `\n\nKlient modeluje scénář. Odpověz POUZE JSON: {"tool":"modelScenario","params":${JSON.stringify(params)}}`;
        }
    }

    // Common questions with VALUE-FOCUSED answers
    if (userMessage.toLowerCase().match(/fixace|fixaci|3 roky|5 let|10 let/)) {
        prompt += `\n\nVYSOKÁ HODNOTA: "Aktuálně: 3 roky = 4.29%, 5 let = 4.09% (nejpopulárnější), 10 let = 4.39%. Na 4 mil. Kč je rozdíl 3 vs. 5 let cirka 800 Kč měsíčně. 5 let dává jistotu při mírně vyšší ceně."`;
    }

    if (userMessage.toLowerCase().match(/ltv|loan to value|kolik.*půjčit/)) {
        prompt += `\n\nPRAKTICKÁ RADA: "Banky půjčují: do 80% LTV standardně, do 90% s vyšším úrokem (+0.3-0.5%), nad 90% výjimečně (+0.7-1%). Na nemovitost za 5 mil. optimálně 4 mil. (80%), max 4.5 mil. (90%)."`;
    }

    if (userMessage.toLowerCase().match(/dsti|splátka.*příjem|kolik.*příjem/)) {
        prompt += `\n\nKONKRÉTNĚ: "ČNB limit: splátky max 50% čistého příjmu, ideálně pod 40%. S příjmem 50k můžete splácet max 25k, komfortně 20k. To je hypotéka ~4.5 mil. na 25 let."`;
    }

    if (userMessage.toLowerCase().match(/dokument|doklad|papír|potřebuj|připravit/)) {
        prompt += `\n\nCHECKLIST: "Základní: 1) Občanka 2) Výpisy z účtu 3 měsíce 3) Potvrzení příjmu 4) Kupní smlouva. OSVČ navíc: daňové přiznání 2 roky. Vše připravte v PDF, ušetříte týden času!"`;
    }

    if (userMessage.toLowerCase().match(/jak dlouho|proces|schválení|vyřízení|trvá|čekat/)) {
        prompt += `\n\nČASOVÁ OSA: "Předschválení 2-3 dny → Ocenění nemovitosti 3-5 dnů → Finální schválení 5-7 dnů → Podpis smlouvy → Čerpání 14 dnů. Celkem 3-4 týdny při kompletních podkladech."`;
    }

    prompt += `\n\n
    INSTRUKCE PRO ODPOVĚĎ:
    1. VŽDY uveď konkrétní čísla, procenta nebo částky
    2. Pokud klient má spočítáno, vztahuj vše k jeho situaci
    3. Dávej PRAKTICKÉ TIPY co může udělat hned
    4. Nabízej další kroky (spočítat, probrat se specialistou)
    5. Max 3-5 vět, hodnotné a akční
    
    Odpověz jako zkušený poradce, ne jako robot.`;

    return prompt;
}

export { handler };