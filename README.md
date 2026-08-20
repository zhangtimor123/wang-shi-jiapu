# 王氏家谱（手机版）

基于照片与文字修订稿制作的移动端家谱网页，支持「家族成员实时共享上传照片」。

> **🚀 一键部署（最快路径，免绑卡）**：本仓库已推到 GitHub → https://github.com/zhangtimor123/wang-shi-jiapu
> 打开 👉 **https://glitch.com/edit/#!/import/github/zhangtimor123/wang-shi-jiapu**
> 用 GitHub 登录 Glitch → 自动拉起项目并安装 → 得到 `https://<你的项目名>.glitch.me`，全家直接用这个地址就能实时传照片、互看头像。

## 目录
- `index.html` 网页入口
- `data.js` 家谱结构化数据（成员、关系、简介、头像）
- `assets/` 人物照与家族合照
- `server.js` 零依赖 Node 服务：同时托管站点 + 提供照片上传/获取/删除接口
- `bake.js` 把本地 `.data/` 里的照片固化进静态站点（本地 server 用）
- `pull.js` 把「线上 Glitch 实例」的照片固化进静态站点（永久化用）
- `watch.json` 告诉 Glitch 上传照片时不要重启服务

## 两种运行模式
1. **纯静态（无上传后端）**：任意静态托管（GitHub Pages / CloudStudio）直接放 `index.html` + `data.js` + `assets/`。
   上传按钮会自动回退到「本机浏览器存储」——仅本人可见。
2. **带共享后端（实时全家可见）**：用 `node server.js` 起服务。
   任何人点详情页「上传照片」→ 照片直达后端、按姓名归位；前端每 10 秒拉取一次，谁传了别人 10 秒内可见。

## 部署到 Glitch（免费、免绑卡、全家实时共享）— 推荐
1. 仓库已推到 GitHub（见下方「推送到 GitHub」）。
2. 打开 👉 **https://glitch.com/edit/#!/import/github/zhangtimor123/wang-shi-jiapu**
   （或在 glitch.com 右上角 New Project → Import from GitHub，粘贴 `https://github.com/zhangtimor123/wang-shi-jiapu`）
3. 用 GitHub 登录并授权，Glitch 自动拉取代码、安装依赖（无需安装，零依赖）、启动服务。
4. 左上角点项目名可改名（即 URL 前缀）。最终地址形如 `https://<项目名>.glitch.me`。
5. 把这个地址发给全族人：前端 + 后端一体，上传立享共享，无需任何人绑卡。

> 免费层注意：项目一段时间不活跃会休眠，首个请求约 5–15 秒冷启动；属正常现象。上传的照片存在 Glitch 的 `.data` 持久目录，重启用不丢。

## 照片永久固化（可选，保险用）
Glitch 的 `.data` 目录本身是持久的，一般不用固化。若想彻底把照片写进仓库（即使关停后端也不丢）：
```
BASE_URL=https://你的项目名.glitch.me node pull.js
git add -A && git commit -m "固化家人的上传照片" && git push
```
（在 Glitch 编辑器 Terminal 里、或本地 clone 后跑均可。）

## 推送到 GitHub
```
git remote add origin https://<用户名>:<PAT>@github.com/<用户名>/wang-shi-jiapu.git
git push -u origin main
```
PAT 需有 `repo` 权限（classic token）。

## 本地调试
```
node server.js            # 然后访问 http://localhost:3000
```
