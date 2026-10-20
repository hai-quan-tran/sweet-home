// Chụp ảnh màn hình cho detail design: sao lưu DB dev → tạo dữ liệu mẫu → chụp từng ảnh, vẽ số đánh dấu các mục →
// luôn khôi phục DB về baseline và xoá ảnh phòng mẫu (kể cả khi lỗi). Cần backend (8090) và frontend (4200) đang chạy.
// Chạy: node capture.mjs [--only=01_DangNhap,05_LichDatPhong]
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { API_URL, BASELINE_FILE, CHROME_PATH, FRONTEND_URL, OUT_DIR, PHOTOS_DIR, SHOTS_DIR } from './lib/config.mjs';
import { backup, readSchema, restore } from './lib/db.mjs';
import { loadDesigns, numberedItems } from './lib/designs.mjs';
import { seed } from './seed.mjs';

const VIEWPORT = { width: 1440, height: 900 };

/** Kiểm tra backend và frontend đang chạy trước khi đụng vào DB. */
async function checkServers() {
  for (const url of [API_URL + '/auth/me', FRONTEND_URL]) {
    try {
      await fetch(url);
    } catch {
      throw new Error(`Không kết nối được ${url} — hãy chạy backend và frontend trước (xem README).`);
    }
  }
}

/**
 * Vẽ khung + số đánh dấu lên các phần tử (lớp phủ tuyệt đối theo toạ độ trang, không đổi bố cục).
 * @param {import('playwright-core').Page} page trang đang chụp
 * @param {object[]} items các mục thuộc ảnh này
 */
async function drawMarks(page, items) {
  const marks = [];
  for (const item of items) {
    const loc = page.locator(item.sel).first();
    try {
      await loc.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      throw new Error(`Mục ${item.no} "${item.label}": không thấy phần tử "${item.sel}"`);
    }
    const box = await loc.boundingBox();
    marks.push({ no: item.no, box, badge: item.badge ?? 'left' });
  }
  await page.evaluate((marks) => {
    const layer = document.createElement('div');
    layer.id = 'doc-marks';
    layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
    for (const { no, box, badge } of marks) {
      const x = box.x + scrollX, y = box.y + scrollY;
      const frame = document.createElement('div');
      frame.style.cssText = `position:absolute;left:${x - 2}px;top:${y - 2}px;width:${box.width + 4}px;height:${box.height + 4}px;
        border:2px solid #e11d48;border-radius:4px;box-sizing:border-box`;
      const tag = document.createElement('div');
      tag.textContent = no;
      // Vị trí số: left = góc trên trái (mặc định), right = góc trên phải, bottom = góc dưới trái, inside = trong khung
      const left = badge === 'right' ? x + box.width - 10 : badge === 'inside' ? x + 2 : x - 12;
      const top = badge === 'inside' ? y + 2 : badge === 'bottom' ? y + box.height - 10 : y - 12;
      tag.style.cssText = `position:absolute;left:${Math.max(0, left)}px;top:${Math.max(0, top)}px;min-width:22px;height:22px;
        padding:0 5px;box-sizing:border-box;border-radius:11px;background:#e11d48;color:#fff;font:700 12px/22px Arial;
        text-align:center;box-shadow:0 0 0 2px #fff`;
      layer.append(frame, tag);
    }
    document.body.append(layer);
  }, marks);
}

/**
 * Vùng cắt ảnh quanh một phần tử (toạ độ trang, chừa lề cho số đánh dấu); không có selector thì chụp cả trang.
 * @param {import('playwright-core').Page} page trang đang chụp
 * @param {string} [selector] phần tử cần cắt
 */
async function clipOf(page, selector) {
  if (!selector) return undefined;
  const box = await page.locator(selector).first().boundingBox();
  const { sx, sy } = await page.evaluate(() => ({ sx: scrollX, sy: scrollY }));
  const pad = 16;
  return { x: Math.max(0, box.x + sx - pad), y: Math.max(0, box.y + sy - pad), width: box.width + 2 * pad, height: box.height + 2 * pad };
}

/**
 * Đăng nhập qua giao diện, trả về context đã có cookie đăng nhập.
 * @param {import('playwright-core').Browser} browser trình duyệt
 * @param {{username: string, password: string}} [login] tài khoản; bỏ trống = chưa đăng nhập
 * @param {{width: number, height: number}} [viewport] kích thước màn hình, mặc định 1440×900
 */
