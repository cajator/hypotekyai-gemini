// netlify/functions/form-handler.js
// Finální verze s čitelným formátováním e-mailů a podmíněným CRM

const sgMail = require('@sendgrid/mail');

// Nastavení API klíčů a e-mailů z proměnných prostředí Netlify
const sendGridApiKey = process.env.SENDGRID_API_KEY;
const crmApiKey = process.env.CRM_API_KEY;
const crmApiUrl = process.env.CRM_API_URL;
const internalNotificationEmail = process.env.INTERNAL_NOTIFICATION_EMAIL; // Váš email
const senderEmail = process.env.SENDER_EMAIL; // Ověřený email v SendGrid (např. info@hypotekyai.cz)

// Základní kontroly konfigurace
if (!sendGridApiKey) console.error("FATAL ERROR: SENDGRID_API_KEY není nastaven.");
else sgMail.setApiKey(sendGridApiKey);
if (!internalNotificationEmail) console.error("ERROR: INTERNAL_NOTIFICATION_EMAIL není nastaven.");
if (!senderEmail) console.error("ERROR: SENDER_EMAIL není nastaven.");

// === POMOCNÉ FUNKCE PRO FORMÁTOVÁNÍ E-MAILU ===

// Helper funkce pro formátování čísel
const formatNumber = (n, currency = true) => {
    if (typeof n !== 'number' || isNaN(n)) return n;
    return n.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });
};

// Helper funkce pro bezpečné formátování hodnoty
const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '<i>Nezadáno</i>';
    let safeValue = String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (typeof value === 'number' && !isNaN(value)) {
        safeValue = value.toLocaleString('cs-CZ');
    }
    return safeValue;
};

// Helper funkce pro formátování jednoduchých objektů (jako formData)
const formatObjectSimple = (obj, title) => {
    if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return `<p>${title}: Žádná data.</p>`;
    let html = `<h3>${title}:</h3><ul>`;
    try {
        for (const key in obj) {
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
                 }
                 const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                 html += `<li><strong>${formattedKey}:</strong> ${formatValue(value)}</li>`;
            }
        }
    } catch (e) {
         console.error("Chyba při formátování objektu:", e);
         html += '<li>Chyba při zpracování dat.</li>';
    }
    html += '</ul>';
    return html;
};

// ===== ZDE JE DEFINICE CHYBĚJÍCÍ FUNKCE =====
// Helper funkce pro formátování výsledků kalkulace
const formatCalculationToHtml = (calc) => {
    if (!calc) return '<h3>Výsledky z kalkulačky:</h3><p>Žádná data.</p>';
    let html = `<h3>Výsledky z kalkulačky:</h3>`;
    try {
        if (calc.selectedOffer) {
            html += `<h4>Vybraná nabídka:</h4><ul>`;
            html += `<li><strong>Název:</strong> ${formatValue(calc.selectedOffer.title)}</li>`;
            html += `<li><strong>Splátka:</strong> ${formatNumber(calc.selectedOffer.monthlyPayment)}</li>`;
            html += `<li><strong>Sazba:</strong> ${formatValue(calc.selectedOffer.rate)} %</li>`;
            html += `</ul>`;
        } else {
             html += '<p>Nebyla vybrána žádná konkrétní nabídka.</p>';
        }
        if (calc.approvability) {
             html += `<h4>Odhad schvalitelnosti:</h4><ul>`;
             html += `<li><strong>Skóre LTV:</strong> ${formatValue(calc.approvability.ltv)}%</li>`;
             html += `<li><strong>Skóre DSTI:</strong> ${formatValue(calc.approvability.dsti)}%</li>`;
             html += `<li><strong>Skóre Bonita:</strong> ${formatValue(calc.approvability.bonita)}%</li>`;
             html += `<li><strong>Celkové skóre:</strong> ${formatValue(calc.approvability.total)}%</li>`;
             html += `</ul>`;
        }
    } catch (e) {
         console.error("Chyba při formátování kalkulace:", e);
         html += '<p>Chyba při zpracování výsledků kalkulace.</p>';
    }
    return html;
};
// ===============================================

