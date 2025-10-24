// netlify/functions/form-handler.js
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

    // --- PŘEKLADOVÁ MAPA ---
    const keyTranslations = {
        'propertyValue': 'Hodnota nemovitosti',
        'loanAmount': 'Výše úvěru',
        'income': 'Příjem',
        'liabilities': 'Závazky (splátky)',
        'age': 'Věk',
        'children': 'Počet dětí',
        'loanTerm': 'Splatnost',
        'fixation': 'Fixace',
        'purpose': 'Účel',
        'propertyType': 'Typ nemovitosti',
        'landValue': 'Hodnota pozemku',
        'reconstructionValue': 'Cena rekonstrukce',
        'employment': 'Zaměstnání',
        'education': 'Vzdělání'
    };
    // -------------------------

    let html = `<h3>${title}:</h3><ul style="list-style-type: none; padding-left: 0;">`;
    try {
        for (const key in obj) {
            if (typeof obj[key] !== 'object' || obj[key] === null || Array.isArray(obj[key])) {
                let value = obj[key];
                if (typeof value === 'number') {
                    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('income') || key.toLowerCase().includes('liabilities') || key.toLowerCase().includes('payment') || key.toLowerCase().includes('savings') || key.toLowerCase().includes('balance') || key.toLowerCase().includes('cost')) {
                        value = formatNumber(value);
                    } else if (key.toLowerCase().includes('term') || key.toLowerCase().includes('age') || key.toLowerCase().includes('fixation')) {
                        value += ' let';
                    } else if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('ltv') || key.toLowerCase().includes('dsti') || key.toLowerCase().includes('score')) {
                        value += ' %';
                    } else if (key.toLowerCase().includes('children')) {
                         value = value;
                    } else {
                        value = formatNumber(value, false);
                    }
                 }
                 
                 // --- APLIKACE PŘEKLADU ---
                 const formattedKey = keyTranslations[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                 // -------------------------

                 html += `<li style="margin-bottom: 5px;"><strong style="color: #555; min-width: 150px; display: inline-block;">${formattedKey}:</strong> ${formatValue(value)}</li>`;
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
            html += `<h4>Vybraná nabídka:</h4><ul style="list-style-type: none; padding-left: 0;">`;
            html += `<li style="margin-bottom: 5px;"><strong style="color: #555; min-width: 150px; display: inline-block;">Název:</strong> ${formatValue(calc.selectedOffer.title)}</li>`;
            html += `<li style="margin-bottom: 5px;"><strong style="color: #555; min-width: 150px; display: inline-block;">Splátka:</strong> ${formatNumber(calc.selectedOffer.monthlyPayment)}</li>`;
            html += `<li style="margin-bottom: 5px;"><strong style="color: #555; min-width: 150px; display: inline-block;">Sazba:</strong> ${formatValue(calc.selectedOffer.rate)} %</li>`;
            html += `</ul>`;
        } else {
             html += '<p>Nebyla vybrána žádná konkrétní nabídka.</p>';
        }
        if (calc.approvability) {
             html += `<h4>Odhad schvalitelnosti:</h4><ul style="list-style-type: none; padding-left: 0;">`;
             html += `<li style="margin-bottom: 5px;"><strong style="color: #555; min-width: 150px; display: inline-block;">Skóre LTV:</strong> ${formatValue(calc.approvability.ltv)}%</li>`;
             html += `<li style="margin-bottom: 5px;"><strong style="color: #555; min-width: 150px; display: inline-block;">Skóre DSTI:</strong> ${formatValue(calc.approvability.dsti)}%</li>`;
             html += `<li style="margin-bottom: 5px;"><strong style="color: #555; min-width: 150px; display: inline-block;">Skóre Bonita:</strong> ${formatValue(calc.approvability.bonita)}%</li>`;
             html += `<li style="margin-bottom: 5px;"><strong style="color: #555; min-width: 150px; display: inline-block;">Celkové skóre:</strong> ${formatValue(calc.approvability.total)}%</li>`;
             html += `</ul>`;
        }
    } catch (e) {
         console.error("Chyba při formátování kalkulace:", e);
         html += '<p>Chyba při zpracování výsledků kalkulace.</p>';
    }
    return html;
};

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
                // Zde by byla logika pro odeslání do CRM
                console.log('CRM API URL/klíč je nastaven, ale odeslání je přeskočeno (demo).');
             } catch (crmError) { console.error('Chyba při komunikaci s CRM:', crmError); }
        } else {
            console.log('CRM API URL/klíč není nastaven, přeskočeno.');
        }

        // --- 2. ODESLÁNÍ E-MAILU VÁM (INTERNÍ) ---
        // (Tato část zůstává beze změny, vy souhrn stále dostanete)
        console.log("Sestavování interního e-mailu pro:", internalNotificationEmail);
        const internalFormDataHtml = formatObjectSimple(extraData.formData, 'Data zadaná do kalkulačky');
        const internalCalculationHtml = formatCalculationToHtml(extraData.calculation);
        const chatHistoryHtml = formatChatSimple(extraData.chatHistory);

        const internalEmailHtml = `
            <!DOCTYPE html><html><head><style>
                body { font-family: Arial, sans-serif; line-height: 1.6; }
                h1, h2, h3 { color: #333; }
                ul { list-style-type: none; padding-left: 0; }
                li { margin-bottom: 8px; }
                li strong { min-width: 150px; display: inline-block; }
            </style></head><body>
            <h1>🚀 Nový lead z Hypoteky Ai</h1>
            <h2>Kontaktní údaje:</h2>
            <ul>
                <li><strong>Jméno:</strong> ${formatValue(name)}</li>
                <li><strong>E-mail:</strong> ${formatValue(email)}</li>
                <li><strong>Telefon:</strong> ${formatValue(phone)}</li>
                <li><strong>Preferovaný čas:</strong> ${formatValue(contactTime)}</li>
                <li><strong>Poznámka:</strong> ${formatValue(note)}</li>
            </ul>
            ${extraData.formData ? `<hr>${internalFormDataHtml}` : ''}
            ${extraData.calculation ? `<hr>${internalCalculationHtml}` : ''}
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

        // --- 3. ODESLÁNÍ POTVRZOVACÍHO E-MAILU KLIENTOVI (OPRAVENÁ VERZE) ---
        
        // --- Souhrn pro klienta je nyní VŽDY PRÁZDNÝ ---
        let calculationSummaryHtml = '';
        if (extraData.formData) {
            console.log("Data z kalkulačky byla nalezena, ale neposílají se klientovi (dle nastavení).");
        }
        // --- Konec úpravy ---
        
        if (email && email.includes('@')) {
            console.log("Sestavování potvrzovacího e-mailu pro:", email);
            const userConfirmationHtml = `
                <!DOCTYPE html>
                <html lang="cs">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 20px auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9; }
                        h1 { color: #1e3a8a; font-size: 24px; margin-bottom: 15px; }
                        p { margin-bottom: 15px; font-size: 16px; }
                        .footer { margin-top: 25px; font-size: 0.9em; color: #777; border-top: 1px solid #e0e0e0; padding-top: 15px; }
                        .footer a { color: #2563eb; text-decoration: none; }
                        .highlight { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Potvrzení vaší poptávky | Hypoteky Ai</h1>
                        
                        <p>Dobrý den${name ? ` <span class="highlight">${name}</span>` : ''},</p>
                        
                        <p>děkujeme, že jste využili naši platformu Hypoteky Ai pro vaši hypoteční kalkulaci a analýzu.</p>
                        
                        <p>Váš požadavek jsme v pořádku přijali a <span class="highlight">co nejdříve</span> (obvykle do 24 hodin v pracovní dny) se vám ozve jeden z našich <span class="highlight">zkušených hypotečních specialistů</span>. Projde s vámi detaily, zodpoví vaše dotazy a pomůže najít tu nejlepší možnou nabídku na trhu.</p>
                        
                        ${calculationSummaryHtml}
                        
                        <p>Pokud byste mezitím měli jakékoli dotazy, neváhejte nám odpovědět na tento e-mail.</p>
                        
                        <p>Těšíme se na spolupráci!</p>
                        
                        <div class="footer">
                            S pozdravem,<br>
                            <span class="highlight">Tým Hypoteky Ai</span><br>
                            <a href="https://hypotekyai.cz">hypotekyai.cz</a>
                            <br><br>
                            <small>Toto je automaticky generovaný e-mail.</small>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            // --- Předmět e-mailu je nyní vždy stejný ---
            const userSubject = 'Potvrzení poptávky | Hypoteky Ai';
                
            const userMsg = { to: email, from: senderEmail, subject: userSubject, html: userConfirmationHtml };
            
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