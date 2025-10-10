// Cesta: utils/excelReader.js

// Import bezpečnej verzie knižnice pre Excel
const XLSX = require('xlsx-js-style'); 
const path = require('path');

/**
 * Načíta dáta z prvého listu Excel súboru v priečinku 'data'.
 * @param {string} fileName - Názov Excel súboru (napr. 'bazos_filtre.xlsx').
 * @returns {Array<Object>} Pole objektov, kde každý objekt je riadok dát.
 */
function readExcelData(fileName) {
    // Vytvorí plnú cestu k dátovému súboru: [ROOT]/data/[fileName]
    const filePath = path.join(__dirname, '..', 'data', fileName); 

    try {
        const workbook = XLSX.readFile(filePath);
        
        // Vezme názov prvého listu v súbore
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Konvertuje list na pole JSON objektov. Hlavičky stĺpcov sú kľúče.
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        if (data.length === 0) {
            console.warn(`[Excel Reader] Upozornenie: Súbor "${fileName}" bol prázdny.`);
        }
        
        return data;
    } catch (error) {
        console.error(`[Excel Reader] Chyba pri čítaní Excel súboru ${fileName}:`, error.message);
        return []; 
    }
}

module.exports = { readExcelData };