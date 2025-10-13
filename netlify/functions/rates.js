// netlify/functions/rates.js
// VERZE S OPRAVAMI A VYLEPŠENÍMI

const ALL_OFFERS = [
    {
        id: 'offer-1',
        title: "🏆 Premium AI výběr",
        description: "Exkluzivní sazba vybraná AI z 19+ bank. Ideální pro klienty s příjmem nad 50k a LTV do 80%.",
        highlights: ["Schválení do 5 dnů", "Nejnižší úrok na trhu", "Online podání"],
        max_ltv: 90,
        rates: {
            '3': { rate_ltv70: 4.19, rate_ltv80: 4.29, rate_ltv90: 4.72 },
            '5': { rate_ltv70: 4.24, rate_ltv80: 4.34, rate_ltv90: 4.89 },
            '7': { rate_ltv70: 4.59, rate_ltv80: 4.69, rate_ltv90: 4.99 },
            '10': { rate_ltv70: 4.69, rate_ltv80: 4.79, rate_ltv90: 5.09 }
        }
    },
    {
        id: 'offer-2',
        title: "⚖️ Optimální poměr",
        description: "Vyvážená nabídka s flexibilními podmínkami. Rychlé schválení i pro OSVČ a jednatele.",
        highlights: ["Flexibilní podmínky", "OSVČ friendly", "Bez skrytých poplatků"],
        max_ltv: 90,
        rates: {
            '3': { rate_ltv70: 4.29, rate_ltv80: 4.39, rate_ltv90: 4.73 },
            '5': { rate_ltv70: 4.34, rate_ltv80: 4.59, rate_ltv90: 4.89 },
            '7': { rate_ltv70: 4.69, rate_ltv80: 4.79, rate_ltv90: 5.04 },
            '10': { rate_ltv70: 4.69, rate_ltv80: 4.89, rate_ltv90: 5.14 }
        }
    },
    {
        id: 'offer-3',
        title: "🚀 Dostupná hypotéka",
        description: "Vstřícné podmínky až do 95% LTV. Schválení i s nižší bonitou nebo vyšším věkem.",
        highlights: ["LTV až 95%", "Věk do 70 let", "Mimořádné splátky zdarma"],
        max_ltv: 95,
        rates: {
            '3': { rate_ltv70: 4.44, rate_ltv80: 4.79, rate_ltv90: 4.94 },
            '5': { rate_ltv70: 4.59, rate_ltv80: 4.74, rate_ltv90: 4.99 },
            '7': { rate_ltv70: 4.69, rate_ltv80: 4.89, rate_ltv90: 5.29 },
            '10': { rate_ltv70: 4.84, rate_ltv80: 5.09, rate_ltv90: 5.49 }
        }
    },
    {
        id: 'offer-premium',
        title: "💎 VIP podmínky",
        description: "Exkluzivní sazby pro prémiové klienty s LTV do 70% a vysokými příjmy.",
        highlights: ["Osobní bankéř", "Prémiové služby", "Expresní vyřízení"],
        max_ltv: 70,
        rates: {
            '3': { rate_ltv70: 4.19 },
            '5': { rate_ltv70: 4.29 },  
            '7': { rate_ltv70: 4.49 },
            '10': { rate_ltv70: 4.54 }
        }
    }
];

const calculateMonthlyPayment = (p, r, t) => { 
    const mR = r / 1200, n = t * 12; 
    if (mR === 0) return p / n; 
    return (p * mR * Math.pow(1 + mR, n)) / (Math.pow(1 + mR, n) - 1); 
};

