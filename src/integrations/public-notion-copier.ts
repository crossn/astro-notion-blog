import fs from 'node:fs'
import path from 'node:path'
import type { AstroIntegration } from 'astro'

export default (): AstroIntegration => ({
  name: 'public-notion-copier',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const srcDir = 'public/notion'
      const outDir = new URL('notion', dir.href).pathname

      if (!fs.existsSync(srcDir)) {
        return
      }

      fs.mkdirSync(outDir, { recursive: true })

      const entries = fs.readdirSync(srcDir).filter((name) => name !== '.gitkeep')
      if (entries.length === 0) {
        return
      }

      entries.forEach((entry) => {
        fs.cpSync(path.join(srcDir, entry), path.join(outDir, entry), {
          recursive: true,
        })
      })
    },
  },
})
