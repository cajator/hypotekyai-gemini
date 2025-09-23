// netlify/functions/rates.js - v19.0 - Multi-offer fix
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
    });
  } catch (e) {
    console.error('Firebase Admin Initialization Error', e);
  }
}

const db = admin.firestore();

const calculateMonthlyPayment = (p, r, t) => { const mR=r/1200, n=t*12; if(mR===0)return p/n; return(p*mR*Math.pow(1+mR,n))/(Math.pow(1+mR,n)-1); };
const formatNumber = (n) => n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

const handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        const offersSnapshot = await db.collection('offers').get();
        const ALL_OFFERS = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const p = event.queryStringParameters;
        const loanAmount = parseInt(p.loanAmount) || 0, propertyValue = parseInt(p.propertyValue) || 0;
        const landValue = parseInt(p.landValue) || 0;
        const income = parseInt(p.income) || 0, liabilities = parseInt(p.liabilities) || 0;
        const term = parseInt(p.loanTerm) || 25;
        const children = parseInt(p.children) || 0;
        const employmentType = p.employmentType || 'zamestnanec';
        const loanPurpose = p.loanPurpose || 'koupe';
        
        const fixationInput = parseInt(p.fixation) || 5;
        const validFixations = [3, 5, 7, 10];
        const fixation = validFixations.reduce((prev, curr) => (Math.abs(curr - fixationInput) < Math.abs(prev - fixationInput) ? curr : prev));

        if (!loanAmount || !propertyValue || !income) { return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; }

        const effectivePropertyValue = loanPurpose === 'vystavba' ? propertyValue + landValue : propertyValue;
        const ltv = (effectivePropertyValue > 0) ? (loanAmount / effectivePropertyValue) * 100 : 0;
        
        const adjustedIncome = employmentType === 'osvc' ? income * 0.7 : income;

        const livingMinimum = 10000 + (children * 2500);
        const disposableIncome = adjustedIncome - livingMinimum;

        const allQualifiedOffers = ALL_OFFERS
            .filter(o => ltv <= o.requirements.maxLTV && o.rates[fixation])
            .map(o => {
                const rateInfo = o.rates[fixation];
                let rate = rateInfo.base;
                if (ltv <= 70) rate = rateInfo.min; else if (ltv > 90) rate = rateInfo.max;
                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, term);
                const dsti = ((monthlyPayment + liabilities) / adjustedIncome) * 100;
                if (dsti > 48 || monthlyPayment + liabilities > disposableIncome) return null;
                
                let title = "Hypotéka";
                if(o.type === 'best-rate') title = "Nejlepší úrok";
                if(o.type === 'standard') title = "Zlatá střední cesta";
                if(o.type === 'approvability') title = "Maximální šance";

                return { 
                    id: o.id, 
                    rate: parseFloat(rate.toFixed(2)), 
                    monthlyPayment: Math.round(monthlyPayment), 
                    type: o.type, 
                    dsti,
                    title: o.title || title, // Použij název z DB, pokud existuje
                    description: o.description || "Standardní nabídka od našich partnerů."
                };
            }).filter(Boolean);

        // ZMĚNA LOGIKY: Seřadíme všechny kvalifikované nabídky podle sazby a vezmeme první tři.
        const finalOffers = allQualifiedOffers.sort((a, b) => a.rate - b.rate).slice(0, 3);
        
        if (finalOffers.length === 0) { return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; }
        
        const bestOfferDsti = finalOffers[0].dsti;
        const score = { 
            ltv: Math.round(Math.max(10, Math.min(95, 110 - ltv))), 
            dsti: Math.round(Math.max(10, Math.min(95, (48 - bestOfferDsti) / 48 * 100))), 
            bonita: Math.round(Math.max(10, Math.min(95, (disposableIncome / 20000) * 100))) 
        };
        score.total = Math.round((score.ltv * 0.4) + (score.dsti * 0.4) + (score.bonita * 0.2));

        let smartTip = null;
        let tips = [];
        if (term < 30) {
            const payment30 = calculateMonthlyPayment(loanAmount, finalOffers[0].rate, 30);
            if (payment30 < finalOffers[0].monthlyPayment * 0.95) {
                const diff = Math.round(finalOffers[0].monthlyPayment - payment30);
                smartTip = { id: 'smart_term', title: "Chytrý tip!", message: `Zvažte prodloužení splatnosti na 30 let. Vaše splátka by klesla na cca ${formatNumber(payment30)} a ušetřili byste tak ${formatNumber(diff)} měsíčně.` };
            }
        }
        if (score.dsti < 60) { tips.push({ id: 'low_dsti', title: 'Tip pro lepší DSTI', message: 'Vaše DSTI je hraniční. Zkuste snížit jiné měsíční splátky, pokud je to možné, pro lepší podmínky.' }); }
        if (score.ltv < 70 && ltv > 80) { tips.push({ id: 'low_ltv', title: 'Tip pro lepší úrok', message: 'Pro nejlepší úrokové sazby zkuste navýšit vlastní zdroje, abyste snížili LTV pod 80 %.' }); }
        
        const finalLtv = Math.round(ltv);
        return { statusCode: 200, headers, body: JSON.stringify({ offers: finalOffers, approvability: { ...score, ltv: finalLtv }, smartTip, tips }) };
    } catch (error) {
        console.error("Rates function error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
export { handler };

