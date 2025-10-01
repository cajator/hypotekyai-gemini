// netlify/functions/chat.js - v19.0 - FINÁLNÍ OPRAVA
// Návrat k vaší plné 600+ řádkové logice.
// Odstranění problematické Google knihovny a její nahrazení přímým, spolehlivým `fetch` voláním na stabilní v1 API.

// Vaše kompletní, původní a detailní logika pro vytváření promptů. Nic nebylo odstraněno.
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
        age: context.formData?.age,
        children: context.formData?.children,
        employment: context.formData?.employment,
        liabilities: context.formData?.liabilities,
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

    let prompt = `Jsi PREMIUM hypoteční stratég s AI analytickými nástroji. Tvůj cíl není jen prodat hypotéku, ale vytvořit DLOUHODOBOU STRATEGII pro klienta.

🎯 TVOJE MISE:
- Ukazuj KONKRÉTNÍ scénáře budoucnosti (ne obecnosti!)
- Varuj před riziky a ukaž jak se chránit
- Najdi skryté příležitosti k úspoře
- Vytvoř akční plán s čísly a termíny
- Propoj AI analýzu s lidským expertním poradenstvím

⚡ KLÍČOVÉ PRINCIPY:
1. VŽDY konkrétní čísla (ne "může", ale "ušetříte 127 000 Kč")
2. SCÉNÁŘE "co kdyby" (ztráta práce, růst sazeb, dítě...)
3. SROVNÁNÍ alternativ (refinancování vs. předčasné splácení)
4. ČASOVÁ OSA (co dělat teď, za rok, za 5 let)
5. ${messageCount > 0 ? 'NEPOZDRAV znovu' : 'Krátký úvod při prvním kontaktu'}

🦾 NÁSTROJE K DISPOZICI:
- Metodiky 19+ bank v reálném čase
- ČNB stress testy a predikce
- Historická data sazeb (10 let zpět)
- Demografické trendy a životní události

${hasContext ? `
📊 AKTUÁLNÍ SITUACE KLIENTA:

ZÁKLADNÍ DATA:
- Hypotéka: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč na ${contextData.loanTerm} let
- Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč (${contextData.rate}% p.a.)
- Příjem: ${contextData.income?.toLocaleString('cs-CZ')} Kč/měs
- Zbývá po splátce: ${contextData.detailedCalculation?.remainingAfterPayment?.toLocaleString('cs-CZ')} Kč
- LTV: ${contextData.ltv}% | DSTI: ${contextData.dsti}%
- Věk: ${contextData.age} let | Děti: ${contextData.children}

SKÓRE BONITY:
- Celkové: ${contextData.totalScore}%
- LTV: ${contextData.ltvScore}% | DSTI: ${contextData.dstiScore}% | Bonita: ${contextData.bonita}%

${contextData.fixationDetails ? `
ANALÝZA FIXACE (${context.formData?.fixation} let):
- Celkem zaplatí: ${contextData.fixationDetails.totalPaymentsInFixation?.toLocaleString('cs-CZ')} Kč
- Z toho úroky: ${contextData.fixationDetails.totalInterestForFixation?.toLocaleString('cs-CZ')} Kč
- Po fixaci zbude: ${contextData.fixationDetails.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč

PREDIKCE PO FIXACI:
- Pokles sazby na ${contextData.fixationDetails.futureScenario?.optimistic?.rate?.toFixed(2)}%: splátka ${contextData.fixationDetails.futureScenario?.optimistic?.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč
- Růst +0.5%: splátka ${contextData.fixationDetails.futureScenario?.moderateIncrease?.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč
- Růst +1.5%: splátka ${contextData.fixationDetails.futureScenario?.pessimistic?.newMonthlyPayment?.toLocaleString('cs-CZ')} Kč
` : ''}

