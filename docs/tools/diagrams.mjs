// Vẽ sơ đồ Mermaid khai báo trong nội dung (design.diagrams) thành PNG (độ phân giải x2) để nhúng vào Excel.
// Chạy: node diagrams.mjs [--only=00_TongThe]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { CHROME_PATH, DIAGRAMS_DIR, TOOLS_DIR } from './lib/config.mjs';
import { loadDesigns } from './lib/designs.mjs';

/** Chương trình chính. */
async function main() {
  const designs = (await loadDesigns(process.argv)).filter((d) => d.diagrams);
  const browser = await chromium.launch({ executablePath: CHROME_PATH });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 2400, height: 1200 } });
    await page.setContent('<body style="margin:0;background:#fff"><div id="out" style="display:inline-block;padding:16px"></div></body>');
    await page.addScriptTag({ path: join(TOOLS_DIR, 'node_modules/mermaid/dist/mermaid.min.js') });
    await page.evaluate(() =>
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: { fontFamily: 'Arial', fontSize: '15px', primaryColor: '#dbeafe', primaryBorderColor: '#2563eb', lineColor: '#475569' },
        flowchart: { htmlLabels: true, curve: 'basis', useMaxWidth: false },
        er: { useMaxWidth: false },
        state: { useMaxWidth: false },
        sequence: { useMaxWidth: false },
      }),
    );
    for (const design of designs) {
      const dir = join(DIAGRAMS_DIR, design.file);
      mkdirSync(dir, { recursive: true });
      for (const [id, src] of Object.entries(design.diagrams)) {
        try {
          await page.evaluate(async ({ id, src }) => {
            const { svg } = await window.mermaid.render('m-' + id, src);
            document.getElementById('out').innerHTML = svg;
          }, { id, src });
        } catch (e) {
          throw new Error(`Sơ đồ ${design.file}/${id} lỗi: ${e.message}`);
        }
        await page.locator('#out').screenshot({ path: join(dir, id + '@2x.png') });
        console.log(`  ✓ ${design.file} / ${id}`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
