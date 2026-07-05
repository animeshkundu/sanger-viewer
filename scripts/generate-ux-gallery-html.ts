/**
 * scripts/generate-ux-gallery-html.ts
 *
 * Generates a single self-contained HTML "UX gallery" page from the screenshots
 * captured by tests/e2e/ux-gallery.e2e.test.ts.
 *
 * Usage:
 *   npx tsx scripts/generate-ux-gallery-html.ts
 *
 * Input:  ux-gallery-screenshots/  (screenshots + manifest-*.json files)
 * Output: ux-gallery-screenshots/index.html  (self-contained, no external deps)
 *
 * The HTML:
 *   - embeds every screenshot as a base64 data URL so the file is portable
 *   - groups thumbnails by state → theme → viewport
 *   - includes a metadata header (commit SHA, date, viewport/theme/state counts)
 *   - works as a standalone file for CI artifact download + local review
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestEntry {
  state: string
  theme: string
  viewport: string
  filePath: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fileToDataUrl(filePath: string): Promise<string> {
  const buf = await fs.readFile(filePath)
  return `data:image/png;base64,${buf.toString('base64')}`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const screenshotDir = path.resolve(process.cwd(), 'ux-gallery-screenshots')

  if (!existsSync(screenshotDir)) {
    console.error(`Screenshot directory not found: ${screenshotDir}`)
    console.error('Run the UX gallery Playwright spec first.')
    process.exit(1)
  }

  // Collect all manifest JSON files
  const allFiles = await fs.readdir(screenshotDir)
  const manifestFiles = allFiles.filter((f) => f.startsWith('manifest-') && f.endsWith('.json'))

  if (manifestFiles.length === 0) {
    console.error('No manifest files found. Run the UX gallery spec first.')
    process.exit(1)
  }

  // Merge all manifest entries
  const entries: ManifestEntry[] = []
  for (const mf of manifestFiles) {
    const raw = await fs.readFile(path.join(screenshotDir, mf), 'utf-8')
    const parsed: ManifestEntry[] = JSON.parse(raw)
    entries.push(...parsed)
  }

  // Deduplicate by filePath (same screenshot can appear in multiple manifests)
  const seen = new Set<string>()
  const unique = entries.filter((e) => {
    if (seen.has(e.filePath)) return false
    seen.add(e.filePath)
    return true
  })

  // Group: state → theme → viewport[]
  const grouped = new Map<string, Map<string, ManifestEntry[]>>()
  for (const entry of unique) {
    if (!grouped.has(entry.state)) grouped.set(entry.state, new Map())
    const byTheme = grouped.get(entry.state)!
    if (!byTheme.has(entry.theme)) byTheme.set(entry.theme, [])
    byTheme.get(entry.theme)!.push(entry)
  }

  // Metadata
  const commitSha = process.env.GITHUB_SHA ?? 'local'
  const runId = process.env.GITHUB_RUN_ID ?? 'local'
  const now = new Date().toISOString()
  const stateCount = grouped.size
  const themeCount = new Set(unique.map((e) => e.theme)).size
  const viewportCount = new Set(unique.map((e) => e.viewport)).size
  const totalImages = unique.length

  // Build HTML sections
  const sections: string[] = []

  for (const [state, byTheme] of grouped) {
    const themeBlocks: string[] = []

    for (const [theme, viewportEntries] of byTheme) {
      const thumbnails: string[] = []

      for (const entry of viewportEntries) {
        const exists = existsSync(entry.filePath)
        if (!exists) {
          thumbnails.push(`
            <figure class="thumb">
              <div class="thumb__missing">Missing</div>
              <figcaption>${escapeHtml(entry.viewport)}</figcaption>
            </figure>`)
          continue
        }

        const dataUrl = await fileToDataUrl(entry.filePath)
        thumbnails.push(`
            <figure class="thumb">
              <a href="${dataUrl}" target="_blank" rel="noopener">
                <img src="${dataUrl}" alt="${escapeHtml(state)} / ${escapeHtml(theme)} / ${escapeHtml(entry.viewport)}" loading="lazy" />
              </a>
              <figcaption>${escapeHtml(entry.viewport)}</figcaption>
            </figure>`)
      }

      themeBlocks.push(`
        <div class="theme-block">
          <h3 class="theme-label theme-label--${escapeHtml(theme)}">${escapeHtml(theme)}</h3>
          <div class="thumbs">${thumbnails.join('')}</div>
        </div>`)
    }

    sections.push(`
      <section class="state-section">
        <h2 class="state-heading">${escapeHtml(state)}</h2>
        ${themeBlocks.join('')}
      </section>`)
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UX Gallery — sanger-viewer</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f8f9fa; color: #1a1a2e; line-height: 1.5; }
    .page-header { background: #1a1a2e; color: #fff; padding: 1.5rem 2rem; }
    .page-header h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
    .meta { font-size: 0.8rem; opacity: 0.75; margin-top: 0.5rem; }
    .meta span { margin-right: 1.5rem; }
    .toc { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 1rem 2rem; }
    .toc h2 { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; }
    .toc ol { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; padding: 0; }
    .toc a { font-size: 0.8rem; color: #2563eb; text-decoration: none; background: #eff6ff; border-radius: 4px; padding: 0.2rem 0.5rem; }
    .toc a:hover { background: #dbeafe; }
    .main { padding: 2rem; max-width: 1400px; margin: 0 auto; }
    .state-section { margin-bottom: 3rem; }
    .state-heading { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; margin-bottom: 1rem; }
    .theme-block { margin-bottom: 1.5rem; }
    .theme-label { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.75rem; display: inline-block; padding: 0.2rem 0.6rem; border-radius: 4px; }
    .theme-label--light { background: #fef9c3; color: #713f12; }
    .theme-label--dark { background: #1e293b; color: #94a3b8; }
    .thumbs { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start; }
    .thumb { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; width: 240px; flex-shrink: 0; }
    .thumb img { width: 100%; height: auto; display: block; }
    .thumb__missing { width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; background: #fee2e2; color: #991b1b; font-size: 0.8rem; }
    .thumb figcaption { font-size: 0.7rem; color: #64748b; padding: 0.4rem 0.6rem; border-top: 1px solid #f1f5f9; }
    @media (max-width: 600px) { .main { padding: 1rem; } .thumb { width: 100%; } }
  </style>
</head>
<body>
  <header class="page-header">
    <h1>UX Gallery — sanger-viewer</h1>
    <div class="meta">
      <span>Commit: ${escapeHtml(commitSha)}</span>
      <span>Run: ${escapeHtml(runId)}</span>
      <span>Generated: ${escapeHtml(now)}</span>
      <span>States: ${stateCount}</span>
      <span>Themes: ${themeCount}</span>
      <span>Viewports: ${viewportCount}</span>
      <span>Total captures: ${totalImages}</span>
    </div>
  </header>

  <nav class="toc" aria-label="UX states">
    <h2>States</h2>
    <ol>${Array.from(grouped.keys()).map((s) => `<li><a href="#state-${escapeHtml(s)}">${escapeHtml(s)}</a></li>`).join('')}</ol>
  </nav>

  <main class="main">
    ${sections.map((s, i) => s.replace('class="state-section"', `class="state-section" id="state-${escapeHtml(Array.from(grouped.keys())[i])}"`)).join('')}
  </main>
</body>
</html>`

  const outPath = path.join(screenshotDir, 'index.html')
  await fs.writeFile(outPath, html, 'utf-8')
  console.log(`✓ UX gallery written to: ${outPath}`)
  console.log(`  ${totalImages} captures across ${stateCount} states × ${themeCount} themes × ${viewportCount} viewports`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
