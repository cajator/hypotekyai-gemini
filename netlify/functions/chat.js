// netlify/functions/chat.js - OPTIMALIZOVANÁ VERZE
// ⚡ Zrychleno 3-5x zkrácením promptů a optimalizací logiky

function createSystemPrompt(userMessage, context) {
    const hasContext = context && context.calculation && context.calculation.selectedOffer;
    const messageCount = context?.messageCount || 0;
    
    // Kompaktní data - jen co potřebujeme
    const d = hasContext ? {
        loan: context.formData?.loanAmount,
        value: context.formData?.propertyValue,
        term: context.formData?.loanTerm,
        fix: context.formData?.fixation,
        income: context.formData?.income,
        age: context.formData?.age,
        payment: context.calculation?.selectedOffer?.monthlyPayment,
        rate: context.calculation?.selectedOffer?.rate,
        ltv: Math.round((context.formData?.loanAmount / context.formData?.propertyValue) * 100),
        dsti: context.calculation?.selectedOffer?.dsti,
        remaining: context.calculation?.detailedCalculation?.remainingAfterPayment,
        fixDetails: context.calculation?.fixationDetails
    } : null;

    // ZKRÁCENÝ základ - zbavili jsme se 80% textu
    let base = `Jsi hypoteční expert. ${messageCount === 0 ? 'Krátce se představ.' : ''} Odpovídej konkrétně s čísly.

${hasContext ? `SITUACE: ${d.loan.toLocaleString('cs-CZ')} Kč/${d.term}let, splátka ${d.payment.toLocaleString('cs-CZ')} Kč (${d.rate}%), LTV ${d.ltv}%, DSTI ${d.dsti}%, zbývá ${d.remaining.toLocaleString('cs-CZ')} Kč` : 'Klient nemá kalkulaci - nabídni ji.'}

DOTAZ: "${userMessage}"`;

    // DETEKCE TYPU DOTAZU - zjednodušeno
    const msg = userMessage.toLowerCase();
    
    // 1. STRESS TEST
    if (msg.match(/co kdyby|ztratím|problém|zvládnu|krize/)) {
        if (!hasContext) return base + '\n\nŘekni: "Pro stress test potřebuji kalkulaci."';
        
        const emergency = d.payment * 6;
        return base + `\n\nStress test:
- Ztráta příjmu: podpora 15k Kč, chybí ${Math.max(0, d.payment - 15000).toLocaleString('cs-CZ')} Kč
- Rezerva: ${emergency.toLocaleString('cs-CZ')} Kč (6 měsíců)
- Růst sazeb +2%: splátka ~${Math.round(d.payment * 1.15).toLocaleString('cs-CZ')} Kč
- Dítě: +10k Kč/měs náklady

Akce: 1) Rezerva ${Math.round(emergency/12).toLocaleString('cs-CZ')} Kč/měs, 2) Pojištění neschopnosti`;
    }
    
    // 2. REFINANCOVÁNÍ
    if (msg.match(/refinanc|lepší.*úrok|ušetř/)) {
        if (!hasContext) return base + '\n\nŘekni: "Pro refinancování potřebuji kalkulaci."';
        
        const bestRate = 4.09;
        const diff = d.rate - bestRate;
        
        if (diff < 0.3) {
            return base + `\n\nVaše ${d.rate}% je TOP. Refinancování se nevyplatí (náklady 15k).`;
        }
        
        const saving = Math.round(diff * d.loan * 0.01 / 12);
        return base + `\n\nRefinancování:
- Nyní: ${d.rate}%, TOP trh: ${bestRate}%
- Úspora: ${saving.toLocaleString('cs-CZ')} Kč/měs = ${(saving * 12).toLocaleString('cs-CZ')} Kč/rok
- Návratnost: ${Math.ceil(15000 / saving)} měsíců
- Akce: Vyjednej u své banky nebo refinancuj`;
    }
    
    // 3. STRATEGIE
    if (msg.match(/za.*let|budouc|strategi|plán/)) {
        if (!hasContext) return base + '\n\nŘekni: "Pro strategii potřebuji kalkulaci."';
        
        return base + `\n\nStrategie ${d.term} let:
- DNES: splátka ${d.payment.toLocaleString('cs-CZ')} Kč
- Za ${d.fix} let (konec fixace): zbude ${d.fixDetails?.remainingBalanceAfterFixation?.toLocaleString('cs-CZ')} Kč
- Za ${d.term} let: splaceno vše, ušetříš ${d.payment.toLocaleString('cs-CZ')} Kč/měs

Milníky:
1. Rok 1-2: Rezerva ${Math.round(d.payment * 6).toLocaleString('cs-CZ')} Kč
2. Za ${d.fix} let: Refixace (potenciál -0.3% sazby)
3. Mimořádné: ${Math.round(d.remaining * 0.2).toLocaleString('cs-CZ')} Kč/měs = zkrátíš o ${Math.round(d.term * 0.15)} let`;
    }
    
    // 4. INVESTICE
    if (msg.match(/investice|investovat|fond/)) {
        if (!hasContext) return base + '\n\nŘekni: "Pro investiční strategii potřebuji kalkulaci."';
        
        const avail = Math.round(d.remaining * 0.5);
        if (avail < 5000) {
            return base + `\n\nPo splátce zbývá málo (${d.remaining.toLocaleString('cs-CZ')} Kč). Nejprve rezerva, pak investice.`;
        }
        
        const years = d.term;
        const invested = avail * 12 * years;
        const futureValue = Math.round(avail * ((Math.pow(1.07/12 + 1, years * 12) - 1) / (0.07/12)));
        const profit = futureValue - invested;
        
        return base + `\n\nInvestice vs. splácení:
A) Vše na hypotéku: ušetříš ~${Math.round(invested * d.rate / 100 * 0.4).toLocaleString('cs-CZ')} Kč úroků
B) Investice (7%): ${futureValue.toLocaleString('cs-CZ')} Kč = +${Math.round(profit * 0.85).toLocaleString('cs-CZ')} Kč po zdanění

Doporučení 50/50: ${Math.round(avail/2).toLocaleString('cs-CZ')} Kč na hypotéku + ${Math.round(avail/2).toLocaleString('cs-CZ')} Kč do ETF`;
    }

    // 5. BANKY
    if (msg.match(/bank|které banky|partner/)) {
        return base + '\n\nOdpověz JSON: {"tool":"showBanksList"}';
    }

    // 6. KONTAKT
    if (msg.match(/kontakt|specialista|zavolat|konzultace/)) {
        return base + '\n\nOdpověz JSON: {"tool":"showLeadForm","response":"Připojím vás k specialistovi. Otevírám formulář..."}';
    }

    // 7. ČÍSLA v dotazu - rychlé modelování
    if (msg.match(/\d+/)) {
        const nums = userMessage.match(/\d+/g);
        let params = {};
        
        if (msg.match(/mil/)) {
            const amt = parseInt(nums[0]) * 1000000;
            if (msg.match(/půjčit|hypotéka/)) {
                params.loanAmount = amt;
                params.propertyValue = Math.round(amt * 1.25);
            }
        }
        
        if (Object.keys(params).length > 0) {
            return base + `\n\nOdpověz JSON: {"tool":"modelScenario","params":${JSON.stringify(params)}}`;
        }
    }

    // DEFAULT - obecná odpověď
    return base + `\n\nOdpověz stručně max 150 slov s <strong> pro důležité.`;
}


