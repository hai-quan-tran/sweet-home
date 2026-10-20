// Sinh file Excel detail design (mỗi màn/dialog 1 file, 4 sheet) từ nội dung content/design/*.mjs + ảnh đã chụp.
// Chạy: node build-design.mjs [--only=00_TongThe]
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { DESIGN_OUT_DIR, DIAGRAMS_DIR, OUT_DIR, SHOTS_DIR } from './lib/config.mjs';
import { loadDesigns, numberedItems } from './lib/designs.mjs';

const GRID = 32; // số cột lưới (B..AG), mọi khối nội dung căn theo lưới này
const UNIT = 4.6; // độ rộng mỗi cột lưới (đơn vị ký tự của Excel)
const UNIT_PX = Math.trunc(((256 * UNIT + 18) / 256) * 7); // công thức đổi độ rộng cột ra pixel của Excel (font mặc định)
const CHAR_PX = 6.3; // độ rộng trung bình một ký tự Arial 10
const ROW_PX = 20; // chiều cao dòng mặc định (15pt)
const MAX_IMG_PX = GRID * UNIT_PX - 10;
const FONT = { name: 'Arial', size: 10 };
const BORDER = { style: 'thin', color: { argb: 'FFCBD5E1' } };
const BOX = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

const SHEETS = ['Thông tin', 'Màn hình', 'Chi tiết mục', 'Logic'];
const ITEM_COLS = [
  { h: 'STT', w: 1, k: 'no' },
  { h: 'Tên hiển thị', w: 4, k: 'label' },
  { h: 'Loại', w: 3, k: 'kind' },
  { h: 'Tên trong code', w: 5, k: 'code' },
  { h: 'Kiểu dữ liệu', w: 2, k: 'dataType' },
  { h: 'Bắt buộc', w: 2, k: 'required' },
  { h: 'Định dạng / ràng buộc', w: 6, k: 'rule' },
  { h: 'Mặc định', w: 3, k: 'default' },
  { h: 'Ghi chú / hành vi', w: 6, k: 'note' },
];

/**
 * Đọc kích thước ảnh PNG từ header (ảnh "@2x" hiển thị bằng một nửa).
 * @param {string} file đường dẫn PNG
 * @returns {{width: number, height: number}}
 */
function pngSize(file) {
  const buf = readFileSync(file);
  const k = file.endsWith('@2x.png') ? 2 : 1;
  return { width: buf.readUInt32BE(16) / k, height: buf.readUInt32BE(20) / k };
}

/** Ghi khối nội dung lên một sheet theo lưới, tự tính chiều cao dòng cho ô có xuống dòng. */
class SheetWriter {
  row = 1;

  /**
   * @param {ExcelJS.Workbook} wb workbook
   * @param {ExcelJS.Worksheet} ws sheet
   * @param {object} design nội dung file (để tìm sơ đồ)
   */
  constructor(wb, ws, design) {
    Object.assign(this, { wb, ws, design });
    ws.properties.defaultRowHeight = 15;
    ws.getColumn(1).width = 2;
    for (let c = 2; c <= GRID + 1; c++) ws.getColumn(c).width = UNIT;
    ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    ws.views = [{ showGridLines: false }];
  }

  /**
   * Ghi một ô gộp từ cột lưới `from` (0-based), rộng `span` cột.
   * @returns {ExcelJS.Cell}
   */
  cell(from, span, value, style = {}) {
    const c1 = from + 2, c2 = from + span + 1;
    if (span > 1) this.ws.mergeCells(this.row, c1, this.row, c2);
    const cell = this.ws.getCell(this.row, c1);
    cell.value = value ?? '';
    cell.font = { ...FONT, ...style.font };
    cell.alignment = { vertical: 'top', wrapText: true, ...style.alignment };
    if (style.fill) cell.fill = fill(style.fill);
    if (style.border) for (let c = c1; c <= c2; c++) this.ws.getCell(this.row, c).border = BOX;
    return cell;
  }

  /** Số dòng chữ cần cho nội dung trong độ rộng `span` cột lưới (mô phỏng xuống dòng theo từ như Excel). */
  static lines(value, span) {
    const cap = Math.max(3, Math.floor((span * UNIT_PX - 6) / CHAR_PX));
    let n = 0;
    for (const para of String(value ?? '').split('\n')) {
      let len = 0;
      n++;
      for (const word of para.split(' ')) {
        if (len && len + 1 + word.length > cap) {
          n++;
          len = 0;
        }
        len += (len ? 1 : 0) + word.length;
        while (len > cap) {
          n++;
          len -= cap;
        }
      }
    }
    return n;
  }

