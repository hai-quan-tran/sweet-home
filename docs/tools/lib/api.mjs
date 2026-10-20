// Gọi API backend như trình duyệt: giữ cookie đăng nhập, gửi kèm header X-XSRF-TOKEN cho request thay đổi dữ liệu.
import { API_URL } from './config.mjs';

export class Api {
  cookies = new Map();

  /**
   * Gửi request, báo lỗi kèm nội dung trả về nếu không thành công.
   * @param {string} method GET/POST/PUT/PATCH/DELETE
   * @param {string} path đường dẫn sau /api, vd "/rooms"
   * @param {object|FormData} [body] dữ liệu gửi đi (JSON hoặc multipart)
   * @returns {Promise<any>} JSON trả về (null nếu không có nội dung)
   */
  async req(method, path, body) {
    const headers = { Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') };
    const xsrf = this.cookies.get('XSRF-TOKEN');
    if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const res = await fetch(API_URL + path, {
      method,
      headers,
      body: body instanceof FormData ? body : body && JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }

  get = (path) => this.req('GET', path);
  post = (path, body) => this.req('POST', path, body ?? {});
  put = (path, body) => this.req('PUT', path, body);
  patch = (path, body) => this.req('PATCH', path, body);
  del = (path) => this.req('DELETE', path);

  /**
   * Đăng nhập rồi gọi /auth/me để nhận cookie CSRF.
   * @param {string} username tên đăng nhập
   * @param {string} password mật khẩu
   */
  async login(username, password) {
    await this.post('/auth/login', { username, password, rememberDevice: false });
    return this.get('/auth/me');
  }
}
