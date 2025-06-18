// ENDPOINT CON PUPPETEER PARA LEER CÓDIGO QR
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/leer-qr', async (req, res) => {
    const qrUrl = req.query.url;
    if(!qrUrl) return res.status(400).json({ error: 'URL del QR no proporcionada' });

    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-web-security',       // Para evitar políticas CORS
                '--ignore-certificate-errors'   // Ignora errores de SSL
            ],
            timeout: 3000000
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await page.goto(qrUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000
         });

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

// ENDPOINT CON EXCELJS PARA RECIBIR Y GUARDAR DATOS EN EXCEL
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

app.post('/api/guardar-registro', async (req, res) => {
    const datos = req.body;
        
    // registros.xlsx es el nombre del archivo donde se guardarán los registros
    const rutaArchivo = path.join(__dirname, 'registros.xlsx');

    try {
        const workbook = new ExcelJS.Workbook();
        let hoja;
        let numeroFila;

        // Si el archivo existe, lo carga. Si no, lo crea
        if(fs.existsSync(rutaArchivo)) {
            await workbook.xlsx.readFile(rutaArchivo);
            hoja = workbook.getWorksheet('Registros');
            hoja.columns = [
                { header: 'Fecha', key: 'fecha', width: 13.20 },
                { header: 'Hora', key: 'hora', width: 13.20 },
                { header: 'Nombre del Consultor', key: 'nombre', width: 47.20 },
                { header: 'No. Control', key: 'noControl', width: 15.13 },
                { header: 'Carrera', key: 'carrera', width: 45 },
                { header: 'Revisión de libro en sala', key: 'sala', width: 9.9 },
                { header: 'Revisión de libro a domicilio', key: 'domicilio', width: 9.9 },
                { header: 'Revisión Tesina', key: 'tesina', width: 9.9 },
                { header: 'Consulta de revista / periódico', key: 'revista', width: 9.9 },
                { header: 'Sala de Computación', key: 'computacion', width: 9.9 },
            ];
            numeroFila = hoja.rowCount + 1;
        } else {
            hoja = workbook.addWorksheet('Registros');
            hoja.columns = [
                { header: 'Fecha', key: 'fecha', width: 13.20 },
                { header: 'Hora', key: 'hora', width: 13.20 },
                { header: 'Nombre del Consultor', key: 'nombre', width: 47.20 },
                { header: 'No. Control', key: 'noControl', width: 15.13 },
                { header: 'Carrera', key: 'carrera', width: 45 },
                { header: 'Revisión de libro en sala', key: 'sala', width: 9.9 },
                { header: 'Revisión de libro a domicilio', key: 'domicilio', width: 9.9 },
                { header: 'Revisión Tesina', key: 'tesina', width: 9.9 },
                { header: 'Consulta de revista / periódico', key: 'revista', width: 9.9 },
                { header: 'Sala de Computación', key: 'computacion', width: 9.9 },
            ];

            // Aplicar estilo
            hoja.getRow(1).eachCell((cell, colNumber) => {
                cell.font = {
                    bold: true, 
                    italic: true, 
                    underline: true,
                    size: colNumber >= 6 ? 8 : 11
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true};
            });

            await workbook.xlsx.writeFile(rutaArchivo);
            numeroFila = 2;
        }

        const fila = {
            fecha: datos.fecha,
            hora: datos.hora,
            nombre: datos.nombre,
            noControl: datos.noControl,
            carrera: datos.carrera,
            sala: datos.tipo === 'Revisión de libro en sala' ? 'X' : '',
            domicilio: datos.tipo === 'Revisión de libro a domicilio' ? 'X' : '',
            tesina: datos.tipo === 'Revisión Tesina' ? 'X' : '',
            revista: datos.tipo === 'Consulta de revista / periódico' ? 'X' : '',
            computacion: datos.tipo === 'Sala de Computación' ? 'X' : ''
        };
        hoja.addRow(fila);
        numeroFila = hoja.rowCount;

        await workbook.xlsx.writeFile(rutaArchivo);

        res.json({ mensaje: 'Registro guardado exitosamente' });
    } catch(error) {
        console.error('Error al guardar el registro:', error);
        res.status(500).json({ error: 'No se pudo guardar el registro ' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});