  /** Đặt chiều cao dòng hiện tại theo số dòng chữ lớn nhất, rồi xuống dòng. */
  next(lines = 1, lineHeight = 13) {
    if (lines > 1 || lineHeight !== 13) this.ws.getRow(this.row).height = Math.max(15, lines * lineHeight + 4);
    this.row++;
  }

  /**
   * Ghi danh sách khối nội dung.
   * @param {object[]} blocks khối: title, h, h2, p, note, list, kv, table, image, diagram, gap
   */
  blocks(blocks) {
    for (const b of blocks) {
      if (b.title) {
        this.cell(0, GRID, b.title, { font: { size: 16, bold: true, color: { argb: 'FF1E3A8A' } } });
        this.next(1, 22);
      } else if (b.h) {
        if (this.row > 2) this.row++;
        this.cell(0, GRID, b.h, { font: { size: 12, bold: true, color: { argb: 'FF1E3A8A' } }, fill: 'FFDBEAFE' });
        this.next(1, 17);
      } else if (b.h2) {
        this.cell(0, GRID, b.h2, { font: { bold: true } });
        this.next();
      } else if (b.p || b.note) {
        const text = b.p ?? b.note;
        this.cell(0, GRID, text, b.note ? { font: { italic: true, color: { argb: 'FF64748B' } } } : {});
        this.next(SheetWriter.lines(text, GRID));
      } else if (b.list) {
        b.list.forEach((item, i) => {
          this.cell(0, 1, b.ordered === false ? '•' : `${i + 1}.`, { alignment: { horizontal: 'right' } });
          this.cell(1, GRID - 1, item);
          this.next(SheetWriter.lines(item, GRID - 1));
        });
      } else if (b.kv) {
        for (const [k, v] of b.kv) {
          const text = Array.isArray(v) ? v.join('\n') : v;
          this.cell(0, 7, k, { font: { bold: true }, fill: 'FFEFF6FF', border: true });
          this.cell(7, GRID - 7, text, { border: true });
          this.next(SheetWriter.lines(text, GRID - 7));
        }
      } else if (b.table) {
        this.table(b.table.cols, b.table.rows);
      } else if (b.image || b.diagram) {
        this.image(b.image ?? join(DIAGRAMS_DIR, this.design.file, b.diagram + '@2x.png'), b.maxWidth);
      } else if (b.gap) {
        this.row += b.gap;
      }
    }
  }

  /**
   * Bảng có tiêu đề; cột {h, w} với w là số cột lưới (tổng ≤ 32).
   * @param {{h: string, w: number}[]} cols cột
   * @param {any[][]} rows dữ liệu
   */
  table(cols, rows) {
    let from = 0;
    const pos = cols.map((c) => ((from += c.w), from - c.w));
    cols.forEach((c, i) =>
      this.cell(pos[i], c.w, c.h, { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: 'FF2563EB', border: true }),
    );
    this.next(Math.max(...cols.map((c) => SheetWriter.lines(c.h, c.w))));
    for (const r of rows) {
      cols.forEach((c, i) =>
        this.cell(pos[i], c.w, r[i], { border: true, alignment: typeof r[i] === 'number' ? { horizontal: 'center' } : {} }),
      );
      this.next(Math.max(...cols.map((c, i) => SheetWriter.lines(r[i], c.w))));
    }
  }

  /**
   * Nhúng ảnh, thu nhỏ vừa chiều ngang lưới; các dòng phía dưới ảnh để trống.
   * @param {string} file đường dẫn PNG
   * @param {number} [maxWidth] độ rộng tối đa (px)
   */
  image(file, maxWidth = MAX_IMG_PX) {
    if (!existsSync(file)) throw new Error(`Thiếu ảnh ${file} — chạy capture.mjs / diagrams.mjs trước.`);
    const { width, height } = pngSize(file);
    const scale = Math.min(1, maxWidth / width);
    const id = this.wb.addImage({ filename: file, extension: 'png' });
    this.ws.addImage(id, { tl: { col: 1, row: this.row - 1 }, ext: { width: width * scale, height: height * scale } });
    this.row += Math.ceil((height * scale) / ROW_PX) + 1;
  }
}

