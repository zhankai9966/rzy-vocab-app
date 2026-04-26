# rzy 词汇 · 双词库背单词

一个本地化的英语背单词应用,支持双词库(朗曼基础 + 你自己的 IT 词)、间隔重复算法、PWA 安装。

> 这份 README **就是部署教程**。第一次看不要跳读,跟着步骤走。

---

## 第一次部署 — 完整保姆教程

### 总览(让你心里有数)

```
你做的事(共 4 步):
  1️⃣ 把代码上传到 GitHub        (10-15 分钟)
  2️⃣ 让 Netlify 连接到 GitHub    (5 分钟)
  3️⃣ 等 Netlify 自动部署完成      (5 分钟,你不用动手)
  4️⃣ 在 App 里点"加载默认词包"     (1 分钟)

总耗时:25-30 分钟,绝大部分时间是等待。
```

---

### 准备工作

确保你已经有:
- ✅ GitHub 账号(已经有,登录到 https://github.com)
- ✅ Netlify 账号(已经有,登录到 https://app.netlify.com)
- ✅ 一个**空的** GitHub 仓库 `rzy-vocab-app`(已经建好了)
- ✅ 这份代码包解压后的文件夹(就是你看到这个 README 的位置)

---

### 步骤 1: 上传代码到 GitHub(关键步骤,小心 src 文件夹)

> ⚠️ **重要警告**:GitHub 网页拖拽上传有个**坑**——空文件夹和某些嵌套结构可能不上传完整。
> 上次部署 longman-app 就是因为这个问题失败的。**这次按下面方法就不会再坑你**。

#### 步骤 1.1 — 进入仓库

1. 浏览器打开 https://github.com/zhankai9966/rzy-vocab-app
2. 仓库应该是**空的**(只有"Quick setup"那个页面)
3. 如果不是空的,**先把里面的文件全删掉**(进入文件 → 右上角小图标 → Delete file)

#### 步骤 1.2 — 拖拽上传(分两次,确保不漏)

**第一次拖拽:仓库根目录所有文件**

1. 在仓库主页点中间的链接 **"uploading an existing file"**
2. 你电脑上打开解压出来的 `rzy-vocab-app` 文件夹
3. **进入这个文件夹内部**,你应该能看到这些东西:
   ```
   .gitignore
   index.html
   package.json
   package-lock.json
   postcss.config.js
   public/         (文件夹)
   src/            (文件夹)
   tailwind.config.js
   tsconfig.app.json
   tsconfig.json
   vite.config.ts
   wordpacks/      (文件夹)
   README.md
   ```
4. **全选这些文件和文件夹**(Ctrl+A 或者鼠标框选)
5. **整体拖到 GitHub 网页那个虚线框里**
6. 等 30 秒到 2 分钟,GitHub 会显示所有文件名
7. **重要检查**:文件列表里**必须**看到 `src/App.tsx`、`src/lib/db.ts`、`src/components/Home.tsx` 等文件——如果只看到 `src` 这个名字没展开,说明文件夹空的,**需要重传**(浏览器换 Edge 或者刷新重传)
8. 滚到页面最下面,在 "Commit changes" 处填:
   - Commit message:`首次部署 · 双词库版本`
9. 点绿色 **"Commit changes"** 按钮

#### 步骤 1.3 — 上传完成后验证

1. 等几秒,页面跳转回仓库主页
2. 你应该看到**至少这些文件夹和文件**:
   - `public/` ← 点进去要能看到 `wordpacks/default.json` 和 3 个 png 图标
   - `src/` ← 点进去要能看到 `App.tsx`、`components/`、`lib/`、`types.ts` 等
   - `wordpacks/` ← 词包源文件
   - `package.json`、`vite.config.ts` 等配置文件
3. 如果某个文件夹是**空的**,**必须**重新上传那个文件夹的内容(不然 Netlify 会构建失败,跟之前 longman-app 那次一样)

---

### 步骤 2: Netlify 连接 GitHub

#### 步骤 2.1 — 创建新项目

1. 浏览器打开 https://app.netlify.com/
2. 顶部菜单点 **"Add new project"**(或者 "Add new site")
3. 选 **"Import an existing project"**
4. 选 **"Deploy with GitHub"**
5. 如果之前授权过,会直接列出你的仓库;如果没授权过,会跳到 GitHub 让你授权 Netlify(点 "Authorize Netlify",**只勾选 rzy-vocab-app 这一个仓库**)

#### 步骤 2.2 — 选仓库

1. 在仓库列表里找 **`rzy-vocab-app`**,点它
2. 进入"Configure project and deploy"页

#### 步骤 2.3 — 检查构建配置(重要)

页面会自动填好:
- ✅ Branch to deploy: `main`
- ✅ Build command: `npm run build`
- ✅ Publish directory: `dist`

**全部不要改**。直接滚到底部点绿色 **"Deploy rzy-vocab-app"** 按钮。

---

### 步骤 3: 等待自动部署(5 分钟,不用动)

1. Netlify 会自动开始构建,**显示进度日志**
2. 第一次构建一般 3-5 分钟
3. **等到看到绿色 "Published" 字样**,就成功了
4. 顶部会显示新的网址,大概是 `https://xxxxxx-xxxxxx-xxxxxx.netlify.app` 这种

#### 如果构建失败(红色 "Failed")

- 点失败的部署进入详情页
- 找 **"Building" 那一行,点左边的 ▶ 三角形展开**
- **滚到日志最下方**,看错误信息
- 把错误信息**截图发给 Claude**,我会告诉你怎么修

---

### 步骤 4: 改个好记的网址(可选,2 分钟)

Netlify 给的随机网址可能像 `glittering-toaster-12345.netlify.app`,不好记。

1. 在 Netlify 项目页面,点左边 **"Project configuration"** → **"General"** → **"Project details"**
2. 点 **"Change project name"** 按钮
3. 改成 `rzy-vocab-zhankai` 或其他你喜欢的名字
4. 保存后,你的网址变成 `https://rzy-vocab-zhankai.netlify.app`

---

### 步骤 5: 第一次打开 App + 加载默认词包

1. 用 **Edge 浏览器** 打开你的新网址
2. 看到欢迎页,词库默认是 **「朗曼 3000」**
3. 中间会显示"这个词库还是空的"+ 一个橙色按钮 **"加载默认词包(401 词) →"**
4. 点这个按钮,等几秒,词库就有了 401 个词
5. 现在可以开始学习了!

---

### 步骤 6: 加到主屏幕(变成 App)

#### iPad / iPhone (Safari)
1. 浏览器打开网址
2. 点底部 **分享按钮**
3. 滚动找 **"添加到主屏幕"** → 命名 → 添加
4. 桌面就有图标了,**离线也能用**

#### Windows (Edge)
1. 网址栏右侧有个 **小电脑图标**(安装应用)
2. 点它 → 安装
3. 桌面/开始菜单就有图标了

#### Android (Chrome)
1. 右上角 ⋮ → **"添加到主屏幕"**

---

## 平时用的功能

### 切换词库
顶部右侧 **"切换词库"** 按钮 → 选 longman3000 或 rzy

### 学习模式
首页有两个按钮:
- **"先学习,后测试"** — 适合学新词
- **"直接测试(摸底)"** — 适合已有基础的人,快速找出哪些词不熟悉

### 错词强化
答错的词会**自动出现在当次测试的后续位置**(隔约 4 题再考一次),也会在以后的学习里**优先抽到**,直到你记牢为止。

### 备份
- **强制提醒**:如果 7 天没备份,首页会显示醒目提示
- **手动备份**:设置 → "导出备份" → 文件下载到电脑
- **跨设备**:在另一台设备打开同样网址 → 设置 → "从备份恢复"

---

## 后续更新流程(以后会变得简单)

### 场景 A:Claude 给你一个新词包(json 文件)

**最常见,最简单**:

1. 下载 json 文件到电脑
2. 打开你的 App → ⚙ 设置 → "选择词包文件" → 选 json
3. **完事**(不需要部署、不需要碰 GitHub)

### 场景 B:Claude 修了个 bug 或加了功能(代码更新)

1. Claude 给你一个新 zip,或者直接告诉你改了哪几个文件
2. 你打开 GitHub 仓库 → 进入对应文件 → 右上角铅笔图标编辑 → 保存
3. **Netlify 自动检测到变化,几分钟后网址自动更新** — 你啥都不用做

如果是大版本(改了很多文件):
1. 删掉旧仓库内容,重新拖拽上传(类似第一次部署)
2. Netlify 自动重新部署

---

## 词库与账号设计说明

### 两个词库完全独立

| | 朗曼 3000 | rzy IT |
|---|---|---|
| 词库内容 | 401 默认词 + 你导入的 | 你自己导入的 |
| 学习进度 | 独立 | 独立 |
| 备份文件 | `vocab-backup-longman3000-*.json` | `vocab-backup-rzy-*.json` |
| 切换 | 顶部"切换词库"按钮 | 同上 |

### 多人共用一台设备

- **方案 1(简单)**:大家用同一个浏览器,通过"切换词库"区分(适合"孩子学朗曼,你学 IT")
- **方案 2(隔离更好)**:每个人用自己的浏览器(Edge/Chrome/Firefox),数据天然隔离

### 多人各自设备

每个人在自己的 iPad/手机/电脑上访问网址,各装各的 PWA,**数据完全独立**——这就是"每个大人下载到本地学"的真正实现。

---

## 常见问题

**Q: 我老婆在她手机上学,数据会同步给我吗?**
A: 不会。每台设备各自独立。如果想"传送进度",可以你导出备份文件、发给她、她导入。

**Q: 清浏览器缓存数据会丢吗?**
A: 会。但 App 会强制提醒你备份,只要每周备份一次就不怕。

**Q: 朗曼 3000 词库的"默认词包"在哪儿?可以重新加载吗?**
A: 在仓库的 `public/wordpacks/default.json`,部署后通过 App 的"加载默认词包"按钮加载。如果想重新加载,需要先**清空当前词库**(设置里的红色按钮),再点"加载默认词包"。

**Q: 我可以创建第三个词库吗(比如"老婆词库")?**
A: 当前版本只支持两个词库(`longman3000` 和 `rzy`)。如果将来需要,可以让 Claude 改代码扩展。

---

## 技术栈
React 18 + TypeScript + Vite + Tailwind + Dexie + ts-fsrs + vite-plugin-pwa
