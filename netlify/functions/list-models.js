const https = require('https');

exports.handler = async (event) => {
    const headers = { 
        'Access-Control-Allow-Origin': '*', 
        'Content-Type': 'application/json' 
    };
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'API klíč (GEMINI_API_KEY) není nastaven v proměnných prostředí na Netlify.' })
        };
    }

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1/models?key=${apiKey}`,
        method: 'GET'
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers,
                    body: data
                });
            });
        });

        req.on('error', (e) => {
            resolve({
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: `Došlo k chybě při volání API: ${e.message}` })
            });
        });

        req.end();
    });
};
