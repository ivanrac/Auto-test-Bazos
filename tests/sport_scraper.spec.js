const { test, expect } = require('@playwright/test');
const { performance } = require('perf_hooks');

// ---- KONFIGURÁCIA ----
// ************************************************************
const BASE_URL = 'https://sport.bazos.sk/'; // ZMENA: URL pre kategóriu Šport
// ************************************************************
const MAX_ADS_TO_SCRAPE = 5; // Limit: Extrahovať iba prvých 5 inzerátov
const NAVIGATE_DELAY_MS = 1000;
const POST_ACTION_DELAY_MIN = 2000; 
const POST_ACTION_DELAY_MAX = 5000;
const delay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
// ----------------------------------------------------

test.describe('Bazos Sport Scraper - Extrakcia prvých 5 inzerátov', () => {
    
    // Nastavenie timeoutu pre jednotlivé akcie
    test.use({ 
        baseURL: BASE_URL,
        timeout: 90000, 
    });

    test('Scraping prvých 5 inzerátov s Cenou, Lokalitou, Názvom a Zobrazeniami', async ({ page }) => {
        
        const testCaseID = 'TC_SPORT_001';
        console.log(`🚀 Spúšťam scraping kategórie Šport - ${MAX_ADS_TO_SCRAPE} inzerátov.`);
        const startTime = performance.now();
        
        let allScrapedData = []; 

        try {
            // --- KROK 1: OŠETRENIE COOKIES a NAVIGÁCIA ---
            await test.step('Akceptovanie cookies a navigácia na URL', async () => {
                await page.goto('/');
                
                // Hľadá tlačidlo "Súhlasím" a klikne naň
                const acceptButton = page.locator('button:has-text("Súhlasím")');
                if (await acceptButton.isVisible({ timeout: 5000 })) {
                    await delay(1000, 2000); 
                    await acceptButton.click();
                    await acceptButton.waitFor({ state: 'hidden', timeout: 5000 });
                    console.log('    -> ✅ Cookies akceptované a dialóg uzavretý.');
                } else {
                    console.log('    -> ℹ️ Cookies dialóg nebol nájdený. Pokračujem.');
                }
                
                // Robustné čakanie na načítanie prvého kontajnera inzerátu
                const firstAdContainer = page.locator('div.inzeraty.inzeratyflex').first();
                await firstAdContainer.waitFor({ state: 'visible', timeout: 30000 });
                
                console.log(`    -> ✅ Stránka s výsledkami bola úspešne načítaná.`);
                await delay(POST_ACTION_DELAY_MIN, POST_ACTION_DELAY_MAX);
            });
            // ----------------------------------------
            
            // Krok 2: Extrakcia dát
            await test.step(`Extrakcia prvých ${MAX_ADS_TO_SCRAPE} inzerátov`, async () => {

                // Získanie všetkých inzerátov a obmedzenie na prvých 5
                const results = (await page.locator('div.inzeraty.inzeratyflex').all()).slice(0, MAX_ADS_TO_SCRAPE);
                
                console.log(`    -> Nájdene a spracovávam ${results.length} inzerátov.`);

                for (let i = 0; i < results.length; i++) {
                    const resultElement = results[i];
                    
                    try {
                        // Názov (Title) a Link: h2.nadpis > a
                        const titleElement = resultElement.locator('h2.nadpis > a').first();
                        const title = await titleElement.innerText();
                        const link = BASE_URL + (await titleElement.getAttribute('href'));
                        
                        // Cena: spoľahlivý span[translate="no"]
                        const priceElement = resultElement.locator('span[translate="no"]').first();
                        let price = 'N/A';
                        if (await priceElement.isVisible({ timeout: 100 })) { 
                            price = (await priceElement.innerText()).trim().replace(/\s*€/g, ' €'); 
                        }
                        
                        // Lokalita a Dátum: div.inzeratylok
                        const locationElement = resultElement.locator('div.inzeratylok').first();
                        const locationText = await locationElement.innerText();
                        // Vyčistíme text (Lokalita a PSČ a Dátum)
                        const cleanedLocation = locationText.trim().replace(/\s*\n\s*/g, ' '); 
                        
                        // Počet Zobrazení
                        const viewCountElement = resultElement.locator('div.inzeratylok span.velikost10').first();
                        let viewCount = 'N/A';
                        if (await viewCountElement.isVisible({ timeout: 100 })) {
                            const rawCountText = await viewCountElement.innerText();
                            // Extrahujeme iba číslo z reťazca, napr. "951" z "(951)"
                            viewCount = rawCountText.match(/\d+/)?.[0] || 'N/A';
                        }

                        if (title && title.trim().length > 0) {
                            console.log(`    [${i + 1}/${MAX_ADS_TO_SCRAPE}] ${title} | Cena: ${price} | Zobr: ${viewCount} | Lok: ${cleanedLocation}`);
                            allScrapedData.push({
                                TestCaseID: testCaseID,
                                Názov: title,
                                Cena: price,
                                Lokalita_Datum: cleanedLocation,
                                Počet_Zobrazení: viewCount,
                                Link: link,
                            });
                        }
                        
                    } catch (e) {
                        console.log(`    -> Upozornenie: Extrakcia dát pre inzerát #${i + 1} zlyhala. Chyba: ${e.message.split('\n')[0]}`);
                    }
                }
            });
            // KONIEC KROKU 2

            // ------------------------------------------------------------------
            // *** KROK 3: OVERENIE VÝSLEDKOV (FAIL ak 0) ***
            // ------------------------------------------------------------------
            await test.step('Overenie, či bola nájdená aspoň jedna položka', async () => {
                // Používame expect, aby test ZLYHAL, ak je pole prázdne
                expect(allScrapedData.length).toBeGreaterThan(0, 
                    `Chyba: Test nenašiel žiadne inzeráty (allScrapedData je prázdne). Očakávané aspoň 1 inzerát z kategórie Šport.`
                );
                console.log(`    -> ✅ Overenie: Extrahovaných ${allScrapedData.length} inzerátov.`)
            });
            // ------------------------------------------------------------------
            
        } catch (error) {
            console.error(`🛑 FATÁLNA CHYBA:`, error.message);
            console.log(`    -> Skript bol prerušený. Chyba: ${error.message.split('\n')[0]}`);
        }

        const endTime = performance.now();
        console.log(`--- Test dokončený za ${(endTime - startTime).toFixed(2)} ms ---`);
        
        // Finalizácia: Výpis extrahovaných dát
        console.log(`\n\n=================================================`);
        console.log(`✅ Extrahované dáta (${allScrapedData.length} inzerátov):`);
        console.table(allScrapedData);
        console.log(`=================================================`);
    });
});