// netlify/functions/rates.js - v23.0 - Hardcoded Data Version
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
    }
];

const calculateMonthlyPayment = (p, r, t) => { const mR=r/1200, n=t*12; if(mR===0)return p/n; return(p*mR*Math.pow(1+mR,n))/(Math.pow(1+mR,n)-1); };
const formatNumber = (n) => n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

const handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        const p = event.queryStringParameters;
        const loanAmount = parseInt(p.loanAmount) || 0, propertyValue = parseInt(p.propertyValue) || 0;
        const landValue = parseInt(p.landValue) || 0;
        const income = parseInt(p.income) || 0, liabilities = parseInt(p.liabilities) || 0;
        const term = parseInt(p.loanTerm) || 25;
        const children = parseInt(p.children) || 0;
        const employmentType = p.employmentType || 'zamestnanec';
        const loanPurpose = p.loanPurpose || 'koupe';
        const fixationInput = parseInt(p.fixation) || 5;

        if (!loanAmount || !propertyValue || !income) { return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; }

        const effectivePropertyValue = loanPurpose === 'vystavba' ? propertyValue + landValue : propertyValue;
        const ltv = (effectivePropertyValue > 0) ? (loanAmount / effectivePropertyValue) * 100 : 0;
        
        const adjustedIncome = employmentType === 'osvc' ? income * 0.7 : income;
        const livingMinimum = 10000 + (children * 2500);
        const disposableIncome = adjustedIncome - livingMinimum;

        const allQualifiedOffers = ALL_OFFERS
            .filter(o => ltv <= o.max_ltv)
            .map(o => {
                const ratesForFixation = o.rates[fixationInput] || o.rates['5'];
                if (!ratesForFixation) return null;

                let rate;
                if (ltv <= 70) {
                    rate = ratesForFixation.rate_ltv70;
                } else if (ltv <= 80) {
                    rate = ratesForFixation.rate_ltv80;
                } else {
                    rate = ratesForFixation.rate_ltv90;
                }

                if (!rate) return null;

                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, term);
                const dsti = ((monthlyPayment + liabilities) / adjustedIncome) * 100;
                
                if (dsti > 50 || monthlyPayment + liabilities > disposableIncome) return null;
                
                return { 
                    id: o.id, 
                    rate: parseFloat(rate.toFixed(2)), 
                    monthlyPayment: Math.round(monthlyPayment), 
                    dsti,
                    title: o.title,
                    description: o.description
                };
            }).filter(Boolean);

        const finalOffers = allQualifiedOffers.sort((a, b) => a.rate - b.rate).slice(0, 3);
        
        if (finalOffers.length === 0) { return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; }
        
        const bestOfferDsti = finalOffers[0].dsti;
        const score = { 
            dsti: Math.round(Math.max(10, Math.min(95, (50 - bestOfferDsti) / 50 * 100))), 
            bonita: Math.round(Math.max(10, Math.min(95, (disposableIncome / 20000) * 100))) 
        };
        score.total = Math.round((score.dsti * 0.6) + (score.bonita * 0.4));

        let smartTip = null;
        if (term < 30) {
            const payment30 = calculateMonthlyPayment(loanAmount, finalOffers[0].rate, 30);
            if (payment30 < finalOffers[0].monthlyPayment * 0.95) {
                const diff = Math.round(finalOffers[0].monthlyPayment - payment30);
                smartTip = { id: 'smart_term', title: "Chytrý tip!", message: `Zvažte prodloužení splatnosti na 30 let. Vaše splátka by klesla na cca ${formatNumber(payment30)} a ušetřili byste tak ${formatNumber(diff)} měsíčně.` };
            }
        }
        
        const finalLtv = Math.round(ltv);
        return { statusCode: 200, headers, body: JSON.stringify({ offers: finalOffers, approvability: { ...score, ltv: finalLtv }, smartTip, tips: [] }) };
    } catch (error) {
        console.error("Rates function error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
export { handler };

