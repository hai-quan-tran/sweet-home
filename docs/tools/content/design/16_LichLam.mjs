// Nội dung file 16_LichLam.xlsx: màn Lịch làm (xếp ca, ca mẫu, độ phủ ca).
import { FIRST_VERSION, ROLES } from '../common.mjs';

/** Mở Lịch làm tuần này, chờ bảng ca. */
const open = async (page, ctx) => {
  await ctx.open(page, '/lich-lam');
  await page.locator('.sch .sft').first().waitFor();
};

export default {
  file: '16_LichLam',
  title: 'Lịch làm',
  kind: 'Màn hình',
  route: '/lich-lam (tuỳ chọn ?date=YYYY-MM-DD mở tuần chứa ngày đó)',
  summary: 'Bảng ca theo tuần (người × 7 ngày, tổng giờ), sửa/thêm/xoá ca, ca lẻ, sao chép tuần trước, quản lý ca mẫu; với Quản lý: số đơn cần nhân viên đón mỗi ngày, cảnh báo đơn sắp tới không ai trực và ô "Cần người" gợi ý xếp ca. Nhân viên chỉ xem.',
  access: ['Menu trái → Lịch làm.', 'Bảng thông báo: "Thiếu nhân viên trực" → "Mở lịch làm" (?date=).'],
  roles: `${ROLES.all}. Chỉ Quản lý: thêm/sửa/xoá ca, sao chép tuần trước, ca mẫu, độ phủ (đơn cần NV đón, cảnh báo, Cần người).`,
  related: ['14_NhanVien (tag Đang trong ca)', '15_ThemSuaNhanVien (ngày bắt đầu làm)', '07_ChiTietDon (mã cửa theo ca)', '03_KhungUngDung (thông báo thiếu nhân viên trực)', '00_TongThe (bảng shift_template, work_shift)'],
  sources: [
    'frontend/src/app/pages/schedule/schedule-page.{ts,html,scss}',
    'frontend/src/app/core/schedule.service.ts, account.service.ts',
    'backend/.../schedule/ScheduleController.java, ScheduleService (ca, ca mẫu, sao chép tuần, coverage, canSeeDoorCode)',
  ],
  history: FIRST_VERSION,
  shots: [
    { id: 'week', caption: 'Lịch làm tuần này (Quản lý)', go: open },
    {
      id: 'editShift',
      caption: 'Sửa một ca đã sửa giờ so với ca mẫu',
      go: async (page, ctx) => {
        await open(page, ctx);
        await page.click('.sft:has(.pi-pencil) >> nth=0');
        await page.locator('.bottom form.cb').first().waitFor();
      },
    },
    {
      id: 'template',
      caption: 'Sửa ca mẫu',
      clip: '.tpl-card',
      go: async (page, ctx) => {
        await open(page, ctx);
        await page.click('.tpl .ib >> nth=0');
        await page.locator('.tpl-form').waitFor();
      },
    },
    { id: 'staff', caption: 'Lịch làm (Nhân viên): chỉ xem', role: 'staff', fullPage: false, go: open },
  ],
  items: [
    { sel: '.ph .page-desc', label: 'Mô tả', kind: 'Chữ', code: 'isManager()', note: 'Quản lý: "Xếp ca theo tuần. Bấm vào một ca để sửa giờ riêng cho ngày đó."; Nhân viên: "Lịch ca theo tuần."' },
    {
      sel: '.toolbar', label: 'Chọn tuần', kind: 'Nút + chữ', code: 'moveWeek(-1 | 1 | 0) · weekLabel',
      note: 'Tuần trước / "dd/MM – dd/MM/yyyy" (thứ Hai → Chủ nhật) / Tuần sau / Tuần này. Đổi tuần đóng form ca đang mở.',
    },
    {
      sel: '.toolbar button:has-text("Sao chép tuần trước")', label: 'Sao chép tuần trước', kind: 'Nút phụ', code: 'copyPreviousWeek()', badge: 'right',
      note: 'Chỉ Quản lý. Hỏi lại; chép mọi ca của tuần trước sang tuần đang xem (+7 ngày); báo "Đã chép N ca, bỏ qua M ca (trùng giờ, tài khoản khoá hoặc chưa tới ngày làm)".',
    },
    {
      sel: '.alert >> nth=0', label: 'Cảnh báo đơn không ai trực', kind: 'Thông báo (cam) + nút', code: 'alerts()',
      note: 'Chỉ Quản lý, đơn có giờ nhận từ bây giờ trở đi trong tuần: "{Thứ} dd/MM: đơn {mã} (P{số}) nhận phòng lúc HH:mm cần nhân viên đón, nhưng chưa có ai trực lúc đó — cần xếp ca {tên} {Thứ} dd/MM." Nút "Xem đơn".',
    },
    { sel: '.sch thead th.today', label: 'Cột hôm nay', kind: 'Tiêu đề cột (tô nền)', code: 'days()[i].today', note: '"{T2…CN} · hôm nay" + dd/MM; cả cột tô nền.' },
    {
      sel: '.sch tbody tr >> nth=0 >> th', label: 'Người', kind: 'Chữ', code: 'accounts() (đang hoạt động)',
      note: 'Chữ viết tắt, họ tên, vai trò — hoặc "Bắt đầu làm từ dd/MM" nếu ngày bắt đầu làm sau đầu tuần. Chỉ tài khoản đang hoạt động; Nhân viên trước, Quản lý sau.',
    },
    {
      sel: '.sft:not(.s0) >> nth=0', label: 'Một ca theo mẫu', kind: 'Nút (màu theo ca)', code: 'cellShifts() · openShift(s)',
      note: 'Tên ca + "HH:mm–HH:mm"; màu của ca mẫu lúc xếp (lưu bản sao); di chuột hiện ghi chú. Quản lý bấm → form Sửa ca (ảnh 2). Ca qua đêm nằm ở ngày bắt đầu.',
    },
    { sel: '.sft:has(.pi-pencil) >> nth=0', label: 'Ca đã sửa giờ', kind: 'Nút + icon bút', code: 's.edited', badge: 'right', note: 'Giờ khác ca mẫu tại lúc lưu (sửa ca mẫu sau đó không làm ca hiện "đã sửa").' },
    { sel: '.sft.s0 >> nth=0', label: 'Ca lẻ', kind: 'Nút (xám)', code: 'templateId = null · color 0', note: 'Ca không theo mẫu.' },
    {
      sel: '.add.need >> nth=0', label: 'Cần người · Ca …', kind: 'Nút (viền cam)', code: 'dayNeeds(day) · openNew(account, day, templateId)',
      note: 'Chỉ Quản lý, ô trống của ngày có ca mẫu mà khung giờ chứa giờ nhận của đơn NV đón không ai trực. Bấm → form Thêm ca chọn sẵn ca mẫu đó.',
    },
    { sel: '.add:not(.need) >> nth=0', label: 'Thêm ca (+)', kind: 'Nút icon', code: 'openNew(accountId, day)', note: 'Chỉ Quản lý. Mở form Thêm ca chọn sẵn ca mẫu đầu tiên. Ngày đã có ca vẫn có "+" để thêm ca khác.' },
    { sel: '.na >> nth=0', label: 'Trước ngày bắt đầu làm', kind: 'Chữ "—"', code: 'beforeStart(account, day)', note: 'Không xếp được ca (backend cũng chặn).' },
    { sel: '.sch tbody tr >> nth=0 >> td.hrs', label: 'Tổng giờ', kind: 'Chữ (số)', code: 'totalHours(accountId)', rule: 'Tổng giờ các ca của người trong tuần, 1 chữ số thập phân ("7,5 giờ").' },
    {
      sel: '.sch tfoot', label: 'Đơn cần NV đón', kind: 'Dòng tổng', code: 'coverageOf(day)',
      note: 'Chỉ Quản lý. Mỗi ngày: "{n} · đủ" (xanh) / "{n} · thiếu {m}" (cam) theo ngày nhận phòng; "—" nếu không có đơn nhân viên đón.',
    },
    { sel: '.legend', label: 'Chú thích', kind: 'Chữ + màu', code: 'templates()', note: 'Màu từng ca mẫu, ca lẻ, icon bút = đã sửa giờ.' },
    {
      sel: '.tpl-card', label: 'Ca mẫu', kind: 'Card', code: 'templates() · openTemplate()',
      note: 'Danh sách "Ca {tên}" + giờ ("… hôm sau" nếu qua đêm). Quản lý: nút bút sửa, "Thêm ca mẫu". Ghi chú: sửa/xoá ca mẫu chỉ áp dụng ca xếp sau.',
    },
    { shot: 'editShift', sel: '.bottom section[aria-label="Sửa ca đang chọn"] .ch', label: 'Tiêu đề form ca', kind: 'Tiêu đề + nút đóng', code: 'editing()', note: '"Sửa ca / Thêm ca · {họ tên} · dd/MM"; X đóng form.' },
    {
      shot: 'editShift', sel: '#tp', label: 'Ca mẫu', kind: 'Ô chọn', code: 'shiftForm.templateId · applyTemplate()', dataType: 'id ca mẫu | null', required: 'Không',
      note: '"Ca {tên} (HH:mm – HH:mm)" + "Không theo mẫu (ca lẻ)". Chọn ca mẫu → điền giờ theo mẫu.',
    },
    { shot: 'editShift', sel: '#st', label: 'Bắt đầu', kind: 'Ô giờ', code: 'shiftForm.startTime', dataType: 'time', required: 'Có' },
    {
      shot: 'editShift', sel: '.field:has(#en)', label: 'Kết thúc + gợi ý đã sửa', kind: 'Ô giờ + chữ', code: 'shiftForm.endTime · formTemplate().changed', dataType: 'time', required: 'Có',
      rule: '≠ giờ bắt đầu; ≤ giờ bắt đầu = kết thúc hôm sau.', note: 'Giờ khác ca mẫu: "Đã sửa · ca mẫu HH:mm – HH:mm".',
    },
    { shot: 'editShift', sel: '#nt', label: 'Ghi chú', kind: 'Ô nhập chữ', code: 'shiftForm.note', dataType: 'string', required: 'Không', rule: 'Tối đa 255 ký tự.' },
    {
      shot: 'editShift', sel: '.bottom .acts >> nth=0', label: 'Lưu · Đặt lại theo mẫu · Thêm ca khác trong ngày · Xoá ca', kind: 'Nhóm nút', code: 'saveShift() · applyTemplate() · openNew() · deleteShift()',
      note: '"Đặt lại theo mẫu" chỉ khi giờ đã khác mẫu; "Thêm ca khác trong ngày", "Xoá ca" (hỏi lại "Xoá ca này?") chỉ khi sửa ca có sẵn.',
    },
    { shot: 'template', sel: '#tn', label: 'Tên ca', kind: 'Ô nhập chữ', code: 'templateForm.name', dataType: 'string', required: 'Có', rule: 'Tối đa 50 ký tự.' },
    { shot: 'template', sel: '#tc', label: 'Màu', kind: 'Ô chọn', code: 'templateForm.color', dataType: '1–6', required: 'Có', default: 'Thêm mới: màu chưa dùng đầu tiên', note: 'Xanh dương, Xanh ngọc, Tím, Cam, Hồng, Xanh lá.' },
    { shot: 'template', sel: '#ts', label: 'Bắt đầu', kind: 'Ô giờ', code: 'templateForm.startTime', dataType: 'time', required: 'Có' },
    { shot: 'template', sel: '#te', label: 'Kết thúc', kind: 'Ô giờ', code: 'templateForm.endTime', dataType: 'time', required: 'Có', rule: '≠ giờ bắt đầu; ≤ giờ bắt đầu = hôm sau.' },
    {
      shot: 'template', sel: '.tpl-form .acts', label: 'Lưu / Thêm · Huỷ · Xoá ca mẫu', kind: 'Nhóm nút', code: 'saveTemplate() · deleteTemplate()',
      note: '"Xoá ca mẫu" hỏi lại; ca đã xếp theo mẫu giữ nguyên (thành không gắn mẫu).',
    },
    { shot: 'staff', sel: '.sch', label: 'Bảng ca (Nhân viên)', kind: 'Bảng chỉ xem', code: 'isManager() = false', badge: 'inside', note: 'Ca bị khoá (disabled), ô trống hiện "—"; không có độ phủ, cảnh báo, nút thêm, sao chép, sửa ca mẫu.' },
  ],
  logic: [
    { title: 'LOGIC MÀN LỊCH LÀM' },
    { h: '1. Khởi tạo và tải dữ liệu' },
    {
      list: [
        'GET /api/accounts (lọc tài khoản đang hoạt động), GET /api/shift-templates.',
        'Tuần đang xem: theo ?date= (đổi URL khi đang ở màn vẫn chuyển tuần) hoặc tuần hiện tại. GET /api/shifts?from={thứ Hai}&to={thứ Hai tuần sau} (ca có ngày bắt đầu trong khoảng, ≤ 31 ngày).',
        'Quản lý: GET /api/shifts/coverage?from=…&to=… → số đơn / số đơn thiếu người theo ngày, danh sách đơn thiếu (kèm ca mẫu cần xếp), các cặp (ngày, ca mẫu) cần người.',
      ],
    },
    { h: '2. Quy tắc ca (ScheduleService)' },
    {
      list: [
        'Ca lưu bản sao tên, màu, giờ bắt đầu/kết thúc tại lúc xếp; sửa/xoá ca mẫu không đổi ca đã xếp. edited = giờ khác ca mẫu lúc lưu.',
        'Giờ kết thúc ≤ giờ bắt đầu = kết thúc hôm sau; bằng nhau → 400. Ca thuộc ngày bắt đầu.',
        'Không trùng giờ với ca khác của cùng người ([bắt đầu, kết thúc) giao nhau) → 409. Một người có thể nhiều ca/ngày.',
        'Không xếp cho tài khoản đã khoá hoặc trước ngày bắt đầu làm → 400.',
        'Sao chép tuần trước (POST /shifts/copy-week { weekStart = thứ Hai }): chép ca có ngày trong tuần trước sang +7 ngày, bỏ qua ca trùng giờ / tài khoản khoá / chưa tới ngày làm, trả số đã chép và bỏ qua.',
        'Xoá ca mẫu: gỡ template_id của các ca đã xếp rồi xoá mẫu.',
      ],
    },
    { h: '3. Độ phủ đơn cần nhân viên đón' },
    {
      list: [
        'Đơn cần NV đón = đơn chưa huỷ, hình thức Nhân viên check-in, giờ nhận trong khoảng.',
        '"Không ai trực" = giờ nhận không nằm trong [bắt đầu, kết thúc) của ca nào thuộc tài khoản đang hoạt động.',
        '"Cần người": với mỗi đơn không ai trực, các ca mẫu mà khung giờ của ngày giờ nhận (hoặc ngày trước — ca đêm kéo sang sáng) chứa giờ nhận; chỉ lấy ngày trong tuần đang xem. Vd đơn 02:00 thứ Sáu → "Cần người · Ca đêm" ở cột thứ Năm.',
        'Ô "Cần người" hiện cho mọi người chưa có ca ngày đó (trừ trước ngày bắt đầu làm). Không có đơn hoặc chỉ có đơn khách tự check-in thì không báo.',
        'Cùng dữ liệu dùng cho thông báo "Thiếu nhân viên trực" (7 ngày tới) và quyền xem mã cửa của Nhân viên (đang trong ca hoặc thời gian ở của đơn giao với ca của mình).',
      ],
    },
    { h: '4. API và lỗi' },
    {
      table: {
        cols: [{ h: 'Thao tác', w: 6 }, { h: 'API (chỉ Quản lý)', w: 9 }, { h: 'Lỗi', w: 17 }],
        rows: [
          ['Thêm / sửa ca', 'POST /shifts · PUT /shifts/{id} { accountId, date, templateId, startTime, endTime, note }', '409 "Trùng giờ với ca khác của {họ tên}"; 400 "Giờ kết thúc phải khác giờ bắt đầu"; 400 "Tài khoản {họ tên} đã bị khoá" / "{họ tên} bắt đầu làm từ dd/MM/yyyy"; 404 "Không tìm thấy ca" / "Không tìm thấy ca mẫu"'],
          ['Xoá ca', 'DELETE /shifts/{id}', '404 "Không tìm thấy ca"'],
          ['Sao chép tuần trước', 'POST /shifts/copy-week { weekStart }', '400 "Ngày bắt đầu tuần phải là thứ Hai"'],
          ['Thêm / sửa ca mẫu', 'POST /shift-templates · PUT /shift-templates/{id} { name, startTime, endTime, color }', '400 "Giờ kết thúc phải khác giờ bắt đầu"; 400 "Màu 1–6", "Bắt buộc nhập"'],
          ['Xoá ca mẫu', 'DELETE /shift-templates/{id}', '404 "Không tìm thấy ca mẫu"'],
        ],
      },
    },
    { note: 'Lỗi hiện trong form đang mở (ca / ca mẫu) hoặc hộp đỏ phía trên bảng. Không ghi nhật ký thao tác (cấu hình), vẫn có created/updated by.' },
  ],
};
