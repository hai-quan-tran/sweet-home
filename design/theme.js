/* Chuyển giao diện sáng/tối cho bản thiết kế. Nạp ở cuối <body>. */
(function () {
  var KEY = 'sh-theme';
  var MOON = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>';
  var SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>';

  /** Lấy giao diện ban đầu: tham số ?theme= ưu tiên, sau đó tới lựa chọn đã lưu. */
  function initial() {
    var q = new URLSearchParams(location.search).get('theme');
    if (q) return q;
    try { return localStorage.getItem(KEY) || 'light'; } catch (e) { return 'light'; }
  }

  /** Bật/tắt class dark trên khung màn hình và đổi icon, nhãn của nút chuyển. */
  function apply(theme) {
    var dark = theme === 'dark';
    document.querySelectorAll('.app,.login').forEach(function (el) { el.classList.toggle('dark', dark); });
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
      b.querySelector('svg').innerHTML = dark ? SUN : MOON;
    });
  }

  var current = initial();
  apply(current);
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      current = current === 'dark' ? 'light' : 'dark';
      apply(current);
      try { localStorage.setItem(KEY, current); } catch (e) { /* trình duyệt chặn lưu: chỉ đổi tạm */ }
    });
  });
})();
