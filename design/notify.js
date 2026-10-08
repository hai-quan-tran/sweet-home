/* Bảng thông báo khi bấm nút chuông trên thanh trên cùng. Mở sẵn bằng #thong-bao. Nạp ở cuối <body>. */
(function () {
  var ICON = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    done: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    staff: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 4 4M21 8l-4 4"/>'
  };
  var ITEMS = [
    { tone: 'w', icon: 'clock', title: 'Phòng 202 quá giờ 25 phút', meta: 'Bùi Thanh Tâm · hẹn trả 12:15 · NV Hồng phụ trách', time: '12:15', acts: ['Trả phòng', 'Gia hạn'] },
    { tone: 'p', icon: 'done', title: 'Chờ xác nhận trả · P302', meta: 'Mai Hương · khách tự check-out, tự chuyển lúc 10:00', time: '10:00', acts: ['Xác nhận trả phòng'] },
    { tone: 'w', icon: 'key', title: 'Chưa gửi mã cửa · P301', meta: 'Ngô Phương · nhận phòng 14:00, còn 1 giờ 20 phút', time: '12:40', acts: ['Sao chép tin nhắn'] },
    { tone: 'c', icon: 'staff', title: 'Thiếu nhân viên trực · T6 09/10', meta: 'SH-1041 (P201) nhận phòng 22:30 cần nhân viên đón, chưa ai trực lúc đó', time: '08:00', acts: ['Mở lịch làm'] }
  ];
  var bell = document.querySelector('.top-r .ibtn[aria-label^="Thông báo"]');
  if (!bell) return;

  /** Tạo HTML cho một thông báo. */
  function item(n) {
    return '<li class="ntf-i ' + n.tone + '"><span class="ntf-ic"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n.icon] + '</svg></span><div>' +
      '<div class="ntf-t"><span>' + n.title + '</span><time>' + n.time + '</time></div><p class="ntf-m">' + n.meta + '</p>' +
      '<div class="ntf-a">' + n.acts.map(function (a, i) { return '<a class="btn ' + (i ? 'btn-t' : 'btn-s') + '" href="#">' + a + '</a>'; }).join('') + '</div></div></li>';
  }

  var panel = document.createElement('div');
  panel.className = 'ntf';
  panel.id = 'ntf';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Thông báo');
  panel.innerHTML = '<div class="ntf-h"><h2>Thông báo</h2><span class="tag t-w">' + ITEMS.length + ' việc cần xử lý</span></div>' +
    '<ul class="ntf-l">' + ITEMS.map(item).join('') + '</ul>' +
    '<div class="ntf-f">Tự cập nhật mỗi phút. Thông báo tự mất khi việc đã được xử lý.</div>';
  bell.parentNode.appendChild(panel);
  bell.setAttribute('aria-label', 'Thông báo, ' + ITEMS.length + ' việc cần xử lý');
  bell.setAttribute('aria-controls', 'ntf');
  bell.setAttribute('aria-expanded', 'false');
  var dot = bell.querySelector('.dot');
  if (dot) { dot.className = 'badge'; dot.textContent = ITEMS.length; }

  /** Mở hoặc đóng bảng thông báo. */
  function toggle(open) {
    panel.hidden = !open;
    bell.setAttribute('aria-expanded', String(open));
  }

  bell.addEventListener('click', function (e) { e.stopPropagation(); toggle(panel.hidden); });
  panel.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('click', function () { toggle(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { toggle(false); bell.focus(); } });
  if (location.hash === '#thong-bao') toggle(true);
})();
