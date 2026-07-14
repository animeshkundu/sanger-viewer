import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const outputPath = fileURLToPath(new URL('../public/og-image.png', import.meta.url))
const outputDirectory = fileURLToPath(new URL('../public/', import.meta.url))

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { width: 1200px; height: 630px; margin: 0; }
      body {
        overflow: hidden;
        background:
          radial-gradient(circle at 84% 12%, rgba(37, 99, 235, 0.34), transparent 36%),
          linear-gradient(145deg, #020617 0%, #0f172a 58%, #172554 100%);
        color: #f8fafc;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .card {
        position: relative;
        width: 100%;
        height: 100%;
        padding: 76px 84px 64px;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 22px;
        color: #93c5fd;
        font-size: 25px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .eyebrow::before {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        background: #3b82f6;
        box-shadow: 0 0 24px #3b82f6;
        content: "";
      }
      h1 {
        margin: 0;
        font-size: 82px;
        font-weight: 800;
        letter-spacing: -0.045em;
        line-height: 1;
      }
      .tagline {
        margin: 24px 0 0;
        color: #cbd5e1;
        font-size: 34px;
        font-weight: 500;
        letter-spacing: -0.018em;
      }
      .privacy {
        margin: 18px 0 0;
        color: #94a3b8;
        font-size: 23px;
      }
      .trace {
        position: absolute;
        right: 70px;
        bottom: 42px;
        left: 70px;
        width: 1060px;
        height: 190px;
        filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.28));
      }
      .baseline { stroke: #334155; stroke-width: 2; }
      .grid { stroke: #1e293b; stroke-width: 1; }
      .peak { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-width: 6; }
      .base-label {
        fill: #94a3b8;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 19px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="eyebrow">Bioinformatics, in your browser</div>
      <h1>Sanger Viewer</h1>
      <p class="tagline">In-browser .ab1/.scf trace viewer</p>
      <p class="privacy">Base calls and quality scores stay private — no uploads.</p>
      <svg class="trace" viewBox="0 0 1060 190" aria-hidden="true">
        <path class="grid" d="M0 45H1060M0 90H1060M0 135H1060" />
        <path class="baseline" d="M0 160H1060" />
        <path class="peak" stroke="#22c55e" d="M0 158 C58 158 66 151 88 59 C99 12 113 12 124 59 C146 151 154 158 215 158 S283 153 301 82 C313 31 327 31 339 82 C357 153 365 158 430 158 S496 151 518 55 C529 9 543 9 554 55 C576 151 584 158 645 158 S714 154 732 91 C746 42 758 42 772 91 C790 154 798 158 860 158 S929 151 951 58 C962 13 976 13 987 58 C1009 151 1017 158 1060 158" />
        <path class="peak" stroke="#3b82f6" d="M0 158 C83 158 91 155 108 103 C123 55 136 55 151 103 C168 155 176 158 250 158 S325 150 345 48 C354 3 370 3 379 48 C399 150 407 158 486 158 S557 154 575 88 C588 40 601 40 614 88 C632 154 640 158 716 158 S791 150 811 50 C820 7 836 7 845 50 C865 150 873 158 948 158 S1011 154 1029 93 C1039 58 1049 58 1060 94" />
        <path class="peak" stroke="#ef4444" d="M0 158 C26 158 34 153 54 75 C66 28 79 28 91 75 C111 153 119 158 183 158 S249 154 267 92 C280 47 293 47 306 92 C324 154 332 158 397 158 S468 149 488 44 C497 1 513 1 522 44 C542 149 550 158 625 158 S699 153 718 77 C730 31 744 31 756 77 C775 153 783 158 853 158 S926 153 945 72 C956 25 971 25 982 72 C1001 153 1009 158 1060 158" />
        <path class="peak" stroke="#f8fafc" d="M0 158 C127 158 137 156 156 117 C173 80 187 80 204 117 C223 156 233 158 365 158 S492 155 510 112 C525 76 540 76 555 112 C573 155 583 158 707 158 S827 155 846 109 C860 75 876 75 890 109 C909 155 919 158 1060 158" opacity="0.9" />
        <text class="base-label" x="65" y="184">A</text>
        <text class="base-label" x="286" y="184">C</text>
        <text class="base-label" x="506" y="184">G</text>
        <text class="base-label" x="726" y="184">T</text>
        <text class="base-label" x="946" y="184">A</text>
      </svg>
    </main>
  </body>
</html>`

await mkdir(outputDirectory, { recursive: true })

const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })
  await page.setContent(html, { waitUntil: 'load' })
  await page.screenshot({
    path: outputPath,
    type: 'png',
    fullPage: false,
    animations: 'disabled',
  })
  console.log(`Open Graph image written to ${outputPath}`)
} finally {
  await browser.close()
}
