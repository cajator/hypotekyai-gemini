// netlify/functions/chat.js - v13.0 - Přechod na model gemini-1.5-flash-latest
const https = require('https');

// Funkce pro bezpečné volání API, která nahrazuje knihovnu
function callGenerativeApi(apiKey, model, prompt) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            "contents": [{ "parts": [{ "text": prompt }] }]
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            // Používáme stabilní v1 API
            path: `/v1/models/${model}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Chyba při parsování odpovědi od API.'));
                    }
                } else {
                    reject(new Error(`API vrátilo chybu ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Chyba síťového požadavku: ${e.message}`));
        });

        req.write(payload);
        req.end();
    });
}


exports.handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('API klíč pro AI nebyl nakonfigurován.');
        }
        
        const prompt = createSystemPrompt(message, context);
        // ZMĚNA: Používáme novější a dostupnější model
        const result = await callGenerativeApi(apiKey, 'gemini-1.5-flash-latest', prompt);
        
        const responseText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
             return { statusCode: 200, headers, body: JSON.stringify({ response: "Omlouvám se, na tento dotaz nemohu odpovědět. Zkuste to prosím formulovat jinak." }) };
        }
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { /* Pokračuje k textové odpovědi */ }
        }
        
        return { statusCode: 200, headers, body: JSON.stringify({ response: responseText.replace(/```json|```/g, "").trim() }) };

    } catch (error) {
        console.error('Finální chyba ve funkci chatu:', error.toString());
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Došlo k chybě na serveru. Zkontrolujte logy na Netlify.` }) };
    }
};

