const multer = require('multer');
const xlsx = require('xlsx');

// Configuraci├│n de multer para memoria (archivos en memoria, no disco)
const storage = multer.memoryStorage();
const upload = multer({ storage });

async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Usar multer middleware manualmente
        await new Promise((resolve, reject) => {
            upload.array('files', 5)(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const files = req.files || [];
        
        if (files.length === 0) {
            return res.status(400).json({ success: false, error: 'No se subieron archivos' });
        }

        const processedFiles = [];

        for (const file of files) {
            if (!file.mimetype.includes('spreadsheet') && !file.originalname.endsWith('.xlsx') && !file.originalname.endsWith('.xls')) {
                return res.status(400).json({ success: false, error: 'Solo se permiten archivos Excel' });
            }

            try {
                const workbook = xlsx.read(file.buffer, { type: 'buffer' });
                const sheetNames = workbook.SheetNames;
                
                if (sheetNames.length === 0) {
                    return res.status(400).json({ success: false, error: 'El archivo Excel no contiene hojas' });
                }

                // Procesar la primera hoja
                const firstSheet = workbook.Sheets[sheetNames[0]];
                const jsonData = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
                
                if (jsonData.length === 0) {
                    return res.status(400).json({ success: false, error: 'La hoja est├í vac├¡a' });
                }

                // Extraer columnas de la primera fila
                const columns = jsonData[0] || [];
                const dataRows = jsonData.slice(1).filter(row => row && row.some(cell => cell !== null && cell !== ''));
                
                processedFiles.push({
                    filename: file.originalname,
                    sheetName: sheetNames[0],
                    columns: columns,
                    data: dataRows,
                    totalRows: dataRows.length
                });

            } catch (error) {
                console.error(`Error procesando archivo ${file.originalname}:`, error);
                return res.status(500).json({ success: false, error: `Error procesando archivo ${file.originalname}` });
            }
        }

        res.json({ 
            success: true, 
            message: 'Archivos procesados correctamente',
            files: processedFiles
        });

    } catch (error) {
        console.error('Error en /api/excel/upload:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

module.exports = handler;

module.exports.config = {
    api: {
        bodyParser: false,
    },
};
