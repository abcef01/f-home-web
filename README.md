# Bunny's Home · 前端

第三章的 UI 原型，搬进了 React + Vite。第四章只要求「浏览器里能看到你的页面」，
所以现在是一个纯静态前端：数据都写死在组件里，还没有接后端。

```bash
npm install
npm run dev      # 本地预览 http://localhost:5173
npm run build    # 产出 dist/
npm run preview  # 预览构建产物
```

## 结构

```
src/
├── App.jsx              外壳：手机框、状态栏、底部导航、全局设置
├── Opening.jsx          启动动画（Canvas：乱码 → 爱心 → 持续消散）
├── styles.css           全部样式（设计规范里的变量都在 :root）
└── screens/
    ├── Home.jsx         首页：在一起的天数、每日一句、此刻、一起、今日
    ├── Chat.jsx         对话：气泡、思考链（可折叠）、拍一拍、输入条
    ├── Diary.jsx        日记：周/月/年日历、双人日记、日程、小纸条
    ├── Aerie.jsx        小屋：对方资料、记忆/钱包/声音入口
    ├── Settings.jsx     设置：质感、纸白、模糊、圆角、气泡、主题色、字体、语言
    ├── Rituals.jsx      日常：打卡、水壶、三餐、睡眠、积分
    ├── Album.jsx        相册
    ├── Mail.jsx         信箱
    └── Games.jsx        一起玩 + 4399 外链
```

## 部署

推到 GitHub 后，在 Vercel 里导入这个仓库即可。Vercel 会自动识别 Vite：

- Framework Preset：`Vite`
- Build Command：`npm run build`
- Output Directory：`dist`

之后每次 `git push`，Vercel 都会自动重新部署。
