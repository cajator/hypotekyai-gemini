// netlify/functions/form-handler.js
// Finální verze s čitelným formátováním e-mailů a podmíněným CRM

const sgMail = require('@sendgrid/mail');

// Nastavení API klíčů a e-mailů z proměnných prostředí Netlify
const sendGridApiKey = process.env.SENDGRID_API_KEY;
const crmApiKey = process.env.CRM_API_KEY;
const crmApiUrl = process.env.CRM_API_URL;
const internalNotificationEmail = process.env.INTERNAL_NOTIFICATION_EMAIL;
const senderEmail = process.env.SENDER_EMAIL;

// Kontrola existence SendGrid klíče a e-mailů
if (!sendGridApiKey) {
    console.error("FATAL ERROR: SENDGRID_API_KEY není nastaven.");
} else {
    sgMail.setApiKey(sendGridApiKey);
}
if (!internalNotificationEmail) {
    console.error("ERROR: INTERNAL_NOTIFICATION_EMAIL není nastaven.");
}
if (!senderEmail) {
    console.error("ERROR: SENDER_EMAIL není nastaven.");
}

// === POMOCNÉ FUNKCE PRO FORMÁTOVÁNÍ E-MAILU ===

// Helper funkce pro formátování čísel
const formatNumber = (n, currency = true) => {
    if (typeof n !== 'number' || isNaN(n)) return n;
    return n.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });
};

// Helper funkce pro formátování jednoduchých objektů (jako formData)
const formatObjectToHtml = (obj, title) => {
    if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return `<p>${title}: Žádná data.</p>`;
    let html = `<h3>${title}:</h3><ul>`;
    try {
        for (const key in obj) {
            // Přeskakujeme vnořené objekty/pole
            if (typeof obj[key] !== 'object' || obj[key] === null || Array.isArray(obj[key])) {
                let value = obj[key];
                // Formátování čísel
                if (typeof value === 'number') {
                    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('income') || key.toLowerCase().includes('liabilities') || key.toLowerCase().includes('payment') || key.toLowerCase().includes('savings') || key.toLowerCase().includes('balance') || key.toLowerCase().includes('cost')) {
                        value = formatNumber(value);
                    } else if (key.toLowerCase().includes('term') || key.toLowerCase().includes('age') || key.toLowerCase().includes('fixation')) {
                        value += ' let';
                    } else if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('ltv') || key.toLowerCase().includes('dsti') || key.toLowerCase().includes('score')) {
                        value += ' %';
                    } else if (key.toLowerCase().includes('children')) {
                         value = value; // Bez jednotky
                    } else {
                        value = formatNumber(value, false);
                    }
                 } else if (value === null || value === undefined || value === '') {
                     value = '<i>Nezadáno</i>';
                 } else {
                     value = String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
                 }
                 const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                 html += `<li><strong>${formattedKey}:</strong> ${value}</li>`;
            }
        }
    } catch (e) {
         console.error("Chyba při formátování objektu:", e);
         html += '<li>Chyba při zpracování dat.</li>';
    }
    html += '</ul>';
    return html;
};

