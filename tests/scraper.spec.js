const { test, expect } = require('@playwright/test');
const { readExcelData } = require('../utils/excelReader'); 
const { writeExcelData } = require('../utils/excelWriter');
const { performance } = require('perf_hooks');

// ---- KONFIGURÁCIA (nemenná) ----
const EXCEL_FILE_NAME = 'bazos_filtre.xlsx'; 
const BASE_URL = 'https://www.bazos.sk/';
const NAVIGATE_DELAY_MS = 1000;
// ZVÝŠENÝ DELAY pre zníženie rizika blokovania (2-5 sekúnd)
const POST_ACTION_DELAY_MIN = 2000; 
const POST_ACTION_DELAY_MAX = 5000;
const delay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
// ----------------------------------------------------

test.describe('Bazos Scraper - Extrakcia dát inzerátov', () => {

    // Kód číta všetky riadky v Exceli (TC_01, TC_02, TC_03 atď.)
    const testScenarios = readExcelData(EXCEL_FILE_NAME); 
    let allScrapedData = []; 

    if (testScenarios.length === 0) {
        test.skip(`Playwright nenašiel žiadne dáta v súbore ${EXCEL_FILE_NAME}. Testy sú preskočené.`, () => {});
        return;
    }
    
    // Nastavenie timeoutu pre jednotlivé akcie - vysoká hodnota pre istotu
    test.use({ 
        baseURL: BASE_URL,
        timeout: 90000, 
    });

    test('Scraping a export dát pre všetky TC', async ({ page }) => {
        
        console.log(`🚀 Spúšťam scraping ${testScenarios.length} scenárov...`);
        
        // --- KROK: OŠETRENIE COOKIES ---
        await test.step('Akceptovanie cookies', async () => {
            await page.goto('/');
            
            // Hľadá tlačidlo "Súhlasím" a klikne naň
            const acceptButton = page.locator('button:has-text("Súhlasím")');
            if (await acceptButton.isVisible({ timeout: 5000 })) {
                await delay(1000, 2000); 
                await acceptButton.click();
                await acceptButton.waitFor({ state: 'hidden', timeout: 5000 });
                console.log('    -> ✅ Cookies akceptované a dialóg uzavretý.');
            } else {
                 console.log('    -> ℹ️ Cookies dialóg nebol nájdený alebo bol už uzavretý. Pokračujem.');
            }
            
            await delay(NAVIGATE_DELAY_MS, NAVIGATE_DELAY_MS);
        });
        // ----------------------------------------
        
        // Hlavný cyklus prechádza cez VŠETKY testovacie prípady (TC) v Exceli
        for (const scenario of testScenarios) {
            console.log(`\n--- Spúšťam TC: ${scenario.TestCaseID} (${scenario.HladanyText || 'Bez textu'}) ---`);
            const startTime = performance.now();
            
            try {
                // Krok 1: Vyplnenie Hľadaného textu a Rubriky
                await test.step(`TC ${scenario.TestCaseID}: Vyplnenie a Rubrika`, async () => {
                    await page.goto('/'); 
                    // Vyplnenie textu do poľa s ID="hledat"
                    await page.fill('[id="hledat"]', scenario.HladanyText || '', { force: true }); 

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
                        // Element pre PSČ je [id="hlokalita"]
                        await page.fill('[id="hlokalita"]', String(scenario.PSC));
                        
                        // Element pre Okolie km je input[name="humkreis"]
                        const humkreisValue = String(scenario.OkolieKm || '25'); 
                        await page.fill('input[name="humkreis"]', humkreisValue);
                        
                        // *** OPRAVA: ODSTRÁNENÉ ZBYTOČNÉ page.waitForNavigation ***
                        // Použijeme len Enter na vyplnenie polí, navigácia príde v Kroku 3
                        await page.press('[id="hlokalita"]', 'Enter');
                        // *******************************************************
                        
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
                            // Čakáme na domcontentloaded (rýchlejšie ako 'load')
                            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }), 
                            page.click('input[value="Hľadať"]'),
                        ]);
                    }
                    
                    // --- ROBUSTNÉ OŠETRENIE VÝSLEDKOV A HLÁŠKY O NULE VÝSLEDKOV ---
                    const noResultsLocator = page.locator('text=/Hľadaniu nevyhovujú žiadne inzeráty/i');
                    const firstAdContainer = page.locator('div.inzeraty.inzeratyflex').first();
                    
                    // Čakáme, či sa objaví prvý inzerát ALEBO hláška o 0 výsledkoch
                    const [adVisible, noResultsVisible] = await Promise.all([
                        firstAdContainer.waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false),
                        noResultsLocator.waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false),
                    ]);

                    if (noResultsVisible || await noResultsLocator.isVisible()) {
                         console.log(`    -> ℹ️ Upozornenie: Hľadaniu nevyhovujú žiadne inzeráty pre TC ${scenario.TestCaseID}.`);
                         return; // Ukončíme tento scenár a ideme na ďalší TC
                    }
                    if (!adVisible) {
                        // Ak nenastala hláška "žiadne výsledky" ani nebol videný inzerát
                        throw new Error("Timeout: Stránka výsledkov nebola načítaná, ani nebola zobrazená hláška o 0 výsledkoch.");
                    }
                    
                    console.log(`    -> ✅ Stránka s výsledkami bola úspešne načítaná a prvý inzerát je viditeľný.`);
                    
                    await delay(POST_ACTION_DELAY_MIN, POST_ACTION_DELAY_MAX); 
                });
                
                
                // Krok 4: Extrakcia dát - extrahuje IBA PRVÚ STRÁNKU (20 inzerátov)
                await test.step(`TC ${scenario.TestCaseID}: Extrakcia dát`, async () => {
    
                    const results = await page.locator('div.inzeraty.inzeratyflex').all();
                    
                    console.log(`    -> Nájdene ${results.length} inzerátov na prvej stránke.`);
                    
                    let scenarioData = [];

                    for (const resultElement of results) {
                        
                        try {
                            // Link a Názov: h2.nadpis > a
                            const titleElement = resultElement.locator('h2.nadpis > a').first();
                            const title = titleElement ? (await titleElement.innerText()) : 'N/A';
                            const link = titleElement ? (BASE_URL + (await titleElement.getAttribute('href'))) : 'N/A';
                            
                            // Cena: spoľahlivý span[translate="no"]
                            const priceElement = resultElement.locator('span[translate="no"]').first();
                            let price = 'N/A';
                            if (await priceElement.isVisible({ timeout: 1000 })) { 
                                price = (await priceElement.innerText()).trim().replace(/\s*€/g, ' €'); 
                            }
                            
                            // Lokalita: spoľahlivý div.inzeratylok
                            const locationElement = resultElement.locator('div.inzeratylok').first();
                            let cleanedLocation = 'N/A';
                            if (await locationElement.isVisible({ timeout: 1000 })) {
                                const locationText = await locationElement.innerText();
                                cleanedLocation = locationText.trim().replace(/\s*\n\s*/g, ' ');
                            }

                            if (title && title.trim().length > 0) {
                                console.log(`    [${scenario.TestCaseID}] ${title} | ${price} | ${cleanedLocation}`);
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
                            console.log(`    -> Upozornenie: Extrakcia dát pre inzerát zlyhala. Chyba: ${e.message.split('\n')[0]}`);
                        }
                    }
                    
                    allScrapedData = allScrapedData.concat(scenarioData);
                });
                // KONIEC KROKU 4
                

            } catch (error) {
                console.error(`🛑 FATÁLNA CHYBA pri TC ${scenario.TestCaseID}:`, error.message);
                console.log(`    -> Opúšťam tento scenár. Chyba bola pri: ${error.message.split('\n')[0]}`);
            }

            const endTime = performance.now();
            console.log(`--- TC ${scenario.TestCaseID} Dokončené za ${(endTime - startTime).toFixed(2)} ms ---`);
            
            // Dvojnásobný delay medzi scenármi pre prevenciu blokovania
            await delay(POST_ACTION_DELAY_MIN * 2, POST_ACTION_DELAY_MAX * 2); 
        } 
        
        // Finalizácia: Uloženie všetkých dát do Excelu
        console.log(`\n\n=================================================`);
        console.log(`✅ Scraping všetkých scenárov dokončený. Exportujem ${allScrapedData.length} inzerátov do Excelu...`);
        writeExcelData(allScrapedData);
        console.log(`=================================================`);
    });
});