// netlify/functions/chat.js - v5.0 - Enhanced Context-Aware AI
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
    const isFromOurCalculator = context?.isDataFromOurCalculator || context?.calculation?.isFromOurCalculator;
    const messageCount = context?.messageCount || 0;
    
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
        marketInfo: context.calculation?.marketInfo,
        quickAnalysis: context.calculation?.fixationDetails?.quickAnalysis,
        isFromOurCalculator: isFromOurCalculator
    } : null;

    let prompt = `Jsi profesionální hypoteční poradce s 15 lety zkušeností a AI analytické nástroje k dispozici. 
    Pracuješ pro platformu Hypoteky Ai, která analyzuje data z ${contextData?.marketInfo?.bankCount || 19} partnerských bank.
    
    KLÍČOVÉ PRINCIPY:
    - Vždy poskytuj KONKRÉTNÍ ČÍSLA a PŘÍKLADY z reálného trhu
    - Odpovědi musí být PRAKTICKÉ a AKČNÍ (co konkrétně má klient udělat)
    - Používej reálná data z českého trhu (aktuální sazby 4.09-5.29% podle bonity)
    - Buď přátelský ale profesionální
    - Max 3-5 vět na odpověď, ale bohatý obsah
    - ${messageCount > 0 ? 'NEPOZDRAV uživatele znovu, už jste v konverzaci' : 'Pozdrav uživatele pouze při prvním kontaktu'}
    
    ${hasContext ? `
    ${isFromOurCalculator ? 'DŮLEŽITÉ: Data jsou z NAŠÍ kalkulačky, ne od klienta! Negratuluj k sazbě, my jsme ji vypočítali!' : ''}
    
    AKTUÁLNÍ SITUACE KLIENTA:
    - Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
    - ${isFromOurCalculator ? 'Naše kalkulačka vypočítala' : 'Klient má'} splátku: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč
    - ${isFromOurCalculator ? 'Nabízená' : 'Aktuální'} úroková sazba: ${contextData.rate?.toFixed(2)}%
    - Skóre schválení dle naší analýzy: ${contextData.totalScore}%
    - LTV: ${contextData.ltv}%
    - DSTI skóre: ${contextData.dsti}%
    - Bonita skóre: ${contextData.bonita}%
    
    ${contextData.fixationDetails ? `
    DETAILNÍ ANALÝZA FIXACE:
    - Za fixaci ${context.formData?.fixation} let zaplatí: ${contextData.fixationDetails.totalPaymentsInFixation?.toLocaleString('cs-CZ')} Kč
    - Z toho úroky: ${contextData.fixationDetails.totalInterestForFixation?.toLocaleString('cs-CZ')} Kč
    - Splaceno z jistiny: ${contextData.fixationDetails.totalPrincipalForFixation?.toLocaleString('cs-CZ')} Kč
    - Po fixaci zbývá: ${contextData.fixationDetails.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč
    ` : ''}
    ` : 'Klient zatím nemá spočítanou hypotéku. Doporuč mu použít rychlou kalkulačku.'}
    
    UŽIVATELŮV DOTAZ: "${userMessage}"`;

    // Seznam bank
    if (userMessage.toLowerCase().match(/bank|které banky|seznam bank|s kým spoluprac|partneř/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }

    // Úvodní analýza
    if (userMessage === "Proveď úvodní analýzu mé situace." || userMessage.includes("analýza")) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz POUZE JSON: {"tool":"initialAnalysis","response":"Nejprve si spočítejte hypotéku pomocí rychlé kalkulačky. Stačí zadat částku úvěru, hodnotu nemovitosti a příjem. Analýza zabere 30 sekund."}`;
        }
        
        let analysis = `<strong>📊 Kompletní AI analýza ${isFromOurCalculator ? 'naší nabídky' : 'vaší hypotéky'}:</strong>\n\n`;
        
        if (isFromOurCalculator) {
            analysis += `✅ <strong>Naše kalkulačka našla ${contextData.rate <= 4.5 ? 'výbornou' : 'solidní'} nabídku!</strong>\n`;
            analysis += `S úrokem ${contextData.rate}% zaplatíte měsíčně ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč.\n\n`;
        } else {
            if (contextData.rate <= contextData.marketInfo?.bestAvailableRate + 0.3) {
                analysis += `✅ <strong>Výborná pozice!</strong> Váš úrok ${contextData.rate}% je pouze ${(contextData.rate - contextData.marketInfo.bestAvailableRate).toFixed(2)}% nad nejlepší sazbou.\n\n`;
            } else {
                analysis += `⚠️ <strong>Solidní pozice.</strong> Váš úrok ${contextData.rate}% je ${(contextData.rate - contextData.marketInfo.averageRate).toFixed(2)}% ${contextData.rate > contextData.marketInfo.averageRate ? 'nad' : 'pod'} průměrem.\n\n`;
            }
        }
        
        analysis += `<strong>💰 Klíčová čísla:</strong>\n`;
        analysis += `• Měsíční splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč\n`;
        analysis += `• Denní náklady: ${contextData.quickAnalysis?.dailyCost?.toLocaleString('cs-CZ')} Kč (cena kávy)\n`;
        analysis += `• Za ${context.formData?.fixation} let přeplatíte: ${contextData.fixationDetails?.totalInterestForFixation?.toLocaleString('cs-CZ')} Kč\n`;
        analysis += `• Daňová úleva: až ${(contextData.quickAnalysis?.taxSavings * 12)?.toLocaleString('cs-CZ')} Kč ročně\n\n`;
        
        analysis += `<strong>🎯 ${isFromOurCalculator ? 'Šance na schválení této nabídky' : 'Vaše šance na schválení'}: ${contextData.totalScore}%</strong>\n`;
        if (contextData.totalScore >= 80) {
            analysis += `Máte výborné šance na schválení. ${isFromOurCalculator ? 'Tuto nabídku lze reálně získat!' : 'Banky o vás budou bojovat!'}\n\n`;
        } else if (contextData.totalScore >= 60) {
            analysis += `Dobré šance na schválení. S naší pomocí to zvládneme.\n\n`;
        } else {
            analysis += `Schválení bude vyžadovat práci. Spojte se s naším specialistou.\n\n`;
        }
        
        if (contextData.fixationDetails?.futureScenario?.optimistic) {
            analysis += `<strong>💡 AI predikce:</strong> Pokud sazby klesnou na ${contextData.fixationDetails.futureScenario.optimistic.rate.toFixed(2)}%, ušetříte ${contextData.fixationDetails.futureScenario.optimistic.monthlySavings?.toLocaleString('cs-CZ')} Kč měsíčně!`;
        }
        
        return prompt + `\n\nVytvoř analýzu. Odpověz POUZE JSON: {"tool":"initialAnalysis","response":"${analysis}"}`;
    }

    // Kontakt/specialista
    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit|konzultace|telefon|schůzka|sejít|zavolat|domluvit/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Spojím vás s naším TOP hypotečním specialistou. Zavolá vám do 24 hodin a projedná všechny detaily včetně vyjednání nejlepších podmínek. Otevírám kontaktní formulář..."}`;
    }

    // Sazby a úroky - s kontextem
    if (userMessage.toLowerCase().match(/sazb|úrok|kolik.*procent|lepší|nejlepší/)) {
        if (hasContext && isFromOurCalculator) {
            const improvement = contextData.rate - contextData.marketInfo?.bestAvailableRate;
            const monthlySaving = Math.round(contextData.monthlyPayment * (improvement / contextData.rate));
            
            prompt += `\n\nOdpověď s KONKRÉTNÍMI ČÍSLY z naší nabídky. Příklad: "Naše kalkulačka našla pro vás sazbu ${contextData.rate}%, což je ${contextData.marketInfo?.ratePosition === 'excellent' ? 'výborná nabídka' : 'solidní nabídka'}. TOP klienti mají ${contextData.marketInfo?.bestAvailableRate}%, takže máte prostor pro vyjednávání o ${monthlySaving} Kč měsíčně. Náš specialista může zkusit vyjednat ještě lepší podmínky."`;
        } else if (hasContext) {
            prompt += `\n\nOdpověď o aktuální situaci klienta.`;
        } else {
            prompt += `\n\nOdpověď: "📊 Aktuální sazby (${new Date().toLocaleDateString('cs-CZ')}): TOP klienti 4.09-4.29% (LTV<70%, příjem 70k+), Standard 4.29-4.69% (LTV<80%), Vyšší LTV 4.89-5.29%. Na 4 mil. je rozdíl mezi 4.09% a 4.59% celkem 480 tisíc Kč! Spočítejte si vaši sazbu kalkulačkou."`;
        }
    }

    // ModelovÃ¡nÃ­ scÃ©nÃ¡Å™Å¯
    if (userMessage.match(/\d+/)) {
        const numbers = userMessage.match(/\d+/g);
        const text = userMessage.toLowerCase();
        
        let params = {};
        
        // Inteligentní parsování částek
        if (text.match(/mil|mega|milion/)) {
            const amount = parseInt(numbers[0]) * 1000000;
            if (text.match(/půjčit|úvěr|hypotéka|potřebuj|chtěl|chci/)) {
                params.loanAmount = amount;
                params.propertyValue = Math.round(amount * 1.25);
            } else if (text.match(/nemovitost|byt|dům|koupit/)) {
                params.propertyValue = amount;
                params.loanAmount = Math.round(amount * 0.8);
            }
        } else if (text.match(/tisíc|tis\.|příjem|výděl|plat/)) {
            const amount = parseInt(numbers[0]) * 1000;
            if (text.match(/příjem|vydělávám|mám|plat|výplat/)) {
                params.income = amount;
                // Automatický odhad hypotéky
                const maxLoan = amount * 100; // Hrubý odhad
                params.loanAmount = Math.round(maxLoan * 0.8);
                params.propertyValue = Math.round(maxLoan);
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

    prompt += `\n\n
    INSTRUKCE PRO ODPOVĚĎ:
    1. ${messageCount > 0 ? 'NEPOZDRAV uživatele znovu' : 'Pozdrav pouze při prvním kontaktu'}
    2. ${isFromOurCalculator ? 'Data jsou z NAŠÍ kalkulačky - negratuluj, nabízej další kroky' : 'Pracuj s daty od klienta'}
    3. Vždy uveď konkrétní čísla, procenta nebo částky relevantní pro dotaz
    4. Dávej PRAKTICKÉ TIPY co může udělat hned teď
    5. Nabízej další kroky (spočítat detailně, probrat se specialistou)
    6. Max 3-5 vět, ale s vysokou informační hodnotou
    7. Používej emoji pro lepší přehlednost
    
    Odpověz jako zkušený hypoteční expert s AI nástroji, ne jako robot.`;

    return prompt;
}

export { handler };
