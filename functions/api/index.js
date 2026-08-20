// 王氏家谱 — CloudBase 云函数（事件式返回）
// 一个函数同时：托管 public/ 下的静态站点 + 提供 /api/photos 实时共享接口
// 部署：把 functions/api/ 整个打成 zip，上传到云开发控制台创建"云函数"
//      访问路径设为 "/"（承载整站）。无需绑卡。
const fs = require('fs');
const path = require('path');
const tcb = require('@cloudbase/node-sdk');

const PUBLIC_DIR = path.join(__dirname, 'public');
const COL = 'photos';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg':  'image/jpeg', '.jpeg': 'image/jpeg',
  '.png':  'image/png',  '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg':  'image/svg+xml',
};

let _app, _db;
function init() {
  if (_app) return _app;
  _app = tcb.init();                 // 在云函数内自动用当前环境身份
  _db  = _app.database();
  _db.createCollection(COL).catch(() => {});   // 已存在则忽略
  return _app;
}

function safeName(n) {
  return String(n).replace(/[\/\\?%*:|"<>]/g, '').slice(0, 40);
}

function resp(statusCode, headers, body, isBase64) {
  const out = { statusCode, headers, body };
  if (isBase64) out.isBase64Encoded = true;
  return out;
}

function isTextual(ct) {
  return ct.indexOf('text/') === 0
      || ct.indexOf('application/javascript') === 0
      || ct.indexOf('application/json') === 0
      || ct.indexOf('application/xml') === 0
      || ct.indexOf('image/svg') === 0;
}

function serveStatic(p) {
  let rel = p === '/' ? '/index.html' : p;
  if (rel.indexOf('..') >= 0) return resp(403, {}, 'forbidden');
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (file.indexOf(PUBLIC_DIR) !== 0) return resp(403, {}, 'forbidden');
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file).toLowerCase();
    const ct  = MIME[ext] || 'application/octet-stream';
    const buf = fs.readFileSync(file);
    if (isTextual(ct)) {
      return resp(200, { 'Content-Type': ct, 'Cache-Control': 'no-cache' }, buf.toString('utf8'));
    }
    return resp(200, { 'Content-Type': ct, 'Cache-Control': 'public, max-age=3600' }, buf.toString('base64'), true);
  }
  // SPA 兜底 → index.html
  const idx = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(idx)) {
    const buf = fs.readFileSync(idx);
    return resp(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' }, buf.toString('utf8'));
  }
  return resp(404, {}, 'not found');
}

exports.main = async (event) => {
  // ---- 解析请求 ----
  const method = String(event.httpMethod || event.method || 'GET').toUpperCase();
  let p = String(event.path || event.pathname || '/');
  const qi = p.indexOf('?'); if (qi >= 0) p = p.slice(0, qi);
  try { p = decodeURIComponent(p); } catch (e) { p = '/'; }

  // ---- API: GET 列表 ----
  if (method === 'GET' && /^\/(api\/)?photos\/?$/.test(p)) {
    const app = init();
    try {
      const r = await _db.collection(COL).limit(1000).get();
      const list = r.data || [];
      if (!list.length) return resp(200, { 'Content-Type': MIME['.json'] }, '{}');
      const urls = await app.getTempFileURL({
        fileList: list.map(function (x) { return { fileID: x.fileID, maxAge: 86400 }; }),
      });
      const out = {};
      list.forEach(function (x, i) {
        out[x.name] = (urls.fileList[i] && urls.fileList[i].downloadUrl) || '';
      });
      return resp(200, { 'Content-Type': MIME['.json'] }, JSON.stringify(out));
    } catch (e) {
      return resp(500, { 'Content-Type': MIME['.json'] }, JSON.stringify({ error: e.message }));
    }
  }

  // ---- API: POST 上传 ----
  if (method === 'POST' && /^\/(api\/)?photos\/?$/.test(p)) {
    const app = init();
    let bodyStr = event.body || '';
    if (event.isBase64Encoded) bodyStr = Buffer.from(bodyStr, 'base64').toString('utf8');
    let obj;
    try { obj = JSON.parse(bodyStr); } catch (e) { return resp(400, { 'Content-Type': MIME['.json'] }, JSON.stringify({ error: 'bad json' })); }
    const name = obj.name, dataUrl = obj.dataUrl || '';
    const mm = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
    if (!name || !mm) return resp(400, { 'Content-Type': MIME['.json'] }, JSON.stringify({ error: 'need name + dataUrl' }));
    const ext = mm[1] === 'image/png' ? 'png' : (mm[1] === 'image/webp' ? 'webp' : 'jpg');
    const cloudPath = 'uploads/' + safeName(name) + '_' + Date.now() + '.' + ext;
    try {
      const up = await app.uploadFile({ cloudPath, fileContent: Buffer.from(mm[2], 'base64') });
      const fileID = up.fileID;
      // upsert：同名人只保留最新一张
      const ex = await _db.collection(COL).where({ name: name }).limit(1).get();
      if (ex.data && ex.data.length) {
        const old = ex.data[0];
        if (old.fileID && old.fileID !== fileID) {
          app.deleteFile({ fileList: [old.fileID] }).catch(function () {});
        }
        await _db.collection(COL).doc(old._id).update({ fileID: fileID });
      } else {
        await _db.collection(COL).add({ name: name, fileID: fileID, createdAt: Date.now() });
      }
      const urls = await app.getTempFileURL({ fileList: [{ fileID: fileID, maxAge: 86400 }] });
      const url = (urls.fileList[0] && urls.fileList[0].downloadUrl) || '';
      return resp(200, { 'Content-Type': MIME['.json'] }, JSON.stringify({ ok: true, url: url, name: name }));
    } catch (e) {
      return resp(500, { 'Content-Type': MIME['.json'] }, JSON.stringify({ error: e.message }));
    }
  }

  // ---- API: DELETE ----
  const dm = /^\/(api\/)?photos\/(.+)$/.exec(p);
  if (method === 'DELETE' && dm) {
    const app = init();
    const name = dm[2]; // 已 decode
    try {
      const ex = await _db.collection(COL).where({ name: name }).limit(1).get();
      if (ex.data && ex.data.length) {
        const r = ex.data[0];
        if (r.fileID) await app.deleteFile({ fileList: [r.fileID] });
        await _db.collection(COL).doc(r._id).remove();
      }
      return resp(200, { 'Content-Type': MIME['.json'] }, JSON.stringify({ ok: true }));
    } catch (e) {
      return resp(500, { 'Content-Type': MIME['.json'] }, JSON.stringify({ error: e.message }));
    }
  }

  // ---- 其它：静态文件 ----
  return serveStatic(p);
};