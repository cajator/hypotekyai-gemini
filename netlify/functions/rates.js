// netlify/functions/rates.js - v7.0 - SPRÁVNÉ DSTI podle ČNB
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const params = event.queryStringParameters || {};
        const loanAmount = parseFloat(params.loanAmount) || 4000000;
        const propertyValue = parseFloat(params.propertyValue) || 5000000;
        const income = parseFloat(params.income) || 50000;
        const liabilities = parseFloat(params.liabilities) || 0;
        const loanTerm = parseInt(params.loanTerm) || 25;
        const fixation = parseInt(params.fixation) || 5;
        const age = parseInt(params.age) || 35;
        const children = parseInt(params.children) || 0;
        const purpose = params.purpose || 'koupě';
        const employment = params.employment || 'zaměstnanec';
        const education = params.education || 'středoškolské';

        // 1. LTV (Loan-to-Value)
        const ltv = (loanAmount / propertyValue) * 100;
        let ltvScore = 100;
        
        if (ltv <= 70) ltvScore = 100;
        else if (ltv <= 80) ltvScore = 90;
        else if (ltv <= 85) ltvScore = 80;
        else if (ltv <= 90) ltvScore = 60;
        else if (ltv <= 95) ltvScore = 40;
        else ltvScore = 20;

        // 2. VÝPOČET SPLÁTKY
        const baseRate = getBaseRate(ltv, income, employment, education, fixation);
        const monthlyRate = baseRate / 100 / 12;
        const numPayments = loanTerm * 12;
        const monthlyPayment = Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1));

        // 3. DSTI (Debt Service to Income) - SPRÁVNÝ VÝPOČET!
        // DSTI = (všechny splátky / čistý příjem) * 100
        const totalMonthlyDebt = monthlyPayment + liabilities;
        const dstiRatio = (totalMonthlyDebt / income) * 100;
        
        // DSTI skóre podle ČNB
        let dstiScore = 100;
        if (dstiRatio <= 35) dstiScore = 100;      // Výborné
        else if (dstiRatio <= 40) dstiScore = 95;   // Velmi dobré  
        else if (dstiRatio <= 45) dstiScore = 85;   // Dobré
        else if (dstiRatio <= 50) dstiScore = 70;   // ČNB soft limit
        else if (dstiRatio <= 55) dstiScore = 50;   // Akceptovatelné
        else if (dstiRatio <= 60) dstiScore = 30;   // Rizikové
        else dstiScore = 10;                         // Velmi rizikové

        // 4. DTI (Debt to Income) - celkový dluh k ročnímu příjmu
        const yearlyIncome = income * 12;
        const dtiRatio = loanAmount / yearlyIncome;
        
        let dtiScore = 100;
        if (dtiRatio <= 5) dtiScore = 100;
        else if (dtiRatio <= 6) dtiScore = 95;
        else if (dtiRatio <= 7) dtiScore = 85;
        else if (dtiRatio <= 8) dtiScore = 70;     // ČNB limit 2024
        else if (dtiRatio <= 8.5) dtiScore = 50;   // ČNB limit 2025
        else if (dtiRatio <= 9) dtiScore = 30;
        else dtiScore = 10;

        // 5. VĚKOVÁ BONITA
        const ageAtEnd = age + loanTerm;
        let ageScore = 100;
        
        if (ageAtEnd <= 60) ageScore = 100;
        else if (ageAtEnd <= 65) ageScore = 90;
        else if (ageAtEnd <= 70) ageScore = 70;
        else if (ageAtEnd <= 75) ageScore = 40;
        else ageScore = 20;

        // 6. BONITA - schopnost splácet
        let bonitaScore = 70; // Základní skóre
        
        // Příjmová bonita
        if (income >= 100000) bonitaScore += 25;
        else if (income >= 70000) bonitaScore += 20;
        else if (income >= 50000) bonitaScore += 15;
        else if (income >= 35000) bonitaScore += 10;
        else if (income >= 25000) bonitaScore += 5;
        
        // Zaměstnání
        if (employment === 'zaměstnanec') bonitaScore += 10;
        else if (employment === 'jednatel') bonitaScore += 5;
        
        // Vzdělání
        if (education === 'vysokoškolské') bonitaScore += 5;
        else if (education === 'středoškolské') bonitaScore += 3;
        
        // Omezení bonity podle DSTI
        if (dstiRatio > 50) {
            bonitaScore = Math.min(bonitaScore, 70);
        } else if (dstiRatio > 45) {
            bonitaScore = Math.min(bonitaScore, 85);
        }
        
        bonitaScore = Math.min(100, bonitaScore);

        // 7. CELKOVÉ SKÓRE
        const totalScore = Math.round(
            (ltvScore * 0.20) +      // 20% váha LTV
            (dstiScore * 0.40) +     // 40% váha DSTI (nejdůležitější!)
            (dtiScore * 0.20) +      // 20% váha DTI
            (bonitaScore * 0.10) +   // 10% váha bonita
            (ageScore * 0.10)        // 10% váha věk
        );

        // NABÍDKY BANK
        const offers = generateBankOffers(loanAmount, loanTerm, fixation, ltv, income, employment, totalScore, dstiRatio);

        // SMART TIPY
        const { smartTip, tips } = generateSmartTips(ltv, dstiRatio, dtiRatio, income, liabilities, totalScore);

        // ANALÝZA FIXACE - včetně scénářů navýšení
        const selectedOffer = offers[0];
        const fixationDetails = calculateFixationAnalysis(loanAmount, selectedOffer.rate, loanTerm, fixation, monthlyPayment, income);

        // TRŽNÍ INFORMACE
        const marketInfo = {
            averageRate: 4.69,
            bestAvailableRate: 4.09,
            worstRate: 5.29,
            bankCount: 19,
            lastUpdate: new Date().toISOString(),
            ratePosition: baseRate <= 4.5 ? 'excellent' : baseRate <= 5.0 ? 'good' : 'average'
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                offers,
                approvability: {
                    ltv: ltvScore,
                    dsti: dstiScore,
                    dti: dtiScore,
                    bonita: bonitaScore,
                    age: ageScore,
                    total: totalScore,
                    details: {
                        ltvRatio: Math.round(ltv),
                        dstiRatio: Math.round(dstiRatio),
                        dtiRatio: dtiRatio.toFixed(1),
                        monthlyPayment,
                        netIncome: income,
                        totalMonthlyDebt
                    }
                },
                smartTip,
                tips,
                fixationDetails,
                marketInfo
            })
        };
    } catch (error) {
        console.error('Error in rates function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};

function getBaseRate(ltv, income, employment, education, fixation) {
    let rate = 5.5; // Základní sazba
    
    // LTV bonusy/malusy
    if (ltv <= 60) rate -= 0.6;
    else if (ltv <= 70) rate -= 0.5;
    else if (ltv <= 80) rate -= 0.3;
    else if (ltv > 90) rate += 0.3;
    else if (ltv > 95) rate += 0.5;
    
    // Příjmové bonusy
    if (income >= 100000) rate -= 0.5;
    else if (income >= 70000) rate -= 0.4;
    else if (income >= 50000) rate -= 0.3;
    else if (income >= 35000) rate -= 0.2;
    else if (income < 25000) rate += 0.3;
    
    // Fixace bonusy/malusy
    if (fixation === 1) rate += 0.3;
    else if (fixation === 3) rate -= 0.1;
    else if (fixation === 5) rate -= 0.2;
    else if (fixation === 7) rate -= 0.1;
    else if (fixation === 10) rate += 0.1;
    
    // Typ zaměstnání
    if (employment === 'osvc') rate += 0.2;
    else if (employment === 'jednatel') rate += 0.15;
    
    // Vzdělání bonus
    if (education === 'vysokoškolské' && income >= 50000) rate -= 0.1;
    
    return Math.max(4.09, Math.min(6.5, rate));
}

function generateBankOffers(loanAmount, loanTerm, fixation, ltv, income, employment, totalScore, dstiRatio) {
    const offers = [];
    
    // Pokud je DSTI výborné (pod 40%) a příjem dobrý, nabídnout TOP sazby
    const hasExcellentDSTI = dstiRatio <= 40;
    const hasGoodIncome = income >= 50000;
    const hasGoodLTV = ltv <= 80;
    
    if (hasExcellentDSTI && hasGoodIncome && hasGoodLTV) {
        // Top klient
        offers.push({
            id: 'premium',
            title: '🏆 Prémiová AI výběr',
            description: 'Exkluzivní sazba vyjednaná AI u T-Mobile bank, úspora přes 500 tis.',
            rate: 4.09,
            monthlyPayment: calculatePayment(loanAmount, 4.09, loanTerm),
            highlights: ['Schválení do 5 dnů', 'Nejnižší úrok na trhu', 'Online podpis']
        });
        offers.push({
            id: 'vip',
            title: '💎 VIP podmínky',
            description: 'Exkluzivní nabídka z portfolia prémiových klientů s LTV do 70% a vysokými příjmy.',
            rate: 4.29,
            monthlyPayment: calculatePayment(loanAmount, 4.29, loanTerm),
            highlights: ['Úspora 250k+', 'Prémiové služby', 'Expresní vyřízení']
        });
    } else if (totalScore >= 70 || (hasExcellentDSTI && ltv <= 90)) {
        // Dobrý klient
        offers.push({
            id: 'standard',
            title: '✅ Optimální poměr',
            description: 'Vyvážená nabídka s rozumnou sazbou i podmínkami.',
            rate: 4.59,
            monthlyPayment: calculatePayment(loanAmount, 4.59, loanTerm),
            highlights: ['Ověřená banka', 'Solidní podmínky', 'Bez skrytých poplatků']
        });
        offers.push({
            id: 'flex',
            title: '🔄 Flexibilní hypotéka',
            description: 'Možnost mimořádných splátek bez sankcí',
            rate: 4.79,
            monthlyPayment: calculatePayment(loanAmount, 4.79, loanTerm),
            highlights: ['Mimořádné splátky zdarma', 'Přerušení splácení', 'Online správa']
        });
    } else if (totalScore >= 50) {
        // Průměrný klient
        offers.push({
            id: 'accessible',
            title: '🚀 Dostupná hypotéka',
            description: 'Vstřícné podmínky i při vyšším LTV až do 95%. Schválení i s nižší bonitou nebo vyšším věkem.',
            rate: 4.99,
            monthlyPayment: calculatePayment(loanAmount, 4.99, loanTerm),
            highlights: ['LTV až 95%', 'Věk do 70 let', 'Mimořádné splátky zdarma']
        });
    } else {
        // Rizikový klient
        offers.push({
            id: 'special',
            title: '🆘 Speciální řešení',
            description: 'Individuální přístup pro složitější případy',
            rate: 5.49,
            monthlyPayment: calculatePayment(loanAmount, 5.49, loanTerm),
            highlights: ['Individuální přístup', 'Možnost garanta', 'Flexibilní dokládání příjmů']
        });
    }
    
    // Vždy přidat záložní nabídku
    if (offers.length < 2) {
        offers.push({
            id: 'backup',
            title: '📋 Alternativní řešení',
            description: 'Záložní varianta pro jistotu schválení',
            rate: 5.29,
            monthlyPayment: calculatePayment(loanAmount, 5.29, loanTerm),
            highlights: ['Jistota schválení', 'Bez poplatků předem']
        });
    }
    
    return offers.slice(0, 3);
}

function calculatePayment(principal, annualRate, years) {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    return Math.round(principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1));
}

function generateSmartTips(ltv, dstiRatio, dtiRatio, income, liabilities, totalScore) {
    const tips = [];
    let smartTip = null;
    
    // DSTI varování pouze pokud je opravdu vysoké
    if (dstiRatio > 50) {
        smartTip = {
            title: '⚠️ DSTI na vyšší hranici',
            message: `Váš poměr dluh/příjem je ${Math.round(dstiRatio)}%. Doporučujeme udržet finanční rezervu.`
        };
    } else if (dstiRatio > 45) {
        tips.push({
            title: '💡 DSTI blízko limitu',
            message: `Váš poměr DSTI ${Math.round(dstiRatio)}% se blíží k limitu ČNB (50%).`
        });
    }
    
    // LTV tipy
    if (ltv > 90) {
        tips.push({
            title: '🏠 Vysoké LTV',
            message: 'LTV nad 90% znamená vyšší úrok. Navýšením vlastních prostředků ušetříte statisíce.'
        });
    } else if (ltv > 80 && ltv <= 90) {
        tips.push({
            title: '💰 LTV optimalizace',
            message: 'Snížením LTV pod 80% získáte lepší úrok o 0.2-0.3%.'
        });
    }
    
    // DTI tipy
    if (dtiRatio > 8) {
        tips.push({
            title: '📊 DTI nad limitem ČNB',
            message: `Poměr dluhu k ročnímu příjmu ${dtiRatio.toFixed(1)}x překračuje limit ČNB.`
        });
    }
    
    // Pozitivní tipy
    if (totalScore >= 85) {
        tips.push({
            title: '🎯 Výborná pozice!',
            message: 'Máte špičkové parametry. Zkuste vyjednat individuální slevu 0.1-0.2%.'
        });
    } else if (totalScore >= 70) {
        tips.push({
            title: '👍 Dobrá šance',
            message: 'Vaše parametry jsou solidní. Hypotéka bude schválena bez problémů.'
        });
    }
    
    // Tip na rezervu
    if (dstiRatio < 40 && income >= 50000) {
        tips.push({
            title: '💎 Skvělé DSTI',
            message: `S DSTI ${Math.round(dstiRatio)}% máte výbornou pozici pro vyjednávání.`
        });
    }
    
    return { smartTip, tips };
}

function calculateFixationAnalysis(loanAmount, rate, loanTerm, fixation, monthlyPayment, income) {
    const monthlyRate = rate / 100 / 12;
    let balance = loanAmount;
    let totalPrincipal = 0;
    let totalInterest = 0;
    
    // Výpočet pro období fixace
    for (let month = 1; month <= fixation * 12; month++) {
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        totalInterest += interest;
        totalPrincipal += principal;
        balance -= principal;
    }
    
    // TŘI SCÉNÁŘE PO FIXACI - pokles, růst mírný, růst výrazný
    const futureScenario = {
        optimistic: {
            rate: Math.max(3.5, rate - 0.5),
            label: 'Co kdyby klesly sazby?',
            newMonthlyPayment: 0,
            monthlySavings: 0
        },
        realistic: {
            rate: rate + 0.5,
            label: 'Co kdyby mírně vzrostly?',
            newMonthlyPayment: 0,
            monthlyIncrease: 0
        },
        pessimistic: {
            rate: Math.min(7.0, rate + 1.5),
            label: 'Co kdyby se zvedly sazby?',
            newMonthlyPayment: 0,
            monthlyIncrease: 0
        }
    };
    
    // Výpočet nových splátek pro každý scénář
    if (loanTerm > fixation) {
        const remainingYears = loanTerm - fixation;
        
        // Optimistický scénář - pokles sazeb
        futureScenario.optimistic.newMonthlyPayment = calculatePayment(balance, futureScenario.optimistic.rate, remainingYears);
        futureScenario.optimistic.monthlySavings = monthlyPayment - futureScenario.optimistic.newMonthlyPayment;
        
        // Realistický scénář - mírný růst
        futureScenario.realistic.newMonthlyPayment = calculatePayment(balance, futureScenario.realistic.rate, remainingYears);
        futureScenario.realistic.monthlyIncrease = futureScenario.realistic.newMonthlyPayment - monthlyPayment;
        
        // Pesimistický scénář - výrazný růst
        futureScenario.pessimistic.newMonthlyPayment = calculatePayment(balance, futureScenario.pessimistic.rate, remainingYears);
        futureScenario.pessimistic.monthlyIncrease = futureScenario.pessimistic.newMonthlyPayment - monthlyPayment;
    }
    
    // Rychlá analýza
    const dailyCost = Math.round(monthlyPayment / 30);
    const yearlyInterest = totalInterest / fixation;
    const taxSavings = Math.round(Math.min(yearlyInterest * 0.15, 150000) / 12);
    const percentOfTotal = Math.round((totalInterest / (monthlyPayment * fixation * 12)) * 100);
    const equivalentRent = Math.round(loanAmount * 0.005); // 0.5% z hodnoty nemovitosti
    
    return {
        totalPaymentsInFixation: monthlyPayment * fixation * 12,
        totalInterestForFixation: Math.round(totalInterest),
        totalPrincipalForFixation: Math.round(totalPrincipal),
        remainingBalanceAfterFixation: Math.round(balance),
        percentPaidOff: Math.round((totalPrincipal / loanAmount) * 100),
        futureScenario,
        quickAnalysis: {
            dailyCost,
            taxSavings,
            percentOfTotal,
            equivalentRent
        }
    };
}