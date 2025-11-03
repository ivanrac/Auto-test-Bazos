# Auto Test Bazos: Data Scraper a Testovanie Filtrov (Playwright / Node.js)

## 🌟 Prehľad Projektu

Tento projekt slúži ako automatizovaný nástroj (scraper) na vyhľadávanie a extrakciu dát inzerátov z portálu **Bazos.sk**. Bol vytvorený pomocou Playwright pre vysokú stabilitu a simuláciu realistického správania používateľa.

Kľúčovou vlastnosťou je parametrizácia: vstupné dáta pre vyhľadávanie (hľadaný text, rubrika, PSČ, cenový rozsah) sa dynamicky načítavajú z externého súboru Excel, čo umožňuje jednoduché vykonávanie viacerých testovacích scenárov (Test Cases - TC) bez zmeny kódu.

## ⚙️ Kľúčové Funkcie

* **Parametrizované vyhľadávanie:** Načítava vstupné filtre (Hľadaný text, Rubrika, Cena Od/Do, PSČ, Okolie) priamo z Excel súboru (`bazos_filtre.xlsx`).
* **Kompletná navigácia:** Automatizuje celý proces vyhľadávania od otvorenia stránky, akceptovania cookies, vyplnenia všetkých filtrov až po spustenie hľadania.
* **Extrakcia dát:** Získava kľúčové informácie o inzerátoch (Názov, Cena, Lokalita, Link) z výsledkov vyhľadávania.
* **Výstup do Excelu:** Všetky zozbierané dáta z každého úspešne prebehnutého scenára sú exportované do prehľadného Excel súboru (`.xlsx`) s automatickým timestampom.
* **Robustnosť:** Zahŕňa mechanizmy pre čakanie na dynamické prvky, zvýšené timeouty a obchádzanie potenciálnych chýb pri extrakcii.

## 💻 Technológie

* **Playwright:** Hlavný nástroj pre automatizáciu prehliadača (Chromium).
* **Node.js:** Runtime prostredie.
* **XLSX:** Použité pre čítanie vstupných dát a zapisovanie výstupných dát do Excel súborov.
* **JavaScript:** Jazyk, v ktorom je celý scraper napísaný.

## 🛠️ Inštalácia a Nastavenie

1.  **Klonovanie Repozitára:**
    ```bash
    git clone [ADRESA_REPOZITÁRA]
    cd Auto-test-Bazos
    ```

2.  **Inštalácia Závislostí:**
    Uistite sa, že máte nainštalovaný Node.js. Následne spustite:
    ```bash
    npm install
    npx playwright install
    ```

3.  **Príprava Vstupných Dát:**
    Umiestnite váš súbor **`bazos_filtre.xlsx`** s testovacími scenármi do koreňového adresára projektu. Očakávané stĺpce v Exceli sú (minimálne):
    * `TestCaseID`
    * `HladanyText`
    * `Rubrika`
    * `CenaOd`
    * `CenaDo`
    * `PSC`
    * `OkolieKm`

## 🚀 Spustenie Scrapera

Spustite test, ktorý automaticky prejde všetkými scenármi definovanými v Exceli a uloží výsledky.

```bash
npx playwright test tests/scraper.spec.js --project=chromium --headed

## 📄 Výstupné Dáta

Výsledky (extrahované inzeráty) sú uložené do adresára `data/` v tvare:
/data/Bazos_Scraped_Data_[DATETIME].xlsx


Každý riadok výsledného Excel súboru bude obsahovať:
* `TestCaseID`
* `HladanyText`
* `Názov` (inzerátu)
* `Cena`
* `Lokalita`
* `Link`