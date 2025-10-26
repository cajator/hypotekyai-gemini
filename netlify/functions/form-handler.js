// netlify/functions/form-handler.js
const { GoogleSpreadsheet } = require('google-spreadsheet'); // TENTO ŘÁDEK PŘIDAT
const { JWT } = require('google-auth-library'); // TENTO ŘÁDEK PŘIDAT
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

// Funkce pro zápis dat do Google Sheetu
// VLOŽTE TUTO CELOU FUNKCI PŘED exports.handler

// Funkce pro zápis dat do Google Sheetu (S VÍCE LOGY)
async function appendToSheet(data) {
    // ===== LOG 1: Začátek funkce =====
    console.log(">>> appendToSheet: Funkce spustena.");
    try {
        // ===== LOG 2: Kontrola proměnných prostředí =====
        const sheetId = process.env.GOOGLE_SHEET_ID;
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

        if (!sheetId || !clientEmail || !privateKeyRaw) {
            console.error(">>> appendToSheet: CHYBA - Chybí proměnné prostředí (ID, email, nebo klíč)!");
            return false;
        }
        // Základní log (ne logovat celý klíč!)
        console.log(`>>> appendToSheet: Sheet ID: ${sheetId.substring(0, 5)}... Email: ${clientEmail}`);

        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        // ===== LOG 3: Po úpravě klíče =====
        console.log(">>> appendToSheet: Private key pripraven (nahrazeny \\n).");

        const serviceAccountAuth = new JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        // ===== LOG 4: Po vytvoření JWT =====
        console.log(">>> appendToSheet: JWT Auth objekt vytvoren.");

        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);

        // ===== LOG 5: Před loadInfo =====
        console.log(">>> appendToSheet: Nacitam info o dokumentu...");
        await doc.loadInfo();
        // ===== LOG 6: Po loadInfo =====
        console.log(`>>> appendToSheet: Info o dokumentu nacteno. Nalezeno listu: ${doc.sheetCount}`);

        const sheet = doc.sheetsByIndex[0]; // Předpokládáme první list
        if (!sheet) {
            console.error(">>> appendToSheet: CHYBA - Nepodařilo se najít první list (index 0)!");
            return false;
        }
        // ===== LOG 7: Po výběru listu =====
        console.log(`>>> appendToSheet: Zapisuji do listu: "${sheet.title}"`);

        // Připravíme řádek podle struktury Sheetu
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
        // ===== LOG 8: Před addRow (NE logovat citlivá data, jen potvrzení) =====
        console.log(">>> appendToSheet: Pripravena data pro radek (bez vypisu obsahu).");

        await sheet.addRow(rowData);
        // ===== LOG 9: Po úspěšném addRow =====
        console.log(">>> appendToSheet: Radek uspesne pridan do Google Sheet.");
        return true;

    } catch (error) {
        // ===== LOG 10: Zachycena CHYBA =====
        console.error(">>> appendToSheet: CHYBA pri zapisu do Google Sheet:", error.message);
        // Volitelně logovat i celý error objekt pro více detailů
        // console.error(error);
        return false;
    }
}

