// Cesta: tests/scraper.spec.js (FINÁLNA, FUNKČNÁ VERZIA)

const { test, expect } = require('@playwright/test');
const { readExcelData } = require('../utils/excelReader'); 
const { writeExcelData } = require('../utils/excelWriter');
const { performance } = require('perf_hooks');

// ---- KONFIGURÁCIA (nemenná) ----
const EXCEL_FILE_NAME = 'bazos_filtre.xlsx'; 
const BASE_URL = 'https://www.bazos.sk/';
const NAVIGATE_DELAY_MS = 1000;
const POST_ACTION_DELAY_MIN = 1000;
const POST_ACTION_DELAY_MAX = 3000;
const delay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
// ----------------------------------------------------

test.describe('Bazos Scraper - Extrakcia dát inzerátov', () => {

    const testScenarios = readExcelData(EXCEL_FILE_NAME); 
    let allScrapedData = []; 

    if (testScenarios.length === 0) {
        test.skip(`Playwright nenašiel žiadne dáta v súbore ${EXCEL_FILE_NAME}. Testy sú preskočené.`, () => {});
        return;
    }
    
    // Konfigurácia pre prehliadač
    test.use({ 
        baseURL: BASE_URL,
        // ZVÝŠENÝ GLOBÁLNY TIMEOUT na 90 sekúnd pre stabilitu
        timeout: 90000, 
    });

    test('Scraping a export dát pre všetky TC', async ({ page }) => {
        
        console.log(`🚀 Spúšťam scraping ${testScenarios.length} scenárov...`);
        
        // --- KROK: OŠETRENIE COOKIES ---
        await test.step('Akceptovanie cookies', async () => {
            await page.goto('/');
            
            const acceptButton = page.locator('button', { hasText: 'Súhlasím' });
            if (await acceptButton.isVisible({ timeout: 5000 })) {
                await delay(1000, 2000); 
                await acceptButton.click();
                await acceptButton.waitFor({ state: 'hidden', timeout: 5000 });
                console.log('   -> ✅ Cookies akceptované a dialóg uzavretý.');
            } else {
                 console.log('   -> ℹ️ Cookies dialóg nebol nájdený alebo bol už uzavretý. Pokračujem.');
            }
            
            await delay(NAVIGATE_DELAY_MS, NAVIGATE_DELAY_MS);
        });
        // ----------------------------------------
        
        // Začíname cyklus pre všetky TC
        for (const scenario of testScenarios) {
            console.log(`\n--- Spúšťam TC: ${scenario.TestCaseID} (${scenario.HladanyText || 'Bez textu'}) ---`);
            const startTime = performance.now();
            
            try {
                // Krok 1: Vyplnenie Hľadaného textu a Rubriky
                await test.step(`TC ${scenario.TestCaseID}: Vyplnenie a Rubrika`, async () => {
                    await page.goto('/'); 
                    await page.fill('[id="hledat"]', scenario.HladanyText || ''); 

                    if (scenario.Rubrika) {
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'domcontentloaded' }), 
                            page.selectOption('select[name="rubriky"]', scenario.Rubrika.toLowerCase()),
                        ]);
                    } else {
                        await delay(POST_ACTION_DELAY_MIN, POST_ACTION_DELAY_MAX); 
                    }
                });
                
                // Krok 2: Lokalita (PSČ a Okolie)
                await test.step(`TC ${scenario.TestCaseID}: Nastavenie Lokality`, async () => {
                    
                    if (scenario.PSC) {
                        await page.fill('[id="hlokalita"]', String(scenario.PSC));
                        
                        const humkreisValue = String(scenario.OkolieKm || '25'); 
                        await page.fill('input[name="humkreis"]', humkreisValue);
                        
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                            page.press('[id="hlokalita"]', 'Enter'),
                        ]);
                        
                        await delay(POST_ACTION_DELAY_MIN, POST_ACTION_DELAY_MAX);
                    }
                });

                // Krok 3: Rozsah cien a spustenie vyhľadávania
                await test.step(`TC ${scenario.TestCaseID}: Nastavenie Cien a Hľadať`, async () => {
                    let searchNeeded = false;
                    
                    if (scenario.CenaOd) {
                        await page.fill('input[name="cenaod"]', String(scenario.CenaOd));
                        searchNeeded = true;
                    }
                    if (scenario.CenaDo) {
                        await page.fill('input[name="cenado"]', String(scenario.CenaDo));
                        searchNeeded = true;
                    }
                    
                    await delay(POST_ACTION_DELAY_MIN, POST_ACTION_DELAY_MAX);

                    if (searchNeeded) {
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }), 
                            page.click('input[value="Hľadať"]'),
                        ]);
                    }
                    
                    const resultTextLocator = page.locator('text=/Zobrazených.*inzerátov/');
                    await resultTextLocator.waitFor({ state: 'visible', timeout: 15000 });
                    console.log(`   -> ✅ Zobrazený text výsledkov nájdený: ${await resultTextLocator.innerText()}`);
                    
                    await delay(POST_ACTION_DELAY_MIN, POST_ACTION_DELAY_MAX); 
                });
                
                // Krok 4: Extrakcia dát z inzerátov
                await test.step(`TC ${scenario.TestCaseID}: Extrakcia dát`, async () => {
                    
                    const results = await page.$$('div.inzeraty.inzeratyflex'); 
                    let scenarioData = [];
                    
                    console.log(`   -> Nájdene ${results.length} inzerátov na prvej stránke.`);
                    
                    for (const resultElement of results) {
                        try {
                            
                            // Nájsť Title a Link
                            const titleElement = await resultElement.$('h2.nadpis > a');
                            const title = titleElement ? (await titleElement.innerText()) : 'N/A';
                            const link = titleElement ? (BASE_URL + (await titleElement.getAttribute('href'))) : 'N/A';
                            
                            // *** FINÁLNA OPRAVA CENY: Zameranie priamo na SPAN s atribútom translate="no" ***
                            const priceElement = await resultElement.$('span[translate="no"]');
                            let price = 'N/A';
                            if (priceElement) {
                                // Oprava: Získanie textu a orezanie
                                price = (await priceElement.innerText()).trim().replace(/\s*€/g, ' €'); // Normalizácia medzier pri mene
                            }
                            
                            // OPRAVA LOKALITY
                            const locationElement = await resultElement.$('div.inzeratylok');
                            let cleanedLocation = 'N/A';
                            if (locationElement) {
                                const locationText = await locationElement.innerText();
                                cleanedLocation = locationText.trim().replace(/\s*\n\s*/g, ' ');
                            }

                            console.log(`   [${scenario.TestCaseID}] ${title} | ${price} | ${cleanedLocation}`);
                            
                            if (title !== 'N/A') {
                                scenarioData.push({
                                    TestCaseID: scenario.TestCaseID,
                                    HladanyText: scenario.HladanyText,
                                    Názov: title,
                                    Cena: price,
                                    Lokalita: cleanedLocation,
                                    Link: link,
                                });
                            }
                        } catch (e) {
                             console.log(`   -> Upozornenie: Extrakcia dát pre jeden inzerát zlyhala. Preskakujem. Chyba: ${e.message.split('\n')[0]}`);
                        }
                    }
                    
                    allScrapedData = allScrapedData.concat(scenarioData);
                });

            } catch (error) {
                console.error(`🛑 FATÁLNA CHYBA pri TC ${scenario.TestCaseID}:`, error.message);
                console.log(`   -> Opúšťam tento scenár. Chyba bola pri: ${error.message.split('\n')[0]}`);
            }

            const endTime = performance.now();
            console.log(`--- TC ${scenario.TestCaseID} Dokončené za ${(endTime - startTime).toFixed(2)} ms ---`);
            
            await delay(3000, 7000); 
        } 
        
        // Finalizácia: Uloženie všetkých dát do Excelu
        console.log(`\n\n=================================================`);
        console.log(`✅ Scraping všetkých scenárov dokončený. Exportujem ${allScrapedData.length} inzerátov do Excelu...`);
        writeExcelData(allScrapedData);
        console.log(`=================================================`);
    });
});