RYCHLÁ ANALÝZA:
- Denní náklady: ${contextData.quickAnalysis?.dailyCost?.toLocaleString('cs-CZ')} Kč
- Daňová úleva: ${(contextData.quickAnalysis?.taxSavings * 12)?.toLocaleString('cs-CZ')} Kč/rok
- Vs. nájem (75%): ${contextData.quickAnalysis?.equivalentRent?.toLocaleString('cs-CZ')} Kč
` : 'Klient zatím nemá spočítanou hypotéku. Nabídni rychlou kalkulačku.'}

DOTAZ UŽIVATELE: "${userMessage}"`;

    // ===== SPECIALIZOVANÉ ANALÝZY (VAŠE PŮVODNÍ PLNOTUČNÁ LOGIKA) =====
    
    // STRESS TESTY
    if (userMessage.toLowerCase().match(/co kdyby|ztratím|přijdu o|nemoc|nezaměstna|krize|problém|zvládnu|nebezpeč/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz: "Pro stress test potřebuji znát vaši situaci. Spočítejte si hypotéku rychlou kalkulačkou (30 sekund) a já vám ukážu přesně co se stane při různých scénářích."`;
        }
        
        const monthlyPayment = contextData.monthlyPayment;
        const remainingAfter = contextData.detailedCalculation?.remainingAfterPayment;
        const emergencyFund = monthlyPayment * 6;
        
        const stressAnalysis = `<strong>🛡️ STRESS TEST - Co kdyby nastaly problémy?</strong>\n\n`;
        
        let response = stressAnalysis;
        
        response += `<strong>SCÉNÁŘ 1: Ztráta příjmu (nezaměstnanost, nemoc)</strong>\n`;
        response += `• Podpora od úřadu práce: cca 15 000 Kč/měs (60% průměru)\n`;
        response += `• Vaše splátka: ${monthlyPayment.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Chybí vám: ${Math.max(0, monthlyPayment - 15000).toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `• Doporučená rezerva: ${emergencyFund.toLocaleString('cs-CZ')} Kč (6 měsíců)\n`;
        response += `• ${remainingAfter >= emergencyFund / 6 ? '✅ Máte prostor vytvořit rezervu' : '⚠️ Rezervu vytváříte obtížně'}\n\n`;
        
        response += `<strong>SCÉNÁŘ 2: Růst sazeb o 2% (pesimistický)</strong>\n`;
        const stressPayment = contextData.fixationDetails?.futureScenario?.pessimistic?.newMonthlyPayment || (monthlyPayment * 1.15);
        const stressIncrease = stressPayment - monthlyPayment;
        response += `• Nová splátka po ${contextData.fixation} letech: ${Math.round(stressPayment).toLocaleString('cs-CZ')} Kč\n`;
        response += `• Navýšení: ${Math.round(stressIncrease).toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `• Nové DSTI: cca ${Math.round((stressPayment / contextData.income) * 100)}%\n`;
        response += `• Zbude vám: ${Math.round(contextData.income - stressPayment).toLocaleString('cs-CZ')} Kč\n\n`;
        
        response += `<strong>SCÉNÁŘ 3: Přibude dítě</strong>\n`;
        const childCost = 10000;
        response += `• Průměrné náklady na dítě: ${childCost.toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `• Rodičovský příspěvek: 350 000 Kč (max, postupně)\n`;
        response += `• Jeden příjem (mateřská): disponibilní ${Math.round((contextData.income * 0.7 + 15000) - monthlyPayment - childCost).toLocaleString('cs-CZ')} Kč\n`;
        response += `• ${remainingAfter >= childCost ? '✅ Zvládnete i s dítětem' : '⚠️ Bude to napjaté, zvažte delší splatnost'}\n\n`;
        
        response += `<strong>💡 AKČNÍ PLÁN - Ochrana před riziky:</strong>\n`;
        response += `1. HNED: Vytvořte rezervu ${emergencyFund.toLocaleString('cs-CZ')} Kč (odkládejte ${Math.round(emergencyFund/12).toLocaleString('cs-CZ')} Kč/měs po rok)\n`;
        response += `2. POJIŠTĚNÍ: Zvažte pojištění neschopnosti (800-1500 Kč/měs)\n`;
        response += `3. FIXACE: ${contextData.fixation <= 5 ? 'Dobrá volba - krátká fixace = flexibilita' : 'Dlouhá fixace vás chrání před růstem sazeb'}\n`;
        response += `4. REZERVA V DSTI: Máte ${Math.round(100 - contextData.dsti)}% příjmu volných = ${remainingAfter < 15000 ? 'MALÁ rezerva ⚠️' : remainingAfter < 25000 ? 'STŘEDNÍ rezerva ✓' : 'VELKÁ rezerva ✅'}\n\n`;
        
        response += `Chcete projednat konkrétní strategii s naším specialistou? Ten najde řešení i pro složité situace.`;
        
        return prompt + `\n\nVytvoř stress test analýzu. Odpověz: "${response}"`;
    }
    
    // REFINANCOVÁNÍ A OPTIMALIZACE
    if (userMessage.toLowerCase().match(/refinanc|přefinanc|změn.*banku|lepší.*nabídka|nižší.*úrok|uš(e|ě)tř/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz: "Pro analýzu refinancování potřebuji znát vaši současnou situaci. Spočítejte si aktuální hypotéku v kalkulačce a já vám ukážu PŘESNĚ kolik ušetříte refinancováním."`;
        }
        
        const currentRate = contextData.rate;
        const bestMarketRate = contextData.marketInfo?.bestAvailableRate || 4.09;
        const rateDiff = currentRate - bestMarketRate;
        
        if (rateDiff <= 0.3) {
            return prompt + `\n\nOdpověz: "Vaše sazba ${currentRate}% je velmi dobrá, jen ${rateDiff.toFixed(2)}% nad top nabídkou. Refinancování by přineslo minimální úsporu (cca ${Math.round(rateDiff * contextData.loanAmount * 0.01 / 12).toLocaleString('cs-CZ')} Kč/měs). NEDOPORUČUJI kvůli nákladům (znalecký posudek 5-8k, poplatky). Lepší strategie: vyjednejte slevu u stávající banky nebo použijte rezervu na mimořádné splátky."`;
        }
        
        const monthlySaving = Math.round((currentRate - bestMarketRate) * contextData.loanAmount * 0.01 / 12);
        const yearlySaving = monthlySaving * 12;
        const totalSaving = monthlySaving * contextData.loanTerm * 12;
        const reficosts = 15000;
        
        let response = `<strong>💰 ANALÝZA REFINANCOVÁNÍ - Konkrétní čísla</strong>\n\n`;
        
        response += `<strong>SOUČASNÝ STAV:</strong>\n`;
        response += `• Vaše sazba: ${currentRate}%\n`;
        response += `• Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `• Zbývá splatit: ${contextData.fixationDetails?.remainingBalanceAfterFixation ? 
            contextData.fixationDetails.remainingBalanceAfterFixation.toLocaleString('cs-CZ') : 
            contextData.loanAmount.toLocaleString('cs-CZ')} Kč\n\n`;
        
        response += `<strong>POTENCIÁL REFINANCOVÁNÍ:</strong>\n`;
        response += `• Top sazba na trhu: ${bestMarketRate}%\n`;
        response += `• Rozdíl: ${rateDiff.toFixed(2)}% = ${monthlySaving.toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `• Roční úspora: ${yearlySaving.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Za ${contextData.loanTerm} let: ${totalSaving.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Návratnost nákladů: ${Math.ceil(reficosts / monthlySaving)} měsíců\n\n`;
        
        response += `<strong>STRATEGIE:</strong>\n`;
        response += `1. TEĎKA (před koncem fixace):\n`;
        response += `   - Vyjednejte u stávající banky slevu ${(rateDiff * 0.5).toFixed(2)}%\n`;
        response += `   - Argument: "Konkurence nabízí ${bestMarketRate}%"\n`;
        response += `   - Ušetříte bez nákladů na refinancování\n\n`;
        
        response += `2. PO FIXACI (za ${contextData.fixation} let):\n`;
        response += `   - Porovnejte 3-5 nabídek (my to uděláme za vás)\n`;
        response += `   - Očekávaný rozdíl: ${(rateDiff * 0.7).toFixed(2)}% = ${Math.round(monthlySaving * 0.7).toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `   - Náš specialista vyjedná nejlepší podmínky\n\n`;
        
        response += `3. ALTERNATIVA - Mimořádné splátky:\n`;
        const extraPayment = Math.round(contextData.detailedCalculation?.remainingAfterPayment * 0.3);
        const yearsReduction = Math.round(extraPayment / contextData.monthlyPayment * 0.8);
        response += `   - Odkládejte ${extraPayment.toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `   - Zkrátíte hypotéku o ~${yearsReduction} let\n`;
        response += `   - Ušetříte na úrocích: ${Math.round(yearsReduction * contextData.monthlyPayment * 12 * 0.3).toLocaleString('cs-CZ')} Kč\n\n`;
        
        response += `💡 <strong>DOPORUČENÍ:</strong> ${rateDiff > 0.5 ? 
            'Refinancování se vyplatí! Spojte se s naším specialistou pro konkrétní nabídky.' : 
            'Zkuste nejprve vyjednat u stávající banky. Náš specialista vám poradí jak na to.'}\n\n`;
        
        response += `Mám pro vás připravit konkrétní nabídky od našich 19 partnerů?`;
        
        return prompt + `\n\nVytvoř refinancovací analýzu. Odpověz: "${response}"`;
    }
    
    // PREDIKCE BUDOUCNOSTI
    if (userMessage.toLowerCase().match(/za.*let|budouc|dlouhodob|strategi|jak.*bude|plán|až.*splat/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz: "Pro vytvoření dlouhodobé strategie potřebuji znát vaši situaci. Spočítejte si hypotéku v kalkulačce a já vám vytvořím plán na 5-20 let dopředu s konkrétními milníky."`;
        }
        
        const yearsRemaining = contextData.loanTerm;
        const currentAge = contextData.age;
        
        let response = `<strong>🔮 VAŠE HYPOTEČNÍ STRATEGIE - Plán na ${yearsRemaining} let</strong>\n\n`;
        
        response += `<strong>📍 DNES (${new Date().getFullYear()}):</strong>\n`;
        response += `• Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Dluh: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Váš věk: ${currentAge} let\n\n`;
        
        const fixationEnd = contextData.fixation;
        response += `<strong>📅 ZA ${fixationEnd} LET (${new Date().getFullYear() + fixationEnd}) - KONEC FIXACE:</strong>\n`;
        response += `• Zbývá splatit: ${contextData.fixationDetails?.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Splaceno: ${Math.round((1 - (contextData.fixationDetails?.remainingBalanceAfterFixation / contextData.loanAmount)) * 100)}%\n`;
        response += `• Váš věk: ${currentAge + fixationEnd} let\n`;
        response += `• KLÍČOVÝ MOMENT: Refixace/refinancování\n`;
        response += `• Co udělat: Porovnat 5+ nabídek, vyjednat slevu 0.2-0.4%\n`;
        response += `• Potenciál úspory: ${Math.round((contextData.rate * 0.05) * contextData.fixationDetails?.remainingBalanceAfterFixation * 0.01).toLocaleString('cs-CZ')} Kč/rok\n\n`;
        
        const midPoint = Math.round(yearsRemaining / 2);
        const midPointBalance = Math.round(contextData.loanAmount * (1 - midPoint / yearsRemaining * 0.7));
        response += `<strong>🎯 ZA ${midPoint} LET (${new Date().getFullYear() + midPoint}) - POLOVINA:</strong>\n`;
        response += `• Zbývá cca: ${midPointBalance.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Váš věk: ${currentAge + midPoint} let\n`;
        response += `• Typická situace: ${currentAge + midPoint < 45 ? 'Děti ve škole, zvyšují se příjmy' : currentAge + midPoint < 55 ? 'Děti odrostly, peak příjmů' : 'Blíží se důchod'}\n`;
        response += `• Doporučení: ${currentAge + midPoint < 45 ? 'Zvažte kratší splatnost nebo mimořádné splátky' : 'Začněte budovat důchodovou rezervu'}\n\n`;
        
        response += `<strong>🏠 ZA ${yearsRemaining} LET (${new Date().getFullYear() + yearsRemaining}) - KONEC:</strong>\n`;
        response += `• Splaceno: ${contextData.loanAmount?.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Váš věk: ${currentAge + yearsRemaining} let\n`;
        response += `• Nemovitost: Vaše (bez dluhů!)\n`;
        response += `• Měsíčně ušetříte: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč\n`;
        response += `• ${currentAge + yearsRemaining >= 65 ? 'Důchodový věk - plná svoboda!' : 'Stále produktivní věk - investujte dál'}\n\n`;
        
        response += `<strong>💡 STRATEGICKÉ MILNÍKY:</strong>\n`;
        response += `• ROK 1-2: Vytvořit rezervu ${Math.round(contextData.monthlyPayment * 6).toLocaleString('cs-CZ')} Kč\n`;
        response += `• ROK 3-${fixationEnd}: Sledovat sazby, připravit se na refixaci\n`;
        response += `• ROK ${fixationEnd}-${midPoint}: Optimalizovat splátky, zvážit mimořádné\n`;
        response += `• ROK ${midPoint}-${yearsRemaining}: Agresivní doplacení nebo investice\n\n`;
        
        response += `<strong>🎲 ALTERNATIVNÍ SCÉNÁŘE:</strong>\n`;
        if (contextData.detailedCalculation?.remainingAfterPayment > 10000) {
            const extraMonthly = Math.round(contextData.detailedCalculation.remainingAfterPayment * 0.2);
            const yearsReduced = Math.round(yearsRemaining * 0.2);
            response += `• Odkládání ${extraMonthly.toLocaleString('cs-CZ')} Kč/měs:\n`;
            response += `  → Splatíte za ${yearsRemaining - yearsReduced} let (o ${yearsReduced} let dříve)\n`;
            response += `  → Ušetříte ${Math.round(yearsReduced * contextData.monthlyPayment * 12 * 0.25).toLocaleString('cs-CZ')} Kč na úrocích\n\n`;
        }
        
        response += `Chcete detailní plán s konkrétními kroky? Náš specialista vám ho vytvoří na míru.`;
        
        return prompt + `\n\nVytvoř dlouhodobou strategii. Odpověz: "${response}"`;
    }
    
    // SROVNÁNÍ INVESTICE VS SPLÁCENÍ
    if (userMessage.toLowerCase().match(/investice|investovat|místo.*splác|fond|akcie|ušetř.*místo|co.*dělat.*s.*peníz/)) {
        if (!hasContext) {
            return prompt + `\n\nOdpověz: "Pro investiční strategii potřebuji znát vaši hypotéku. Spočítejte si ji v kalkulačce a já vám ukážu PŘESNÉ srovnání: splácet hypotéku vs. investovat do fondů."`;
        }
        
        const availableForInvestment = Math.round((contextData.detailedCalculation?.remainingAfterPayment || 0) * 0.5);
        
        if (availableForInvestment < 5000) {
            return prompt + `\n\nOdpověz: "Po splátce vám zbývá ${contextData.detailedCalculation?.remainingAfterPayment?.toLocaleString('cs-CZ')} Kč. To je příliš málo na efektivní investice. DOPORUČUJI: 1) Nejprve vytvořte rezervu ${Math.round(contextData.monthlyPayment * 6).toLocaleString('cs-CZ')} Kč. 2) Pak zvažte delší splatnost pro uvolnění prostředků. 3) Až budete mít 10k+ měsíčně volných, můžeme řešit investice. Chcete přepočítat hypotéku s delší splatností?"`;
        }
        
        const investmentReturn = 0.07;
        const mortgageRate = contextData.rate / 100;
        
        let response = `<strong>📊 INVESTICE VS. SPLÁCENÍ HYPOTÉKY - Matematická analýza</strong>\n\n`;
        
        response += `<strong>VAŠE SITUACE:</strong>\n`;
        response += `• Úrok hypotéky: ${contextData.rate}% p.a.\n`;
        response += `• Volné prostředky: ${availableForInvestment.toLocaleString('cs-CZ')} Kč/měs\n`;
        response += `• Investiční horizont: ${contextData.loanTerm} let\n\n`;
        
        response += `<strong>SCÉNÁŘ A: Vše na hypotéku (mimořádné splátky)</strong>\n`;
        const totalExtraPaid = availableForInvestment * 12 * contextData.loanTerm;
        const interestSaved = Math.round(totalExtraPaid * mortgageRate * 0.4);
        const yearsReduced = Math.round(contextData.loanTerm * 0.15);
        response += `• Mimořádně splatíte: ${totalExtraPaid.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Ušetříte na úrocích: ${interestSaved.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Zkrátíte o: ~${yearsReduced} let\n`;
        response += `• Zisk/ztráta: <strong>-${interestSaved.toLocaleString('cs-CZ')} Kč nákladů</strong>\n\n`;
        
        response += `<strong>SCÉNÁŘ B: Investice do fondů (7% p.a.)</strong>\n`;
        const futureValue = Math.round(availableForInvestment * ((Math.pow(1 + investmentReturn/12, contextData.loanTerm * 12) - 1) / (investmentReturn/12)));
        const invested = availableForInvestment * 12 * contextData.loanTerm;
        const profit = futureValue - invested;
        response += `• Investováno celkem: ${invested.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Hodnota za ${contextData.loanTerm} let: ${futureValue.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Čistý zisk: ${profit.toLocaleString('cs-CZ')} Kč\n`;
        response += `• Po zdanění (15%): ${Math.round(profit * 0.85).toLocaleString('cs-CZ')} Kč\n\n`;
        
        const netDifference = Math.round(profit * 0.85) - interestSaved;
        response += `<strong>📈 VÝSLEDEK:</strong>\n`;
        response += `Investování je lepší o: <strong>${Math.abs(netDifference).toLocaleString('cs-CZ')} Kč</strong>\n`;
        response += `Důvod: Výnos 7% > Úrok ${contextData.rate}%\n\n`;
        
        response += `<strong>⚠️ ALE POZOR - RIZIKA:</strong>\n`;
        response += `• Investice kolísají (2008: -40%, 2022: -20%)\n`;
        response += `• Hypotéka = jistota\n`;
        response += `• Psychologická pohoda bezdlužnosti\n\n`;
        
        response += `<strong>💡 DOPORUČENÁ STRATEGIE "50/50":</strong>\n`;
        const half = Math.round(availableForInvestment / 2);
        response += `1. ${half.toLocaleString('cs-CZ')} Kč na mimořádné splátky\n`;
        response += `   → Snížíte úroky o ${Math.round(interestSaved * 0.5).toLocaleString('cs-CZ')} Kč\n`;
        response += `   → Zkrátíte o ${Math.round(yearsReduced * 0.5)} let\n\n`;
        response += `2. ${half.toLocaleString('cs-CZ')} Kč do ETF fondů (diverzifikace)\n`;
        response += `   → Potenciál ${Math.round(futureValue * 0.5).toLocaleString('cs-CZ')} Kč\n`;
        response += `   → Zisk ${Math.round(profit * 0.5 * 0.85).toLocaleString('cs-CZ')} Kč\n\n`;
        
        response += `<strong>Kombinace = Bezpečnost + Růst!</strong>\n\n`;
        response += `Chcete konkrétní investiční portfolio? Náš finanční poradce vám ho sestaví zdarma.`;
        
        return prompt + `\n\nVytvoř investiční analýzu. Odpověz: "${response}"`;
    }

    // ZÁKLADNÍ ROUTY
    
    if (userMessage.toLowerCase().match(/bank|které banky|seznam bank|s kým spoluprac|partner/)) {
        return prompt + `\n\nKlient se ptá na banky. Odpověz POUZE JSON: {"tool":"showBanksList"}`;
    }

    if (userMessage === "Proveď úvodní analýzu mé situace." || userMessage === "Rychlá analýza" || userMessage === "📊 Rychlá analýza") {
        if (!hasContext) {
            return prompt + `\n\nOdpověz POUZE JSON: {"tool":"initialAnalysis","response":"Nejprve si spočítejte hypotéku pomocí rychlé kalkulačky. Stačí zadat částku úvěru, hodnotu nemovitosti a příjem. Analýza zabere 30 sekund."}`;
        }
        
        let analysis = `<strong>🎯 PREMIUM AI ANALÝZA - Vaše hypotéka pod lupou</strong>\n\n`;
        
        if (isFromOurCalculator) {
            if (contextData.totalScore >= 85) {
                analysis += `✅ <strong>TOP KATEGORIE! Patříte mezi ${100 - contextData.totalScore}% nejlepších klientů!</strong>\n`;
                analysis += `Banky se o vás budou hádat. Využijte toho!\n\n`;
            } else if (contextData.totalScore >= 70) {
                analysis += `✅ <strong>SILNÝ PROFIL! Šance na schválení ${contextData.totalScore}%</strong>\n\n`;
            } else if (contextData.totalScore >= 50) {
                analysis += `⚠️ <strong>HRANIČNÍ PŘÍPAD - Potřebujeme optimalizovat</strong>\n\n`;
            } else {
                analysis += `🔴 <strong>KOMPLIKOVANÁ SITUACE - Ale řešení existuje!</strong>\n\n`;
            }
        }
        
        analysis += `<strong>💰 ZÁKLADNÍ PARAMETRY:</strong>\n`;
        analysis += `• Splátka: ${contextData.monthlyPayment?.toLocaleString('cs-CZ')} Kč (${Math.round((contextData.monthlyPayment / contextData.income) * 100)}% příjmu)\n`;
        analysis += `• Úrok: ${contextData.rate}% - ${contextData.marketInfo?.ratePosition === 'excellent' ? '🌟 EXCELENTNÍ' : contextData.marketInfo?.ratePosition === 'good' ? '👍 DOBRÁ' : '⚠️ DA SE LEPSI'}\n`;
        analysis += `• Zbyde vám: ${contextData.detailedCalculation?.remainingAfterPayment?.toLocaleString('cs-CZ')} Kč/měs\n`;
        analysis += `• To je ${Math.round((contextData.detailedCalculation?.remainingAfterPayment / contextData.monthlyPayment) * 100)}% splátky = ${contextData.detailedCalculation?.remainingAfterPayment > 20000 ? '✅ VÝBORNÁ rezerva' : contextData.detailedCalculation?.remainingAfterPayment > 10000 ? '👍 DOBRÁ rezerva' : '⚠️ TĚSNÁ rezerva'}\n\n`;
        
        analysis += `<strong>🔍 DETAILNÍ SKÓRE:</strong>\n`;
        analysis += `• LTV ${contextData.ltv}%: ${contextData.ltvScore}% ${contextData.ltvScore >= 85 ? '(💎 Málo půjčujete = top sazba)' : contextData.ltvScore >= 70 ? '(✓ Standardní)' : '(⚠️ Hodně půjčujete)'}\n`;
        analysis += `• DSTI ${contextData.dsti}%: ${contextData.dstiScore}% ${contextData.dstiScore >= 90 ? '(✅ Obrovská rezerva)' : contextData.dstiScore >= 70 ? '(👍 Zdravá rezerva)' : '(⚠️ Na hraně)'}\n`;
        analysis += `• Bonita: ${contextData.bonita}% ${contextData.bonita >= 85 ? '(🌟 Premium klient)' : contextData.bonita >= 70 ? '(✓ Solidní)' : '(⚠️ Zlepšitelné)'}\n\n`;
        
        if (contextData.fixationDetails) {
            analysis += `<strong>📊 CO VÁS ČEKÁ:</strong>\n`;
            analysis += `• Za ${contextData.fixation} let (konec fixace): zbude ${contextData.fixationDetails.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč\n`;
            analysis += `• Splatíte ${Math.round((1 - contextData.fixationDetails.remainingBalanceAfterFixation / contextData.loanAmount) * 100)}% dluhu\n`;
            analysis += `• Pokud sazby klesnou o 0.5%: ušetříte ${contextData.fixationDetails.futureScenario?.optimistic?.monthlySavings?.toLocaleString('cs-CZ')} Kč/měs\n`;
            analysis += `• Pokud vzrostou o 1%: zaplatíte +${contextData.fixationDetails.futureScenario?.moderateIncrease?.monthlyIncrease?.toLocaleString('cs-CZ')} Kč/měs\n\n`;
        }
        
        analysis += `<strong>💡 TOP 3 TIPY PRO VÁS:</strong>\n`;
        if (contextData.totalScore >= 85) {
            analysis += `1. 💎 VYJEDNEJTE SLEVU: S vaším profilem máte páky. Zkuste snížit sazbu o 0.1-0.2%\n`;
            analysis += `2. 💰 INVESTUJTE REZERVU: Máte prostor investovat ${Math.round(contextData.detailedCalculation?.remainingAfterPayment * 0.3).toLocaleString('cs-CZ')} Kč/měs\n`;
            analysis += `3. ⚡ ZKRAŤTE SPLATNOST: Můžete si dovolit vyšší splátky = tisíce ušetřené na úrocích\n\n`;
        } else if (contextData.totalScore >= 70) {
            analysis += `1. 🎯 OPTIMALIZUJTE LTV: ${contextData.ltv > 80 ? `Sežeňte ${Math.round((contextData.ltv - 80) * contextData.propertyValue / 100).toLocaleString('cs-CZ')} Kč navíc → lepší sazba` : 'Máte dobré LTV'}\n`;
            analysis += `2. 💪 BUDUJTE REZERVU: Cílte na ${Math.round(contextData.monthlyPayment * 6).toLocaleString('cs-CZ')} Kč (6 měsíců)\n`;
            analysis += `3. 🔄 SLEDUJTE TRH: Za ${contextData.fixation} let refinancujte, potenciál ${Math.round((contextData.rate - contextData.marketInfo?.bestAvailableRate) * contextData.loanAmount * 0.01 / 12).toLocaleString('cs-CZ')} Kč/měs\n\n`;
        } else {
            analysis += `1. ⚠️ PRODLUŽTE SPLATNOST: ${contextData.loanTerm < 30 ? `30 let = nižší splátka, lepší DSTI` : 'Už máte maximum'}\n`;
            analysis += `2. 🛡️ POJISTĚTE SE: Pojištění neschopnosti = ochrana splácení\n`;
            analysis += `3. 💬 PROMLUVTE SE SPECIALISTOU: Najdeme řešení i pro složité případy\n\n`;
        }
        
        analysis += `Chcete prozkoumat konkrétní scénáře? Zeptejte se například:\n`;
        analysis += `• "Co kdyby ztratím práci?"\n`;
        analysis += `• "Vyplatí se refinancování?"\n`;
        analysis += `• "Jaký bude můj plán na 10 let?"`;
        
        return prompt + `\n\nVytvoř premium analýzu. Odpověz POUZE JSON: {"tool":"initialAnalysis","response":"${analysis}"}`;
    }

    if (userMessage.toLowerCase().match(/kontakt|specialista|mluvit|poradit|konzultace|telefon|schůzka|sejít|zavolat|domluvit/)) {
        return prompt + `\n\nKlient chce kontakt. Odpověz POUZE JSON: {"tool":"showLeadForm","response":"📞 Výborně! Připojím vás k našemu PREMIUM týmu hypotečních stratégů. Nejsme jen zprostředkovatelé - vytvoříme vám:\\n\\nâ€¢ Kompletní finanční strategii na míru\\n• Vyjednání TOP podmínek u bank\\n• Dlouhodobý plán (ne jen jednorázovou nabídku)\\n• Přístup ke skrytým nabídkám nedostupným online\\n\\nSpecialista vás kontaktuje do 4 hodin. Otevírám formulář..."}`;
    }

    if (userMessage.match(/\d+/)) {
        const numbers = userMessage.match(/\d+/g);
        const text = userMessage.toLowerCase();
        
        let params = {};
        
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
                const maxMonthlyPayment = amount * 0.45;
                const maxLoan = maxMonthlyPayment * 12 * 9;
                params.loanAmount = Math.round(maxLoan * 0.9);
                params.propertyValue = Math.round(maxLoan);
            }
        }
        
        if (text.match(/let|rok/)) {
            const years = numbers.find(n => parseInt(n) >= 5 && parseInt(n) <= 30);
            if (years) params.loanTerm = parseInt(years);
        }
        
        if (Object.keys(params).length > 0) {
            return prompt + `\n\nKlient modeluje scénář. Odpověz POUZE JSON: {"tool":"modelScenario","params":${JSON.stringify(params)}}`;
        }
    }

    prompt += `\n\n
📋 INSTRUKCE PRO ODPOVĚĎ:
1. ${messageCount > 0 ? 'BEZ pozdravu - už jste v konverzaci' : 'Stručný úvod pouze při prvním kontaktu'}
2. KONKRÉTNÍ čísla v Kč (ne "může ušetřit", ale "ušetříte 127 000 Kč")
3. SCÉNÁŘE "co kdyby" s přesnými dopady
4. SROVNÁNÍ alternativ (A vs. B s čísly)
5. AKČNÍ kroky s termíny (ne "zvažte", ale "HNED/za měsíc/za rok")
6. Propoj AI analýzu s nabídkou lidského experta
7. Max 250 slov, ale s vysokou hodnotou
8. Používej <strong> pro důležité věci, ne emoji

Odpovídej jako premium stratég, ne jako kalkulačka. Ukaž HODNOTU nad rámec čísel.`;

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
            throw new Error('Chybí GEMINI_API_KEY. Nastavte ho v proměnných prostředí na Netlify.');
        }

        const prompt = createSystemPrompt(message, context);

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };
        
        // PŘÍMÉ VOLÁNÍ NA STABILNÍ v1 API POMOCÍ `fetch`
        const modelName = "gemini-1.5-flash"; // OPRAVA: Použití stabilního názvu modelu místo "latest"
        // OPRAVA: Změna verze API z v1 na v1beta pro kompatibilitu s modelem
        const url = `https://generativelace.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('API Error Body:', errorBody); // Log the detailed error from the API
            throw new Error(`Chyba API: ${apiResponse.status} ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error("AI nevrátila žádný text. Odpověď API byla: " + JSON.stringify(data));
        }
        
        // Zpracování odpovědi (zůstává stejné)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { 
                // Pokračujeme, pokud to není validní JSON
            }
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
                error: `Došlo k chybě při komunikaci s AI. Zkuste to prosím znovu. (Detail: ${error.message})`
            }) 
        };
    }
};

// Netlify vyžaduje `handler` jako export
export { handler };