const calculateFixationAnalysis = (loanAmount, propertyValue, rate, loanTerm, fixation) => {
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
    
    const optimisticRate = Math.max(3.59, rate - 0.6);
    const optimisticPayment = remainingMonths > 0 ? calculateMonthlyPayment(remainingBalance, optimisticRate, remainingYears) : 0;
    const moderateIncreaseRate = rate + 0.5;
    const moderateIncreasePayment = remainingMonths > 0 ? calculateMonthlyPayment(remainingBalance, moderateIncreaseRate, remainingYears) : 0;
    
    const quickAnalysis = {
        dailyCost: Math.round(monthlyPayment / 30),
        percentOfTotal: Math.round((totalInterest / totalPaymentsInFixation) * 100),
        estimatedRent: Math.round((propertyValue * 0.035) / 12),
        taxSavings: Math.round(totalInterest * 0.15 / (fixation * 12)),
    };
    
    return {
        totalPaymentsInFixation: Math.round(totalPaymentsInFixation),
        totalInterestForFixation: Math.round(totalInterest),
        totalPrincipalForFixation: Math.round(totalPrincipal),
        remainingBalanceAfterFixation: Math.round(remainingBalance),
        quickAnalysis,
        futureScenario: {
            optimistic: {
                rate: optimisticRate,
                newMonthlyPayment: Math.round(optimisticPayment),
                monthlySavings: Math.round(monthlyPayment - optimisticPayment),
            },
            moderateIncrease: {
                rate: moderateIncreaseRate,
                newMonthlyPayment: Math.round(moderateIncreasePayment),
                monthlyIncrease: Math.round(moderateIncreasePayment - monthlyPayment),
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
        
        const disposableIncome = income - (4500 + 7000 + (children > 0 ? 2700 + (children - 1) * 2400 : 0));
        const effectiveTerm = Math.min(term, Math.max(5, 70 - age));

        const allQualifiedOffers = ALL_OFFERS
            .filter(o => ltv <= o.max_ltv)
            .map(o => {
                const ratesForFixation = o.rates[fixationInput] || o.rates['5'];
                if (!ratesForFixation) return null;

                let rate;
                if (ltv <= 70) rate = ratesForFixation.rate_ltv70;
                else if (ltv <= 80) rate = ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70;
                else if (ltv <= 90) rate = ratesForFixation.rate_ltv90 || ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70;
                else rate = (ratesForFixation.rate_ltv90 || ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70) + 0.3;
                if (!rate) return null;

                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, effectiveTerm);
                const dsti = ((monthlyPayment + liabilities) / income) * 100;
                const stressPayment = calculateMonthlyPayment(loanAmount, rate + 2, effectiveTerm);
                const stressDsti = ((stressPayment + liabilities) / income) * 100;
                
                const dstiLimit = income >= 50000 ? 55 : income >= 30000 ? 50 : 45;
                if (dsti > dstiLimit * 1.1 || stressDsti > (dstiLimit + 5) * 1.15) return null;
                if (income - monthlyPayment - liabilities < (8000 + children * 2000) * 0.6) return null;
                
                return { id: o.id, rate: parseFloat(rate.toFixed(2)), monthlyPayment: Math.round(monthlyPayment), dsti: Math.round(dsti), title: o.title, description: o.description, highlights: o.highlights || [] };
            }).filter(Boolean);

        const finalOffers = allQualifiedOffers.sort((a, b) => a.rate - b.rate);
        if (finalOffers.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; 
        
        const bestOffer = finalOffers[0];
        const ltvScore = Math.max(50, Math.min(100, 100 - (ltv - 80)));
        const dstiScore = Math.max(50, 100 - (bestOffer.dsti - 20) * 2);
        const bonitaScore = Math.max(50, Math.min(100, (income - bestOffer.monthlyPayment - liabilities) / 300));
        const totalScore = Math.round(ltvScore * 0.2 + dstiScore * 0.35 + bonitaScore * 0.45);
        
        const score = {
            ltv: Math.round(ltvScore),
            dsti: Math.round(dstiScore),
            bonita: Math.round(bonitaScore),
            total: Math.max(50, Math.min(95, totalScore))
        };
        const fixationDetails = calculateFixationAnalysis(loanAmount, propertyValue, bestOffer.rate, effectiveTerm, fixationInput);
        
        return { statusCode: 200, headers, body: JSON.stringify({ offers: finalOffers.slice(0, 3), approvability: score, fixationDetails }) };
    } catch (error) {
        console.error("Rates Error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};

export { handler };