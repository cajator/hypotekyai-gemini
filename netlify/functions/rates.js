// netlify/functions/rates.js - v24.0 - Enhanced with Fixation Analysis
const ALL_OFFERS = [
    {
        id: 'offer-1',
        title: "Nejlepší úrok",
        description: "Absolutně nejnižší úrok pro maximální úsporu. Ideální, pokud máte silnou bonitu.",
        max_ltv: 90,
        rates: {
            '3': { rate_ltv70: 4.29, rate_ltv80: 4.49, rate_ltv90: 4.89 },
            '5': { rate_ltv70: 4.09, rate_ltv80: 4.29, rate_ltv90: 4.69 },
            '7': { rate_ltv70: 4.19, rate_ltv80: 4.39, rate_ltv90: 4.79 },
            '10': { rate_ltv70: 4.39, rate_ltv80: 4.59, rate_ltv90: 4.99 }
        }
    },
    {
        id: 'offer-2',
        title: "Zlatá střední cesta",
        description: "Skvělá sazba v kombinaci s mírnějšími požadavky. Pro většinu klientů nejlepší volba.",
        max_ltv: 90,
        rates: {
            '3': { rate_ltv70: 4.39, rate_ltv80: 4.59, rate_ltv90: 4.99 },
            '5': { rate_ltv70: 4.19, rate_ltv80: 4.39, rate_ltv90: 4.79 },
            '7': { rate_ltv70: 4.29, rate_ltv80: 4.49, rate_ltv90: 4.89 },
            '10': { rate_ltv70: 4.49, rate_ltv80: 4.69, rate_ltv90: 5.09 }
        }
    },
    {
        id: 'offer-3',
        title: "Maximální šance",
        description: "Nejbenevolentnější podmínky pro případy, kdy si nejste jistí svými příjmy nebo registry.",
        max_ltv: 95,
        rates: {
            '3': { rate_ltv70: 4.59, rate_ltv80: 4.79, rate_ltv90: 5.19 },
            '5': { rate_ltv70: 4.39, rate_ltv80: 4.59, rate_ltv90: 4.99 },
            '7': { rate_ltv70: 4.49, rate_ltv80: 4.69, rate_ltv90: 5.09 },
            '10': { rate_ltv70: 4.69, rate_ltv80: 4.89, rate_ltv90: 5.29 }
        }
    },
    {
        id: 'offer-premium',
        title: "Premium nabídka",
        description: "Exkluzivní sazby pro klienty s výjimečnou bonitou a nízkým LTV.",
        max_ltv: 70,
        rates: {
            '3': { rate_ltv70: 3.89 },
            '5': { rate_ltv70: 3.89 },
            '7': { rate_ltv70: 3.99 },
            '10': { rate_ltv70: 4.09 }
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
    
    // Calculate for fixation period
    for (let i = 0; i < fixation * 12; i++) {
        const interest = remainingBalance * monthlyRate;
        const principal = monthlyPayment - interest;
        totalInterest += interest;
        totalPrincipal += principal;
        remainingBalance -= principal;
    }
    
    // Future scenarios
    const remainingYears = loanTerm - fixation;
    const remainingMonths = remainingYears * 12;
    
    // Optimistic scenario - rate drops by 1%
    const optimisticRate = Math.max(2.5, rate - 1.0);
    const optimisticPayment = remainingMonths > 0 ? 
        calculateMonthlyPayment(remainingBalance, optimisticRate, remainingYears) : 0;
    
    // Pessimistic scenario - rate increases by 1%
    const pessimisticRate = rate + 1.0;
    const pessimisticPayment = remainingMonths > 0 ? 
        calculateMonthlyPayment(remainingBalance, pessimisticRate, remainingYears) : 0;
    
    return {
        totalPaymentsInFixation: monthlyPayment * fixation * 12,
        totalInterestForFixation: Math.round(totalInterest),
        totalPrincipalForFixation: Math.round(totalPrincipal),
        remainingBalanceAfterFixation: Math.round(remainingBalance),
        percentagePaidOff: Math.round((totalPrincipal / loanAmount) * 100),
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
            newMonthlyPayment: Math.round(optimisticPayment) // For backwards compatibility
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
        
        // Income adjustments based on employment type
        let adjustedIncome = income;
        if (employment === 'osvč') adjustedIncome = income * 0.7;
        else if (employment === 'jednatel') adjustedIncome = income * 0.8;
        
        // Education bonus
        if (education === 'vysokoškolské') adjustedIncome *= 1.05;
        
        // Living minimum calculation
        const livingMinimum = 10000 + (children * 2500);
        const disposableIncome = adjustedIncome - livingMinimum;

        // Age factor for maximum term
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
                    rate = ratesForFixation.rate_ltv90 || ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70;
                    if (rate) rate += 0.5; // Additional penalty for >90% LTV
                }

                if (!rate) return null;

                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, effectiveTerm);
                const dsti = ((monthlyPayment + liabilities) / adjustedIncome) * 100;
                
                // DSTI limits
                if (dsti > 50) return null;
                if (monthlyPayment + liabilities > disposableIncome) return null;
                
                return { 
                    id: o.id, 
                    rate: parseFloat(rate.toFixed(2)), 
                    monthlyPayment: Math.round(monthlyPayment), 
                    dsti: Math.round(dsti),
                    title: o.title,
                    description: o.description
                };
            }).filter(Boolean);

        // Sort by rate and take top 3
        const finalOffers = allQualifiedOffers.sort((a, b) => a.rate - b.rate).slice(0, 3);
        
        if (finalOffers.length === 0) { 
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; 
        }
        
        // Calculate scores
        const bestOfferDsti = finalOffers[0].dsti;
        const score = { 
            ltv: Math.round(ltv),
            dsti: Math.round(Math.max(10, Math.min(95, (50 - bestOfferDsti) / 50 * 100))), 
            bonita: Math.round(Math.max(10, Math.min(95, (disposableIncome / 20000) * 100))) 
        };
        score.total = Math.round((score.ltv <= 80 ? 95 : score.ltv <= 90 ? 80 : 60) * 0.3 + score.dsti * 0.4 + score.bonita * 0.3);

        // Generate tips
        const tips = [];
        if (score.dsti < 60) {
            tips.push({ 
                id: 'low_dsti', 
                title: "DSTI na hraně", 
                message: `Váš poměr dluh/příjem je ${bestOfferDsti}%. Snižte stávající závazky nebo zvyšte příjem pro lepší podmínky.` 
            });
        }
        if (ltv > 80) {
            tips.push({ 
                id: 'high_ltv', 
                title: "Vysoké LTV", 
                message: `LTV ${Math.round(ltv)}% je vyšší. Zvažte navýšení vlastních zdrojů pro lepší úrok.` 
            });
        }

        // Smart tip for term optimization
        let smartTip = null;
        if (effectiveTerm < 30 && age < 45) {
            const payment30 = calculateMonthlyPayment(loanAmount, finalOffers[0].rate, 30);
            if (payment30 < finalOffers[0].monthlyPayment * 0.9) {
                const diff = Math.round(finalOffers[0].monthlyPayment - payment30);
                smartTip = { 
                    id: 'smart_term', 
                    title: "💡 Chytrý tip!", 
                    message: `Prodloužení splatnosti na 30 let by snížilo splátku o ${diff.toLocaleString('cs-CZ')} Kč měsíčně.` 
                };
            }
        }

        // Calculate fixation details for the best offer
        const fixationDetails = finalOffers.length > 0 ? 
            calculateFixationAnalysis(loanAmount, finalOffers[0].rate, effectiveTerm, fixationInput) : null;
        
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ 
                offers: finalOffers, 
                approvability: score, 
                smartTip, 
                tips,
                fixationDetails 
            }) 
        };
    } catch (error) {
        console.error("Rates function error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};

export { handler };