// Helper funkce pro formátování výsledků kalkulace
const formatCalculationToHtml = (calc) => {
    if (!calc) return '<h3>Výsledky z kalkulačky:</h3><p>Žádná data.</p>';
    let html = `<h3>Výsledky z kalkulačky:</h3>`;
    try {
        if (calc.selectedOffer) {
            html += `<h4>Vybraná nabídka:</h4><ul>`;
            html += `<li><strong>Název:</strong> ${calc.selectedOffer.title || '<i>Neznámý</i>'}</li>`;
            html += `<li><strong>Splátka:</strong> ${formatNumber(calc.selectedOffer.monthlyPayment)}</li>`;
            html += `<li><strong>Sazba:</strong> ${calc.selectedOffer.rate} %</li>`;
            html += `</ul>`;
        } else {
             html += '<p>Nebyla vybrána žádná konkrétní nabídka.</p>';
        }
        if (calc.approvability) {
             html += `<h4>Odhad schvalitelnosti:</h4><ul>`;
             html += `<li><strong>Skóre LTV:</strong> ${calc.approvability.ltv}%</li>`;
             html += `<li><strong>Skóre DSTI:</strong> ${calc.approvability.dsti}%</li>`;
             html += `<li><strong>Skóre Bonita:</strong> ${calc.approvability.bonita}%</li>`;
             html += `<li><strong>Celkové skóre:</strong> ${calc.approvability.total}%</li>`;
             html += `</ul>`;
        }
        // Zde můžete přidat i formátování fixationDetails, pokud je potřeba
        // Např.: if (calc.fixationDetails) { html += formatObjectToHtml(calc.fixationDetails, 'Detaily fixace'); }
    } catch (e) {
         console.error("Chyba při formátování kalkulace:", e);
         html += '<p>Chyba při zpracování výsledků kalkulace.</p>';
    }
    return html;
};

// Helper funkce pro formátování historie chatu
const formatChatHistoryToHtml = (chatHistory) => {
     if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
        return '<p>Žádná historie chatu.</p>';
     }
     try {
        return chatHistory.map(msg => {
            const sender = msg.sender === 'user' ? 'Klient' : 'AI';
            const safeText = String(msg.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const cleanText = safeText.replace(/<button.*?<\/button>/g, '[Tlačítko]'); // Nahradíme tlačítka
            return `<p style="margin: 5px 0; padding: 2px 5px; border-radius: 3px; background-color: ${sender === 'Klient' ? '#e0e0e0' : '#f0f0f0'};"><strong>${sender}:</strong> ${cleanText.replace(/\n/g, '<br>')}</p>`;
        }).join('');
     } catch(e) {
         console.error("Chyba při formátování historie chatu:", e);
         return '<p>Chyba při zpracování historie chatu.</p>';
     }
};

// ===============================================

