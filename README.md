# 演示站合集 DemoHub

一个零成本 Serverless 的演示站点导航合集：前台卡片展示 + 详情弹窗，后台可视化管理站点、文章、背景与数据，数据存放在仓库 JSON 中，可直接部署到 **GitHub + Cloudflare Pages**，无需服务器、数据库与 PHP 环境。

## 功能清单

### 前台（index.html）
- 置顶导航：站点名称、文章标题（工具 / 联系我们，可在后台增改）、搜索框、「全部分类」下拉筛选
- 卡片网格：系统名称、是否正常（正常 / 失效 / 未知）、站点域名、分类、单卡浏览量；无封面图时自动以名称首字作为占位缩略图
- 自动分页：上百个站点自动分页，每页条数可选 12 / 24 / 36 / 48，默认 24
- 详情弹窗：居中弹出，不带缩略图；含卡片名称、是否正常、简介、功能、演示账号、演示密码、最近检测时间、打开演示站、源码地址，右上角 X 关闭
- 右侧固定轨道：回到顶部 / 回到底部；右下角悬浮回到顶部按钮
- 页脚：版权信息、隐私政策、免责声明、站点地图，以及「本站所有演示站点仅用于技术演示，不承担任何使用分享」声明
- 顶部显示网站总浏览量，卡片显示单卡浏览量

### 后台（admin.html）
- 轻量密码登录（初始密码 `admin123`，可在设置中修改）
- 站点管理：添加 / 编辑 / 删除站点，批量检测链接是否失效（状态与检测时间自动更新）
- 文章管理：添加 / 编辑 / 删除文章，标题自动显示在前台置顶导航
- 站点设置：站点名称、默认每页条数、页脚版权、背景图（上传图片自动转存或填写图片 URL）、修改管理员密码
- 数据管理：导出 JSON 备份、导入 / 上传 JSON 覆盖数据、清空浏览量、清除本地快照
- GitHub 同步：配置仓库信息与 Token 后，后台改动自动提交回仓库 JSON，前台从仓库读取最新数据

## 目录结构

```
demo-site-collection/
├── index.html          # 前台页面
├── admin.html          # 后台页面
├── data/
│   └── sites.json      # 站点 / 文章 / 设置 / 浏览量数据
├── assets/
│   ├── style.css       # 公共样式
│   ├── app.js          # 公共数据层（存储、GitHub 读写、浏览量、链接检测）
│   ├── public.js       # 前台逻辑
│   └── admin.js        # 后台逻辑
└── README.md
```

## 本地预览

直接用任意静态服务器打开即可，例如在本目录执行：

```
python3 -m http.server 8080
```

浏览器访问 `http://localhost:8080/`，后台地址为 `http://localhost:8080/admin.html`。

> 注意：直接双击 HTML 文件（file://）时浏览器禁止读取本地 JSON，页面会使用内置兜底数据；部署到静态托管后 `data/sites.json` 即可正常加载。

## 部署一：上传到 GitHub（可视化操作，无需命令行）

1. 登录 GitHub，右上角 `+` → `New repository`，仓库名自取（如 `demo-hub`），选择 Public 或 Private，不要勾选初始化 README，点击创建。
2. 进入仓库页面，点击 `Add file` → `Upload files`，把本目录下的 `index.html`、`admin.html`、`assets` 文件夹、`data` 文件夹整体拖入上传。
3. 等待上传完成，点击 `Commit changes`。

## 部署二：连接 Cloudflare Pages 发布（可视化操作，无需命令行）

1. 登录 Cloudflare 控制台，左侧进入 `Workers & Pages` → `Create` → `Pages` → `Connect to Git`。
2. 授权并选择上一步的 GitHub 仓库。
3. 构建配置按下面填写，其余留空：
   - **Project name**：站点站名（会作为默认域名前缀）
   - **Production branch**：`main`（与仓库分支一致）
   - **Framework preset**：选择 `None`
   - **Build command**：留空
   - **Build output directory**：填 `/`（根目录）
4. 点击 `Save and Deploy`，等待约一分钟即可获得 `xxx.pages.dev` 访问地址。
5. 以后在后台修改数据并推送到仓库后，Cloudflare Pages 会自动重新发布。

## 后台 GitHub 数据同步配置

1. 进入后台 `GitHub 同步` 标签页，填写：
   - **owner**：GitHub 用户名或组织名
   - **repo**：仓库名
   - **branch**：分支名（默认 `main`）
   - **path**：`data/sites.json`
   - **token**：Personal Access Token，需勾选 `contents` 读写权限
2. 点击「保存配置」，之后可「立即推送数据到仓库」或「从仓库拉取数据」。
3. 未配置 GitHub 时，后台改动只保存在当前浏览器本地；配置后改动会自动提交一次到仓库 JSON。

## 数据字段说明（sites.json）

| 字段 | 含义 |
| --- | --- |
| `settings.siteName` | 站点名称 |
| `settings.perPage` | 默认每页条数 |
| `settings.footerCopyright` | 页脚版权文字 |
| `settings.backgroundImage` | 背景图地址（可为空） |
| `settings.adminPassword` | 后台密码 |
| `settings.github` | 仓库同步配置 |
| `articles[]` | 导航文章：`id` / `title` / `content` |
| `sites[]` | 站点：`name` 名称、`category` 分类、`url` 演示地址、`sourceUrl` 源码地址、`status` 状态（normal / offline / unknown）、`intro` 简介、`features` 功能数组、`demoAccount` 演示账号、`demoPassword` 演示密码、`checkedAt` 最近检测时间、`views` 浏览量、`image` 封面图 |
| `stats.totalViews` | 全站总浏览量 |

## 注意事项

- 本项目为纯静态站点，后台密码仅做浏览器前端校验，适合个人演示与内部使用，不要存放敏感信息。
- 链接检测在浏览器内发起，受跨域（CORS）限制，部分站点会误判为失效，可在后台手动修正状态。
- 浏览量在访客打开详情弹窗时累加；未配置 GitHub 写回时，计数只保存在本机浏览器，配置仓库同步后才会跨访客累计。
- 站内演示站点均仅用于技术演示，收录前请确认对方开源协议与使用授权。
