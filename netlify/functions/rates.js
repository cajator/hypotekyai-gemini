// netlify/functions/rates.js - v4.0 - Real Market Rates
const ALL_OFFERS = [
    {
        id: 'offer-1',
        title: "Nejlepší úrok",
        description: "Nejnižší úrok pro klienty s výbornou bonitou a nízkým LTV.",
        max_ltv: 90,
        rates: {
            '3': { rate_ltv70: 4.49, rate_ltv80: 4.69, rate_ltv90: 5.09 },
            '5': { rate_ltv70: 4.29, rate_ltv80: 4.49, rate_ltv90: 4.89 },
            '7': { rate_ltv70: 4.39, rate_ltv80: 4.59, rate_ltv90: 4.99 },
            '10': { rate_ltv70: 4.59, rate_ltv80: 4.79, rate_ltv90: 5.19 }
        }
    },
    {
        id: 'offer-2',
        title: "Zlatá střední cesta",
        description: "Vyvážená nabídka s rozumnými podmínkami pro většinu klientů.",
        max_ltv: 90,
        rates: {
            '3': { rate_ltv70: 4.59, rate_ltv80: 4.79, rate_ltv90: 5.19 },
            '5': { rate_ltv70: 4.39, rate_ltv80: 4.59, rate_ltv90: 4.99 },
            '7': { rate_ltv70: 4.49, rate_ltv80: 4.69, rate_ltv90: 5.09 },
            '10': { rate_ltv70: 4.69, rate_ltv80: 4.89, rate_ltv90: 5.29 }
        }
    },
    {
        id: 'offer-3',
        title: "Maximální dostupnost",
        description: "Vstřícné podmínky i pro klienty s vyšším LTV nebo nižší bonitou.",
        max_ltv: 95,
        rates: {
            '3': { rate_ltv70: 4.79, rate_ltv80: 4.99, rate_ltv90: 5.39 },
            '5': { rate_ltv70: 4.59, rate_ltv80: 4.79, rate_ltv90: 5.19 },
            '7': { rate_ltv70: 4.69, rate_ltv80: 4.89, rate_ltv90: 5.29 },
            '10': { rate_ltv70: 4.89, rate_ltv80: 5.09, rate_ltv90: 5.49 }
        }
    },
    {
        id: 'offer-premium',
        title: "Premium pro TOP klienty",
        description: "Exkluzivní sazby pro klienty s nejlepší bonitou a LTV do 70%.",
        max_ltv: 70,
        rates: {
            '3': { rate_ltv70: 4.29 },
            '5': { rate_ltv70: 4.09 },  // Minimum 4.09% jak jste uvedl
            '7': { rate_ltv70: 4.19 },
            '10': { rate_ltv70: 4.39 }
        }
    }
];

const calculateMonthlyPayment = (p, r, t) => { 
    const mR = r / 1200, n = t * 12; 
    if (mR === 0) return p / n; 
    return (p * mR * Math.pow(1 + mR, n)) / (Math.pow(1 + mR, n) - 1); 
};

const calculateFixationAnalysis = (loanAmount, rate, loanTerm, fixation) => {
    const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
    const monthlyRate = rate / 100 / 12;
    
    let remainingBalance = loanAmount;
    let totalInterest = 0;
    let totalPrincipal = 0;
    
    for (let i = 0; i < fixation * 12; i++) {
        const interest = remainingBalance * monthlyRate;
        const principal = monthlyPayment - interest;
        totalInterest += interest;
        totalPrincipal += principal;
        remainingBalance -= principal;
    }
    
    const totalPaymentsInFixation = monthlyPayment * fixation * 12;
    const remainingYears = loanTerm - fixation;
    const remainingMonths = remainingYears * 12;
    
    // Realistické scénáře
    const optimisticRate = Math.max(3.79, rate - 0.5); // Pokles max o 0.5%
    const optimisticPayment = remainingMonths > 0 ? 
        calculateMonthlyPayment(remainingBalance, optimisticRate, remainingYears) : 0;
    
    const pessimisticRate = rate + 1.0;
    const pessimisticPayment = remainingMonths > 0 ? 
        calculateMonthlyPayment(remainingBalance, pessimisticRate, remainingYears) : 0;
    
    const marketAvgRate = 4.59; // Aktuální průměr trhu
    const marketPayment = remainingMonths > 0 ? 
        calculateMonthlyPayment(remainingBalance, marketAvgRate, remainingYears) : 0;
    
    return {
        totalPaymentsInFixation: Math.round(totalPaymentsInFixation),
        totalInterestForFixation: Math.round(totalInterest),
        totalPrincipalForFixation: Math.round(totalPrincipal),
        remainingBalanceAfterFixation: Math.round(remainingBalance),
        percentagePaidOff: Math.round((totalPrincipal / loanAmount) * 100),
        monthlyPayment: Math.round(monthlyPayment),
        futureScenario: {
            optimistic: {
                rate: optimisticRate,
                newMonthlyPayment: Math.round(optimisticPayment),
                monthlySavings: Math.round(monthlyPayment - optimisticPayment)
            },
            pessimistic: {
                rate: pessimisticRate,
                newMonthlyPayment: Math.round(pessimisticPayment),
                monthlyIncrease: Math.round(pessimisticPayment - monthlyPayment)
            },
            marketAverage: {
                rate: marketAvgRate,
                newMonthlyPayment: Math.round(marketPayment),
                difference: Math.round(marketPayment - monthlyPayment)
            }
        }
    };
};

const handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        const p = event.queryStringParameters;
        const loanAmount = parseInt(p.loanAmount) || 0;
        const propertyValue = parseInt(p.propertyValue) || 0;
        const landValue = parseInt(p.landValue) || 0;
        const income = parseInt(p.income) || 0;
        const liabilities = parseInt(p.liabilities) || 0;
        const term = parseInt(p.loanTerm) || 25;
        const fixationInput = parseInt(p.fixation) || 5;
        const children = parseInt(p.children) || 0;
        const age = parseInt(p.age) || 35;
        const employment = p.employment || 'zaměstnanec';
        const education = p.education || 'středoškolské';
        const purpose = p.purpose || 'koupě';

        if (!loanAmount || !propertyValue || !income) { 
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; 
        }

        const effectivePropertyValue = purpose === 'výstavba' ? propertyValue + landValue : propertyValue;
        const ltv = (effectivePropertyValue > 0) ? (loanAmount / effectivePropertyValue) * 100 : 0;
        
        // Income adjustments
        let adjustedIncome = income;
        if (employment === 'osvč') adjustedIncome = income * 0.7;
        else if (employment === 'jednatel') adjustedIncome = income * 0.8;
        
        if (education === 'vysokoškolské') adjustedIncome *= 1.1;
        else if (education === 'středoškolské') adjustedIncome *= 1.05;
        
        // Living minimum (Czech standards 2024)
        const adultMinimum = 5000;
        const firstChildMinimum = 3000;
        const otherChildMinimum = 2500;
        const housingMinimum = 8000;
        
        let livingMinimum = adultMinimum + housingMinimum;
        if (children > 0) livingMinimum += firstChildMinimum;
        if (children > 1) livingMinimum += (children - 1) * otherChildMinimum;
        
        const disposableIncome = adjustedIncome - livingMinimum;

        // Age factor
        const maxTermByAge = Math.max(5, Math.min(30, 70 - age));
        const effectiveTerm = Math.min(term, maxTermByAge);

        const allQualifiedOffers = ALL_OFFERS
            .filter(o => ltv <= o.max_ltv)
            .map(o => {
                const ratesForFixation = o.rates[fixationInput] || o.rates['5'];
                if (!ratesForFixation) return null;

                let rate;
                if (ltv <= 70) {
                    rate = ratesForFixation.rate_ltv70;
                } else if (ltv <= 80) {
                    rate = ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70;
                } else if (ltv <= 90) {
                    rate = ratesForFixation.rate_ltv90 || ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70;
                } else {
                    rate = (ratesForFixation.rate_ltv90 || ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70);
                    if (rate) rate += 0.2; // Malá penalizace pro >90% LTV
                }

                if (!rate) return null;

                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, effectiveTerm);
                
                // DSTI calculation with stress test
                const stressRate = rate + 2; // ČNB stress test
                const stressPayment = calculateMonthlyPayment(loanAmount, stressRate, effectiveTerm);
                const dsti = ((monthlyPayment + liabilities) / adjustedIncome) * 100;
                const stressDsti = ((stressPayment + liabilities) / adjustedIncome) * 100;
                
                // ČNB limity
                if (dsti > 50) return null;
                if (stressDsti > 60) return null;
                if (monthlyPayment + liabilities > disposableIncome * 0.9) return null;
                
                return { 
                    id: o.id, 
                    rate: parseFloat(rate.toFixed(2)), 
                    monthlyPayment: Math.round(monthlyPayment), 
                    dsti: Math.round(dsti),
                    stressDsti: Math.round(stressDsti),
                    title: o.title,
                    description: o.description
                };
            }).filter(Boolean);

        const finalOffers = allQualifiedOffers.sort((a, b) => a.rate - b.rate).slice(0, 3);
        
        if (finalOffers.length === 0) { 
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; 
        }
        
        // Calculate scores
        const bestOffer = finalOffers[0];
        
        let ltvScore;
        if (ltv <= 60) ltvScore = 95;
        else if (ltv <= 70) ltvScore = 90;
        else if (ltv <= 80) ltvScore = 80;
        else if (ltv <= 90) ltvScore = 65;
        else ltvScore = 40;
        
        let dstiScore = Math.round(Math.max(10, Math.min(95, (50 - bestOffer.dsti) / 50 * 100)));
        let bonitaScore = Math.round(Math.max(10, Math.min(95, (disposableIncome / 30000) * 100)));
        let ageScore = age <= 35 ? 95 : age <= 45 ? 85 : age <= 55 ? 70 : 50;
        let employmentScore = employment === 'zaměstnanec' ? 90 : employment === 'jednatel' ? 75 : 60;
        
        const totalScore = Math.round(
            ltvScore * 0.25 +
            dstiScore * 0.30 +
            bonitaScore * 0.20 +
            ageScore * 0.10 +
            employmentScore * 0.15
        );
        
        const score = { 
            ltv: Math.round(ltv),
            dsti: dstiScore,
            bonita: bonitaScore,
            age: ageScore,
            employment: employmentScore,
            total: totalScore
        };

        // Generate tips
        const tips = [];
        
        if (bestOffer.dsti > 35) {
            tips.push({ 
                id: 'dsti_warning', 
                title: "DSTI na vyšší hranici", 
                message: `Váš poměr dluh/příjem je ${bestOffer.dsti}%. Doporučujeme udržet finanční rezervu.` 
            });
        }
        
        if (ltv > 80) {
            const additionalOwnFunds = Math.round((ltv - 80) * propertyValue / 100);
            tips.push({ 
                id: 'high_ltv', 
                title: "Vyšší LTV = vyšší úrok", 
                message: `Navýšením vlastních zdrojů o ${(additionalOwnFunds/1000000).toFixed(1)} mil. Kč získáte lepší sazbu.` 
            });
        }
        
        if (age > 45 && effectiveTerm > 20) {
            tips.push({ 
                id: 'age_term', 
                title: "Věk a délka splácení", 
                message: `V ${age + effectiveTerm} letech skončíte splácení. Zvažte kratší dobu nebo spolužadatele.` 
            });
        }

        // Smart tip
        let smartTip = null;
        
        // Check shorter fixation
        if (fixationInput >= 7) {
            const shorterFixRates = ALL_OFFERS[0].rates['5'];
            if (shorterFixRates) {
                const shorterRate = ltv <= 70 ? shorterFixRates.rate_ltv70 : 
                                   ltv <= 80 ? shorterFixRates.rate_ltv80 : 
                                   shorterFixRates.rate_ltv90;
                if (shorterRate && shorterRate < bestOffer.rate - 0.1) {
                    smartTip = { 
                        id: 'smart_fixation', 
                        title: "💡 Tip na úsporu!", 
                        message: `5letá fixace má sazbu ${shorterRate}% místo ${bestOffer.rate}%. Ušetříte tisíce měsíčně.` 
                    };
                }
            }
        }
        
        // Check longer term
        if (!smartTip && effectiveTerm < 30 && age < 40) {
            const payment30 = calculateMonthlyPayment(loanAmount, bestOffer.rate, 30);
            if (payment30 < bestOffer.monthlyPayment * 0.85) {
                const diff = Math.round(bestOffer.monthlyPayment - payment30);
                smartTip = { 
                    id: 'smart_term', 
                    title: "💡 Prodlužte splatnost!", 
                    message: `Na 30 let by splátka klesla o ${diff.toLocaleString('cs-CZ')} Kč měsíčně.` 
                };
            }
        }

        // Fixation analysis
        const fixationDetails = finalOffers.length > 0 ? 
            calculateFixationAnalysis(loanAmount, bestOffer.rate, effectiveTerm, fixationInput) : null;
        
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ 
                offers: finalOffers, 
                approvability: score, 
                smartTip, 
                tips,
                fixationDetails,
                marketInfo: {
                    averageRate: 4.59,
                    bestAvailableRate: 4.09,
                    yourRate: bestOffer.rate,
                    ratePosition: bestOffer.rate <= 4.29 ? 'excellent' : 
                                 bestOffer.rate <= 4.59 ? 'good' : 'average'
                }
            }) 
        };
    } catch (error) {
        console.error("Rates function error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};

export { handler };