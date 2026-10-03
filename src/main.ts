import './styles/base.css'
import { initScroll, ScrollTrigger } from './lib/scroll'
import { initReveals } from './lib/reveal'
import { initNav } from './lib/nav'
import { initHero } from './chapters/hero'
import { initNextWord } from './chapters/nextword'
import { initTokens } from './chapters/tokens'
import { initEmbeddings } from './chapters/embeddings'
import { initTransformer } from './chapters/transformer'
import { initAttention } from './chapters/attention'
import { initMLP } from './chapters/mlp'
import { initSoftmax } from './chapters/softmax'
import { initGeneration } from './chapters/generation'
import { initTraining } from './chapters/training'
import { initAssistant } from './chapters/assistant'
import { initAlignment } from './chapters/alignment'
import { initScale } from './chapters/scale'
import { initSkills } from './chapters/skills'
import { initAgents } from './chapters/agents'
import { initLimits } from './chapters/limits'
import { initGlossary } from './chapters/glossary'

document.documentElement.classList.add('js')

initScroll()

const chapters: [string, () => void][] = [
  ['hero', initHero],
  ['next-word', initNextWord],
  ['tokens', initTokens],
  ['embeddings', initEmbeddings],
  ['transformer', initTransformer],
  ['attention', initAttention],
  ['mlp', initMLP],
  ['softmax', initSoftmax],
  ['generation', initGeneration],
  ['training', initTraining],
  ['assistant', initAssistant],
  ['alignment', initAlignment],
  ['scale', initScale],
  ['skills', initSkills],
  ['agents', initAgents],
  ['limits', initLimits],
  ['glossary', initGlossary],
]

for (const [name, init] of chapters) {
  try {
    init()
  } catch (err) {
    console.error(`[${name}]`, err)
  }
}

initReveals()
initNav()

window.addEventListener('load', () => ScrollTrigger.refresh())
document.fonts?.ready.then(() => ScrollTrigger.refresh())
