const { test, expect } = require('@playwright/test');
const { performance } = require('perf_hooks');

// ************************************************************
// Zoznam všetkých kategórií a ich subdomén na Bazos.sk
const CATEGORIES = [
    { name: 'Zvieratá', url: 'https://zvierata.bazos.sk/' },
    { name: 'Deti', url: 'https://deti.bazos.sk/' },
    { name: 'Reality', url: 'https://reality.bazos.sk/' },
    { name: 'Práca', url: 'https://praca.bazos.sk/' },
    { name: 'Auto', url: 'https://auto.bazos.sk/' },
    { name: 'Motocykle', url: 'https://motocykle.bazos.sk/' },
    { name: 'Stroje', url: 'https://stroje.bazos.sk/' },
    { name: 'Dom a záhrada', url: 'https://dom.bazos.sk/' },
    { name: 'PC', url: 'https://pc.bazos.sk/' },
    { name: 'Mobily', url: 'https://mobil.bazos.sk/' },
    { name: 'Foto', url: 'https://foto.bazos.sk/' },
    { name: 'Elektro', url: 'https://elektro.bazos.sk/' },
    { name: 'Šport', url: 'https://sport.bazos.sk/' },
    { name: 'Hudba', url: 'https://hudba.bazos.sk/' },
    { name: 'Vstupenky', url: 'https://vstupenky.bazos.sk/' },
    { name: 'Knihy', url: 'https://knihy.bazos.sk/' },
    { name: 'Nábytok', url: 'https://nabytok.bazos.sk/' },
    { name: 'Oblečenie', url: 'https://oblecenie.bazos.sk/' },
    { name: 'Služby', url: 'https://sluzby.bazos.sk/' },
    { name: 'Ostatné', url: 'https://ostatne.bazos.sk/' },
];
// ************************************************************

// ---- KONFIGURÁCIA SCRAPERU ----
const MAX_ADS_TO_SCRAPE = 5; 
const POST_ACTION_DELAY_MIN = 1000; 
const POST_ACTION_DELAY_MAX = 3000;
const delay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
// ------------------------------

