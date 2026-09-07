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

        // Zápis do Google Sheets
        if(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
            try {
                const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
                const auth = new JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key: privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
                const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, auth);
                await doc.loadInfo();
                const sheet = doc.sheetsByIndex[0];
                await sheet.addRow({
                    'Datum a čas': new Date().toLocaleString('cs-CZ'),
                    'Jméno': formData.get('name') || '', 'Telefon': formData.get('phone') || '', 'E-mail': formData.get('email') || '',
                    'PSČ': formData.get('psc') || '', 'Úvěr': extraData.formData?.loanAmount || formData.get('manual_loan') || '',
                    'Hodnota nemovitosti': extraData.formData?.propertyValue || formData.get('manual_prop') || '',
                    'Preferovaný čas': formData.get('contact-time') || '', 'Poznámka': formData.get('note') || ''
                });
            } catch (err) { console.error("Chyba Sheets:", err); }
        }

        // Odeslání e-mailu KLIENTOVI přes Gmail
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
                });

                const clientName = formData.get('name') || '';
                
                await transporter.sendMail({
                    from: `"Tým Hypoteky Ai" <info@hypotekyai.cz>`,
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
                });
            } catch (err) { console.error("Chyba Gmail:", err); }
        }

        return { statusCode: 200, body: 'Form processed successfully' };
    } catch (error) { return { statusCode: 500, body: `Server Error: ${error.message}` }; }
};