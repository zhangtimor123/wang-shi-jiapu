// 从「正在运行的 Render 实例」拉取全族已上传的照片，固化进 assets/ 与 data.js。
// 用法: BASE_URL=https://wang-shi-jiapu.onrender.com node pull.js
// 说明: Render 免费层磁盘是临时的，重启/重新部署会清空 uploads。
//       家人传完后跑一次本脚本，照片就会永久写进站点（配合 GitHub Pages 即永久托管）。
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ROOT = __dirname;
const ASSETS = path.join(ROOT, 'assets');

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (r) => {
      if (r.statusCode !== 200) return reject(new Error(url + ' -> HTTP ' + r.statusCode));
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function safeName(n) {
  // 保留中文/字母/数字/下划线/·，其余替换为 _，避免文件系统/URL 问题
  return String(n).replace(/[^一-龥A-Za-z0-9_·]/g, '_').slice(0, 40);
}

(async () => {
  const map = JSON.parse(await get(BASE + '/api/photos'));
  const names = Object.keys(map);
  console.log('服务器上的照片数量:', names.length);
  if (!names.length) { console.log('没有可拉取的照片，退出。'); return; }

  for (const n of names) {
    const rel = map[n];                 // 形如 /uploads/王莉.jpg
    const buf = await get(BASE + rel);
    const file = safeName(n) + '.jpg';
    fs.writeFileSync(path.join(ASSETS, file), buf);
    console.log('  + 保存', file, buf.length, 'bytes');
  }

  // 把匹配到的成员 photo 字段改写为本地资源
  const tp = path.join(ROOT, 'data.js');
  const t = fs.readFileSync(tp, 'utf8');
  const body = t.slice(t.indexOf('=') + 1).replace(/;\s*$/, '');
  const F = eval('(' + body + ')');
  let changed = 0;
  F.members.forEach((m) => {
    if (map[m.name]) {
      const f = safeName(m.name) + '.jpg';
      if (m.photo !== f) { m.photo = f; changed++; }
    }
  });
  fs.writeFileSync(tp, 'const FAMILY = ' + JSON.stringify(F, null, 2) + ';\n');
  console.log('已更新 data.js 的', changed, '位成员头像');
  console.log('完成。记得 git add -A && git commit && git push，Render 会自动重部署。');
})().catch((e) => { console.error('拉取失败:', e.message); process.exit(1); });
