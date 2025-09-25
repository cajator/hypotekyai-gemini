// netlify/functions/rates.js - v7.0 - Fixed for realistic calculations
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
        const interest = remainingBalance * monthlyRate;
        const principal = monthlyPayment - interest;
        totalInterest += interest;
        totalPrincipal += principal;
        remainingBalance -= principal;
    }
    
    const totalPaymentsInFixation = monthlyPayment * fixation * 12;
    const remainingYears = loanTerm - fixation;
    const remainingMonths = remainingYears * 12;
    
    // Realistické scénáře změn sazeb
    const optimisticRate = Math.max(3.59, rate - 0.6); // Pokles
    const optimisticPayment = remainingMonths > 0 ? 
        calculateMonthlyPayment(remainingBalance, optimisticRate, remainingYears) : 0;
    
    const pessimisticRate = rate + 1.5; // Výrazný růst
    const pessimisticPayment = remainingMonths > 0 ? 
        calculateMonthlyPayment(remainingBalance, pessimisticRate, remainingYears) : 0;
    
    const moderateIncreaseRate = rate + 0.5; // Mírný růst - DŮLEŽITÉ!
    const moderateIncreasePayment = remainingMonths > 0 ? 
        calculateMonthlyPayment(remainingBalance, moderateIncreaseRate, remainingYears) : 0;
    
    const marketAvgRate = 4.59;
    const marketPayment = remainingMonths > 0 ? 
        calculateMonthlyPayment(remainingBalance, marketAvgRate, remainingYears) : 0;
    
    // Rychlá analýza
    const quickAnalysis = {
        monthlyImpact: Math.round(totalInterest / (fixation * 12)),
        dailyCost: Math.round(monthlyPayment / 30),
        percentOfTotal: Math.round((totalInterest / totalPaymentsInFixation) * 100),
        equivalentRent: Math.round(monthlyPayment * 0.75),
        taxSavings: Math.round(totalInterest * 0.15 / (fixation * 12)),
    };
    
    return {
        totalPaymentsInFixation: Math.round(totalPaymentsInFixation),
        totalInterestForFixation: Math.round(totalInterest),
        totalPrincipalForFixation: Math.round(totalPrincipal),
        remainingBalanceAfterFixation: Math.round(remainingBalance),
        percentagePaidOff: Math.round((totalPrincipal / loanAmount) * 100),
        monthlyPayment: Math.round(monthlyPayment),
        quickAnalysis,
        futureScenario: {
            optimistic: {
                rate: optimisticRate,
                newMonthlyPayment: Math.round(optimisticPayment),
                monthlySavings: Math.round(monthlyPayment - optimisticPayment),
                totalSavings: Math.round((monthlyPayment - optimisticPayment) * remainingMonths)
            },
            pessimistic: {
                rate: pessimisticRate,
                newMonthlyPayment: Math.round(pessimisticPayment),
                monthlyIncrease: Math.round(pessimisticPayment - monthlyPayment),
                totalIncrease: Math.round((pessimisticPayment - monthlyPayment) * remainingMonths)
            },
            moderateIncrease: {
                rate: moderateIncreaseRate,
                newMonthlyPayment: Math.round(moderateIncreasePayment),
                monthlyIncrease: Math.round(moderateIncreasePayment - monthlyPayment),
                totalIncrease: Math.round((moderateIncreasePayment - monthlyPayment) * remainingMonths)
            },
            marketAverage: {
                rate: marketAvgRate,
                newMonthlyPayment: Math.round(marketPayment),
                difference: Math.round(marketPayment - monthlyPayment)
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
        
        // Income adjustments - UPRAVENO pro realističtější výpočet
        let adjustedIncome = income;
        
        // Pro expresní kalkulačku nepřepočítáváme, používáme přímo zadaný příjem
        // Pouze pro detailní analýzu
        if (p.employment) {
            if (employment === 'osvc') adjustedIncome = income * 0.7;
            else if (employment === 'jednatel') adjustedIncome = income * 0.85;
        }
        
        // Vzdělání bonifikace pouze když je explicitně zadáno
        if (p.education) {
            if (education === 'vysokoškolské') adjustedIncome *= 1.1;
            else if (education === 'středoškolské') adjustedIncome *= 1.05;
        }
        
        // Living minimum - UPRAVENO na realističtější hodnoty
        const adultMinimum = 4500;
        const firstChildMinimum = 2700;
        const otherChildMinimum = 2400;
        const housingMinimum = 7000;
        
        let livingMinimum = adultMinimum + housingMinimum;
        if (children > 0) livingMinimum += firstChildMinimum;
        if (children > 1) livingMinimum += (children - 1) * otherChildMinimum;
        
        // Pro expresní kalkulačku používáme jednodušší výpočet
        const isExpressMode = !p.employment && !p.education;
        if (isExpressMode) {
            livingMinimum = 10000; // Fixní minimum pro express mode
        }
        
        const disposableIncome = adjustedIncome - livingMinimum;

        // Age factor
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
                    rate = (ratesForFixation.rate_ltv90 || ratesForFixation.rate_ltv80 || ratesForFixation.rate_ltv70);
                    if (rate) rate += 0.3; // Přirážka pro LTV > 90%
                }

                if (!rate) return null;

                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, effectiveTerm);
                
                // OPRAVENÝ VÝPOČET DSTI
                const dsti = ((monthlyPayment + liabilities) / income) * 100;
                
                // Stress test podle ČNB - sazba + 2%
                const stressRate = rate + 2;
                const stressPayment = calculateMonthlyPayment(loanAmount, stressRate, effectiveTerm);
                const stressDsti = ((stressPayment + liabilities) / income) * 100;
                
                // ČNB limity - UPRAVENO pro realističtější podmínky
                let dstiLimit, stressDstiLimit;
                if (income >= 50000) {
                    dstiLimit = 50; // Zvýšeno z 45%
                    stressDstiLimit = 55; // Zvýšeno z 50%
                } else if (income >= 30000) {
                    dstiLimit = 45; // Zvýšeno z 40%
                    stressDstiLimit = 50; // Zvýšeno z 45%
                } else {
                    dstiLimit = 40; // Zvýšeno z 35%
                    stressDstiLimit = 45; // Zvýšeno z 40%
                }
                
                // Pro expresní mód jsme méně striktní
                if (isExpressMode) {
                    dstiLimit += 5;
                    stressDstiLimit += 5;
                }
                
                // Kontrola limitů
                if (dsti > dstiLimit) return null;
                if (stressDsti > stressDstiLimit) return null;
                
                // Kontrola disponibilního příjmu - UPRAVENO
                // Musí zbýt alespoň životní minimum po splátce
                const remainingAfterPayment = income - monthlyPayment - liabilities;
                if (remainingAfterPayment < livingMinimum * 0.8) return null; // 80% minima musí zbýt
                
                return { 
                    id: o.id, 
                    rate: parseFloat(rate.toFixed(2)), 
                    monthlyPayment: Math.round(monthlyPayment), 
                    dsti: Math.round(dsti),
                    stressDsti: Math.round(stressDsti),
                    title: o.title,
                    description: o.description,
                    highlights: o.highlights || [],
                    dstiLimit: dstiLimit
                };
            }).filter(Boolean);

        const finalOffers = allQualifiedOffers.sort((a, b) => a.rate - b.rate).slice(0, 3);
        
        if (finalOffers.length === 0) { 
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [] }) }; 
        }
        
        // VÝPOČTY SKÓRE
        const bestOffer = finalOffers[0];
        
        // LTV skóre
        let ltvScore;
        if (ltv <= 60) ltvScore = 100;
        else if (ltv <= 70) ltvScore = 95;
        else if (ltv <= 80) ltvScore = 85;
        else if (ltv <= 90) ltvScore = 70;
        else ltvScore = 50;
        
        // DSTI skóre
        let dstiScore;
        if (bestOffer.dsti <= 20) dstiScore = 100;
        else if (bestOffer.dsti <= 25) dstiScore = 95;
        else if (bestOffer.dsti <= 30) dstiScore = 90;
        else if (bestOffer.dsti <= 35) dstiScore = 85;
        else if (bestOffer.dsti <= 40) dstiScore = 75;
        else if (bestOffer.dsti <= 45) dstiScore = 65;
        else dstiScore = 50;
        
        // Bonita skóre - založené na disponibilním příjmu po splátce
        const remainingIncomeAfterPayment = income - bestOffer.monthlyPayment - liabilities;
        let bonitaScore;
        if (remainingIncomeAfterPayment >= 40000) bonitaScore = 100;
        else if (remainingIncomeAfterPayment >= 30000) bonitaScore = 95;
        else if (remainingIncomeAfterPayment >= 25000) bonitaScore = 90;
        else if (remainingIncomeAfterPayment >= 20000) bonitaScore = 85;
        else if (remainingIncomeAfterPayment >= 15000) bonitaScore = 75;
        else if (remainingIncomeAfterPayment >= 10000) bonitaScore = 65;
        else bonitaScore = 50;
        
        // Věkové skóre
        let ageScore;
        if (age <= 30) ageScore = 100;
        else if (age <= 35) ageScore = 95;
        else if (age <= 40) ageScore = 90;
        else if (age <= 45) ageScore = 85;
        else if (age <= 50) ageScore = 75;
        else if (age <= 55) ageScore = 65;
        else ageScore = 50;
        
        // Zaměstnání skóre
        let employmentScore;
        if (employment === 'zaměstnanec') employmentScore = 95;
        else if (employment === 'jednatel') employmentScore = 80;
        else employmentScore = 70;
        
        // Celkové skóre - vážený průměr
        const totalScore = Math.round(
            ltvScore * 0.20 +      // LTV 20%
            dstiScore * 0.35 +     // DSTI 35%
            bonitaScore * 0.25 +   // Bonita 25%
            ageScore * 0.10 +      // Věk 10%
            employmentScore * 0.10 // Zaměstnání 10%
        );
        
        const score = { 
            ltv: ltvScore,
            dsti: dstiScore,
            bonita: bonitaScore,
            age: ageScore,
            employment: employmentScore,
            total: Math.max(50, Math.min(95, totalScore)) // Omezení mezi 50-95%
        };

        // Generate tips
        const tips = [];
        
        if (bestOffer.dsti > 35) {
            tips.push({ 
                id: 'dsti_warning', 
                title: "DSTI na vyšší hranici", 
                message: `Váš poměr dluh/příjem je ${bestOffer.dsti}%. Doporučujeme udržet rezervu 6 měsíčních splátek.` 
            });
        }
        
        if (ltv > 80) {
            const additionalOwnFunds = Math.round((ltv - 80) * propertyValue / 100);
            tips.push({ 
                id: 'high_ltv', 
                title: "Snižte LTV pro lepší sazbu", 
                message: `Navýšením vlastních zdrojů o ${(additionalOwnFunds/1000000).toFixed(1)} mil. Kč získáte lepší sazbu o 0.4% a ušetříte až 500 Kč měsíčně.` 
            });
        }

        // Smart tip
        let smartTip = null;
        
        // Tip na kratší fixaci
        if (fixationInput >= 7) {
            const shorterFixRates = ALL_OFFERS[0].rates['5'];
            if (shorterFixRates) {
                const shorterRate = ltv <= 70 ? shorterFixRates.rate_ltv70 : 
                                   ltv <= 80 ? shorterFixRates.rate_ltv80 : 
                                   shorterFixRates.rate_ltv90;
                if (shorterRate && shorterRate < bestOffer.rate - 0.1) {
                    const savingAmount = Math.round((bestOffer.rate - shorterRate) * loanAmount * 0.01 * fixationInput / 12);
                    smartTip = { 
                        id: 'smart_fixation', 
                        title: "💡 AI tip - kratší fixace!", 
                        message: `5letá fixace má sazbu ${shorterRate}% místo ${bestOffer.rate}%. Za ${fixationInput} let ušetříte až ${savingAmount.toLocaleString('cs-CZ')} Kč.` 
                    };
                }
            }
        }
        
        // Tip na delší splatnost pro nízké DSTI
        if (!smartTip && bestOffer.dsti < 30 && effectiveTerm < 30 && age < 40) {
            const payment30 = calculateMonthlyPayment(loanAmount, bestOffer.rate, 30);
            const diff = Math.round(bestOffer.monthlyPayment - payment30);
            smartTip = { 
                id: 'smart_term', 
                title: "💡 Můžete si dovolit kratší splatnost", 
                message: `S DSTI jen ${bestOffer.dsti}% máte prostor. Nebo prodlužte na 30 let a ušetřete ${diff.toLocaleString('cs-CZ')} Kč/měs pro investice.` 
            };
        }

        // Fixation analysis
        const fixationDetails = finalOffers.length > 0 ? 
            calculateFixationAnalysis(loanAmount, bestOffer.rate, effectiveTerm, fixationInput) : null;
        
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ 
                offers: finalOffers, 
                approvability: score, 
                smartTip, 
                tips,
                fixationDetails,
                marketInfo: {
                    averageRate: 4.59,
                    bestAvailableRate: 4.09,
                    yourRate: bestOffer.rate,
                    ratePosition: bestOffer.rate <= 4.29 ? 'excellent' : 
                                 bestOffer.rate <= 4.59 ? 'good' : 
                                 bestOffer.rate <= 4.89 ? 'average' : 'higher',
                    bankCount: 19,
                    lastUpdate: new Date().toISOString().split('T')[0],
                    cnbBaseRate: 4.25,
                    inflationRate: 2.3
                },
                detailedCalculation: {
                    monthlyPayment: bestOffer.monthlyPayment,
                    dsti: bestOffer.dsti,
                    dstiLimit: bestOffer.dstiLimit,
                    stressDsti: bestOffer.stressDsti,
                    disposableIncome: disposableIncome,
                    remainingAfterPayment: income - bestOffer.monthlyPayment - liabilities,
                    livingMinimum: livingMinimum
                }
            }) 
        };
    } catch (error) {
        console.error("Rates function error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};

const formatNumber = (n, currency = true) => n.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });

export { handler };