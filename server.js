// 王氏家谱 — 共享照片后端（零依赖 Node 服务）
// 同时托管静态站点 + 提供 /api/photos 上传/获取/删除
// 适配 Glitch：PORT 由平台注入；照片存进 .data（Glitch 持久目录，重启用不丢）
// 运行：node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname;                       // 项目根目录（静态文件所在）
const DATA = path.join(ROOT, '.data');       // Glitch 持久存储目录（重启用不丢）
const UPLOADS = path.join(DATA, 'uploads');
const META = path.join(DATA, 'photos.json');
const PORT = process.env.PORT || 3000;
const UPLOAD_KEY = process.env.UPLOAD_KEY || ''; // 可选：设置后上传/删除需带 x-key 头

fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(META)) fs.writeFileSync(META, '{}');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
};

function readMeta() {
  try { return JSON.parse(fs.readFileSync(META, 'utf8') || '{}'); }
  catch (e) { return {}; }
}
function writeMeta(o) { fs.writeFileSync(META, JSON.stringify(o, null, 2)); }

function safeName(name) {
  // 保留原名（中文/字母数字），仅剔除文件系统不安全字符，避免路径穿越
  return String(name).replace(/[\/\\?%*:|"<>]/g, '').slice(0, 40);
}
function sendJSON(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(b);
}
function checkKey(req) {
  if (!UPLOAD_KEY) return true;
  return req.headers['x-key'] === UPLOAD_KEY;
}

const server = http.createServer(function (req, res) {
  const u = url.parse(req.url);
  const p = decodeURIComponent(u.pathname);

  // ---- API: 获取全部共享照片 ----
  if (p === '/api/photos' && req.method === 'GET') {
    const m = readMeta();
    const out = {};
    Object.keys(m).forEach(function (k) { out[k] = '/uploads/' + m[k]; });
    return sendJSON(res, 200, out);
  }

  // ---- API: 上传照片 ----
  if (p === '/api/photos' && req.method === 'POST') {
    if (!checkKey(req)) return sendJSON(res, 403, { error: 'forbidden' });
    let body = '';
    req.on('data', function (c) { body += c; if (body.length > 8e6) req.destroy(); });
    req.on('end', function () {
      let obj;
      try { obj = JSON.parse(body); } catch (e) { return sendJSON(res, 400, { error: 'bad json' }); }
      const name = obj.name, dataUrl = obj.dataUrl || '';
      const mm = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
      if (!name || !mm) return sendJSON(res, 400, { error: 'need name + dataUrl' });
      const ext = mm[1] === 'image/png' ? 'png' : (mm[1] === 'image/webp' ? 'webp' : 'jpg');
      const b64 = mm[2];
      const fname = safeName(name) + '.' + ext;
      try {
        fs.writeFileSync(path.join(UPLOADS, fname), Buffer.from(b64, 'base64'));
        const m = readMeta(); m[name] = fname; writeMeta(m);
        return sendJSON(res, 200, { ok: true, url: '/uploads/' + fname, name: name });
      } catch (e) { return sendJSON(res, 500, { error: 'write fail' }); }
    });
    return;
  }

  // ---- API: 删除照片 ----
  const del = /^\/api\/photos\/(.+)$/.exec(p);
  if (del && req.method === 'DELETE') {
    if (!checkKey(req)) return sendJSON(res, 403, { error: 'forbidden' });
    const name = decodeURIComponent(del[1]);
    const m = readMeta();
    const fname = m[name];
    if (fname) {
      try { fs.unlinkSync(path.join(UPLOADS, fname)); } catch (e) {}
      delete m[name]; writeMeta(m);
    }
    return sendJSON(res, 200, { ok: true });
  }

  // ---- 上传的图片 ----
  const up = /^\/uploads\/(.+)$/.exec(p);
  if (up) {
    const f = path.join(UPLOADS, path.basename(up[1]));
    if (fs.existsSync(f)) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      return fs.createReadStream(f).pipe(res);
    }
    res.writeHead(404); return res.end('not found');
  }

  // ---- 静态文件 ----
  let rel = p === '/' ? '/index.html' : p;
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    return fs.createReadStream(file).pipe(res);
  }
  // SPA 兜底
  const idx = path.join(ROOT, 'index.html');
  if (fs.existsSync(idx)) {
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    return fs.createReadStream(idx).pipe(res);
  }
  res.writeHead(404); res.end('not found');
});

server.listen(PORT, function () {
  console.log('王氏家谱服务已启动: http://localhost:' + PORT);
});
