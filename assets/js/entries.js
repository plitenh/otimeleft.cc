/**
 * 经历数据入口
 * ───────────
 * 方式 A（推荐）：浏览器打开 admin.html，图形化增删改，点「保存」写入 localStorage。
 * 方式 B：在本文件用 R.job / R.project / R.paper 等添加，适合固化进 Git。
 *
 * 下面保留一条「示例」工作经历，确认格式后可删除或改掉。
 */
(function () {
  "use strict";

  const R = new PortfolioRegistry();

  // ── 示例（可删）────────────────────────────────────────
  R.job({
    id: "work-example",
    title: "Example Company · Intern",
    titleZh: "示例公司 · 实习生",
    date: "2025.01 – Present",
    dateZh: "2025.01 – 至今",
    bodyText:
      "Describe what you did in English. One bullet per line.\nMention impact or metrics if you have them.",
    bodyTextZh:
      "中文描述工作内容，每行一条要点。\n尽量写清成果或数据。",
    showOnHome: true,
    presets: ["full"],
  });

  R.highlight({
    title: "Quick start",
    titleZh: "快速开始",
    body: "Open admin.html to add jobs, projects, papers, and honors. Use resume.html to pick sections and export PDF.",
    bodyZh: "打开 admin.html 管理各模块内容；resume.html 勾选模块并导出 PDF。",
    href: "admin.html",
  });

  R.highlight({
    title: "Edit site info",
    titleZh: "改站点信息",
    body: "Name, email, tags: edit assets/js/data.js. Clear browser storage in admin if old data persists.",
    bodyZh: "姓名、邮箱、标签：改 assets/js/data.js。若仍显示旧内容，在后台点「恢复默认」或清空浏览器缓存。",
    href: "admin.html",
  });

  PortfolioAPI.applyCustomEntries(R);
  R.buildInto(window.PORTFOLIO);
  PortfolioStore.apply(window.PORTFOLIO);
  PortfolioStore.ensureSections(window.PORTFOLIO);
  window.PORTFOLIO_ENTRIES = R;
})();
