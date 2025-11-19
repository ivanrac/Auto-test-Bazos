# Auto Test Bazos: Globálny Scraper a Testovanie Filtrov (Playwright / Node.js)

## 🌟 Prehľad Projektu

Tento projekt slúži ako komplexný automatizovaný nástroj (scraper) na vyhľadávanie a extrakciu dát inzerátov z portálu **Bazos.sk**. Projekt obsahuje dve hlavné verzie scraperov/testov:

1.  **Parametrizovaný Scraper (Legacy):** Zameraný na testovanie filtrov a extrakciu dát do Excelu (`tests/scraper.spec.js`).
2.  **Globálny Scraper:** Zameraný na hromadnú extrakciu dát zo všetkých kategórií pre pravidelné spúšťanie cez GitHub Actions (`tests/all_categories_scraper.spec.js`).

## ⚙️ Kľúčové Funkcie

* **Globálna Extrakcia:** Prechádza dynamicky cez 20 hlavných kategórií Bazos.sk a extrahuje dáta do logov Actions.
* **Testovanie Filtrov (Legacy):** Načítava vstupné filtre (Hľadaný text, Rubrika, Cena Od/Do, PSČ, Okolie) priamo z Excel súboru (`bazos_filtre.xlsx`).
* **Robustná Extrakcia dát:** Získava kľúčové informácie o inzerátoch (Názov, Cena, Lokalita, Počet zobrazení, Link).
* **Ošetrenie ceny:** Spracováva číselné ceny aj textové hodnoty ako "V texte" alebo "Dohodou".
* **Automatizácia cez GitHub Actions:** Kód je pripravený pre pravidelné automatické spúšťanie.

## 💻 Technológie

* **Playwright:** Hlavný nástroj pre automatizáciu prehliadača (Chromium, Firefox, WebKit).
* **Node.js:** Runtime prostredie.
* **XLSX:** Použité pre čítanie vstupných dát a zapisovanie výstupných dát do Excel súborov (v prípade `scraper.spec.js`).
* **JavaScript:** Jazyk, v ktorom je celý scraper napísaný.

## 🛠️ Inštalácia a Nastavenie (Lokálne Spustenie)

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

## 🚀 Spustenie Scrapera a Testov

### 1. Spustenie Legacy Scrapera (Excel Export a Testy)

Tento príkaz spustí scraper, ktorý číta vstupné dáta z Excelu a exportuje výsledky do nového súboru `.xlsx` v priečinku `/data/`.

```bash
npx playwright test tests/scraper.spec.js --project=chromium --headed