const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Vytvorí priečinok, ak neexistuje
function ensureDirectoryExistence(filePath) {
    // Extrahujeme cestu k adresáru zo súborovej cesty
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    // Vytvoríme ho rekurzívne
    fs.mkdirSync(dirname, { recursive: true });
}

function writeExcelData(data) {
    if (!data || data.length === 0) {
        console.log("    -> Žiadne dáta na export. Export preskočený.");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bazos Scrape Data');

    // 1. Definovanie stĺpcov (Headers)
    const columns = [
        { header: 'TestCaseID', key: 'TestCaseID', width: 10 },
        { header: 'HladanyText', key: 'HladanyText', width: 30 },
        { header: 'Názov', key: 'Názov', width: 50 },
        { header: 'Cena', key: 'Cena', width: 15 },
        { header: 'Lokalita', key: 'Lokalita', width: 30 },
        { header: 'Link', key: 'Link', width: 70 }
    ];
    worksheet.columns = columns;

    // 2. Pridanie dát
    worksheet.addRows(data);

    // 3. Uloženie súboru
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const fileName = `Bazos_Scraped_Data_${timestamp}.xlsx`;
    
    // **************** OPRAVA LOGIKY ADRESÁRA ****************
    const outputDir = path.join(__dirname, '..', 'exportovane_data'); 
    const outputPath = path.join(outputDir, fileName);

    // KĽÚČOVÁ OPRAVA: Voláme zabezpečenie adresára
    ensureDirectoryExistence(outputPath); 
    // *******************************************************

    workbook.xlsx.writeFile(outputPath)
        .then(() => {
            console.log(`\n✅ Dáta úspešne uložené do Excelu: ${outputPath}`);
        })
        .catch(err => {
            // Táto chyba by sa už nemala zobraziť!
            console.error('\n🛑 CHYBA pri ukladaní Excelu (Po oprave by už nemala nastať):', err);
        });
}

module.exports = { writeExcelData };