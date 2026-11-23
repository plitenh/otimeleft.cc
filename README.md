# otimeleft.cc — 静态导航站

静态站点：主站只做 BSD/FreshPorts 风格导航；原 CV/内容编辑器作为独立应用，个人数据只保存在浏览器 localStorage。公开目录包含博客资料库、开源仓库索引和贡献记录。

## 本地预览

```bash
cd CV_editor
python3 -m http.server 8080
```

浏览器打开：

| 地址 | 作用 |
|------|------|
| http://127.0.0.1:8080/index.html | 主页 |
| http://127.0.0.1:8080/blog.html | 博客 / 资料库（LaTeX、PDF、论文） |
| http://127.0.0.1:8080/repos.html | 看过的开源仓库与体验总结 |
| http://127.0.0.1:8080/contributions.html | 合入/未合入的上游贡献 diff |
| http://127.0.0.1:8080/editor.html | **个人编辑器**（独立应用入口） |
| http://127.0.0.1:8080/resume.html | 组合简历并导出 PDF |
| http://127.0.0.1:8080/admin.html | CV 内容管理（localStorage） |

## 数据边界

- 公开目录数据放在 `assets/js/catalog.js`，只包含博客分类、公开文档和公共仓库索引。
- 个人仓库、账户和贡献记录不写入仓库；打开 `editor.html`，在“本地目录缓存”中导入/导出 JSON，浏览器使用 localStorage 读取。
- 原 CV/内容编辑器继续沿用 `admin.html` 的 localStorage 机制，个人简历内容不进入静态站点。

## 两种持久化方式

| 方式 | 适合 | 说明 |
|------|------|------|
| **admin 保存** | 个人本地、快速迭代 | 存在本机浏览器，换电脑需重新录入或导出 JSON |
| **改 `entries.js`** | 进 Git、部署到 Pages | 用 `R.job({...})` 等 API 写死在代码里 |
| **导入 JSON** | 备份恢复、换浏览器 | admin 顶栏「导入 JSON」；完全替换或合并 |

后台「模块抬头」可增删改简历分区（如把「工作经历」改成「实习经历」，或新增自定义分区）。

后台「导出 JSON」可备份；「恢复默认」清空 localStorage，回到 `entries.js` 里的内容。

## 文件说明

```
assets/js/data.js        # 主站/编辑器导航、简历预设骨架
assets/js/catalog.js     # 公开博客、公共仓库索引
assets/js/local-catalog.js # 个人仓库/账户/贡献的 localStorage 读写
assets/js/entries.js     # 默认经历数据（可留空，只留示例）
assets/js/registry.js  # R.job / R.project / R.paper API（一般不改）
assets/js/store.js     # localStorage 读写
assets/js/admin.js     # 后台页逻辑
assets/js/app.js       # 前台页面渲染
```

## 新增模块维护

- 博客文章：编辑 `assets/js/catalog.js` 的 `posts`，文件放在 `assets/library/` 下；PDF/TeX/Markdown 在页面内渲染。
- 公共仓库索引：编辑 `catalog.js` 的 `repos`。
- 个人仓库/账户/贡献：不写进 `catalog.js`；在 `editor.html` 导入本地 JSON，`contributions` 条目使用 `diffText`/`patchText` 在页面内渲染 diff。

## 部署

将整个目录推到 GitHub Pages、Cloudflare Pages 等静态托管即可，根目录为 `index.html`。

**注意：** `admin.html` 无登录，公开部署时他人也能改你浏览器里看不到的「默认文件」——真正上线前请把个人数据写在 `entries.js` 或接受仅本地用 admin。
目前只能在linux版的firefox中使用pdf导出
