// ZAČÁTEK NOVÉHO BLOKU
// netlify/functions/form-handler.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const crmApiKey = process.env.CRM_API_KEY;
const crmApiUrl = process.env.CRM_API_URL;

exports.handler = async (event) => {
    // Funkce spuštěná událostí nemá httpMethod, kontrola není nutná.
    
    try {
        // Data z formuláře přijdou v event.payload.data
        const formData = event.payload.data;
        const name = formData.name;
        const email = formData.email;
        const phone = formData.phone;
        const note = formData.note;
        // Naše extra data jsou v poli extraData
        const extraData = JSON.parse(formData.extraData || '{}');
// KONEC NOVÉHO BLOKU (zbytek funkce zůstává stejný)

        // --- 1. ODESLÁNÍ DAT DO CRM ---
        const crmPayload = {
            // ZDE UPRAVTE STRUKTURU PODLE VAŠEHO CRM
            jmeno_prijmeni: name,
            email_adresa: email,
            telefonni_cislo: phone,
            poznamka_klienta: note,
            kalkulacka_vysledky: extraData.calculation,
            historie_chatu: extraData.chatHistory,
        };
        
        // Použijte `fetch` pro odeslání dat do vašeho CRM API
        // Tento kód je POUZE PŘÍKLAD, upravte ho podle dokumentace vašeho CRM
        await fetch(crmApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${crmApiKey}`
            },
            body: JSON.stringify(crmPayload)
        });


        // --- 2. ODESLÁNÍ E-MAILU VÁM ---
        const internalEmailHtml = `
            <h1>Nový lead z Hypoteky Ai</h1>
            <h2>Kontaktní údaje:</h2>
            <ul>
                <li><strong>Jméno:</strong> ${name}</li>
                <li><strong>E-mail:</strong> ${email}</li>
                <li><strong>Telefon:</strong> ${phone}</li>
                <li><strong>Poznámka:</strong> ${note || 'Není'}</li>
            </ul>
            <hr>
            <h2>Výsledky z kalkulačky:</h2>
            <pre>${JSON.stringify(extraData.calculation, null, 2)}</pre>
            <hr>
            <h2>Historie chatu:</h2>
            <ul>
                ${extraData.chatHistory.map(msg => `<li><strong>${msg.sender === 'user' ? 'Klient' : 'AI'}:</strong> ${msg.text}</li>`).join('')}
            </ul>
        `;

        const internalMsg = {
            to: 'vas-email@hypotekyai.cz', // <-- ZMĚŇTE NA VÁŠ PRACOVNÍ E-MAIL
            from: 'lead@hypotekyai.cz', // E-mail, který jste verifikovali v SendGrid
            subject: '🚀 Nový lead na hypotéku!',
            html: internalEmailHtml,
        };
        await sgMail.send(internalMsg);


        // --- 3. ODESLÁNÍ POTVRZOVACÍHO E-MAILU KLIENTOVI ---
        const userConfirmationHtml = `
            <h1>Děkujeme za váš zájem</h1>
            <p>Dobrý den, ${name},</p>
            <p>děkujeme za využití naší platformy Hypoteky Ai. Váš požadavek jsme přijali a co nejdříve se vám ozve jeden z našich hypotečních specialistů.</p>
            <p>S pozdravem,<br>Tým Hypoteky Ai</p>
        `;
        
        const userMsg = {
            to: email,
            from: 'info@hypotekyai.cz', // E-mail, který jste verifikovali v SendGrid
            subject: 'Potvrzení poptávky | Hypoteky Ai',
            html: userConfirmationHtml,
        };
        await sgMail.send(userMsg);

        // Vše proběhlo v pořádku
        return { statusCode: 200, body: 'Form submitted successfully' };

    } catch (error) {
        console.error('Chyba ve funkci form-handler:', error);
        return { statusCode: 500, body: `Server Error: ${error.message}` };
    }
};