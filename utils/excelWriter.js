// Cesta: utils/excelWriter.js

const XLSX = require('xlsx-js-style');
const path = require('path');

/**
 * Uloží pole dát do Excel súboru s automatickým názvom a formátovaním.
 * @param {Array<Object>} data - Pole objektov, kde každý objekt je riadok dát.
 * @param {string} fileNamePrefix - Predpona názvu súboru (napr. 'Bazose_data_').
 */
function writeExcelData(data, fileNamePrefix = 'Bazos_Scraped_Data') {
    if (data.length === 0) {
        console.warn(`[Excel Writer] Neboli nájdené žiadne dáta na export.`);
        return;
    }

    // Vytvorenie unikátneho názvu súboru s dátumom a časom
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${fileNamePrefix}_${timestamp}.xlsx`;
    const filePath = path.join(__dirname, '..', 'data', fileName); 

    try {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ScrapedData');
        
        // Export do súboru
        XLSX.writeFile(workbook, filePath);
        
        console.log(`\n✅ Dáta úspešne uložené do Excelu: ${filePath}`);
    } catch (error) {
        console.error(`[Excel Writer] Chyba pri zápise Excel súboru ${fileName}:`, error.message);
    }
}

module.exports = { writeExcelData };