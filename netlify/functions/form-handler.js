// netlify/functions/form-handler.js
const { GoogleSpreadsheet } = require('google-spreadsheet'); // Přidáno pro Google Sheets
const { JWT } = require('google-auth-library'); // Přidáno pro Google Sheets autentizaci
const sgMail = require('@sendgrid/mail'); // Původní pro SendGrid

// Nastavení API klíčů a e-mailů z proměnných prostředí Netlify
const sendGridApiKey = process.env.SENDGRID_API_KEY;
const crmApiKey = process.env.CRM_API_KEY; // I když není použito, necháme pro budoucí použití
const crmApiUrl = process.env.CRM_API_URL; // I když není použito, necháme pro budoucí použití
const internalNotificationEmail = process.env.INTERNAL_NOTIFICATION_EMAIL; // Váš email
const senderEmail = process.env.SENDER_EMAIL; // Ověřený email v SendGrid

// Základní kontroly konfigurace
if (!sendGridApiKey) console.error("FATAL ERROR: SENDGRID_API_KEY není nastaven.");
else sgMail.setApiKey(sendGridApiKey);
if (!internalNotificationEmail) console.error("ERROR: INTERNAL_NOTIFICATION_EMAIL není nastaven.");
if (!senderEmail) console.error("ERROR: SENDER_EMAIL není nastaven.");
if (!process.env.GOOGLE_SHEET_ID) console.error("ERROR: GOOGLE_SHEET_ID není nastaven.");
if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) console.error("ERROR: GOOGLE_SERVICE_ACCOUNT_EMAIL není nastaven.");
if (!process.env.GOOGLE_PRIVATE_KEY) console.error("ERROR: GOOGLE_PRIVATE_KEY není nastaven.");

// === POMOCNÉ FUNKCE PRO FORMÁTOVÁNÍ E-MAILU ===

// Helper funkce pro formátování čísel
const formatNumber = (n, currency = true) => {
    if (typeof n !== 'number' || isNaN(n)) return n;
    // Převedeno na český formát s Kč
    return n.toLocaleString('cs-CZ', currency ? { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 } : { maximumFractionDigits: 0 });
};

// Helper funkce pro bezpečné formátování hodnoty (prevence XSS)
const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '<i>Nezadáno</i>';
    let safeValue = String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Formátování čísel v hodnotách
    if (typeof value === 'number' && !isNaN(value)) {
        safeValue = value.toLocaleString('cs-CZ');
    }
    return safeValue;
};

