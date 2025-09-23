// netlify/functions/rates.js - v15.0 - Final Build
const ALL_OFFERS = {
    'offer-1': { id: 'offer-1', rates: { 3: { base: 4.59, min: 4.39, max: 5.09 }, 5: { base: 4.39, min: 4.19, max: 4.89 }, 7: { base: 4.49, min: 4.29, max: 4.99 }, 10: { base: 4.69, min: 4.49, max: 5.19 } }, requirements: { maxLTV: 90 }, type: "standard" },
    'offer-2': { id: 'offer-2', rates: { 3: { base: 4.49, min: 4.29, max: 4.99 }, 5: { base: 4.29, min: 4.09, max: 4.79 }, 7: { base: 4.39, min: 4.19, max: 4.89 }, 10: { base: 4.59, min: 4.39, max: 5.09 } }, requirements: { maxLTV: 100 }, type: "best-rate" },
    'offer-3': { id: 'offer-3', rates: { 3: { base: 4.69, min: 4.49, max: 5.19 }, 5: { base: 4.49, min: 4.29, max: 4.99 }, 7: { base: 4.59, min: 4.39, max: 5.09 }, 10: { base: 4.79, min: 4.59, max: 5.29 } }, requirements: { maxLTV: 85 }, type: "approvability" },
    'offer-4': { id: 'offer-4', rates: { 3: { base: 4.39, min: 4.19, max: 4.89 }, 5: { base: 4.19, min: 3.99, max: 4.69 }, 7: { base: 4.29, min: 4.09, max: 4.79 }, 10: { base: 4.49, min: 4.29, max: 4.99 } }, requirements: { maxLTV: 80 }, type: "best-rate" },
    'offer-5': { id: 'offer-5', rates: { 3: { base: 4.54, min: 4.34, max: 5.04 }, 5: { base: 4.34, min: 4.14, max: 4.84 }, 7: { base: 4.44, min: 4.24, max: 4.94 }, 10: { base: 4.64, min: 4.44, max: 5.14 } }, requirements: { maxLTV: 90 }, type: "standard" },
    'offer-6': { id: 'offer-6', rates: { 3: { base: 4.89, min: 4.69, max: 5.39 }, 5: { base: 4.79, min: 4.59, max: 5.29 }, 7: { base: 4.89, min: 4.69, max: 5.39 }, 10: { base: 4.99, min: 4.79, max: 5.49 } }, requirements: { maxLTV: 95 }, type: "approvability" }
};
const calculateMonthlyPayment = (p, r, t) => { const mR=r/1200, n=t*12; if(mR===0)return p/n; return(p*mR*Math.pow(1+mR,n))/(Math.pow(1+mR,n)-1); };
const formatNumber = (n) => n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

const handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        const p = event.queryStringParameters;
        const loanAmount = parseInt(p.loanAmount) || 0, propertyValue = parseInt(p.propertyValue) || 0;
        const income = parseInt(p.income) || 0, liabilities = parseInt(p.liabilities) || 0;
        const term = parseInt(p.loanTerm) || 25;
        const children = parseInt(p.children) || 0;
        
        const fixationInput = parseInt(p.fixation) || 5;
        const validFixations = [3, 5, 7, 10];
        const fixation = validFixations.reduce((prev, curr) => (Math.abs(curr - fixationInput) < Math.abs(prev - fixationInput) ? curr : prev));

        if (!loanAmount || !propertyValue || !income) { return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; }

        const ltv = (loanAmount / propertyValue) * 100;
        const livingMinimum = 10000 + (children * 2500);
        const disposableIncome = income - livingMinimum;

        const allQualifiedOffers = Object.values(ALL_OFFERS)
            .filter(o => ltv <= o.requirements.maxLTV && o.rates[fixation])
            .map(o => {
                const rateInfo = o.rates[fixation];
                let rate = rateInfo.base;
                if (ltv <= 70) rate = rateInfo.min; else if (ltv > 90) rate = rateInfo.max;
                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, term);
                const dsti = ((monthlyPayment + liabilities) / income) * 100;
                if (dsti > 48 || monthlyPayment + liabilities > disposableIncome) return null;
                return { id: o.id, rate: parseFloat(rate.toFixed(2)), monthlyPayment: Math.round(monthlyPayment), type: o.type, dsti };
            }).filter(Boolean);

        const getBestOffer = (type) => allQualifiedOffers.filter(o => o.type === type).sort((a,b) => a.rate - b.rate)[0];
        const finalOffers = [
            {...getBestOffer('best-rate'), title: "Nejlepší úrok", description: "Absolutně nejnižší úrok pro maximální úsporu. Ideální, pokud máte silnou bonitu."},
            {...getBestOffer('standard'), title: "Zlatá střední cesta", description: "Skvělá sazba v kombinaci s mírnějšími požadavky. Pro většinu klientů nejlepší volba."},
            {...getBestOffer('approvability'), title: "Maximální šance", description: "Nejbenevolentnější podmínky pro případy, kdy si nejste jistí svými příjmy nebo registry."}
        ].filter(o => o.id);

        const uniqueOffers = [...new Map(finalOffers.map(item => [item.id, item])).values()].slice(0,3);
        if (uniqueOffers.length === 0) { return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; }
        
        const bestOfferDsti = uniqueOffers[0].dsti;
        const score = { ltv: Math.round(Math.max(10, Math.min(95, 110 - ltv))), dsti: Math.round(Math.max(10, Math.min(95, (48 - bestOfferDsti) / 48 * 100))), bonita: Math.round(Math.max(10, Math.min(95, (disposableIncome / 20000) * 100))) };
        score.total = Math.round((score.ltv * 0.4) + (score.dsti * 0.4) + (score.bonita * 0.2));

        let smartTip = null;
        let tips = [];
        if (term < 30) {
            const payment30 = calculateMonthlyPayment(loanAmount, uniqueOffers[0].rate, 30);
            if (payment30 < uniqueOffers[0].monthlyPayment * 0.95) {
                const diff = Math.round(uniqueOffers[0].monthlyPayment - payment30);
                smartTip = { id: 'smart_term', title: "Chytrý tip!", message: `Zvažte prodloužení splatnosti na 30 let. Vaše splátka by klesla na cca ${formatNumber(payment30)} a ušetřili byste tak ${formatNumber(diff)} měsíčně.` };
            }
        }
        if (score.dsti < 60) { tips.push({ id: 'low_dsti', title: 'Tip pro lepší DSTI', message: 'Vaše DSTI je hraniční. Zkuste snížit jiné měsíční splátky, pokud je to možné, pro lepší podmínky.' }); }
        if (score.ltv < 70 && ltv > 80) { tips.push({ id: 'low_ltv', title: 'Tip pro lepší úrok', message: 'Pro nejlepší úrokové sazby zkuste navýšit vlastní zdroje, abyste snížili LTV pod 80 %.' }); }
        
        return { statusCode: 200, headers, body: JSON.stringify({ offers: uniqueOffers, approvability: score, smartTip, tips }) };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
export { handler };