exports.handler = async (event) => {
    if (event.httpMethod && event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    if (!sendGridApiKey || !internalNotificationEmail || !senderEmail) {
        return { statusCode: 500, body: "Chyba konfigurace serveru (e-mail)." };
    }

    try {
        console.log("Funkce form-handler spuštěna.");
        let name, email, phone, note, contactTime, extraDataString, extraData;

        // Zpracování dat...
        if (event.httpMethod === 'POST') {
            console.log("Zpracování POST požadavku.");
            const formData = new URLSearchParams(event.body);
            name = formData.get('name');
            email = formData.get('email');
            phone = formData.get('phone');
            contactTime = formData.get('contact-time');
            note = formData.get('note');
            extraDataString = formData.get('extraData');
        } else {
             console.error("Neočekávaný způsob spuštění funkce:", event);
             throw new Error("Funkce byla spuštěna neočekávaným způsobem.");
        }

        try {
            extraData = JSON.parse(extraDataString || '{}');
            console.log("ExtraData úspěšně naparsována.");
        } catch (e) {
            console.error("Chyba při parsování extraData:", e, "Původní string:", extraDataString);
            extraData = { error: "Chyba při parsování dat z formuláře." };
        }

        // --- 1. ODESLÁNÍ DAT DO CRM (POUZE POKUD JE NASTAVENO) ---
        if (crmApiUrl && crmApiKey) {
            console.log("Pokus o odeslání dat do CRM na URL:", crmApiUrl);
            try {
                const crmPayload = { /* ... vaše CRM data ... */ };
                const crmResponse = await fetch(crmApiUrl, { /* ... váš fetch kód ... */ });
                if (!crmResponse.ok) {
                    console.error(`Chyba CRM: ${crmResponse.status} ${crmResponse.statusText}`, await crmResponse.text());
                } else { console.log('Data úspěšně odeslána do CRM.'); }
            } catch (crmError) { console.error('Chyba při komunikaci s CRM:', crmError); }
        } else {
            console.log('CRM API URL nebo klíč není nastaven, přeskočeno odesílání do CRM.');
        }

        // --- 2. ODESLÁNÍ E-MAILU VÁM (S FORMÁTOVÁNÍM) ---
        console.log("Sestavování interního e-mailu pro:", internalNotificationEmail);
        const internalEmailHtml = `
            <!DOCTYPE html><html><head><style>body{font-family: sans-serif; line-height: 1.5;} ul{list-style: none; padding-left: 0;} li{margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 8px;} strong{min-width: 150px; display: inline-block; color: #555;} h1, h2, h3 { color: #333; border-bottom: 2px solid #0054a6; padding-bottom: 5px; margin-top: 30px;} hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }</style></head><body>
            <h1>🚀 Nový lead z Hypoteky Ai</h1>
            <h2>Kontaktní údaje:</h2>
            <ul>
                <li><strong>Jméno:</strong> ${name || '<i>Nezadáno</i>'}</li>
                <li><strong>E-mail:</strong> ${email || '<i>Nezadáno</i>'}</li>
                <li><strong>Telefon:</strong> ${phone || '<i>Nezadáno</i>'}</li>
                <li><strong>Preferovaný čas:</strong> ${contactTime || 'Nespecifikováno'}</li>
                <li><strong>Poznámka:</strong> ${note || '<i>Není</i>'}</li>
            </ul>
            <hr>
            ${formatObjectToHtml(extraData.formData, 'Data zadaná do kalkulačky')}
            <hr>
            ${formatCalculationToHtml(extraData.calculation)}
            <hr>
            <h2>Historie chatu:</h2>
            <div style="max-height: 400px; overflow-y: auto; border: 1px solid #eee; padding: 10px; margin-bottom: 20px; background-color: #f9f9f9; font-size: 0.9em;">
                ${formatChatHistoryToHtml(extraData.chatHistory)}
            </div>
            <hr>
            <p><small>Odesláno: ${new Date().toLocaleString('cs-CZ')}</small></p>
            </body></html>
        `;

        const internalMsg = {
            to: internalNotificationEmail,
            from: senderEmail,
            subject: `🚀 Nový lead z Hypoteky Ai: ${name || 'Neznámý'}`,
            html: internalEmailHtml,
        };
        
        console.log("Pokus o odeslání interního e-mailu...");
        try {
             const sendResultInternal = await sgMail.send(internalMsg);
             console.log("Interní e-mail úspěšně odeslán.", sendResultInternal[0].statusCode);
        } catch (error) {
             console.error("CHYBA při odesílání interního e-mailu:", error.response ? JSON.stringify(error.response.body, null, 2) : error.message);
        }


        // --- 3. ODESLÁNÍ POTVRZOVACÍHO E-MAILU KLIENTOVI ---
        if (email && email.includes('@')) {
            console.log("Sestavování potvrzovacího e-mailu pro:", email);
            const userConfirmationHtml = `... Váš HTML kód pro potvrzovací e-mail ...`; // Vložte sem váš HTML kód
            const userMsg = {
                to: email,
                from: senderEmail,
                subject: 'Potvrzení poptávky | Hypoteky Ai',
                html: userConfirmationHtml,
            };

            console.log("Pokus o odeslání e-mailu klientovi...");
             try {
                 const sendResultUser = await sgMail.send(userMsg);
                 console.log("E-mail klientovi úspěšně odeslán.", sendResultUser[0].statusCode);
             } catch (error) {
                 console.error("CHYBA při odesílání e-mailu klientovi:", error.response ? JSON.stringify(error.response.body, null, 2) : error.message);
             }
        } else {
             console.log("Přeskočeno odeslání e-mailu klientovi - chybí e-mail.");
        }

        console.log("Funkce form-handler úspěšně dokončena.");
        return { statusCode: 200, body: 'Form processed successfully' };

    } catch (error) {
        console.error('NEČEKANÁ ZÁVAŽNÁ CHYBA ve funkci form-handler:', error);
        return { statusCode: 500, body: `Server Error: ${error.message}` };
    }
};