// Helper funkce pro formátování jednoduchých objektů (jako formData) pro email
const formatObjectSimple = (obj, title) => {
    if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return `<p>${title}: Žádná data.</p>`;

    // Překladová mapa pro klíče v emailu
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

    let html = `<h3>${title}:</h3><ul style="list-style-type: none; padding-left: 0;">`;
    try {
        for (const key in obj) {
            // Jen pro primitivní hodnoty
            if (typeof obj[key] !== 'object' || obj[key] === null || Array.isArray(obj[key])) {
                let value = obj[key];
                // Formátování čísel s jednotkami
                if (typeof value === 'number') {
                    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('income') || key.toLowerCase().includes('liabilities') || key.toLowerCase().includes('payment') || key.toLowerCase().includes('savings') || key.toLowerCase().includes('balance') || key.toLowerCase().includes('cost')) {
                        value = formatNumber(value); // S Kč
                    } else if (key.toLowerCase().includes('term') || key.toLowerCase().includes('age') || key.toLowerCase().includes('fixation')) {
                        value += ' let';
                    } else if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('ltv') || key.toLowerCase().includes('dsti') || key.toLowerCase().includes('score')) {
                        value += ' %';
                    } else if (key.toLowerCase().includes('children')) {
                         value = value; // Bez jednotky
                    } else {
                        value = formatNumber(value, false); // Bez Kč
                    }
                 }
                 // Aplikace překladu názvu klíče
                 const formattedKey = keyTranslations[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
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

// Helper funkce pro formátování výsledků kalkulace pro email
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

// Helper funkce pro formátování chatu pro email
const formatChatSimple = (chatHistory) => {
     if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
        return '<p>Žádná historie chatu.</p>';
     }
     try {
        // Převod HTML tagů na bezpečný text a nahrazení <br> za nové řádky
        return chatHistory.map(msg => {
            const sender = msg.sender === 'user' ? 'Klient' : 'AI';
            const safeText = String(msg.text || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''); // Nahradí <br> a odstraní ostatní HTML
            const cleanText = safeText.replace(/\[Tlačítko\]/g, ''); // Odstraní placeholdery tlačítek
            return `<p style="margin: 2px 0;"><strong>${sender}:</strong> ${cleanText.replace(/\n/g, '<br>')}</p>`; // Zpět převede \n na <br> pro HTML email
        }).join('');
     } catch(e) {
         console.error("Chyba při formátování historie chatu:", e);
         return '<p>Chyba při zpracování historie chatu.</p>';
     }
};

// === FUNKCE PRO ZÁPIS DO GOOGLE SHEETS ===

// Funkce pro zápis dat do Google Sheetu (S DETAILNÍM LOGOVÁNÍM CHYB)
async function appendToSheet(data) {
    console.log(">>> appendToSheet: Funkce spustena.");
    try {
        const sheetId = process.env.GOOGLE_SHEET_ID;
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

        // Kontrola existence proměnných
        if (!sheetId || !clientEmail || !privateKeyRaw) {
            console.error(">>> appendToSheet: CHYBA - Chybí proměnné prostředí (ID, email, nebo klíč)!");
            return false;
        }
        console.log(`>>> appendToSheet: Sheet ID: ${sheetId.substring(0, 5)}... Email: ${clientEmail}`);

        // Nahrazení \n v klíči - klíč v Netlify MUSÍ obsahovat \n
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        console.log(">>> appendToSheet: Private key pripraven.");

        // Autentizace pomocí JWT
        const serviceAccountAuth = new JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Rozsah oprávnění
        });
        console.log(">>> appendToSheet: JWT Auth objekt vytvoren.");

        // Inicializace dokumentu
        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);

        // Načtení informací o dokumentu (listy atd.)
        console.log(">>> appendToSheet: Nacitam info o dokumentu...");
        await doc.loadInfo();
        console.log(`>>> appendToSheet: Info o dokumentu nacteno. Nalezeno listu: ${doc.sheetCount}`);

        // Výběr prvního listu
        const sheet = doc.sheetsByIndex[0];
        if (!sheet) {
            console.error(">>> appendToSheet: CHYBA - Nepodařilo se najít první list (index 0)!");
            return false;
        }
        console.log(`>>> appendToSheet: Zapisuji do listu: "${sheet.title}" (Index 0)`);

        // Příprava dat řádku - NÁZVY KLÍČŮ MUSÍ ODPOVÍDAT ZÁHLAVÍ V SHEETU
        const rowData = {
            'Datum a čas': new Date().toLocaleString('cs-CZ'),
            'Jméno': data.name || '',
            'Telefon': data.phone || '',
            'E-mail': data.email || '',
            'Preferovaný čas': data.contactTime || '',
            'Poznámka': data.note || '',
            'Souhrn kalkulace': data.summary || '',
            'Historie chatu': data.chatHistoryText || '',
            'Parametry kalkulace (JSON)': data.formDataJson || '',
            'Výsledky kalkulace (JSON)': data.calculationJson || ''
        };
        console.log(">>> appendToSheet: Pripravena data pro radek.");

        // Přidání řádku
        console.log(">>> appendToSheet: Pridavam radek...");
        await sheet.addRow(rowData);
        console.log(">>> appendToSheet: Radek uspesne pridan do Google Sheet.");
        return true; // Vracíme úspěch

    } catch (error) {
        // Detailní logování chyby
        console.error(">>> appendToSheet: ZACHYCENA CHYBA pri zapisu do Google Sheet!");
        console.error(">>> Chyba - Message:", error.message);
        console.error(">>> Chyba - Stack:", error.stack);
        if (error.response && error.response.data) {
             console.error(">>> Chyba - Google API Response Data:", JSON.stringify(error.response.data, null, 2));
        } else if (error.errors) {
             console.error(">>> Chyba - Google API Errors:", JSON.stringify(error.errors, null, 2));
        } else {
             console.error(">>> Chyba - Kompletní objekt:", error);
        }
        return false; // Vracíme neúspěch
    }
}