/**
 * Nội dung 4 sheet của một màn hình/dialog; file Tổng thể tự khai báo khối cho sheet 2, 3.
 * @param {object} d nội dung file
 * @param {object} env dữ liệu dùng chung (schema DB)
 * @returns {object[][]} khối của từng sheet
 */
function sheetBlocks(d, env) {
  const call = (v) => (typeof v === 'function' ? v(env) : v);
  const items = numberedItems(d);
  const shotTitle = (s, i) => `Ảnh ${i + 1}. ${s.caption}`;
  const info = [
    { title: `SWEET HOME · DETAIL DESIGN · ${d.title.toUpperCase()}` },
    {
      kv: [
        ['Tên file', d.file + '.xlsx'],
        ['Tên màn / dialog', d.title],
        ['Loại', d.kind],
        ...(d.route ? [['Đường dẫn (URL)', d.route]] : []),
        ['File này mô tả', d.summary],
        ['Cách đi đến', d.access ?? '—'],
        ['Vai trò dùng được', d.roles],
        ...(d.related ? [['Tài liệu liên quan', d.related]] : []),
        ['Mã nguồn chính', d.sources],
      ],
    },
    ...(d.extraInfo ?? []),
    { h: 'Cấu trúc file' },
    {
      table: {
        cols: [{ h: 'Sheet', w: 7 }, { h: 'Nội dung', w: 25 }],
        rows: (d.sheetNames ?? SHEETS).map((name, i) => [`${i + 1}. ${name}`, (d.sheetDescriptions ?? DEFAULT_SHEET_DESC)[i]]),
      },
    },
    { h: 'Lịch sử cập nhật' },
    {
      table: {
        cols: [{ h: 'Phiên bản', w: 3 }, { h: 'Ngày', w: 4 }, { h: 'Người cập nhật', w: 5 }, { h: 'Nội dung', w: 20 }],
        rows: d.history.map((h) => [h.version, h.date, h.author, h.content]),
      },
    },
  ];
  const screen = call(d.screen) ?? d.shots.flatMap((s, i) => [{ h: shotTitle(s, i) }, ...(s.note ? [{ p: s.note }] : []), { image: join(SHOTS_DIR, d.file, s.id + '.png') }]);
  const detail =
    call(d.detail) ??
    d.shots.flatMap((s, i) => {
      const rows = items.filter((it) => it.shot === s.id).map((it) => ITEM_COLS.map((c) => it[c.k] ?? (c.k === 'required' ? '' : '—')));
      return rows.length ? [{ h: shotTitle(s, i) }, { table: { cols: ITEM_COLS, rows } }] : [];
    });
  return [info, screen, detail, call(d.logic)];
}

const DEFAULT_SHEET_DESC = [
  'Thông tin chung: màn/dialog nào, cách đi đến, vai trò dùng được, lịch sử cập nhật.',
  'Ảnh chụp màn hình (có thể nhiều trạng thái); các vùng, ô nhập, nút được đánh số màu đỏ.',
  'Chi tiết từng mục theo số trên ảnh: tên hiển thị, loại, tên trong code, kiểu dữ liệu, ràng buộc, mặc định, hành vi.',
  'Logic: khởi tạo, từng hành động, API gọi tới, quyền, đổi trạng thái, nhật ký, thông báo lỗi; sơ đồ luồng.',
];

/** Chương trình chính. */
async function main() {
  const designs = await loadDesigns(process.argv);
  const schemaFile = join(OUT_DIR, 'schema.json');
  const env = { schema: existsSync(schemaFile) ? JSON.parse(readFileSync(schemaFile, 'utf8')) : null };
  mkdirSync(DESIGN_OUT_DIR, { recursive: true });
  for (const d of designs) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sweet Home';
    wb.created = wb.modified = new Date(`${d.history.at(-1).date}T00:00:00`);
    sheetBlocks(d, env).forEach((blocks, i) => {
      const ws = wb.addWorksheet(`${i + 1}. ${(d.sheetNames ?? SHEETS)[i]}`);
      new SheetWriter(wb, ws, d).blocks(blocks);
    });
    const file = join(DESIGN_OUT_DIR, d.file + '.xlsx');
    await wb.xlsx.writeFile(file);
    console.log(`  ✓ ${d.file}.xlsx`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
