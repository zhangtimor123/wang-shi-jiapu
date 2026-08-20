# 王氏家谱（手机版）

基于照片与文字修订稿制作的移动端家谱网页，支持「家族成员实时共享上传照片」。

> **🚀 一键部署（最快路径）**：本仓库已推到 GitHub → https://github.com/zhangtimor123/wang-shi-jiapu
> 在浏览器打开 👉 **https://render.com/deploy?repo=https://github.com/zhangtimor123/wang-shi-jiapu**
> 用 GitHub 登录 Render → 选 Free → 等 1–2 分钟 → 得到 `https://wang-shi-jiapu.onrender.com`，全家直接用这个地址就能实时传照片、互看头像。

## 目录
- `index.html` 网页入口
- `data.js` 家谱结构化数据（成员、关系、简介、头像）
- `assets/` 人物照与家族合照
- `server.js` 零依赖 Node 服务：同时托管站点 + 提供照片上传/获取/删除接口
- `render.yaml` Render 一键部署蓝图
- `bake.js` 把「本地后端」的照片固化进静态站点（本地 server 用）
- `pull.js` 把「线上 Render 实例」的照片固化进静态站点（永久化用）

## 两种运行模式
1. **纯静态（无上传后端）**：任意静态托管（GitHub Pages / CloudStudio）直接放 `index.html` + `data.js` + `assets/`。
   上传按钮会自动回退到「本机浏览器存储」——仅本人可见。
2. **带共享后端（实时全家可见）**：用 `node server.js` 起服务（默认 3000 端口）。
   任何人点详情页「上传照片」→ 照片直达后端、按姓名归位；前端每 10 秒拉取一次，谁传了别人 10 秒内可见。

## 部署到 Render（免费、全家实时共享）— 推荐
1. 把本仓库推到 GitHub（见下方「推送到 GitHub」）。
2. 打开 https://render.com → 登录 → 左上角 New → **Blueprint**。
3. 连接你的 GitHub 账号并授权访问该仓库。
4. 选中 `wang-shi-jiapu` 仓库 → Render 会自动读取 `render.yaml`（Node / Free / `node server.js`）。
5. 点 Create Web Service → 等 1–2 分钟构建完成，得到 `https://wang-shi-jiapu.onrender.com`。
   家人直接用这个地址即可：前端 + 后端一体，上传立享共享。
   也可一键部署：在浏览器打开 `https://render.com/deploy?repo=https://github.com/<你的用户名>/wang-shi-jiapu`
6. （可选）想换域名/绑定自定义域名：Render 服务详情 → Settings → Custom Domains。

> 免费层注意：不活跃一段时间会休眠，首个请求约 10–30 秒冷启动；属正常现象。

## 照片永久固化（重要）
Render 免费层磁盘是**临时**的——每次重新部署会清空 `server-data/uploads` 里的照片。
等家人传得差不多了，把照片永久写进站点（即使关停后端也不丢）：
```
BASE_URL=https://wang-shi-jiapu.onrender.com node pull.js
git add -A && git commit -m "固化家人的上传照片" && git push
```
Render 检测到 main 分支更新会自动重部署，照片从此永久留在 `assets/` 与 `data.js`。

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