// Funkce createSystemPrompt zůstává beze změny
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
        ltv: Math.round((context.formData?.loanAmount / context.formData?.propertyValue) * 100),
        ltvScore: context.calculation?.approvability?.ltv,
        dsti: context.calculation?.selectedOffer?.dsti,
        dstiScore: context.calculation?.approvability?.dsti,
        bonita: context.calculation?.approvability?.bonita,
        fixationDetails: context.calculation?.fixationDetails,
        marketInfo: context.calculation?.marketInfo,
        quickAnalysis: context.calculation?.fixationDetails?.quickAnalysis,
        detailedCalculation: context.calculation?.detailedCalculation,
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
    - Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč
    - LTV: ${contextData.ltv}%
    - DSTI: ${contextData.dsti}% (jak velká část příjmu jde na splátku)
    - Zbývá po splátce: ${contextData.detailedCalculation?.remainingAfterPayment?.toLocaleString('cs-CZ')} Kč
    
    SKÓRE SCHVÁLENÍ:
    - Celkové skóre: ${contextData.totalScore}%
    - LTV skóre: ${contextData.ltvScore}% 
    - DSTI skóre: ${contextData.dstiScore}%
    - Bonita skóre: ${contextData.bonita}%
    
    ANALÝZA PODLE ČNB METODIKY:
    - DSTI limit pro tento příjem: ${contextData.detailedCalculation?.dstiLimit}%
    - Aktuální DSTI: ${contextData.dsti}%
    - Stress DSTI (sazba +2%): ${contextData.detailedCalculation?.stressDsti}%
    - Disponibilní příjem: ${contextData.detailedCalculation?.disposableIncome?.toLocaleString('cs-CZ')} Kč
    - Životní minimum: ${contextData.detailedCalculation?.livingMinimum?.toLocaleString('cs-CZ')} Kč
    
    ${contextData.fixationDetails ? `
    DETAILNÍ ANALÝZA FIXACE:
    - Za fixaci ${context.formData?.fixation} let zaplatí: ${contextData.fixationDetails.totalPaymentsInFixation?.toLocaleString('cs-CZ')} Kč
    - Z toho úroky: ${contextData.fixationDetails.totalInterestForFixation?.toLocaleString('cs-CZ')} Kč
    - Splaceno z jistiny: ${contextData.fixationDetails.totalPrincipalForFixation?.toLocaleString('cs-CZ')} Kč
    - Po fixaci zbývá: ${contextData.fixationDetails.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč
    
    SCÉNÁŘE PO FIXACI:
    - Pokles sazby na ${contextData.fixationDetails.futureScenario?.optimistic?.rate?.toFixed(2)}%: splátka ${contextData.fixationDetails.futureScenario?.optimistic?.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč (úspora ${contextData.fixationDetails.futureScenario?.optimistic?.monthlySavings?.toLocaleString('cs-CZ')} Kč/měs)
    - Růst sazby o 0.5%: splátka ${contextData.fixationDetails.futureScenario?.moderateIncrease?.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč (navýšení ${contextData.fixationDetails.futureScenario?.moderateIncrease?.monthlyIncrease?.toLocaleString('cs-CZ')} Kč/měs)
    - Růst sazby o 1.5%: splátka ${contextData.fixationDetails.futureScenario?.pessimistic?.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč (navýšení ${contextData.fixationDetails.futureScenario?.pessimistic?.monthlyIncrease?.toLocaleString('cs-CZ')} Kč/měs)
    ` : ''}
    ` : 'Klient zatím nemá spočítanou hypotéku. Doporuč mu použít rychlou kalkulačku.'}
    
    UŽIVATELŮV DOTAZ: "${userMessage}"`;

    // Seznam bank
    if (userMessage.toLowerCase().match(/bank|které banky|seznam bank|s kým spoluprac|partner/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }

    // Úvodní analýza
    if (userMessage === "Proveď úvodní analýzu mé situace." || userMessage === "Rychlá analýza" || userMessage === "🔊 Rychlá analýza") {
        if (!hasContext) {
            return prompt + `\n\nOdpověz POUZE JSON: {"tool":"initialAnalysis","response":"Nejprve si spočítejte hypotéku pomocí rychlé kalkulačky. Stačí zadat částku úvěru, hodnotu nemovitosti a příjem. Analýza zabere 30 sekund."}`;
        }
        
        let analysis = `<strong>🔊 Kompletní AI analýza ${isFromOurCalculator ? 'naší nabídky' : 'vaší hypotéky'}:</strong>\n\n`;
        
        // Hlavní hodnocení
        if (isFromOurCalculator) {
            if (contextData.totalScore >= 85) {
                analysis += `✅ <strong>VÝBORNÁ NABÍDKA! Schválení téměř jisté (${contextData.totalScore}%)!</strong>\n`;
            } else if (contextData.totalScore >= 70) {
                analysis += `✅ <strong>Dobrá nabídka! Vysoká šance na schválení (${contextData.totalScore}%).</strong>\n`;
            } else if (contextData.totalScore >= 50) {
                analysis += `⚠️ <strong>Standardní nabídka. Šance na schválení ${contextData.totalScore}%.</strong>\n`;
            } else {
                analysis += `❌ <strong>Složitější případ. Šance ${contextData.totalScore}%. Doporučuji konzultaci.</strong>\n`;
            }
        }
        
        analysis += `\n<strong>💰 Vaše čísla:</strong>\n`;
        analysis += `• Měsíční splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč\n`;
        analysis += `• Úrok: ${contextData.rate}% (${contextData.marketInfo?.ratePosition === 'excellent' ? 'výborný' : contextData.marketInfo?.ratePosition === 'good' ? 'dobrý' : 'standardní'})\n`;
        analysis += `• DSTI: ${contextData.dsti}% (${contextData.dsti <= 25 ? 'výborné' : contextData.dsti <= 35 ? 'dobré' : contextData.dsti <= 45 ? 'hraniční' : 'vysoké'})\n`;
        analysis += `• Po splátce vám zbyde: ${contextData.detailedCalculation?.remainingAfterPayment?.toLocaleString('cs-CZ')} Kč\n`;
        analysis += `• Denní náklady: ${contextData.quickAnalysis?.dailyCost?.toLocaleString('cs-CZ')} Kč\n`;
        analysis += `• Daňová úleva: až ${(contextData.quickAnalysis?.taxSavings * 12)?.toLocaleString('cs-CZ')} Kč ročně\n\n`;
        
        analysis += `<strong>🎯 Hodnocení parametrů:</strong>\n`;
        analysis += `• LTV ${contextData.ltv}%: ${contextData.ltvScore >= 85 ? '✅ Výborné' : contextData.ltvScore >= 70 ? '👍 Dobré' : '⚠️ Vyšší'}\n`;
        analysis += `• DSTI skóre: ${contextData.dstiScore >= 90 ? '✅ Výborné' : contextData.dstiScore >= 70 ? '👍 Dobré' : '⚠️ Průměrné'}\n`;
        analysis += `• Bonita: ${contextData.bonita >= 85 ? '✅ Výborná' : contextData.bonita >= 70 ? '👍 Dobrá' : '⚠️ Průměrná'}\n\n`;
        
        // Scénáře budoucnosti
        if (contextData.fixationDetails) {
            analysis += `<strong>📊 Co se může stát po fixaci za ${context.formData?.fixation} let:</strong>\n`;
            analysis += `• 📉 Pokles sazeb: splátka ${contextData.fixationDetails.futureScenario.optimistic.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč (${contextData.fixationDetails.futureScenario.optimistic.monthlySavings > 0 ? '-' : ''}${Math.abs(contextData.fixationDetails.futureScenario.optimistic.monthlySavings)?.toLocaleString('cs-CZ')} Kč)\n`;
            analysis += `• ➡️ Stejné sazby: splátka zůstane ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč\n`;
            analysis += `• 📈 Růst +0.5%: splátka ${contextData.fixationDetails.futureScenario.moderateIncrease.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč (+${contextData.fixationDetails.futureScenario.moderateIncrease.monthlyIncrease?.toLocaleString('cs-CZ')} Kč)\n`;
            analysis += `• 📈 Růst +1.5%: splátka ${contextData.fixationDetails.futureScenario.pessimistic.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč (+${contextData.fixationDetails.futureScenario.pessimistic.monthlyIncrease?.toLocaleString('cs-CZ')} Kč)\n\n`;
        }
        
        // Doporučení
        analysis += `<strong>💡 Co doporučuji:</strong>\n`;
        if (contextData.totalScore >= 85) {
            analysis += `• Máte skvělé parametry! Zkuste vyjednat slevu 0.1-0.2% ze sazby.\n`;
            analysis += `• Zvažte mimořádné splátky pro rychlejší splacení.\n`;
        } else if (contextData.totalScore >= 70) {
            analysis += `• Parametry jsou dobré. Spojte se se specialistou pro vyjednání lepších podmínek.\n`;
            if (contextData.ltv > 80) {
                analysis += `• Snižte LTV pod 80% pro lepší sazbu.\n`;
            }
        } else {
            analysis += `• Doporučuji konzultaci se specialistou pro optimalizaci.\n`;
            if (contextData.dsti > 35) {
                analysis += `• Zvažte delší splatnost pro snížení DSTI.\n`;
            }
        }
        
        return prompt + `\n\nVytvoř analýzu. Odpověz POUZE JSON: {"tool":"initialAnalysis","response":"${analysis}"}`;
    }

    // Fixace dotazy
    if (userMessage.toLowerCase().match(/fixac|změn|jiná fixace|lepší fixace|fixaci/)) {
        if (!hasContext) {
            return prompt + `\n\nKlient se ptá na fixace. Odpověz s konkrétními čísly: "Pro hypotéku 4 mil. Kč: 3 roky = 4.29% (splátka 21 759 Kč), 5 let = 4.39% (21 982 Kč), 7 let = 4.69% (22 652 Kč), 10 let = 4.79% (22 876 Kč). Kratší fixace = nižší úrok, ale častější refixace. Spočítejte si vaši situaci kalkulačkou."`;
        } else {
            return prompt + `\n\nOdpověz o fixacích. Vysvětli rozdíly, co znamená aktuální ${context.formData?.fixation} let fixace a jaké jsou alternativy. Uveď konkrétní čísla.`;
        }
    }

    // Kontakt/specialista
    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit|konzultace|telefon|schůzka|sejít|zavolat|domluvit/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Spojím vás s naším TOP hypotečním specialistou. Zavolá vám do 24 hodin a projedná všechny detaily včetně vyjednání nejlepších podmínek. Otevírám kontaktní formulář..."}`;
    }

    // Sazby a úroky
    if (userMessage.toLowerCase().match(/sazb|úrok|kolik.*procent|lepší|nejlepší/)) {
        if (hasContext && isFromOurCalculator) {
            const improvement = contextData.rate - contextData.marketInfo?.bestAvailableRate;
            const monthlySaving = Math.round(contextData.monthlyPayment * (improvement / contextData.rate));
            
            let response = `Naše kalkulačka našla pro vás sazbu ${contextData.rate}%, což je `;
            if (contextData.marketInfo?.ratePosition === 'excellent') {
                response += `výborná nabídka, jen ${(contextData.rate - contextData.marketInfo.bestAvailableRate).toFixed(2)}% nad nejlepší sazbou na trhu. `;
            } else if (contextData.marketInfo?.ratePosition === 'good') {
                response += `dobrá nabídka, ${(contextData.rate - contextData.marketInfo.averageRate).toFixed(2)}% ${contextData.rate < contextData.marketInfo.averageRate ? 'pod' : 'nad'} průměrem trhu. `;
            } else {
                response += `standardní nabídka. Máte prostor pro vylepšení. `;
            }
            
            if (improvement > 0.1) {
                response += `TOP klienti mají ${contextData.marketInfo?.bestAvailableRate}%, takže máte prostor pro vyjednávání až ${monthlySaving} Kč měsíčně. `;
            }
            
            response += `Náš specialista může zkusit vyjednat ještě lepší podmínky. Základní sazba ČNB je ${contextData.marketInfo?.cnbBaseRate}%.`;
            
            prompt += `\n\nOdpověz: "${response}"`;
        } else if (hasContext) {
            prompt += `\n\nOdpověz o aktuální situaci klienta a sazbách.`;
        } else {
            prompt += `\n\nOdpověz: "📊 Aktuální sazby (${new Date().toLocaleDateString('cs-CZ')}): TOP klienti 4.09-4.29% (LTV<70%, příjem 70k+), Standard 4.29-4.69% (LTV<80%), Vyšší LTV 4.89-5.29%. ČNB základní sazba 4.25%. Na 4 mil. je rozdíl mezi 4.09% a 4.59% celkem 480 tisíc Kč! Spočítejte si vaši sazbu kalkulačkou."`;
        }
    }

    // DSTI vysvětlení
    if (userMessage.toLowerCase().match(/dsti|co je dsti|debt|dluh/)) {
        if (hasContext) {
            prompt += `\n\nVysvětli DSTI: "DSTI (Debt Service to Income) ukazuje, kolik % příjmu jde na splátky. Váš DSTI je ${contextData.dsti}% (${contextData.monthlyPayment} Kč splátka / ${contextData.income} Kč příjem). ČNB limit pro váš příjem je ${contextData.detailedCalculation?.dstiLimit}%. Čím nižší DSTI, tím lépe - máte ${contextData.dstiScore >= 90 ? 'výborné' : contextData.dstiScore >= 70 ? 'dobré' : 'průměrné'} skóre ${contextData.dstiScore}%. Po splátce vám zbývá ${contextData.detailedCalculation?.remainingAfterPayment?.toLocaleString('cs-CZ')} Kč."`;
        } else {
            prompt += `\n\nOdpověz: "DSTI (Debt Service to Income) = kolik % z příjmu jde na splátky všech úvěrů. ČNB limity: příjem nad 50k = max 45%, příjem 30-50k = max 40%, pod 30k = max 35%. Příklad: příjem 50k, splátka 20k = DSTI 40%. Spočítejte si vaše DSTI v kalkulačce."`;
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
        } else if (text.match(/tisíc|tis\.|příjem|vydělávám|plat/)) {
            const amount = parseInt(numbers[0]) * 1000;
            if (text.match(/příjem|vydělávám|mám|plat|výplat/)) {
                params.income = amount;
                // Automatický odhad hypotéky podle ČNB pravidel
                const maxMonthlyPayment = amount * 0.45; // DSTI limit 45% pro vyšší příjmy
                const maxLoan = maxMonthlyPayment * 12 * 9; // Hrubý odhad při 25 letech a 4.5% úroku
                params.loanAmount = Math.round(maxLoan * 0.9);
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
    3. VŽDY uveď správné DSTI (${contextData?.dsti}%), ne špatné hodnoty
    4. Vždy uveď konkrétní čísla, procenta nebo částky relevantní pro dotaz
    5. Dávej PRAKTICKÉ TIPY co může udělat hned teď
    6. Nabízej další kroky (spočítat detailně, probrat se specialistou)
    7. Max 3-5 vět, ale s vysokou informační hodnotou
    8. Používej emoji pro lepší přehlednost
    
    Odpověz jako zkušený hypoteční expert s AI nástroji, ne jako robot.`;

    return prompt;
}

