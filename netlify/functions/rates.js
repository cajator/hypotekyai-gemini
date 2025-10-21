// netlify/functions/rates.js
// FINÁLNÍ KOMPLETNÍ VERZE S 3.99%, MAX LTV 90%, DEFAULT 30 LET

const ALL_OFFERS = [
    {
        id: 'offer-premium', // Přesunuto nahoru jako nejlepší
        title: "💎 VIP Sazba 3.99%", // Upraven název
        description: "Exkluzivní sazba 3.99% pro bonitní klienty s LTV do 70% a 3letou fixací.",
        highlights: ["Sazba 3.99%", "LTV do 70%", "Fixace 3 roky"],
        max_ltv: 70, // Striktně do 70%
        rates: { // Pouze 3letá fixace s touto sazbou
            '3': { rate_ltv70: 3.99 },
            // Ostatní VIP sazby pro LTV70
             '5': { rate_ltv70: 4.19 },
             '7': { rate_ltv70: 4.39 },
             '10': { rate_ltv70: 4.49 }
        }
    },
    {
        id: 'offer-1',
        title: "🏆 Premium AI výběr",
        description: "Výhodná sazba vybraná AI z 19+ bank. Ideální pro klienty s LTV do 80%.",
        highlights: ["Schválení do 5 dnů", "Výhodný úrok", "Online podání"],
        max_ltv: 90, // Max LTV 90%
        rates: { // Sazby začínají výše než VIP
            '3': { rate_ltv70: 4.19, rate_ltv80: 4.29, rate_ltv90: 4.72 },
            '5': { rate_ltv70: 4.24, rate_ltv80: 4.34, rate_ltv90: 4.89 },
            '7': { rate_ltv70: 4.59, rate_ltv80: 4.69, rate_ltv90: 4.99 },
            '10': { rate_ltv70: 4.69, rate_ltv80: 4.79, rate_ltv90: 5.09 }
        }
    },
    {
        id: 'offer-2',
        title: "⚖️ Optimální poměr",
        description: "Vyvážená nabídka s flexibilními podmínkami. Rychlé schválení i pro OSVČ.",
        highlights: ["Flexibilní podmínky", "OSVČ friendly", "Bez skrytých poplatků"],
        max_ltv: 90, // Max LTV 90%
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
        description: "Vstřícné podmínky až do 90% LTV.", // Max LTV 90%
        highlights: ["LTV až 90%", "Věk do 70 let", "Mimořádné splátky"], // Max LTV 90%
        max_ltv: 90, // Max LTV 90%
        rates: { // Sazby pro LTV 90 jsou relevantní
            '3': { rate_ltv70: 4.44, rate_ltv80: 4.79, rate_ltv90: 4.94 },
            '5': { rate_ltv70: 4.59, rate_ltv80: 4.74, rate_ltv90: 4.99 },
            '7': { rate_ltv70: 4.69, rate_ltv80: 4.89, rate_ltv90: 5.29 },
            '10': { rate_ltv70: 4.84, rate_ltv80: 5.09, rate_ltv90: 5.49 }
        }
    }
    // Odebrali jsme nabídku s max_ltv 95%, protože už není relevantní
];

