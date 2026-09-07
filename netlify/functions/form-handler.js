// netlify/functions/form-handler.js
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const formatNumber = (n, currency = true) => {
    const num = Number(n);
    if (typeof num !== 'number' || isNaN(num)) return n;
    return num.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });
};

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    try {
        const formData = new URLSearchParams(event.body);
        let extraData = {};
        try { extraData = JSON.parse(formData.get('extraData') || '{}'); } catch(e){}

        // ZPRACOVÁNÍ HISTORIE CHATU A SOUHRNU
        let chatHistoryText = 'Žádná historie chatu.';
        if (extraData.chatHistory && extraData.chatHistory.length > 0) {
            chatHistoryText = extraData.chatHistory.map(msg => {
                const sender = msg.sender === 'user' ? 'Klient' : 'AI';
                const safeText = String(msg.text || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
                return `${sender}: ${safeText}`;
            }).join('\n------\n');
        }

        let formDataSummaryText = 'Nezadáno';
        let calculationSummaryText = 'Nekalkulováno';
        const form = extraData.formData || {};
        
        if (form.loanAmount) {
            const txtUcel = form.purpose || 'Standardní'; 
            const txtTyp = form.propertyType || 'Standardní';
            const txtPrijem = form.income ? formatNumber(form.income) : '?';
            const txtZam = form.employment || '';
            const txtVek = form.age || '?';
            const txtDeti = form.children || '0';
            const txtZavazky = form.liabilities ? formatNumber(form.liabilities) : '0';
            formDataSummaryText = `Účel: ${txtUcel}, Typ: ${txtTyp}, Příjem: ${txtPrijem} (${txtZam}), Věk: ${txtVek} let, Děti: ${txtDeti}, Závazky: ${txtZavazky}`;
        }

        if (extraData.calculation && extraData.calculation.selectedOffer) {
            const calc = extraData.calculation;
            const offer = calc.selectedOffer;
            calculationSummaryText = `Nabídka: ${offer.title}. Skóre: ${calc.approvability ? calc.approvability.total + '%' : '?'} (LTV:${calc.approvability ? calc.approvability.ltv : '?'}, DSTI:${calc.approvability ? calc.approvability.dsti : '?'})`;
        }

        // 1. ZÁPIS DO GOOGLE SHEETS
        if(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
            try {
                const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
                const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
                const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
                await doc.loadInfo();
                const sheet = doc.sheetsByIndex[0];
                await sheet.addRow({
                    'Datum a čas': new Date().toLocaleString('cs-CZ'),
                    'Jméno': formData.get('name') || '', 
                    'Telefon': formData.get('phone') || '', 
                    'E-mail': formData.get('email') || '',
                    'PSČ': formData.get('psc') || '', 
                    'Úvěr': extraData.formData?.loanAmount || formData.get('manual_loan') || '',
                    'Hodnota nemovitosti': extraData.formData?.propertyValue || formData.get('manual_prop') || '',
                    'Měsíční splátka': extraData.calculation?.selectedOffer?.monthlyPayment || '',
                    'Úroková sazba': extraData.calculation?.selectedOffer?.rate ? `${extraData.calculation.selectedOffer.rate} %` : '',
                    'Čistý příjem (Kč)': extraData.formData?.income || '', 
                    'Poznámka': formData.get('note') || '',
                    'Preferovaný čas': formData.get('contact-time') || '',
                    'Historie chatu': chatHistoryText,
                    'Parametry (souhrn)': formDataSummaryText,
                    'Výsledky (souhrn)': calculationSummaryText
                });
                console.log("Úspěšně zapsáno do tabulky.");
            } catch (sheetError) {
                console.error("Chyba při zápisu do Google Sheets:", sheetError);
            }
        }

        // 2. ODESLÁNÍ E-MAILU (NETLIFY EMAILS INTEGRATION - Váš původní způsob)
        if (process.env.NETLIFY_EMAILS_SECRET) {
            try {
                const templateName = 'confirmation'; 
                
                await fetch(`${process.env.URL}/.netlify/functions/emails/${templateName}`, {
                    method: 'POST',
                    headers: {
                        'netlify-emails-secret': process.env.NETLIFY_EMAILS_SECRET,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: "Tým Hypoteky Ai <info@hypotekyai.cz>", // Vynucený odesílatel, jak jste chtěl
                        to: formData.get('email'),
                        subject: "Potvrzení vaší poptávky | Hypoteky Ai",
                        parameters: {
                            name: formData.get('name') || 'kliente'
                        },
                    }),
                });
                console.log("E-mail úspěšně odeslán přes Netlify Emails.");
            } catch (emailError) {
                console.error("Chyba při odesílání e-mailu přes Netlify Emails:", emailError);
            }
        } else {
            console.log("NETLIFY_EMAILS_SECRET nenalezen, email se neodeslal.");
        }

        return { statusCode: 200, body: 'Form processed successfully' };
    } catch (error) { 
        console.error("Critical error in form-handler:", error);
        return { statusCode: 500, body: `Server Error: ${error.message}` }; 
    }
};
