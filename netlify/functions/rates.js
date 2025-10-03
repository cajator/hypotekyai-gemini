// netlify/functions/rates.js

const ALL_OFFERS = [
    {
        id: 'offer-1',
        title: "🏆 Premium AI výběr",
        description: "Exkluzivní sazba vybraná AI z 19+ bank. Ideální pro klienty s příjmem nad 50k a LTV do 80%.",
        highlights: ["Schválení do 5 dnů", "Nejnižší úrok na trhu", "Online podání"],
        max_ltv: 90,
        rates: {
            '3': { rate_ltv70: 4.09, rate_ltv80: 4.29, rate_ltv90: 4.72 },
            '5': { rate_ltv70: 4.14, rate_ltv80: 4.29, rate_ltv90: 4.89 },
            '7': { rate_ltv70: 4.59, rate_ltv80: 4.69, rate_ltv90: 4.99 },
            '10': { rate_ltv70: 4.69, rate_ltv80: 4.79, rate_ltv90: 5.19 }
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
            '3': { rate_ltv70: 4.09 },
            '5': { rate_ltv70: 4.19 },  
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

const calculateFixationAnalysis = (loanAmount, rate, loanTerm, fixation) => {
    const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
    const monthlyRate = rate / 100 / 12;
    
    let remainingBalance = loanAmount;
    let totalInterest = 0;
    let totalPrincipal = 0;
    
    for (let i = 0; i < fixation * 12; i++) {
        if (remainingBalance <= 0) break;
        const interest = remainingBalance * monthlyRate;
        const principal = monthlyPayment - interest;
        totalInterest += interest;
        totalPrincipal += principal;
        remainingBalance -= principal;
    }
    
    const totalPaymentsInFixation = monthlyPayment * fixation * 12;
    const remainingYears = loanTerm - fixation;
    
    const optimisticRate = Math.max(3.59, rate - 0.6);
    const optimisticPayment = remainingYears > 0 ? calculateMonthlyPayment(remainingBalance, optimisticRate, remainingYears) : 0;
    
    return {
        totalPaymentsInFixation: Math.round(totalPaymentsInFixation),
        totalInterestForFixation: Math.round(totalInterest),
        totalPrincipalForFixation: Math.round(totalPrincipal),
        remainingBalanceAfterFixation: Math.round(remainingBalance),
        futureScenario: {
            optimistic: {
                rate: optimisticRate,
                newMonthlyPayment: Math.round(optimisticPayment),
                monthlySavings: Math.round(monthlyPayment - optimisticPayment),
            },
        }
    };
};

const handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

        const p = event.queryStringParameters;
        const loanAmount = parseInt(p.loanAmount) || 0;
        const propertyValue = parseInt(p.propertyValue) || 0;
        const income = parseInt(p.income) || 0;
        const liabilities = parseInt(p.liabilities) || 0;
        const term = parseInt(p.loanTerm) || 30;
        const fixationInput = parseInt(p.fixation) || 5;
        const children = parseInt(p.children) || 0;
        const age = parseInt(p.age) || 35;
        const purpose = p.purpose || 'koupě';
        const landValue = parseInt(p.landValue) || 0;


        if (!loanAmount || !propertyValue || !income) { 
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; 
        }

        const effectivePropertyValue = purpose === 'výstavba' ? propertyValue + landValue : propertyValue;
        const ltv = (effectivePropertyValue > 0) ? (loanAmount / effectivePropertyValue) * 100 : 100;
        
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
                
                // Přísnější scoring
                const dstiLimit = income > 36000 ? 50 : 45;
                if (dsti > dstiLimit || stressDsti > (dstiLimit + 5)) return null;
                
                return { id: o.id, rate: parseFloat(rate.toFixed(2)), monthlyPayment: Math.round(monthlyPayment), dsti: Math.round(dsti), title: o.title, description: o.description };
            }).filter(Boolean);

        const finalOffers = allQualifiedOffers.sort((a, b) => a.rate - b.rate);
        if (finalOffers.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; 
        
        const bestOffer = finalOffers[0];
        const ltvScore = Math.max(10, 100 - (ltv - 70) * 2);
        const dstiScore = Math.max(10, 100 - (bestOffer.dsti - 25) * 2.5);
        const bonitaScore = Math.max(10, Math.min(100, (income - bestOffer.monthlyPayment - liabilities) / 200));
        const totalScore = Math.round(ltvScore * 0.3 + dstiScore * 0.4 + bonitaScore * 0.3);
        
        const score = { ltv: Math.max(0, Math.min(100, Math.round(ltvScore))), dsti: Math.max(0, Math.min(100, Math.round(dstiScore))), bonita: Math.max(0, Math.min(100, Math.round(bonitaScore))), total: Math.max(10, Math.min(98, totalScore)) };
        const fixationDetails = calculateFixationAnalysis(loanAmount, bestOffer.rate, effectiveTerm, fixationInput);
        
        return { statusCode: 200, headers, body: JSON.stringify({ offers: finalOffers.slice(0, 3), approvability: score, fixationDetails }) };
    } catch (error) {
        console.error("Rates Error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};

export { handler };
