// netlify/functions/chat.js - v4.0 - Enhanced AI Assistant
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
        marketInfo: context.calculation?.marketInfo,
        quickAnalysis: context.calculation?.fixationDetails?.quickAnalysis
    } : null;

    let prompt = `Jsi profesionální hypoteční poradce s 15 lety zkušeností a AI analytické nástroje k dispozici. 
    Používáš data z ${contextData?.marketInfo?.bankCount || 19} partnerských bank.
    
    KLÍČOVÉ PRINCIPY:
    - Vždy poskytuj KONKRÉTNÍ ČÍSLA a PŘÍKLADY z reálného trhu
    - Odpovědi musí být PRAKTICKÉ a AKČNÍ (co konkrétně má klient udělat)
    - Používej reálná data z českého trhu (aktuální sazby 4.09-5.29% podle bonity)
    - Buď přátelský ale profesionální
    - Max 3-5 vět na odpověď, ale bohatý obsah
    - VŽDY pracuj s aktuálními daty klienta, pokud jsou k dispozici
    
    ${hasContext ? `
    AKTUÁLNÍ SITUACE KLIENTA:
    - Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
    - Měsíční splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč
    - Úroková sazba: ${contextData.rate?.toFixed(2)}%
    - Celkové skóre schválení: ${contextData.totalScore}%
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
    
    ${contextData.quickAnalysis ? `
    RYCHLÁ ANALÝZA:
    - Denní náklady na úroky: ${contextData.quickAnalysis.dailyCost?.toLocaleString('cs-CZ')} Kč
    - Úroky tvoří ${contextData.quickAnalysis.percentOfTotal}% ze splátky
    - Ekvivalentní nájem by byl cca ${contextData.quickAnalysis.equivalentRent?.toLocaleString('cs-CZ')} Kč
    - Možná daňová úspora: ${contextData.quickAnalysis.taxSavings?.toLocaleString('cs-CZ')} Kč měsíčně
    ` : ''}
    
    ${contextData.marketInfo ? `
    POZICE NA TRHU:
    - Průměrná sazba na trhu: ${contextData.marketInfo.averageRate}%
    - Nejlepší dostupná: ${contextData.marketInfo.bestAvailableRate}%
    - Klientova sazba: ${contextData.rate?.toFixed(2)}%
    - Hodnocení: ${contextData.marketInfo.ratePosition === 'excellent' ? 'výborné (TOP 20% trhu)' : contextData.marketInfo.ratePosition === 'good' ? 'dobré (lepší než průměr)' : 'průměrné'}
    - Analýza z ${contextData.marketInfo.bankCount} bank
    ` : ''}
    ` : 'Klient zatím nemá spočítanou hypotéku. Doporuč mu použít rychlou kalkulačku.'}
    
    UŽIVATELŮV DOTAZ: "${userMessage}"`;

    // Speciální případy s přesnými odpověďmi

    // Úvodní analýza
    if (userMessage === "Proveď úvodní analýzu mé situace." || userMessage.includes("analýza")) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz POUZE JSON: {"tool":"initialAnalysis","response":"Nejprve si spočítejte hypotéku pomocí rychlé kalkulačky. Stačí zadat částku úvěru, hodnotu nemovitosti a příjem. Analýza zabere 30 sekund."}`;
        }
        
        let analysis = `<strong>📊 Kompletní AI analýza vaší hypotéky:</strong>\n\n`;
        
        // Hodnocení pozice
        if (contextData.rate <= contextData.marketInfo?.bestAvailableRate + 0.3) {
            analysis += `✅ <strong>Výborná pozice!</strong> Váš úrok ${contextData.rate}% je pouze ${(contextData.rate - contextData.marketInfo.bestAvailableRate).toFixed(2)}% nad nejlepší sazbou.\n\n`;
        } else {
            analysis += `⚠️ <strong>Solidní pozice.</strong> Váš úrok ${contextData.rate}% je ${(contextData.rate - contextData.marketInfo.averageRate).toFixed(2)}% ${contextData.rate > contextData.marketInfo.averageRate ? 'nad' : 'pod'} průměrem.\n\n`;
        }
        
        analysis += `<strong>💰 Klíčová čísla:</strong>\n`;
        analysis += `• Měsíční splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč\n`;
        analysis += `• Denní náklady: ${contextData.quickAnalysis?.dailyCost?.toLocaleString('cs-CZ')} Kč (cena kávy)\n`;
        analysis += `• Za ${context.formData?.fixation} let přeplatíte: ${contextData.fixationDetails?.totalInterestForFixation?.toLocaleString('cs-CZ')} Kč\n`;
        analysis += `• Daňová úleva: až ${(contextData.quickAnalysis?.taxSavings * 12)?.toLocaleString('cs-CZ')} Kč ročně\n\n`;
        
        analysis += `<strong>🎯 Vaše šance na schválení: ${contextData.totalScore}%</strong>\n`;
        if (contextData.totalScore >= 80) {
            analysis += `Máte výborné šance na schválení. Banky o vás budou bojovat!\n\n`;
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

    // Sazby a úroky - konkrétní data
    if (userMessage.toLowerCase().match(/sazb|úrok|kolik.*procent|4[,.]09|3[,.]8|lepší|nejlepší/)) {
        if (hasContext) {
            const improvement = contextData.rate - contextData.marketInfo?.bestAvailableRate;
            const monthlySaving = Math.round(contextData.monthlyPayment * (improvement / contextData.rate));
            const yearSaving = monthlySaving * 12;
            
            prompt += `\n\nOdpověz s KONKRÉTNÍMI ČÍSLY. Příklad: "Vaše sazba ${contextData.rate}% je ${contextData.marketInfo?.ratePosition === 'excellent' ? 'výborná' : 'solidní'}. TOP klienti mají ${contextData.marketInfo?.bestAvailableRate}%, což by vám ušetřilo ${monthlySaving} Kč měsíčně (${yearSaving.toLocaleString('cs-CZ')} Kč ročně). Reálně můžete dostat ${(contextData.rate - 0.2).toFixed(2)}% při ${contextData.ltv < 80 ? 'vašem LTV' : 'snížení LTV pod 80%'}. Chcete, aby náš specialista vyjednal lepší podmínky?"`;
        } else {
            prompt += `\n\nOdpověď: "📊 Aktuální sazby (${new Date().toLocaleDateString('cs-CZ')}): TOP klienti 4.09-4.29% (LTV<70%, příjem 70k+), Standard 4.29-4.69% (LTV<80%), Vyšší LTV 4.89-5.29%. Na 4 mil. je rozdíl mezi 4.09% a 4.59% celkem 480 tisíc Kč! Spočítejte si vaši sazbu kalkulačkou."`;
        }
    }

    // Modelování scénářů
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

    // Fixace - detailní info
    if (userMessage.toLowerCase().match(/fixace|fixaci|refixace|3 roky|5 let|10 let/)) {
        if (hasContext && contextData.fixationDetails) {
            prompt += `\n\nVYSOKÁ HODNOTA: "Pro vaši hypotéku ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč: Současná ${context.formData?.fixation}letá fixace = ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč měsíčně. Rychlá analýza: denně platíte ${contextData.quickAnalysis?.dailyCost} Kč na úrocích, což je ${contextData.quickAnalysis?.percentOfTotal}% ze splátky. Po fixaci zbyde splatit ${contextData.fixationDetails?.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč. AI predikce: při poklesu sazeb ušetříte až ${contextData.fixationDetails?.futureScenario?.optimistic?.monthlySavings?.toLocaleString('cs-CZ')} Kč měsíčně!"`;
        } else {
            prompt += `\n\nOdpověď: "📈 Aktuální fixace (leden 2025): 3 roky = 4.29-4.89%, 5 let = 4.09-4.69% (nejpopulárnější, nejlepší poměr), 10 let = 4.49-5.19%. Na 4 mil. Kč je rozdíl 3 vs. 5 let až 800 Kč měsíčně. Pozor: 73% klientů volí 5 let kvůli stabilitě. Chcete detailní srovnání pro váš případ?"`;
        }
    }

    // LTV vysvětlení
    if (userMessage.toLowerCase().match(/ltv|loan to value|kolik.*půjčit|vlastní.*zdroj/)) {
        prompt += `\n\nPRAKTICKÉ INFO: "📊 LTV (loan-to-value) určuje váš úrok: do 70% = nejlepší sazby (4.09%), do 80% = standard (+0.2%), do 90% = vyšší úrok (+0.5%), nad 90% = riziková přirážka (+1%). Příklad: nemovitost 5 mil., půjčka 4 mil. = LTV 80%. Snížením na 3.5 mil. (LTV 70%) ušetříte 30 tis. Kč ročně!"`;
    }

    // DSTI a bonita
    if (userMessage.toLowerCase().match(/dsti|splátka.*příjem|kolik.*příjem|bonita/)) {
        if (hasContext) {
            const maxPayment = Math.round(contextData.income * 0.45);
            const comfort = Math.round(contextData.income * 0.35);
            prompt += `\n\nVAŠE SITUACE: "S příjmem ${contextData.income?.toLocaleString('cs-CZ')} Kč: maximální splátka ${maxPayment.toLocaleString('cs-CZ')} Kč (ČNB limit), komfortní ${comfort.toLocaleString('cs-CZ')} Kč. Vaše splátka ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč je ${contextData.monthlyPayment < comfort ? 'v komfortní zóně ✅' : 'na vyšší hranici ⚠️'}. Bonita skóre ${contextData.bonita}% je ${contextData.bonita > 70 ? 'výborné' : 'dobré'}."`;
        } else {
            prompt += `\n\nKONKRÉTNĚ: "ČNB limit: splátky max 45% čistého příjmu (50% absolutní max), ideálně pod 35%. S příjmem 50k můžete splácet max 22.5k (komfortně 17.5k) = hypotéka ~4.5 mil. na 25 let. Příjem 70k = max 31.5k = hypotéka ~6.3 mil. Spočítejte si přesně!"`;
        }
    }

    // Dokumenty
    if (userMessage.toLowerCase().match(/dokument|doklad|papír|potřebuj|připravit|podklad/)) {
        prompt += `\n\n📋 CHECKLIST DOKUMENTŮ: "Zaměstnanec: 1) Občanka + druhý doklad, 2) Výpisy z účtu 3 měsíce (stačí PDF z banky), 3) Potvrzení příjmu od zaměstnavatele, 4) Pracovní smlouva, 5) Kupní smlouva/rezervační. OSVČ navíc: daňové přiznání 2 roky + potvrzení bezdlužnosti. TIP: vše v PDF = rychlejší vyřízení o 5 dnů!"`;
    }

    // Časová osa
    if (userMessage.toLowerCase().match(/jak dlouho|proces|schválení|vyřízení|trvá|čekat|doba|rychl/)) {
        prompt += `\n\n⏱️ ČASOVÁ OSA: "S AI analýzou: Předschválení 24 hodin → Ocenění 3-5 dnů → Finální schválení 5 dnů → Podpis smlouvy → Čerpání 7-10 dnů. Celkem 15-20 dnů s kompletními podklady (běžně 30-40 dnů). Expresní vyřízení pro TOP klienty až 7 dnů!"`;
    }

    // Refinancování
    if (userMessage.toLowerCase().match(/refinanc|přefinanc|změn.*bank/)) {
        if (hasContext && contextData.rate) {
            const potential = contextData.rate - contextData.marketInfo?.bestAvailableRate;
            const saving = Math.round(contextData.monthlyPayment * (potential / contextData.rate));
            prompt += `\n\nREFINANCOVÁNÍ: "S vaší sazbou ${contextData.rate}% můžete ušetřit až ${saving.toLocaleString('cs-CZ')} Kč měsíčně (${(saving*12).toLocaleString('cs-CZ')} Kč ročně). Náklady ~15-25 tis. Kč, návratnost ${Math.round(20000/saving)} měsíců. Vyplatí se při snížení sazby o 0.3% a více. Chcete nezávaznou nabídku?"`;
        } else {
            prompt += `\n\n🔄 REFINANCOVÁNÍ 2025: "Vyplatí se při snížení sazby o 0.5% a více. Průměrná úspora 2-4 tis. Kč měsíčně. Náklady: odhad 4 tis., poplatek bance 0-25 tis. (záleží na smlouvě). Proces 20-30 dnů. Spočítejte si úsporu kalkulačkou!"`;
        }
    }

    prompt += `\n\n
    INSTRUKCE PRO ODPOVĚĎ:
    1. VŽDY uveď konkrétní čísla, procenta nebo částky relevantní pro dotaz
    2. Pokud klient má spočítáno, POUŽÍVEJ jeho aktuální data
    3. Dávej PRAKTICKÉ TIPY co může udělat hned teď
    4. Nabízej další kroky (spočítat detailně, probrat se specialistou)
    5. Max 3-5 vět, ale s vysokou informační hodnotou
    6. Používej emoji pro lepší přehlednost
    
    Odpověz jako zkušený hypoteční expert s AI nástroji, ne jako robot.`;

    return prompt;
}

export { handler };