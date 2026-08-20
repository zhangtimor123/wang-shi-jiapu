// 把共享后端里的照片固化进静态站点（永久托管用）
// 用法：node bake.js   —— 读取 .data/photos.json，写入 assets/ 并更新 data.js 中对应成员的 photo
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const UPLOADS = path.join(ROOT, '.data', 'uploads');
const META = path.join(ROOT, '.data', 'photos.json');
const ASSETS = path.join(ROOT, 'assets');
const DATA = path.join(ROOT, 'data.js');

if (!fs.existsSync(META)) { console.log('没有共享照片可固化'); process.exit(0); }
const map = JSON.parse(fs.readFileSync(META, 'utf8'));
const names = Object.keys(map);
if (!names.length) { console.log('没有共享照片可固化'); process.exit(0); }

// 读取 data.js
let t = fs.readFileSync(DATA, 'utf8');
const obj = eval('(' + t.slice(t.indexOf('=') + 1).replace(/;\s*$/, '') + ')');
let done = 0;
names.forEach(function (name) {
  const fname = map[name];
  const src = path.join(UPLOADS, fname);
  if (!fs.existsSync(src)) return;
  const dest = path.join(ASSETS, 'shared_' + fname);
  fs.copyFileSync(src, dest);
  const m = obj.members.find(function (x) { return x.name === name; });
  if (m) { m.photo = 'shared_' + fname; done++; }
});
// 写回 data.js（保持 var FAMILY = {...}; 结构）
const out = 'var FAMILY = ' + JSON.stringify(obj, null, 2) + ';\n';
fs.writeFileSync(DATA, out);
console.log('已固化 ' + done + ' 张共享照片到 assets/ 并更新 data.js');
console.log('下一步：git add -A && git commit && 重新部署（静态站）。');