exports.handler = async (event) => {
    // Tento úvodní blok zůstává stejný
    if (event.httpMethod && event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    if (!sendGridApiKey || !internalNotificationEmail || !senderEmail) {
        return { statusCode: 500, body: "Chyba konfigurace serveru (e-mail)." };
    }

    // Blok try začíná zde
    try {
        console.log("Funkce form-handler spuštěna.");
        let name, email, phone, note, contactTime, extraDataString, extraData;

        // Zpracování dat (zůstává stejné)
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

        // Parsování extraData (zůstává stejné)
        try {
            extraData = JSON.parse(extraDataString || '{}');
        } catch (e) {
            console.error("Chyba při parsování extraData:", e);
            extraData = { error: "Chyba při parsování dat." };
        }

        // ODESLÁNÍ DAT DO CRM (zůstává stejné)
        if (crmApiUrl && crmApiKey) {
             console.log("Pokus o odeslání dat do CRM...");
             // ... (kód pro CRM) ...
        } else {
            console.log('CRM API URL/klíč není nastaven, přeskočeno.');
        }


        // --- ZÁPIS DO GOOGLE SHEETS ---
        // Nejprve připravíme data pro Sheet

        // Formátování historie chatu na text
        let chatHistoryText = 'Žádná historie chatu.';
        if (extraData.chatHistory && extraData.chatHistory.length > 0) {
            try {
                chatHistoryText = extraData.chatHistory.map(msg => {
                    const sender = msg.sender === 'user' ? 'Klient' : 'AI';
                    const cleanText = String(msg.text || '').replace(/<button.*?<\/button>/g, '[Tlačítko]').replace(/<br>/g, '\n');
                    return `${sender}: ${cleanText}`;
                }).join('\n------\n'); // Oddělovač mezi zprávami
            } catch (e) {
                console.error("Chyba formátování chatu pro Sheets:", e);
                chatHistoryText = 'Chyba při zpracování chatu.';
            }
        }

        // Stručný souhrn kalkulace
        let summaryText = 'Kalkulace nebyla provedena.';
        if (extraData.calculation && extraData.calculation.selectedOffer) {
            const calc = extraData.calculation.selectedOffer;
            const form = extraData.formData;
            summaryText = `Úvěr: ${formatNumber(form.loanAmount)}, Nemovitost: ${formatNumber(form.purpose === 'výstavba' ? form.propertyValue + form.landValue : form.propertyValue)}, Splátka: ${formatNumber(calc.monthlyPayment)}, Sazba: ${calc.rate}%`;
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

        // ===== LOG 11: Před voláním appendToSheet =====
        console.log(">>> Handler: Pripravena data pro Google Sheet, volam appendToSheet...");
        appendToSheet(sheetData).catch(err => {
            // ===== LOG 12: Zachycena chyba z asynchronního volání =====
            console.error(">>> Handler: Asynchronni chyba pri zapisu do Sheetu:", err);
        });
        // ===== LOG 13: Hned po asynchronním volání =====
        console.log(">>> Handler: Volani appendToSheet odeslano (bezi na pozadi).");
        // --- Konec bloku pro Google Sheets ---


        // --- ODESLÁNÍ E-MAILU VÁM (INTERNÍ) ---
        // (Tento kód zůstává stejný)
        console.log("Sestavování interního e-mailu pro:", internalNotificationEmail);
        const internalFormDataHtml = formatObjectSimple(extraData.formData, 'Data zadaná do kalkulačky');
        const internalCalculationHtml = formatCalculationToHtml(extraData.calculation);
        const chatHistoryHtml = formatChatSimple(extraData.chatHistory);
        const internalEmailHtml = `... (HTML šablona interního emailu zůstává stejná) ...`; // Zkráceno pro přehlednost
        const internalMsg = {
            to: internalNotificationEmail,
            from: senderEmail,
            subject: `🚀 Nový lead z Hypoteky Ai: ${name || 'Neznámý'}`,
            html: internalEmailHtml,
        };

        console.log("Pokus o odeslání interního e-mailu...");

        // ===== PŘIDAT TENTO KONTROLNÍ VÝPIS =====
        console.log(">>> DEBUG: Objekt internalMsg před odesláním:", JSON.stringify(internalMsg, null, 2));
        // ==========================================

        await sgMail.send(internalMsg); // Zde dochází k chybě
        console.log("Interní e-mail úspěšně odeslán.");
        // --- Konec interního emailu ---


        // --- ODESLÁNÍ POTVRZOVACÍHO E-MAILU KLIENTOVI ---
        // (Tento kód zůstává stejný)
        let calculationSummaryHtml = ''; // Souhrn se neposílá
        if (email && email.includes('@')) {
            console.log("Sestavování potvrzovacího e-mailu pro:", email);
            const userConfirmationHtml = `... (HTML šablona emailu klientovi zůstává stejná) ...`; // Zkráceno
            const userSubject = 'Potvrzení poptávky | Hypoteky Ai';
            const userMsg = { to: email, from: senderEmail, subject: userSubject, html: userConfirmationHtml };
            await sgMail.send(userMsg);
            console.log("E-mail klientovi úspěšně odeslán.");
        } else {
             console.log("Přeskočeno odeslání e-mailu klientovi - chybí e-mail.");
        }
        // --- Konec emailu klientovi ---

        // Úspěšný konec funkce
        console.log(">>> Handler: Funkce form-handler úspěšně dokončena (emaily odeslany).");
        return { statusCode: 200, body: 'Form processed successfully' };

    // Catch blok pro zachycení chyb v handleru
    } catch (error) {
        // ===== LOG 14: Zachycena chyba v hlavním handleru =====
        console.error('>>> Handler: NEČEKANÁ ZÁVAŽNÁ CHYBA ve funkci form-handler:', error);
        // Zbytek error handlingu
        if (error.response) {
             console.error("SendGrid Error Body:", JSON.stringify(error.response.body, null, 2));
        }
        return { statusCode: 500, body: `Server Error: ${error.message}` };
    }
}; // Konec funkce exports.handler