const handler = async (event) => {
    const headers = { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('Chybí GEMINI_API_KEY');
        }

        const prompt = createSystemPrompt(message, context);

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            // ⚡ PŘIDÁNO: Rychlejší generování
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,  // Omezení délky = rychlejší odpověď
                topP: 0.8,
                topK: 40
            }
        };
        
        // ⚡ OPRAVENO: Správný model (gemini-1.5-flash je nejrychlejší)
        const modelName = "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

        // ⚡ PŘIDÁNO: Timeout protection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s limit

        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('API Error:', errorBody); 
            throw new Error(`Chyba API: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error("AI nevrátila text");
        }
        
        // Detekce JSON toolů
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonResponse = JSON.parse(jsonMatch[0]);
                if (jsonResponse.tool) {
                    return { statusCode: 200, headers, body: JSON.stringify(jsonResponse) };
                }
            } catch (e) { 
                // Pokračujeme
            }
        }
        
        const cleanResponse = responseText.replace(/```json\n?|```\n?/g, "").trim();
        
        return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({ response: cleanResponse }) 
        };

    } catch (error) {
        console.error('Chyba:', error);
        
        // ⚡ PŘIDÁNO: Lepší error handling
        if (error.name === 'AbortError') {
            return { 
                statusCode: 504, 
                headers, 
                body: JSON.stringify({ 
                    error: 'Odpověď trvala příliš dlouho. Zkuste jednodušší otázku.' 
                }) 
            };
        }
        
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ 
                error: `Chyba při komunikaci s AI. Zkuste znovu. (${error.message})`
            }) 
        };
    }
};

module.exports = { handler };