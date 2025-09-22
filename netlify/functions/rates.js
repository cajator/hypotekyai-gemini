// netlify/functions/rates.js - v15.0 - Final Build
const ALL_OFFERS = {
    'offer-1': { id: 'offer-1', rates: { 3: { base: 4.59, min: 4.39, max: 5.09 }, 5: { base: 4.39, min: 4.19, max: 4.89 }, 7: { base: 4.49, min: 4.29, max: 4.99 }, 10: { base: 4.69, min: 4.49, max: 5.19 } }, requirements: { minIncome: 25000, minLoan: 300000, maxLTV: 90 }, type: "standard" },
    'offer-2': { id: 'offer-2', rates: { 3: { base: 4.49, min: 4.29, max: 4.99 }, 5: { base: 4.29, min: 4.09, max: 4.79 }, 7: { base: 4.39, min: 4.19, max: 4.89 }, 10: { base: 4.59, min: 4.39, max: 5.09 } }, requirements: { minIncome: 20000, minLoan: 200000, maxLTV: 100 }, type: "best-rate" },
    'offer-3': { id: 'offer-3', rates: { 3: { base: 4.69, min: 4.49, max: 5.19 }, 5: { base: 4.49, min: 4.29, max: 4.99 }, 7: { base: 4.59, min: 4.39, max: 5.09 }, 10: { base: 4.79, min: 4.59, max: 5.29 } }, requirements: { minIncome: 30000, minLoan: 500000, maxLTV: 85 }, type: "approvability" },
    'offer-4': { id: 'offer-4', rates: { 3: { base: 4.39, min: 4.19, max: 4.89 }, 5: { base: 4.19, min: 3.99, max: 4.69 }, 7: { base: 4.29, min: 4.09, max: 4.79 }, 10: { base: 4.49, min: 4.29, max: 4.99 } }, requirements: { minIncome: 40000, minLoan: 1000000, maxLTV: 80 }, type: "best-rate" },
    'offer-5': { id: 'offer-5', rates: { 3: { base: 4.54, min: 4.34, max: 5.04 }, 5: { base: 4.34, min: 4.14, max: 4.84 }, 7: { base: 4.44, min: 4.24, max: 4.94 }, 10: { base: 4.64, min: 4.44, max: 5.14 } }, requirements: { minIncome: 25000, minLoan: 500000, maxLTV: 90 }, type: "standard" },
    'offer-6': { id: 'offer-6', rates: { 3: { base: 4.89, min: 4.69, max: 5.39 }, 5: { base: 4.79, min: 4.59, max: 5.29 }, 7: { base: 4.89, min: 4.69, max: 5.39 }, 10: { base: 4.99, min: 4.79, max: 5.49 } }, requirements: { minIncome: 18000, minLoan: 200000, maxLTV: 95 }, type: "approvability" }
};

const calculateMonthlyPayment = (p, r, t) => {
    const monthlyRate = r / 100 / 12;
    const numberOfPayments = t * 12;
    if (monthlyRate === 0) return p / numberOfPayments;
    return (p * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
};

const handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        const p = event.queryStringParameters;
        const loanAmount = parseInt(p.loanAmount) || 0;
        const propertyValue = parseInt(p.propertyValue) || 0;
        const income = parseInt(p.income) || 0;
        const liabilities = parseInt(p.liabilities) || 0;
        const term = parseInt(p.loanTerm) || 25;
        const fixation = parseInt(p.fixation) || 5;

        if (loanAmount <= 0 || propertyValue <= 0 || income <= 0) {
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) };
        }

        const ltv = (loanAmount / propertyValue) * 100;

        const allQualifiedOffers = Object.values(ALL_OFFERS)
            .filter(o => {
                const r = o.requirements;
                return ltv <= r.maxLTV && loanAmount >= r.minLoan && income >= r.minIncome && o.rates[fixation];
            })
            .map(o => {
                const rateInfo = o.rates[fixation];
                let rate = rateInfo.base;
                if (ltv <= 70) rate = rateInfo.min;
                else if (ltv > 80) rate = rateInfo.max;
                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, term);
                const dsti = ((monthlyPayment + liabilities) / income) * 100;
                if (dsti > 50) return null;
                return { id: o.id, rate: parseFloat(rate.toFixed(2)), monthlyPayment: Math.round(monthlyPayment), type: o.type, dsti };
            }).filter(Boolean);

        const getBestOffer = (type) => allQualifiedOffers.filter(o => o.type === type).sort((a,b) => a.rate - b.rate)[0];
        const finalOffers = [
            {...getBestOffer('best-rate'), title: "Nejlepší úrok", description: "Absolutně nejnižší úrok pro maximální úsporu. Ideální, pokud máte silnou bonitu."},
            {...getBestOffer('standard'), title: "Zlatá střední cesta", description: "Skvělá sazba v kombinaci s mírnějšími požadavky. Pro většinu klientů nejlepší volba."},
            {...getBestOffer('approvability'), title: "Maximální šance", description: "Nejbenevolentnější podmínky pro případy, kdy si nejste jistí svými příjmy nebo registry."}
        ].filter(o => o.id);

        const uniqueOffers = [...new Map(finalOffers.map(item => [item.id, item])).values()].slice(0,3);
        if (uniqueOffers.length === 0) {
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) };
        }
        
        const bestOfferDsti = uniqueOffers[0].dsti;
        const score = {
            ltv: Math.round(Math.max(10, Math.min(95, 100 - ltv))),
            dsti: Math.round(Math.max(10, Math.min(95, (48 - bestOfferDsti) / 48 * 100))),
            bonita: Math.round(Math.max(10, Math.min(95, (income / 35000) * 50)))
        };
        score.total = Math.round((score.ltv * 0.4) + (score.dsti * 0.4) + (score.bonita * 0.2));

        let smartTip = null;
        if (term < 30) {
            const payment30 = calculateMonthlyPayment(loanAmount, uniqueOffers[0].rate, 30);
            if (payment30 < uniqueOffers[0].monthlyPayment * 0.95) {
                const diff = Math.round(uniqueOffers[0].monthlyPayment - payment30);
                smartTip = {
                    title: "Chytrý tip!",
                    message: `Zvažte prodloužení splatnosti na 30 let. Vaše splátka by klesla na cca ${Math.round(payment30).toLocaleString('cs-CZ')} Kč a ušetřili byste tak ${diff.toLocaleString('cs-CZ')} Kč měsíčně.`
                };
            }
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ offers: uniqueOffers, approvability: score, smartTip })
        };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};

export { handler };