test.describe('Bazos ALL Categories Scraper - Extrakcia všetkých sekcií', () => {
    
    // Zvýšime globálny timeout pre test, keďže bude trvať dlho
    test.use({ 
        timeout: 5 * 60 * 1000, // 5 minút celkový timeout pre test
    });

    test('Scraping prvých 5 inzerátov pre KAŽDÚ kategóriu', async ({ page }) => {
        
        console.log(`🚀 Spúšťam globálny scraping pre ${CATEGORIES.length} kategórií.`);
        const startTime = performance.now();
        
        let globalScrapedData = []; // Pole pre všetky výsledky
        
        // --- ITERÁCIA CEZ KATEGÓRIE ---
        for (const category of CATEGORIES) {
            
            const categoryName = category.name;
            const categoryUrl = category.url;
            console.log(`\n=================================================`);
            console.log(`▶️ SPRACÚVAM KATEGÓRIU: ${categoryName} (${categoryUrl})`);
            
            try {
                // Nastavenie novej BASE URL pre danú kategóriu
                page.context().setDefaultTimeout(60000); // 60 sekúnd na jednu kategóriu
                
                // 1. KROK: NAVIGÁCIA A OŠETRENIE COOKIES
                await test.step(`[${categoryName}] Akceptovanie cookies a navigácia`, async () => {
                    await page.goto(categoryUrl);
                    
                    // Ošetrenie cookies
                    const acceptButton = page.locator('button:has-text("Súhlasím")');
                    if (await acceptButton.isVisible({ timeout: 5000 })) {
                        await acceptButton.click();
                        await acceptButton.waitFor({ state: 'hidden', timeout: 5000 });
                    }
                    
                    // Čakanie na načítanie prvého kontajnera inzerátu
                    const firstAdContainer = page.locator('div.inzeraty.inzeratyflex').first();
                    await firstAdContainer.waitFor({ state: 'visible', timeout: 30000 });
                    
                    console.log(`    -> ✅ Stránka načítaná.`);
                    await delay(POST_ACTION_DELAY_MIN, POST_ACTION_DELAY_MAX);
                });

                // 2. KROK: EXTRACT DATA
                await test.step(`[${categoryName}] Extrakcia ${MAX_ADS_TO_SCRAPE} inzerátov`, async () => {
                    const results = (await page.locator('div.inzeraty.inzeratyflex').all()).slice(0, MAX_ADS_TO_SCRAPE);
                    
                    // *** PROFESIONÁLNA KONTROLA PRE FAIL (Ak je 0, test zlyhá) ***
                    expect(results.length).toBeGreaterThan(0, 
                        `Kritická chyba: Test pre kategóriu "${categoryName}" nenašiel žiadny inzerát (0). Očakávané aspoň 1. Skontrolujte selektory alebo štruktúru stránky.`
                    );
                    // ************************************************************
                    
                    console.log(`    -> Nájdene a spracovávam ${results.length} inzerátov.`);

                    for (let i = 0; i < results.length; i++) {
                        const resultElement = results[i];
                        
                        // --- Logika extrakcie ---
                        const titleElement = resultElement.locator('h2.nadpis > a').first();
                        const title = await titleElement.innerText();
                        const link = categoryUrl + (await titleElement.getAttribute('href'));
                        
                        // ************************************************************
                        // *** ROBUSTNÁ KONTROLA CENY (Nový Kód) ***
                        let price = 'N/A';
                        
                        // 1. Primárna kontrola: span[translate="no"]
                        const primaryPriceElement = resultElement.locator('span[translate="no"]').first();
                        
                        // 2. Sekundárna kontrola: div.inzeratycena b (pre istotu, ak je obalená)
                        const secondaryPriceElement = resultElement.locator('div.inzeratycena b').first();
                        
                        let priceElementToUse;

                        // Určíme, ktorý element je viditeľný a použijeme ho
                        if (await primaryPriceElement.isVisible({ timeout: 100 })) {
                             priceElementToUse = primaryPriceElement;
                        } else if (await secondaryPriceElement.isVisible({ timeout: 100 })) {
                             priceElementToUse = secondaryPriceElement;
                        }
                        
                        if (priceElementToUse) {
                            price = (await priceElementToUse.innerText()).trim();

                            // Čistenie textu (ak je číslo, pridaj € a odstráň medzery)
                            if (price.toLowerCase().includes('v texte') || price.toLowerCase().includes('dohodou')) {
                                price = 'V texte';
                            } else {
                                // Vyčistíme a naformátujeme cenu, napr. "3 000" -> "3 000 €"
                                price = price.replace(/\s*€/g, '').trim() + ' €'; 
                            }
                        }
                        // ************************************************************
                        
                        // Lokalita a Dátum: div.inzeratylok
                        const locationElement = resultElement.locator('div.inzeratylok').first();
                        const locationText = await locationElement.innerText();
                        const cleanedLocation = locationText.trim().replace(/\s*\n\s*/g, ' '); 
                        
                        // Počet Zobrazení
                        const viewCountElement = resultElement.locator('div.inzeratylok span.velikost10').first();
                        let viewCount = 'N/A';
                        if (await viewCountElement.isVisible({ timeout: 100 })) {
                            viewCount = (await viewCountElement.innerText()).match(/\d+/)?.[0] || 'N/A';
                        }
                        
                        // --- Uloženie do globálneho poľa ---
                        if (title && title.trim().length > 0) {
                            globalScrapedData.push({
                                Kategória: categoryName, 
                                Názov: title,
                                Cena: price,
                                Lokalita_Datum: cleanedLocation,
                                Počet_Zobrazení: viewCount,
                                Link: link,
                            });
                        }
                        // Znížený delay medzi inzerátmi
                        if (i < results.length - 1) await delay(100, 300); 
                    }
                    console.log(`    -> ✅ Extrahovaných ${results.length} inzerátov.`);
                });
                
            } catch (error) {
                console.error(`    -> 🛑 CHYBA pri spracovaní kategórie ${categoryName}: ${error.message.split('\n')[0]}`);
                // V tomto profi móde necháme test zlyhať (throw error) pre okamžitú detekciu kritického problému.
                throw error; 
            }
        }
        // --- KONIEC ITERÁCIE ---

        
        const endTime = performance.now();
        console.log(`--- Test dokončený za ${(endTime - startTime).toFixed(2)} ms ---`);
        
        // Finalizácia: Výpis extrahovaných dát
        console.log(`\n\n====================== GLOBÁLNY VÝPIS =====================`);
        console.log(`✅ Extrahované dáta (${globalScrapedData.length} záznamov celkom):`);
        console.table(globalScrapedData);
        console.log(`===========================================================`);
    });
});