// Helper funkce pro formátování chatu
const formatChatSimple = (chatHistory) => {
     if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
        return '<p>Žádná historie chatu.</p>';
     }
     try {
        return chatHistory.map(msg => {
            const sender = msg.sender === 'user' ? 'Klient' : 'AI';
            const safeText = String(msg.text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const cleanText = safeText.replace(/<button.*?<\/button>/g, '[Tlačítko]');
            return `<p style="margin: 2px 0;"><strong>${sender}:</strong> ${cleanText.replace(/\n/g, '<br>')}</p>`;
        }).join('');
     } catch(e) {
         console.error("Chyba při formátování historie chatu:", e);
         return '<p>Chyba při zpracování historie chatu.</p>';
     }
};


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

        // Zpracování dat
        if (event.httpMethod === 'POST') {
            const formData = new URLSearchParams(event.body);
            name = formData.get('name');
            email = formData.get('email');
            phone = formData.get('phone');
            contactTime = formData.get('contact-time');
            note = formData.get('note');
            extraDataString = formData.get('extraData');
        } else {
             throw new Error("Funkce byla spuštěna neočekávaným způsobem.");
        }

        try {
            extraData = JSON.parse(extraDataString || '{}');
        } catch (e) {
            console.error("Chyba při parsování extraData:", e);
            extraData = { error: "Chyba při parsování dat." };
        }

        // --- 1. ODESLÁNÍ DAT DO CRM (POUZE POKUD JE NASTAVENO) ---
        if (crmApiUrl && crmApiKey) {
             console.log("Pokus o odeslání dat do CRM...");
             try {
                const crmPayload = { /* ... CRM data ... */ };
                const crmResponse = await fetch(crmApiUrl, { /* ... fetch kód ... */ });
                if (!crmResponse.ok) { console.error(`Chyba CRM: ${crmResponse.status} ${crmResponse.statusText}`); }
                else { console.log('Data úspěšně odeslána do CRM.'); }
             } catch (crmError) { console.error('Chyba při komunikaci s CRM:', crmError); }
        } else {
            console.log('CRM API URL/klíč není nastaven, přeskočeno.');
        }

        // --- 2. ODESLÁNÍ E-MAILU VÁM (S FORMÁTOVÁNÍM) ---
        console.log("Sestavování interního e-mailu pro:", internalNotificationEmail);
        const formDataHtml = formatObjectSimple(extraData.formData, 'Data zadaná do kalkulačky');
        const calculationHtml = formatCalculationToHtml(extraData.calculation); // Použití správné funkce
        const chatHistoryHtml = formatChatSimple(extraData.chatHistory);

        const internalEmailHtml = `
            <!DOCTYPE html><html><head><style>/* ... CSS styly ... */</style></head><body>
            <h1>🚀 Nový lead z Hypoteky Ai</h1>
            <h2>Kontaktní údaje:</h2>
            <ul>
                <li><strong>Jméno:</strong> ${formatValue(name)}</li>
                <li><strong>E-mail:</strong> ${formatValue(email)}</li>
                <li><strong>Telefon:</strong> ${formatValue(phone)}</li>
                <li><strong>Preferovaný čas:</strong> ${formatValue(contactTime)}</li>
                <li><strong>Poznámka:</strong> ${formatValue(note)}</li>
            </ul>
            ${extraData.formData ? `<hr>${formDataHtml}` : ''}
            ${extraData.calculation ? `<hr>${calculationHtml}` : ''}
            <hr>
            <h2>Historie chatu:</h2>
            <div style="max-height: 400px; overflow-y: auto; border: 1px solid #eee; padding: 10px; margin-bottom: 20px; background-color: #f9f9f9; font-size: 0.9em;">
                ${chatHistoryHtml}
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
        await sgMail.send(internalMsg);
        console.log("Interní e-mail úspěšně odeslán.");

        // --- 3. ODESLÁNÍ POTVRZOVACÍHO E-MAILU KLIENTOVI ---
        if (email && email.includes('@')) {
            console.log("Sestavování potvrzovacího e-mailu pro:", email);
            const userConfirmationHtml = `... Váš HTML kód pro potvrzovací e-mail ...`; // Vložte sem váš HTML kód
            const userMsg = { to: email, from: senderEmail, subject: 'Potvrzení poptávky | Hypoteky Ai', html: userConfirmationHtml };
            console.log("Pokus o odeslání e-mailu klientovi...");
            await sgMail.send(userMsg);
            console.log("E-mail klientovi úspěšně odeslán.");
        } else {
             console.log("Přeskočeno odeslání e-mailu klientovi - chybí e-mail.");
        }

        console.log("Funkce form-handler úspěšně dokončena.");
        return { statusCode: 200, body: 'Form processed successfully' };

    } catch (error) {
        console.error('NEČEKANÁ ZÁVAŽNÁ CHYBA ve funkci form-handler:', error);
        console.error("Detaily chyby:", error.message, error.stack);
        if (error.response) {
             console.error("SendGrid Error Body:", JSON.stringify(error.response.body, null, 2));
        }
        return { statusCode: 500, body: `Server Error: ${error.message}` };
    }
};