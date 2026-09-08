// netlify/functions/rates.js
const ALL_OFFERS = [
    { id: 'offer-premium', title: "💎 VIP Sazba 5.29%", description: "Exkluzivní sazba pro bonitní klienty.", max_ltv: 70, rates: { '3': { rate_ltv70: 5.29 }, '5': { rate_ltv70: 5.29 }, '7': { rate_ltv70: 5.49 }, '10': { rate_ltv70: 5.59 } } },
    { id: 'offer-1', title: "🏆 Premium + Pojištění", description: "Nejoblíbenější volba našich klientů.", max_ltv: 90, rates: { '3': { rate_ltv70: 5.49, rate_ltv80: 5.49, rate_ltv90: 6.02 }, '5': { rate_ltv70: 5.59, rate_ltv80: 5.59, rate_ltv90: 6.19 }, '7': { rate_ltv70: 5.89, rate_ltv80: 5.89, rate_ltv90: 6.29 }, '10': { rate_ltv70: 5.99, rate_ltv80: 5.99, rate_ltv90: 6.39 } } },
    { id: 'offer-2', title: "⚖️ Flexibilní / OSVČ", description: "Obratové hypotéky pro podnikatele.", max_ltv: 90, rates: { '3': { rate_ltv70: 5.69, rate_ltv80: 5.79, rate_ltv90: 6.19 }, '5': { rate_ltv70: 5.79, rate_ltv80: 5.89, rate_ltv90: 6.29 }, '7': { rate_ltv70: 6.09, rate_ltv80: 6.19, rate_ltv90: 6.49 }, '10': { rate_ltv70: 6.19, rate_ltv80: 6.29, rate_ltv90: 6.59 } } }
];

const calculateMonthlyPayment = (p, r, t) => {
    const monthlyRate = r / 1200; const numberOfPayments = t * 12;
    if (monthlyRate === 0) return p / numberOfPayments;
    return (p * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
};

const calculateFixationAnalysis = (loanAmount, propertyValue, rate, loanTerm, fixation) => {
    const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
    const monthlyRate = rate / 100 / 12; 
    let remainingBalance = loanAmount, totalInterest = 0, totalPrincipal = 0;
    const numberOfFixationPayments = fixation * 12;
    for (let i = 0; i < numberOfFixationPayments; i++) {
        const interestPayment = remainingBalance * monthlyRate;
        const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance);
        totalInterest += interestPayment; totalPrincipal += principalPayment; remainingBalance -= principalPayment;
        if (remainingBalance <= 0) { remainingBalance = 0; break; }
    }
    const remainingYears = Math.max(0, loanTerm - fixation); 
    const optimisticRate = Math.max(3.59, rate - 0.6); 
    const moderateIncreaseRate = rate + 0.5; 
    return {
        totalPaymentsInFixation: Math.round(totalPrincipal + totalInterest), totalInterestForFixation: Math.round(totalInterest), totalPrincipalForFixation: Math.round(totalPrincipal), remainingBalanceAfterFixation: Math.round(remainingBalance),
        quickAnalysis: { dailyCost: Math.round(monthlyPayment / 30.4375), taxSavings: (numberOfFixationPayments > 0) ? Math.min(Math.round(totalInterest * 0.15 / numberOfFixationPayments), 1875) : 0 },
        futureScenario: {
            optimistic: { rate: parseFloat(optimisticRate.toFixed(2)), newMonthlyPayment: Math.round(remainingYears > 0 ? calculateMonthlyPayment(remainingBalance, optimisticRate, remainingYears) : 0) },
            moderateIncrease: { rate: parseFloat(moderateIncreaseRate.toFixed(2)), newMonthlyPayment: Math.round(remainingYears > 0 ? calculateMonthlyPayment(remainingBalance, moderateIncreaseRate, remainingYears) : 0) }
        }
    };
};

exports.handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    try {
        const p = event.queryStringParameters;
        const loanAmount = parseInt(p.loanAmount) || 0; const propertyValue = parseInt(p.propertyValue) || 0; const landValue = parseInt(p.landValue) || 0;
        const income = parseInt(p.income) || 0; const liabilities = parseInt(p.liabilities) || 0;
        const totalDebt = parseInt(p.totalDebt) || 0;
        const energyLabel = p.energyLabel || 'c_worse';
        const ownedProperties = p.ownedProperties || '0_1';
        
        const term = parseInt(p.loanTerm) || 30; const fixationInput = parseInt(p.fixation) || 5; const age = parseInt(p.age) || 35;
        const purpose = p.purpose || 'koupě';
        
        if (!loanAmount || !propertyValue || !income) return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) };
        const effectivePropertyValue = purpose === 'výstavba' ? propertyValue + landValue : propertyValue;
        if (effectivePropertyValue <= 0) return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) };
        
        const ltv = (loanAmount / effectivePropertyValue) * 100;
        if (ltv > 90) return { statusCode: 200, headers, body: JSON.stringify({ offers: [], error: "LTV > 90%" }) }; 
        
        const isYoungApplicant = age < 36; 
        const dti = (loanAmount + totalDebt) / (income * 12);
        const maxDti = ownedProperties === '2_plus' ? 7.0 : (isYoungApplicant ? 9.5 : 8.5);
        if (dti > maxDti) return { statusCode: 200, headers, body: JSON.stringify({ offers: [], error: "DTI limit" }) }; 

        const effectiveTerm = Math.min(term, Math.max(5, 70 - age));
        
        const offers = ALL_OFFERS.filter(o => ltv <= o.max_ltv).map(o => {
            const rates = o.rates[fixationInput] || o.rates['5']; 
            if (!rates) return null;
            let rate = ltv <= 70 ? rates.rate_ltv70 : (ltv <= 80 ? (rates.rate_ltv80 || rates.rate_ltv70) : (isYoungApplicant ? (rates.rate_ltv80 || rates.rate_ltv70) + 0.1 : rates.rate_ltv90 || rates.rate_ltv80));
            if (!rate) return null; 
            
            // Sleva za štítek, ALE absolutní dno je 5.19 %
            if (energyLabel === 'a_b') { rate = Math.max(5.19, rate - 0.1); }
            
            const payment = calculateMonthlyPayment(loanAmount, rate, effectiveTerm);
            const dsti = income > 0 ? ((payment + liabilities) / income) * 100 : Infinity;
            if (dsti > 55) return null;
            
            let title = o.title;
            if(energyLabel === 'a_b' && rate >= 5.19) title += " (Zelená sleva)";
            
            return { id: o.id, rate: parseFloat(rate.toFixed(2)), monthlyPayment: Math.round(payment), dsti: Math.round(dsti), title: title, description: o.description };
        }).filter(Boolean).sort((a, b) => a.rate - b.rate);
        
        if (offers.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) };
        const best = offers[0];
        const score = { ltv: Math.round(100 - Math.max(0, ltv - 50)*2), dsti: Math.round(100 - Math.max(0, best.dsti - 20)*2), bonita: 0 };
        score.bonita = Math.round((score.ltv + score.dsti)/2);
        score.total = Math.round(score.ltv * 0.3 + score.dsti * 0.4 + score.bonita * 0.3);
        
        return { statusCode: 200, headers, body: JSON.stringify({ offers: offers.slice(0, 3), approvability: score, fixationDetails: calculateFixationAnalysis(loanAmount, effectivePropertyValue, best.rate, effectiveTerm, fixationInput) }) };
    } catch (error) { return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }; }
};