// ===== KOMPLETNÍ FUNKCE calculateMonthlyPayment =====
const calculateMonthlyPayment = (p, r, t) => {
    // p = loan amount, r = annual interest rate (%), t = loan term in years
    const monthlyRate = r / 1200; // Convert annual rate to monthly decimal
    const numberOfPayments = t * 12;

    if (monthlyRate === 0) { // Handle zero interest rate
        return p / numberOfPayments;
    }

    // Standard mortgage payment formula
    const payment = (p * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    return payment;
};
// ===================================================

// ===== KOMPLETNÍ FUNKCE calculateFixationAnalysis =====
const calculateFixationAnalysis = (loanAmount, propertyValue, rate, loanTerm, fixation) => {
    const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
    const monthlyRate = rate / 100 / 12; // Monthly rate as decimal

    let remainingBalance = loanAmount;
    let totalInterest = 0;
    let totalPrincipal = 0;
    const numberOfFixationPayments = fixation * 12;

    for (let i = 0; i < numberOfFixationPayments; i++) {
        const interestPayment = remainingBalance * monthlyRate;
        // Ensure principal payment doesn't exceed remaining balance (important for end of loan)
        const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance);
        
        totalInterest += interestPayment;
        totalPrincipal += principalPayment;
        remainingBalance -= principalPayment;
        
        // Break if balance is paid off early (shouldn't happen within fixation typically)
        if (remainingBalance <= 0) {
            remainingBalance = 0;
            break;
        }
    }

    const totalPaymentsInFixation = totalPrincipal + totalInterest; // More accurate than monthlyPayment * numberOfFixationPayments if loan ends early
    const remainingYears = Math.max(0, loanTerm - fixation); // Ensure non-negative remaining years
    const remainingMonths = remainingYears * 12;

    // Future scenarios calculation
    const optimisticRate = Math.max(3.59, rate - 0.6); // Example optimistic rate
    const optimisticPayment = remainingMonths > 0 ? calculateMonthlyPayment(remainingBalance, optimisticRate, remainingYears) : 0;
    const moderateIncreaseRate = rate + 0.5; // Example moderate increase
    const moderateIncreasePayment = remainingMonths > 0 ? calculateMonthlyPayment(remainingBalance, moderateIncreaseRate, remainingYears) : 0;

    const quickAnalysis = {
        dailyCost: Math.round(monthlyPayment / 30.4375), // Average days in month
        percentOfTotal: totalPaymentsInFixation > 0 ? Math.round((totalInterest / totalPaymentsInFixation) * 100) : 0,
        estimatedRent: Math.round((propertyValue * 0.035) / 12), // Rent estimation based on property value
        taxSavings: Math.round(totalInterest * 0.15 / numberOfFixationPayments), // Monthly tax saving estimate
    };

    return {
        totalPaymentsInFixation: Math.round(totalPaymentsInFixation),
        totalInterestForFixation: Math.round(totalInterest),
        totalPrincipalForFixation: Math.round(totalPrincipal),
        remainingBalanceAfterFixation: Math.round(remainingBalance),
        quickAnalysis,
        futureScenario: {
            optimistic: {
                rate: parseFloat(optimisticRate.toFixed(2)),
                newMonthlyPayment: Math.round(optimisticPayment),
                monthlySavings: Math.round(monthlyPayment - optimisticPayment),
            },
            moderateIncrease: {
                rate: parseFloat(moderateIncreaseRate.toFixed(2)),
                newMonthlyPayment: Math.round(moderateIncreasePayment),
                monthlyIncrease: Math.round(moderateIncreasePayment - monthlyPayment),
            }
        }
    };
};
// =======================================================