// === HLAVNÍ HANDLER FUNKCE ===

exports.handler = async (event) => {
    // Kontrola metody a základní konfigurace
    if (event.httpMethod && event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    if (!sendGridApiKey || !internalNotificationEmail || !senderEmail || !process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        // Kontrolujeme i Google proměnné zde pro jistotu
        console.error("Chyba konfigurace serveru - chybí některé API klíče nebo emaily v proměnných prostředí.");
        return { statusCode: 500, body: "Chyba konfigurace serveru." };
    }

    try {
        console.log("Funkce form-handler spuštěna.");
        let name, email, phone, note, contactTime, extraDataString, extraData;

        // Zpracování dat z formuláře
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

        // Parsování extra dat (chat, kalkulace)
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
                console.log('CRM API URL/klíč je nastaven, ale odeslání je přeskočeno (demo).');
             } catch (crmError) { console.error('Chyba při komunikaci s CRM:', crmError); }
        } else {
            console.log('CRM API URL/klíč není nastaven, přeskočeno.');
        }

        // --- ZÁPIS DO GOOGLE SHEETS ---
        // Příprava dat pro Google Sheet
        let chatHistoryText = 'Žádná historie chatu.';
        if (extraData.chatHistory && extraData.chatHistory.length > 0) {
            try {
                chatHistoryText = extraData.chatHistory.map(msg => {
                    const sender = msg.sender === 'user' ? 'Klient' : 'AI';
                    const safeText = String(msg.text || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
                    const cleanText = safeText.replace(/\[Tlačítko\]/g, '');
                    return `${sender}: ${cleanText}`;
                }).join('\n------\n');
            } catch (e) {
                console.error("Chyba formátování chatu pro Sheets:", e);
                chatHistoryText = 'Chyba při zpracování chatu.';
            }
        }

        let summaryText = 'Kalkulace nebyla provedena.';
        if (extraData.calculation && extraData.calculation.selectedOffer) {
            const calc = extraData.calculation.selectedOffer;
            const form = extraData.formData;
            // Zajistíme, že form existuje před přístupem k jeho vlastnostem
            if (form) {
                 const effectivePropValue = form.purpose === 'výstavba' ? (form.propertyValue || 0) + (form.landValue || 0) : (form.propertyValue || 0);
                 summaryText = `Úvěr: ${formatNumber(form.loanAmount || 0)}, Nemovitost: ${formatNumber(effectivePropValue)}, Splátka: ${formatNumber(calc.monthlyPayment || 0)}, Sazba: ${(calc.rate || 0)}%`;
            }
        }

        const sheetData = {
            name: name,
            phone: phone,
            email: email,
            contactTime: contactTime,
            note: note,
            summary: summaryText,
            chatHistoryText: chatHistoryText,
            formDataJson: JSON.stringify(extraData.formData || {}),
            calculationJson: JSON.stringify(extraData.calculation || {})
        };

        // Logování před voláním a čekání na výsledek zápisu
        console.log(">>> Handler: Pripravena data pro Google Sheet, volam appendToSheet...");
        try {
            const sheetWriteSuccess = await appendToSheet(sheetData); // Čekáme na dokončení
            if (sheetWriteSuccess) {
                console.log(">>> Handler: Zápis do Sheetu dokončen úspěšně.");
            } else {
                 console.warn(">>> Handler: Zápis do Sheetu selhal (viz logy z appendToSheet).");
                 // Zde bychom mohli poslat notifikaci adminovi, že zápis selhal
            }
        } catch (err) {
            console.error(">>> Handler: Chyba behem cekani na appendToSheet:", err.message);
            console.error(">>> Handler: Chyba Stack:", err.stack);
             // Zde bychom mohli poslat notifikaci adminovi, že zápis selhal
        }
        console.log(">>> Handler: Blok pro zápis do Sheetu dokončen.");
        // --- Konec bloku pro Google Sheets ---


        // --- ODESLÁNÍ E-MAILU VÁM (INTERNÍ) ---
        console.log("Sestavování interního e-mailu pro:", internalNotificationEmail);
        const internalFormDataHtml = formatObjectSimple(extraData.formData, 'Data zadaná do kalkulačky');
        const internalCalculationHtml = formatCalculationToHtml(extraData.calculation);
        const chatHistoryHtml = formatChatSimple(extraData.chatHistory); // Používáme funkci pro HTML email
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


        // --- ODESLÁNÍ POTVRZOVACÍHO E-MAILU KLIENTOVI ---
        let calculationSummaryHtml = ''; // Souhrn se neposílá klientovi
        if (email && email.includes('@')) {
            console.log("Sestavování potvrzovacího e-mailu pro:", email);
            const userConfirmationHtml = `
                <!DOCTYPE html>
                <html lang="cs"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style> body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; } .container { max-width: 600px; margin: 20px auto; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9; } h1 { color: #1e3a8a; font-size: 24px; margin-bottom: 15px; } p { margin-bottom: 15px; font-size: 16px; } .footer { margin-top: 25px; font-size: 0.9em; color: #777; border-top: 1px solid #e0e0e0; padding-top: 15px; } .footer a { color: #2563eb; text-decoration: none; } .highlight { font-weight: bold; } </style>
                </head><body><div class="container"><h1>Potvrzení vaší poptávky | Hypoteky Ai</h1><p>Dobrý den${name ? ` <span class="highlight">${name}</span>` : ''},</p><p>děkujeme, že jste využili naši platformu Hypoteky Ai pro vaši hypoteční kalkulaci a analýzu.</p><p>Váš požadavek jsme v pořádku přijali a <span class="highlight">co nejdříve</span> (obvykle do 24 hodin v pracovní dny) se vám ozve jeden z našich <span class="highlight">zkušených hypotečních specialistů</span>. Projde s vámi detaily, zodpoví vaše dotazy a pomůže najít tu nejlepší možnou nabídku na trhu.</p>${calculationSummaryHtml}<p>Pokud byste mezitím měli jakékoli dotazy, neváhejte nám odpovědět na tento e-mail.</p><p>Těšíme se na spolupráci!</p><div class="footer">S pozdravem,<br><span class="highlight">Tým Hypoteky Ai</span><br><a href="https://hypotekyai.cz">hypotekyai.cz</a><br><br><small>Toto je automaticky generovaný e-mail.</small></div></div></body></html>`;
            const userSubject = 'Potvrzení poptávky | Hypoteky Ai';
            const userMsg = { to: email, from: senderEmail, subject: userSubject, html: userConfirmationHtml };
            console.log("Pokus o odeslání e-mailu klientovi...");
            await sgMail.send(userMsg);
            console.log("E-mail klientovi úspěšně odeslán.");
        } else {
             console.log("Přeskočeno odeslání e-mailu klientovi - chybí e-mail.");
        }

        // Úspěšná odpověď klientovi
        console.log(">>> Handler: Funkce form-handler úspěšně dokončena (emaily odeslany).");
        return { statusCode: 200, body: 'Form processed successfully' };

    // Zachycení jakékoli neočekávané chyby v handleru
    } catch (error) {
        console.error('>>> Handler: NEČEKANÁ ZÁVAŽNÁ CHYBA ve funkci form-handler:', error);
        if (error.response) { // Pro chyby z API volání (SendGrid, Google?)
             console.error(">>> Chyba - API Response Body:", JSON.stringify(error.response.body || error.response.data, null, 2));
        }
        return { statusCode: 500, body: `Server Error: ${error.message}` };
    }
}; // Konec funkce exports.handler