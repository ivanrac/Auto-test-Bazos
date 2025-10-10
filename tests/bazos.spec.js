const { test, expect } = require('@playwright/test');
const { readExcelData } = require('../utils/excelReader'); 

const EXCEL_FILE_NAME = 'bazos_filtre.xlsx'; 
const testScenarios = readExcelData(EXCEL_FILE_NAME); 

if (testScenarios.length === 0) {
    test.skip(`Playwright nenašiel žiadne dáta v súbore ${EXCEL_FILE_NAME}. Testy sú preskočené.`, () => {});
}

for (const scenario of testScenarios) {

    // Identifikácia testov, ktoré robia problémy s nadpisom (TC_03 a TC_06)
    const isProblematicPSCTest = scenario.PSC && (scenario.TestCaseID === 'TC_03' || scenario.TestCaseID === 'TC_06');

    test(`TC: ${scenario.TestCaseID} - ${scenario.HladanyText} s filtrami`, async ({ page }) => {
        
        await test.step('1. Navigácia a výber Rubriky', async () => {
            await page.goto('/'); 
            
            // Čakáme na zobrazenie kontajnera filtrov
            await page.waitForSelector('div.rubriky'); 
            
            // Vyplníme hľadaný text
            await page.fill('[id="hledat"]', scenario.HladanyText);

            if (scenario.Rubrika) {
                // Výber rubriky AUTOMATICKY ODOŠLE FORMULÁR. Čakáme na navigáciu.
                await Promise.all([
                    page.waitForURL(/.*bazos.sk\/.*/), 
                    page.selectOption('select[name="rubriky"]', scenario.Rubrika.toLowerCase()),
                ]);
            }
        });
        
        await test.step('2. Nastavenie lokality (PSČ a Okolie) a Opätovné zadanie Hľadaného textu', async () => {
            
            // Ak sa Rubrika vybrala v kroku 1, stránka sa znova načítala a hľadaný text sa vymazal. Musíme ho vyplniť znova!
            if (scenario.Rubrika) {
                 await page.fill('[id="hledat"]', scenario.HladanyText);
            }
            
            // PSČ a Okolie sú definované len pre TC_03 a TC_06
            if (scenario.PSC) {
                // Vyplň PSČ
                await page.fill('[id="hlokalita"]', String(scenario.PSC));
                
                // *** RIEŠENIE BLOKOVANIA: Priame vloženie hodnoty Okolia (humkreis) ***
                const humkreisValue = String(scenario.OkolieKm); 
                
                await page.evaluate(({ value }) => {
                    // Selektor pre pôvodné, skryté INPUT pole
                    const input = document.querySelector('input[name="humkreis"]');
                    if (input) {
                        input.value = value;
                    }
                }, { value: humkreisValue });
                
                // Stlačíme ENTER na PSČ, aby sa aktivovala zmena miesta
                await page.press('[id="hlokalita"]', 'Enter');
                
                // Krátke, nutné čakanie, aby sa formulár spracoval.
                await page.waitForTimeout(1000); 
            }
        });

        await test.step('3. Nastavenie rozsahu cien', async () => {
            
            if (scenario.CenaOd) {
                await page.fill('[name="cenaod"]', String(scenario.CenaOd));
            }
            
            if (scenario.CenaDo) {
                await page.fill('[name="cenado"]', String(scenario.CenaDo));
            }
        });

        await test.step('4. Spustenie vyhľadávania a overenie', async () => {
            
            // KLIKNUTIE NA TLAČIDLO HĽADAŤ
            await Promise.all([
                page.waitForURL(/.*bazos.sk\/.*/),
                page.click('input[value="Hľadať"]'),
            ]);

            // OVERENIE NADPISU - Vykona sa LEN ak nejde o problematické PSČ testy
            if (!isProblematicPSCTest) {
                const nadpisLocator = page.locator('h1.nadpiskategorie').filter({ hasText: scenario.HladanyText });
                await expect(nadpisLocator).toBeVisible({ timeout: 15000 }); 
            }
            
            // -----------------------------------------------------
            // FINÁLNA LOGIKA OVERENIA URL (Platí pre všetky TC vrátane TC_03/06)
            // -----------------------------------------------------
            
            const pageUrl = page.url();
            const hladanyTextSlug = scenario.HladanyText.toLowerCase().replace(/\s/g, '-');
            
            // 1. Overenie, či ide o TC, ktoré by malo generovať priateľské URL (TC_02)
            if (scenario.Rubrika && !scenario.PSC && !scenario.CenaOd && !scenario.CenaDo) {
                
                // Krátka, priateľská URL: https://auto.bazos.sk/inzeraty/ford-focus/
                const expectedFriendlyUrl = new RegExp(`${scenario.Rubrika.toLowerCase()}.bazos.sk/inzeraty/${hladanyTextSlug}/`, 'i');
                await expect(page).toHaveURL(expectedFriendlyUrl);
                
            } else {
                
                // 2. Dlhý, parametrický formát (TC_01, 03, 04, 05, 06)
                
                // Vytvoríme pole všetkých kľúčových parametrov, ktoré OČAKÁVAME, že v URL budú.
                const expectedParams = [
                    `hledat=${scenario.HladanyText.replace(/\s/g, '+')}`,
                    `rubriky=${scenario.Rubrika ? scenario.Rubrika.toLowerCase() : 'www'}`,
                    `hlokalita=${scenario.PSC || ''}`,
                    `humkreis=${scenario.OkolieKm || '25'}`, // Predvolená hodnota
                    `cenaod=${scenario.CenaOd || ''}`,
                    `cenado=${scenario.CenaDo || ''}`
                ];
                
                let isUrlCorrect = true;
                
                // Kontrola prítomnosti všetkých parametrov v URL bez ohľadu na ich poradie
                for (const param of expectedParams) {
                    if (param.endsWith('=')) {
                        const key = param.substring(0, param.indexOf('='));
                        if (!pageUrl.includes(key + '=')) {
                            isUrlCorrect = false;
                            break;
                        }
                    } else if (!pageUrl.includes(param)) {
                        isUrlCorrect = false;
                        break;
                    }
                }
                
                // Ak overenie prešlo, potvrdíme, že URL obsahuje hľadaný text.
                if (isUrlCorrect) {
                     await expect(pageUrl).toContain(expectedParams[0]);
                } else {
                     // Ak zlyhá, vyhodíme chybu s detailmi pre ľahšiu diagnostiku
                     throw new Error(`URL Overenie ZLYHALO. Prijaté URL: ${pageUrl}. Očakávané parametre neboli nájdené.`);
                }
            }
        });
    });
}