const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());    // Enable CORS for all routes (Vercel & GitHub)
app.use(express.json());

app.get('/api/leer-qr', async (req, res) => {
    const qrUrl = req.query.url;
    if(!qrUrl) return res.status(400).json({ error: 'URL del QR no proporcionada' });

    try {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.goto(qrUrl, { waitUntil: 'domcontentloaded' });

        // Etraer el contenido de la página
        const datosEstudiante = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));

            return {
                nombre: spans.find(span => span.classList.contains('text-mb-primary'))?.textContent.trim(),
                matricula: spans.find(span => span.textContent.includes('Matrícula:'))?.textContent.replace('Matrícula:', '').trim(),
                carrera: spans.find(span => span.textContent.includes('Plan de estudios:'))?.textContent.replace('Plan de estudios:', '').trim()
            };
        });       

        await browser.close();
        
        res.json({ contenido: datosEstudiante });
    } catch(error) {
        res.status(500).json({ error: 'Error al procesar el QR: ' + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});