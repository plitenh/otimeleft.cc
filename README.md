# CV Editor — 个人主页与简历组合器

静态站点：多页个人主页 + 按模块勾选导出 PDF + 后台管理。

## 本地预览

```bash
cd CV_editor
python3 -m http.server 8080
```

浏览器打开：

| 地址 | 作用 |
|------|------|
| http://127.0.0.1:8080/index.html | 主页 |
| http://127.0.0.1:8080/admin.html | **内容管理（增删改）** |
| http://127.0.0.1:8080/resume.html | 组合简历并导出 PDF |

## 第一次使用（推荐顺序）

1. **改基本信息** — 编辑 `assets/js/data.js`（姓名、邮箱、GitHub、自我介绍、标签）。
2. **打开 `admin.html`** — 左侧切换分类，新增/编辑/删除工作经历、项目、论文、荣誉等。
3. **点顶栏「保存」** — 数据写入浏览器 localStorage，全站即时生效。
4. **打开 `resume.html`** — 选岗位预设、勾选模块、导出 PDF。

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
assets/js/data.js      # 站点配置、简历预设骨架
assets/js/entries.js   # 默认经历数据（可留空，只留示例）
assets/js/registry.js  # R.job / R.project / R.paper API（一般不改）
assets/js/store.js     # localStorage 读写
assets/js/admin.js     # 后台页逻辑
assets/js/app.js       # 前台页面渲染
```

## 部署

将整个目录推到 GitHub Pages、Cloudflare Pages 等静态托管即可，根目录为 `index.html`。

**注意：** `admin.html` 无登录，公开部署时他人也能改你浏览器里看不到的「默认文件」——真正上线前请把个人数据写在 `entries.js` 或接受仅本地用 admin。
目前只能在linux版的firefox中使用pdf导出
