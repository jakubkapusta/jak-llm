import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const partialsDir = fileURLToPath(new URL('./src/partials/', import.meta.url))

// Wkleja pliki z src/partials w miejsce <!-- @include nazwa.html -->,
// dzięki czemu cała treść trafia do statycznego index.html.
function htmlPartials(): Plugin {
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(/<!--\s*@include\s+([\w./-]+)\s*-->/g, (_, file: string) =>
          fs.readFileSync(partialsDir + file, 'utf-8'),
        ),
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('/src/partials/')) server.ws.send({ type: 'full-reload' })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [htmlPartials()],
  build: { chunkSizeWarningLimit: 4000 },
})
