// netlify/functions/form-handler.js
// Bezpečnější verze s jednodušším formátováním e-mailů

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

// Jednoduchá helper funkce pro bezpečné formátování hodnoty
const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '<i>Nezadáno</i>';
    // Základní ochrana proti HTML
    let safeValue = String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Jednoduché formátování čísel pro lepší čitelnost (bez závislosti na klíči)
    if (typeof value === 'number' && !isNaN(value)) {
        safeValue = value.toLocaleString('cs-CZ'); // Použije oddělovače tisíců
    }
    return safeValue;
};

// Jednoduchá helper funkce pro formátování objektu do seznamu
const formatObjectSimple = (obj, title) => {
    if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return `<p>${title}: Žádná data.</p>`;
    let html = `<h3>${title}:</h3><ul>`;
    try {
        for (const key in obj) {
            // Přeskakujeme vnořené objekty/pole
            if (typeof obj[key] !== 'object' || obj[key] === null || Array.isArray(obj[key])) {
                 const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                 html += `<li><strong>${formattedKey}:</strong> ${formatValue(obj[key])}</li>`;
            }
        }
    } catch (e) {
         console.error("Chyba při formátování objektu:", e);
         html += '<li>Chyba při zpracování dat.</li>';
    }
    html += '</ul>';
    return html;
};

// Jednoduchá helper funkce pro formátování chatu
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
            // ... (kód pro CRM zůstává stejný jako v předchozí verzi) ...
             console.log("Pokus o odeslání dat do CRM...");
             try {
                // ... fetch kód ...
             } catch (crmError) { console.error('Chyba při komunikaci s CRM:', crmError); }
        } else {
            console.log('CRM API URL/klíč není nastaven, přeskočeno.');
        }

        // --- 2. ODESLÁNÍ E-MAILU VÁM (S JEDNODUŠŠÍM FORMÁTOVÁNÍM) ---
        console.log("Sestavování interního e-mailu pro:", internalNotificationEmail);
        // Použijeme JEDNODUCHÉ formátovací funkce
        const formDataHtml = formatObjectSimple(extraData.formData, 'Data zadaná do kalkulačky');
        // Pro výsledky kalkulace použijeme bezpečnější formátování jen základních údajů
        let calculationHtml = '<h3>Výsledky z kalkulačky:</h3>';
        if (extraData.calculation && extraData.calculation.selectedOffer) {
            calculationHtml += `<ul><li><strong>Nabídka:</strong> ${formatValue(extraData.calculation.selectedOffer.title)}</li>`;
            calculationHtml += `<li><strong>Splátka:</strong> ${formatValue(extraData.calculation.selectedOffer.monthlyPayment)}</li>`;
            calculationHtml += `<li><strong>Sazba:</strong> ${formatValue(extraData.calculation.selectedOffer.rate)} %</li></ul>`;
        } else {
            calculationHtml += '<p>Žádná data.</p>';
        }
        const chatHistoryHtml = formatChatSimple(extraData.chatHistory);

        const internalEmailHtml = `
            <!DOCTYPE html><html><head><style>body{font-family: sans-serif; line-height: 1.5;} ul{list-style: none; padding-left: 0;} li{margin-bottom: 5px;} strong{min-width: 150px; display: inline-block;}</style></head><body>
            <h1>🚀 Nový lead z Hypoteky Ai</h1>
            <h2>Kontaktní údaje:</h2>
            <ul>
                <li><strong>Jméno:</strong> ${formatValue(name)}</li>
                <li><strong>E-mail:</strong> ${formatValue(email)}</li>
                <li><strong>Telefon:</strong> ${formatValue(phone)}</li>
                <li><strong>Preferovaný čas:</strong> ${formatValue(contactTime)}</li>
                <li><strong>Poznámka:</strong> ${formatValue(note)}</li>
            </ul>
            <hr>
            ${formDataHtml}
            <hr>
            ${calculationHtml}
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
        // Logování detailů chyby pro snadnější ladění
        console.error("Detaily chyby:", error.message, error.stack);
        if (error.response) { // Pokud je to chyba od SendGrid API
             console.error("SendGrid Error Body:", JSON.stringify(error.response.body, null, 2));
        }
        return { statusCode: 500, body: `Server Error: ${error.message}` };
    }
};