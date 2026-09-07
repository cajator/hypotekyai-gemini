const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const nodemailer = require('nodemailer');

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

        // ZPRACOVÁNÍ HISTORIE CHATU A SOUHRNU (z původního kódu)
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

        // 2. ODESLÁNÍ E-MAILU KLIENTOVI PŘES GMAIL (Nodemailer s plnou konfigurací)
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
            try {
                // Přidána plná konfigurace pro Gmail SMTP
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.GMAIL_USER,
                        pass: process.env.GMAIL_APP_PASSWORD
                    }
                });

                const clientName = formData.get('name') || 'kliente';

                const mailOptions = {
                    from: `"Tým Hypoteky Ai" <${process.env.GMAIL_USER}>`,
                    replyTo: "info@hypotekyai.cz",
                    to: formData.get('email'),
                    subject: "Potvrzení vaší poptávky | Hypoteky Ai",
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #1e3a8a; margin-top: 0; margin-bottom: 20px;">Potvrzení vaší poptávky | Hypoteky Ai</h2>
                            <p style="margin-bottom: 16px;">Dobrý den ${clientName},</p>
                            <p style="margin-bottom: 16px;">děkujeme, že jste využili naši platformu Hypoteky Ai pro vaši hypoteční kalkulaci a analýzu.</p>
                            <p style="margin-bottom: 16px;">Váš požadavek jsme v pořádku přijali a <strong>co nejdříve</strong> (obvykle do 24 hodin v pracovní dny) se vám ozve jeden z našich <strong>zkušených hypotečních specialistů</strong>.</p>
                            <p style="margin-bottom: 16px;">Projde s vámi detaily, zodpoví vaše dotazy a pomůže najít tu nejlepší možnou nabídku na trhu.</p>
                            <p style="margin-bottom: 16px;">Pokud byste mezitím měli jakékoli dotazy, neváhejte nám odpovědět na tento e-mail.</p>
                            <p style="margin-bottom: 24px;">Těšíme se na spolupráci!</p>
                            <div style="color: #4b5563; font-size: 14px;">
                                <p style="margin: 0;">S pozdravem,</p>
                                <p style="margin: 0; font-weight: bold;">Tým Hypoteky Ai</p>
                                <p style="margin: 0;"><a href="https://hypotekyai.cz" style="color: #2563eb; text-decoration: none;">hypotekyai.cz</a></p>
                            </div>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log("E-mail klientovi úspěšně odeslán přes Gmail.");

            } catch (emailError) {
                console.error("Chyba při odesílání e-mailu klientovi:", emailError);
            }
        } else {
            console.log("E-mail klientovi nebyl odeslán, chybí GMAIL_USER nebo GMAIL_APP_PASSWORD.");
        }

        return { statusCode: 200, body: 'Form processed successfully' };
    } catch (error) { 
        console.error("Kritická chyba v celém procesu form-handleru:", error);
        return { statusCode: 500, body: `Server Error: ${error.message}` }; 
    }
};