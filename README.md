# Jak myśli maszyna

Interaktywna opowieść o tym, jak działają duże modele językowe — od tokenów, przez uwagę i trening, po alignment.
Statyczna strona (Vite + TypeScript, GSAP/ScrollTrigger, Lenis, Three.js, gpt-tokenizer).

## Uruchomienie

```bash
npm install
npm run dev       # serwer deweloperski
npm run build     # statyczny build do dist/
npm run preview   # podgląd zbudowanej wersji
```

## Publikacja na GitHub Pages

Build używa względnych ścieżek (`base: './'`), więc `dist/` działa pod dowolnym adresem — także
`https://<user>.github.io/<repo>/`.

1. Wypchnij repozytorium na GitHub (gałąź `main`).
2. W ustawieniach repozytorium: **Settings → Pages → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` zbuduje i opublikuje stronę przy każdym pushu na `main`.

## Struktura

```
index.html              szkielet; treść rozdziałów wklejana z src/partials przy buildzie
src/partials/NN-*.html  treść 16 sekcji (wstęp + 15 rozdziałów, słowniczek w ostatniej)
src/chapters/*.ts|css   interaktywne elementy każdego rozdziału
src/lib/                płynny scroll, animacje wejścia, nawigacja, narzędzia
```

| #  | Rozdział            | Najważniejsza interakcja                                        |
|----|---------------------|-----------------------------------------------------------------|
| 00 | Wstęp               | galaktyka cząsteczek (WebGL), model „pisze na żywo”            |
| 01 | Wielka idea         | gra „zgadnij następne słowo”                                    |
| 02 | Tokenizacja         | prawdziwy tokenizer GPT-4o / GPT-2, animacja BPE, PL vs EN      |
| 03 | Embeddingi          | przestrzeń znaczeń 3D z arytmetyką słów, RoPE jako „zegary”     |
| 04 | Transformer         | przypięty schemat, przez który przejeżdża zdanie                |
| 05 | Uwaga               | łuki uwagi dla „zamka”, Q·K·V na liczbach, maska przyczynowa    |
| 06 | MLP                 | neurony zapalające fakty, superpozycja                          |
| 07 | Softmax i losowanie | temperatura, top-p, losowanie ×100                              |
| 08 | Pętla generowania   | token po tokenie z pamięcią KV                                  |
| 09 | Trening             | krok gradientu na logitach, krajobraz straty 3D                 |
| 10 | Asystent            | model bazowy vs asystent, ukryty szablon czatu                  |
| 11 | Alignment           | głosowanie A/B → model nagrody, smycz KL i hakowanie nagrody, konstytucja, wyzwania, sterowanie cechą, spektrum „matematyka ↔ psychologia” |
| 12 | Skala               | ściana parametrów, prawa skalowania, emergencja vs miara        |
| 13 | Skąd te umiejętności?| głowica indukcyjna, „przepis na umiejętność”, jak powstała ta strona, debata o kreatywności |
| 14 | Agenci            | pętla agenta krok po kroku, okno kontekstu i kompaktowanie, subagenci, skille, MCP, kumulacja błędów |
| 15 | Granice i przyszłość| halucynacje, kontekst, rozumowanie, agenci, finał, słowniczek PL–EN |

Liczby w demonstracjach są ilustracyjne, chyba że zaznaczono inaczej. Tokenizer, softmax, spadek gradientu
i optimum z karą KL są liczone naprawdę w przeglądarce. Strona respektuje `prefers-reduced-motion`.
