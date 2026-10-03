import { $, h } from '../lib/utils'
import { scrollToEl } from '../lib/scroll'

// [polski termin, angielski termin, krótka definicja, id rozdziału]
const TERMS: [string, string, string, string][] = [
  ['przewidywanie następnego tokenu', 'next-token prediction', 'jedyne zadanie modelu: rozkład prawdopodobieństwa kolejnego tokenu', 'idea'],
  ['parametry, wagi', 'parameters, weights', 'liczby w macierzach modelu, ustalane w treningu', 'idea'],
  ['wnioskowanie', 'inference', 'używanie gotowego modelu; parametry się nie zmieniają', 'idea'],
  ['token', 'token', 'kawałek tekstu: słowo, część słowa, znak lub bajt', 'tokeny'],
  ['tokenizacja', 'tokenization', 'cięcie tekstu na tokeny', 'tokeny'],
  ['słownik', 'vocabulary', 'zbiór wszystkich tokenów, które zna model', 'tokeny'],
  ['kodowanie par bajtów', 'byte pair encoding, BPE', 'budowanie słownika przez sklejanie najczęstszych par', 'tokeny'],
  ['tokeny specjalne', 'special tokens', 'znaczniki typu „koniec tekstu” czy „mówi użytkownik”', 'tokeny'],
  ['embedding, wektor', 'embedding, vector', 'lista liczb reprezentująca znaczenie tokenu', 'embeddingi'],
  ['kodowanie pozycji', 'positional encoding, RoPE', 'informacja o miejscu tokenu w tekście', 'embeddingi'],
  ['transformer', 'transformer', 'architektura z 2017 r., na której stoją współczesne LLM', 'transformer'],
  ['strumień rezydualny', 'residual stream', 'wektor tokenu, do którego warstwy dopisują poprawki', 'transformer'],
  ['warstwa, blok', 'layer, transformer block', 'para: uwaga + MLP', 'transformer'],
  ['normalizacja', 'LayerNorm, RMSNorm', 'przeskalowanie wektora, które stabilizuje trening', 'transformer'],
  ['uwaga', 'attention', 'mechanizm wymiany informacji między tokenami', 'uwaga'],
  ['samouwaga', 'self-attention', 'uwaga tokenów na tokeny z tego samego tekstu', 'uwaga'],
  ['zapytanie, klucz, wartość', 'query, key, value', 'trzy wektory, z których liczona jest uwaga', 'uwaga'],
  ['głowica uwagi', 'attention head', 'jeden niezależny „wzorzec patrzenia”; jest ich wiele', 'uwaga'],
  ['maska przyczynowa', 'causal mask', 'zakaz patrzenia na przyszłe tokeny', 'uwaga'],
  ['MLP, sieć jednokierunkowa', 'MLP, feed-forward network', 'część bloku przetwarzająca każdy token osobno', 'mlp'],
  ['funkcja aktywacji', 'activation function', 'nieliniowość, dzięki której neuron może się „zapalić”', 'mlp'],
  ['superpozycja', 'superposition', 'więcej pojęć niż neuronów, upchniętych w kierunkach', 'mlp'],
  ['mieszanka ekspertów', 'mixture of experts, MoE', 'wiele MLP, z których router wybiera kilka', 'mlp'],
  ['logit', 'logit', 'surowy wynik dla tokenu przed softmaxem', 'losowanie'],
  ['softmax', 'softmax', 'zamiana logitów na prawdopodobieństwa', 'losowanie'],
  ['temperatura', 'temperature', 'wyostrzanie lub spłaszczanie rozkładu', 'losowanie'],
  ['top-p', 'nucleus sampling', 'losowanie tylko spośród najlepszych tokenów', 'losowanie'],
  ['dekodowanie zachłanne', 'greedy decoding', 'zawsze wybór najbardziej prawdopodobnego tokenu', 'losowanie'],
  ['generowanie autoregresyjne', 'autoregressive generation', 'token po tokenie, każdy zależny od poprzednich', 'petla'],
  ['pamięć podręczna KV', 'KV cache', 'zapamiętane klucze i wartości starych tokenów', 'petla'],
  ['wczytanie / pisanie', 'prefill / decode', 'równoległe czytanie promptu vs generowanie po jednym tokenie', 'petla'],
  ['pretrening', 'pretraining', 'nauka przewidywania tekstu na ogromnych danych', 'trening'],
  ['strata, entropia krzyżowa', 'loss, cross-entropy', 'miara pomyłki: −ln p(prawdziwy token)', 'trening'],
  ['spadek gradientu', 'gradient descent', 'krok w stronę mniejszego błędu', 'trening'],
  ['propagacja wsteczna', 'backpropagation', 'liczenie gradientu dla wszystkich parametrów', 'trening'],
  ['wielkość kroku', 'learning rate', 'jak daleko przesuwamy parametry w jednym kroku', 'trening'],
  ['przeuczenie', 'overfitting', 'zapamiętywanie zamiast uogólniania', 'trening'],
  ['model bazowy', 'base model', 'model po samym pretreningu', 'asystent'],
  ['dostrajanie nadzorowane', 'supervised fine-tuning, SFT', 'nauka na wzorcowych dialogach', 'asystent'],
  ['szablon czatu', 'chat template', 'zapis rozmowy jako jednego tekstu z tokenami specjalnymi', 'asystent'],
  ['prompt systemowy', 'system prompt', 'ukryta instrukcja na początku rozmowy', 'asystent'],
  ['destylacja', 'distillation', 'uczenie mniejszego modelu na odpowiedziach większego', 'asystent'],
  ['dopasowanie', 'alignment', 'sprawianie, by model robił to, czego naprawdę chcemy', 'alignment'],
  ['model nagrody', 'reward model', 'model przewidujący ludzkie oceny odpowiedzi', 'alignment'],
  ['RLHF', 'reinforcement learning from human feedback', 'uczenie ze wzmocnieniem na podstawie ludzkich ocen', 'alignment'],
  ['dywergencja KL', 'KL divergence', 'miara oddalenia od modelu wyjściowego; „smycz”', 'alignment'],
  ['hakowanie nagrody', 'reward hacking', 'wykorzystywanie luk w ocenie zamiast wykonania zadania', 'alignment'],
  ['pochlebstwo', 'sycophancy', 'mówienie tego, co użytkownik chce usłyszeć', 'alignment'],
  ['konstytucja', 'Constitutional AI, RLAIF', 'trening według spisanych zasad, z ocenami modelu', 'alignment'],
  ['interpretowalność', 'interpretability', 'badanie, co dzieje się wewnątrz modelu', 'alignment'],
  ['rzadki autoenkoder', 'sparse autoencoder, SAE', 'narzędzie rozkładające aktywacje na zrozumiałe cechy', 'alignment'],
  ['ewaluacje, red teaming', 'evals, red teaming', 'testy umiejętności i celowe próby złamania modelu', 'alignment'],
  ['prawa skalowania', 'scaling laws', 'przewidywalny spadek błędu wraz ze skalą', 'skala'],
  ['moc obliczeniowa', 'compute, FLOP', 'liczba operacji zużytych na trening', 'skala'],
  ['zdolności emergentne', 'emergent abilities', 'umiejętności pojawiające się (pozornie) skokowo', 'skala'],
  ['głowica indukcyjna', 'induction head', 'obwód kontynuujący wzorzec [A][B] … [A] → [B]', 'umiejetnosci'],
  ['uczenie w kontekście', 'in-context learning', 'łapanie wzorca z przykładów w poleceniu, bez treningu', 'umiejetnosci'],
  ['obwód', 'circuit', 'zestaw głowic i neuronów wykonujący konkretną operację', 'umiejetnosci'],
  ['zawężenie różnorodności', 'mode collapse', 'utrata różnorodności odpowiedzi po dostrajaniu', 'umiejetnosci'],
  ['halucynacja', 'hallucination', 'wiarygodnie brzmiąca nieprawda', 'granice'],
  ['okno kontekstu', 'context window', 'maksymalna liczba tokenów widoczna dla modelu', 'granice'],
  ['łańcuch myśli', 'chain of thought', 'pisanie kroków pośrednich przed odpowiedzią', 'granice'],
  ['wyszukiwanie wspomagające', 'retrieval-augmented generation, RAG', 'dołączanie znalezionych dokumentów do kontekstu', 'granice'],
  ['agent', 'agent', 'model w pętli z narzędziami, dążący do celu przez wiele kroków', 'agenci'],
  ['uprząż', 'harness, scaffolding', 'program wokół modelu: narzędzia, uprawnienia, zarządzanie kontekstem', 'agenci'],
  ['wywołanie narzędzia', 'tool call, function calling', 'sformatowany tekst, który uprząż zamienia na akcję', 'agenci'],
  ['pętla agenta', 'agent loop, ReAct', 'myśl → działaj → obserwuj, powtarzane do skutku', 'agenci'],
  ['kompaktowanie', 'compaction', 'streszczenie kontekstu, gdy okno się zapełnia', 'agenci'],
  ['inżynieria kontekstu', 'context engineering', 'decydowanie, co trafia do kontekstu modelu', 'agenci'],
  ['subagent, orkiestrator', 'subagent, orchestrator', 'osobna instancja modelu z własnym kontekstem do wydzielonego zadania', 'agenci'],
  ['skill', 'skill, progressive disclosure', 'pakiet instrukcji wczytywany dopiero wtedy, gdy jest potrzebny', 'agenci'],
  ['MCP', 'Model Context Protocol', 'otwarty standard podłączania narzędzi i danych do modeli', 'agenci'],
  ['człowiek w pętli', 'human-in-the-loop', 'zgoda człowieka przed działaniami nieodwracalnymi', 'agenci'],
]

export function initGlossary() {
  const list = $('.gloss-list')
  const search = $<HTMLInputElement>('.gloss-search')
  const titles = new Map(
    Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]')).map((s) => [s.id, `${s.dataset.chapter} · ${s.dataset.title}`]),
  )
  const rows = TERMS.map(([pl, en, def, ch]) => {
    const row = h(
      'a',
      { class: 'gl', href: '#' + ch },
      h('span', { class: 'gl-pl' }, pl),
      h('span', { class: 'gl-en mono' }, en),
      h('span', { class: 'gl-def' }, def),
      h('span', { class: 'gl-ch mono' }, titles.get(ch) ?? ''),
    )
    row.addEventListener('click', (e) => {
      e.preventDefault()
      scrollToEl('#' + ch)
    })
    list.append(row)
    return { row, text: `${pl} ${en} ${def}`.toLowerCase() }
  })
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase()
    for (const r of rows) r.row.hidden = !!q && !r.text.includes(q)
  })
}