// ===== KOMPLETNÍ FUNKCE handler =====
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
        const term = parseInt(p.loanTerm) || 30; // <-- Default 30 let
        const fixationInput = parseInt(p.fixation) || 3; // Default fixace 5 let
        const children = parseInt(p.children) || 0;
        const age = parseInt(p.age) || 35;
        const employment = p.employment || 'zaměstnanec';
        const education = p.education || 'středoškolské';
        const purpose = p.purpose || 'koupě';

        if (!loanAmount || !propertyValue || !income) {
            console.log("Chybí základní vstupní data.");
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) };
        }

        const effectivePropertyValue = purpose === 'výstavba' ? propertyValue + landValue : propertyValue;
        if (effectivePropertyValue <= 0) {
             console.log("Neplatná hodnota nemovitosti.");
             return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) };
        }
        const ltv = (loanAmount / effectivePropertyValue) * 100;
        
        // ===== KONTROLA MAX LTV 90% =====
        if (ltv > 90) {
             console.log(`LTV ${ltv.toFixed(1)}% překročilo limit 90%.`);
             // Můžeme vrátit prázdné nabídky nebo specifickou chybovou zprávu
             return { statusCode: 200, headers, body: JSON.stringify({ offers: [], error: "LTV nesmí překročit 90 %." }) }; 
        }
        // ================================
        
        // Výpočet efektivní splatnosti s ohledem na věk
        const effectiveTerm = Math.min(term, Math.max(5, 70 - age));

        const allQualifiedOffers = ALL_OFFERS
            .filter(o => ltv <= o.max_ltv) // Filtrujeme dle max_ltv nabídky
            .map(o => {
                const ratesForFixation = o.rates[fixationInput] || o.rates['5']; // Fallback na 5 let
                if (!ratesForFixation) {
                    console.log(`Chybí sazby pro fixaci ${fixationInput} u nabídky ${o.id}`);
                    return null;
                }

                let rate;
                // Pečlivý výběr sazby s fallbacky
                if (ltv <= 70) rate = ratesForFixation.rate_ltv70;
                else if (ltv <= 80) rate = ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70;
                else if (ltv <= 90) rate = ratesForFixation.rate_ltv90 || ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70;
                
                if (!rate) {
                    console.log(`Nenalezena sazba pro LTV ${ltv.toFixed(1)}% a fixaci ${fixationInput} u nabídky ${o.id}`);
                    return null; // Přeskočíme nabídku, pokud pro danou kombinaci LTV/fixace nemá sazbu
                }

                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, effectiveTerm);
                const dsti = income > 0 ? ((monthlyPayment + liabilities) / income) * 100 : Infinity; // DSTI
                
                // Základní kontroly bonity
                const dstiLimit = 50; // Zjednodušený limit DSTI
                if (dsti > dstiLimit) {
                     console.log(`Nabídka ${o.id} zamítnuta: DSTI ${dsti.toFixed(1)}% > ${dstiLimit}%`);
                     return null;
                }
                
                return { 
                    id: o.id, 
                    rate: parseFloat(rate.toFixed(2)), 
                    monthlyPayment: Math.round(monthlyPayment), 
                    dsti: Math.round(dsti), 
                    title: o.title, 
                    description: o.description, 
                    highlights: o.highlights || [] 
                };
            }).filter(Boolean); // Odstraní null hodnoty (nabídky bez sazby nebo nesplňující bonitu)

        // Seřadíme finální nabídky podle sazby
        const finalOffers = allQualifiedOffers.sort((a, b) => a.rate - b.rate);

        if (finalOffers.length === 0) {
            console.log("Nenalezeny žádné vyhovující nabídky.");
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) };
        }
        
        // Nejlepší nabídka pro výpočet skóre a detailů
        const bestOffer = finalOffers[0];
        
        // Výpočet skóre
        const ltvScore = Math.max(50, Math.min(100, 100 - (ltv - 80))); // LTV 80% = 100 bodů
        const dstiScore = Math.max(50, Math.min(100, 100 - (bestOffer.dsti - 20) * 2)); // DSTI 20% = 100 bodů
        const minLivingCost = 10000 + (children * 3000); // Zjednodušený odhad životního minima
        const freeIncome = income - bestOffer.monthlyPayment - liabilities - minLivingCost;
        const bonitaScore = Math.max(50, Math.min(100, 50 + (freeIncome / 500))); // Každých 500 Kč volných navíc přidá bod
        const totalScore = Math.round(ltvScore * 0.3 + dstiScore * 0.4 + bonitaScore * 0.3); // Mírně upravené váhy
        
        const score = {
            ltv: Math.round(ltvScore),
            dsti: Math.round(dstiScore),
            bonita: Math.round(bonitaScore),
            total: Math.max(50, Math.min(95, totalScore)) // Omezení celkového skóre
        };
        
        // Spočítáme fixationDetails pro NEJLEPŠÍ nabídku a ZVOLENOU fixaci
        const fixationDetails = calculateFixationAnalysis(loanAmount, effectivePropertyValue, bestOffer.rate, effectiveTerm, fixationInput);
        
        console.log(`Výpočet dokončen, nalezeno ${finalOffers.length} nabídek.`);
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ 
                offers: finalOffers.slice(0, 3), // Vrátíme max 3 nejlepší
                approvability: score, 
                fixationDetails 
            }) 
        };
    } catch (error) {
        console.error("Rates Error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Nastala chyba: ${error.message}` }) };
    }
};
// ===============================

// Export pro Netlify Functions
export { handler };