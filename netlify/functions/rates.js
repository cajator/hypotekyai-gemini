// netlify/functions/rates.js
// FINÁLNÍ KOMPLETNÍ VERZE S 3.99%, MAX LTV 90%, DEFAULT 30 LET

const ALL_OFFERS = [
    {
        id: 'offer-premium',
        title: "💎 VIP Sazba 3.99%",
        description: "Exkluzivní sazba pro bonitní klienty. Podmínkou je aktivní využívání účtu a pojištění.",
        highlights: ["Nejnižší sazba na trhu", "Sleva za domicil", "Osobní bankéř"], // Upraveno
        max_ltv: 70,
        targetGroup: "Bonitní klienty", // Opraveno
        rates: {
            '3': { rate_ltv70: 3.99 },
            '5': { rate_ltv70: 4.19 },
            '7': { rate_ltv70: 4.39 },
            '10': { rate_ltv70: 4.49 }
        }
    },
    {
        id: 'offer-1',
        title: "🏆 Premium + Pojištění",
        description: "Výhodná sazba při sjednání pojištění nemovitosti a schopnosti splácet. Nejoblíbenější volba.",
        highlights: ["Sleva za pojištění", "Rychlé čerpání", "Odhad zdarma"],
        max_ltv: 90, // <--- ZMĚNA ZDE (bylo 80). Nyní pustí i 90%, logika uvnitř handleru pak určí cenu.
        targetGroup: "Maximální úsporu",
        rates: {
            '3': { rate_ltv70: 4.19, rate_ltv80: 4.19, rate_ltv90: 4.72 },
            '5': { rate_ltv70: 4.29, rate_ltv80: 4.29, rate_ltv90: 4.89 },
            '7': { rate_ltv70: 4.59, rate_ltv80: 4.59, rate_ltv90: 4.99 },
            '10': { rate_ltv70: 4.69, rate_ltv80: 4.69, rate_ltv90: 5.09 }
        }
    },
    {
        id: 'offer-2',
        title: "⚖️ Flexibilní / OSVČ",
        description: "Nabídka s benevolentnějším posuzováním příjmů (obratové hypotéky).",
        highlights: ["Akceptace obratu", "OSVČ friendly", "Bez poplatků"],
        max_ltv: 90,
        targetGroup: "Podnikatele a OSVČ", // Opraveno
        rates: {
            '3': { rate_ltv70: 4.39, rate_ltv80: 4.49, rate_ltv90: 4.89 },
            '5': { rate_ltv70: 4.49, rate_ltv80: 4.59, rate_ltv90: 4.99 },
            '7': { rate_ltv70: 4.79, rate_ltv80: 4.89, rate_ltv90: 5.19 },
            '10': { rate_ltv70: 4.89, rate_ltv80: 4.99, rate_ltv90: 5.29 }
        }
    },
    {
        id: 'offer-3',
        title: "🚀 Dostupná (LTV 90)",
        description: "Řešení pro klienty s minimem vlastních zdrojů (stačí 10 %).",
        highlights: ["LTV až 90%", "Akceptace diet", "Mimořádné splátky"],
        max_ltv: 90,
        targetGroup: "Nízké vlastní zdroje",
        rates: {
            '3': { rate_ltv70: 4.54, rate_ltv80: 4.89, rate_ltv90: 5.04 },
            '5': { rate_ltv70: 4.69, rate_ltv80: 4.84, rate_ltv90: 5.19 },
            '7': { rate_ltv70: 4.79, rate_ltv80: 4.99, rate_ltv90: 5.39 },
            '10': { rate_ltv70: 4.94, rate_ltv80: 5.19, rate_ltv90: 5.59 }
        }
    }
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
        
        // --- UPRAVENÁ LOGIKA PRO DAŇOVOU ÚLEVU ---
        taxSavings: (numberOfFixationPayments > 0) 
            ? Math.min(
                Math.round(totalInterest * 0.15 / numberOfFixationPayments), // Průměrná měsíční úspora
                1875 // Maximální měsíční úspora (limit 150k úroků * 15% / 12)
              )
            : 0,
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

        // ===== UPRAVENÁ PREMIUM LOGIKA =====
        const isPremiumLoan = loanAmount >= 7000000; // 7 Mil. Kč (dříve 8)
        const isPremiumIncome = income >= 80000;    // 80 tis. Kč čistého
        const isPremiumEducation = education === 'vysokoškolské'; // Nový VŠ faktor
        let premiumDiscount = 0.0; 

        // Prémiový status stačí splnit jednou
        if (isPremiumLoan || isPremiumIncome || isPremiumEducation) {
            premiumDiscount = 0.1; 
            console.log(`PREMIUM KLIENT (Úvěr: ${isPremiumLoan}, Příjem: ${isPremiumIncome}, Vzdělání: ${isPremiumEducation}): Uplatněna sleva ${premiumDiscount}%`);
        }
        // ===================================
        
        const isYoungApplicant = age < 36; 
        if (isYoungApplicant) {
            console.log("Detekován žadatel do 36 let -> Aplikuji zvýhodněné sazby pro LTV 90%.");
        }
        // ===============================================

        const allQualifiedOffers = ALL_OFFERS
            .filter(o => ltv <= o.max_ltv) 
            .map(o => {
                const ratesForFixation = o.rates[fixationInput] || o.rates['5']; 
                if (!ratesForFixation) {
                    return null;
                }

                let rate;
                
                // === 2. ZDE JE UPRAVENÁ LOGIKA VÝBĚRU SAZBY ===
                if (ltv <= 70) {
                    rate = ratesForFixation.rate_ltv70;
                } else if (ltv <= 80) {
                    // Fallback: pokud není definována sazba pro 80, bereme 70
                    rate = ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70;
                } else if (ltv <= 90) {
                    // LOGIKA PRO MLADÉ DO 36 LET
                    if (isYoungApplicant) {
                        // Vezmeme sazbu pro LTV 80 a přičteme jen 0.1%
                        // (místo braní drahé sazby rate_ltv90)
                        const baseRate = ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70;
                        if (baseRate) rate = baseRate + 0.1;
                        else rate = ratesForFixation.rate_ltv90; // Záchrana kdyby nebylo nic jiného
                    } else {
                        // Pro starší (36+) platí standardní drahá sazba pro 90%
                        rate = ratesForFixation.rate_ltv90 || ratesForFixation.rate_ltv80;
                    }
                }
                // ==============================================
                
                if (!rate) {
                    return null; 
                }
        
                
                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, effectiveTerm);
                const dsti = income > 0 ? ((monthlyPayment + liabilities) / income) * 100 : Infinity; // DSTI
                // ===== VYLEPŠENÍ BONITY PRO PREMIUM =====
                // Pro bonitní klienty můžeme mírně posunout limit DSTI
                const dstiLimit = isPremiumIncome ? 55 : 50; // 55% pro bonitní, 50% pro ostatní
                // =========================================
                
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
                    highlights: o.highlights || [],
                    targetGroup: o.targetGroup // <--- TENTO ŘÁDEK PŘIDAT
                };
            }).filter(Boolean);

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