async function newContext(browser, login, viewport = VIEWPORT) {
  const context = await browser.newContext({
    viewport, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', colorScheme: 'light',
    permissions: ['clipboard-read', 'clipboard-write'], // nút Sao chép tin nhắn
  });
  if (login) {
    const page = await context.newPage();
    await page.goto(FRONTEND_URL + '/dang-nhap');
    await page.fill('#u', login.username);
    await page.fill('#p', login.password);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.startsWith('/dang-nhap'));
    await page.close();
  }
  return context;
}

/**
 * Sinh ảnh phòng giả (khối màu có chữ) để tải lên làm ảnh phòng mẫu.
 * @param {import('playwright-core').Browser} browser trình duyệt
 */
const photoMaker = (browser) => async (label, hue) => {
  const page = await browser.newPage({ viewport: { width: 640, height: 420 } });
  await page.setContent(`<body style="margin:0"><div style="width:640px;height:420px;display:grid;place-items:center;
    background:linear-gradient(135deg,hsl(${hue} 60% 75%),hsl(${hue + 40} 55% 45%));font:600 34px Arial;color:#fff">${label}</div>`);
  const png = await page.screenshot();
  await page.close();
  return png;
};

/** Chương trình chính. */
async function main() {
  const designs = await loadDesigns(process.argv);
  const shots = designs.flatMap((d) => (d.shots ?? []).map((s) => ({ design: d, shot: s })));
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'schema.json'), JSON.stringify(readSchema(), null, 1));
  if (!shots.length) return console.log('Không có ảnh nào cần chụp. Đã ghi out/schema.json.');
  if (existsSync(BASELINE_FILE)) {
    throw new Error('Còn file out/baseline.sql của lần chạy trước — chạy "npm run restore" để khôi phục DB trước.');
  }
  await checkServers();

  const photosBefore = new Set(existsSync(PHOTOS_DIR) ? readdirSync(PHOTOS_DIR) : []);
  backup(BASELINE_FILE);
  const browser = await chromium.launch({ executablePath: CHROME_PATH });
  try {
    console.log('Tạo dữ liệu mẫu (chờ tác vụ nền chuyển trạng thái đơn, ~1–2 phút)...');
    const ctx = await seed({ photo: photoMaker(browser) });
    ctx.photo = photoMaker(browser);
    const logins = { guest: undefined, manager: ctx.manager, staff: ctx.staffLogin, newStaff: ctx.newStaffLogin };
    const contexts = {};
    ctx.open = async (page, path) => {
      await page.goto(FRONTEND_URL + path);
      await page.waitForLoadState('networkidle');
    };
    for (const { design, shot } of shots) {
      const role = shot.role ?? 'manager';
      // Ảnh đổi kích thước màn hình hoặc đổi trạng thái lưu trong trình duyệt (dark mode) dùng context riêng
      const isolated = shot.isolated || shot.viewport;
      const context = isolated
        ? await newContext(browser, logins[role], shot.viewport)
        : (contexts[role] ??= await newContext(browser, logins[role]));
      const page = await context.newPage();
      try {
        await shot.go(page, ctx);
        await page.evaluate(() => document.fonts.ready);
        const items = numberedItems(design).filter((i) => i.shot === shot.id && i.sel);
        await drawMarks(page, items);
        const dir = join(SHOTS_DIR, design.file);
        mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: join(dir, shot.id + '.png'), fullPage: shot.fullPage ?? true, clip: await clipOf(page, shot.clip) });
        console.log(`  ✓ ${design.file} / ${shot.id} (${items.length} mục)`);
      } finally {
        await page.close();
        if (isolated) await context.close();
      }
    }
  } finally {
    await browser.close();
    restore(BASELINE_FILE);
    rmSync(BASELINE_FILE);
    for (const f of existsSync(PHOTOS_DIR) ? readdirSync(PHOTOS_DIR) : []) {
      if (!photosBefore.has(f)) rmSync(join(PHOTOS_DIR, f), { recursive: true });
    }
    console.log('Đã khôi phục DB dev về baseline và xoá ảnh phòng mẫu.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
