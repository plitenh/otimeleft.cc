(function () {
  "use strict";

  const STORAGE_LANG = "portfolio-lang";
  const STORAGE_THEME = "portfolio-theme";

  const state = {
    lang: localStorage.getItem(STORAGE_LANG) || "zh",
    theme: localStorage.getItem(STORAGE_THEME) || "light",
    page: document.body.dataset.page || "home",
    selectedModules: new Set(),
  };

  const D = window.PORTFOLIO;

  function t(en, zh) {
    return state.lang === "zh" ? zh : en;
  }

  function esc(s) {
    const el = document.createElement("span");
    el.textContent = s;
    return el.innerHTML;
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_THEME, theme);
  }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem(STORAGE_LANG, lang);
    render();
  }

  function moduleLabel(id) {
    const m = D.modules[id];
    if (!m) return id;
    if (m.type === "header-edu") return t("Profile", "基本信息");
    if (m.type === "papers") return t("Publications", "论文与报告");
    if (m.titleZh) return t(m.title || m.label, m.titleZh || m.labelZh);
    return t(m.label, m.labelZh);
  }

  function groupModules() {
    const sections = PortfolioStore.getSections(D);
    const groups = {};
    sections.forEach((s) => {
      groups[s.id] = {
        id: s.id,
        label: s.label,
        labelZh: s.labelZh,
        kind: s.kind,
        ids: [],
      };
    });

    Object.entries(D.modules).forEach(([id, mod]) => {
      const g = groups[mod.pdfGroup];
      if (g) g.ids.push(id);
    });

    const sortByList = (order, ids) => {
      if (!order || !order.length) return ids;
      const seen = new Set();
      const sorted = [];
      order.forEach((id) => {
        if (ids.includes(id)) {
          sorted.push(id);
          seen.add(id);
        }
      });
      ids.forEach((id) => {
        if (!seen.has(id)) sorted.push(id);
      });
      return sorted;
    };

    sections.forEach((s) => {
      if (s.listKey && D.lists?.[s.listKey] && groups[s.id]) {
        groups[s.id].ids = sortByList(D.lists[s.listKey], groups[s.id].ids);
      }
    });

    return groups;
  }

  function initResumeSelection() {
    const preset = D.presets.find((p) => p.id === "full");
    state.selectedModules = new Set(preset ? preset.modules : Object.keys(D.modules));
  }

  function renderMasthead() {
    const root = document.getElementById("masthead");
    if (!root) return;

    const site = D.site;
    const editorMode = document.body.dataset.nav === "editor";
    const nav = editorMode ? D.editorNav || D.nav : D.nav;
    const brandHref = editorMode ? "editor.html" : "index.html";
    const mark = editorMode ? "ED" : "OT";
    root.innerHTML = `
      <a class="masthead__brand" href="${brandHref}">
        <div class="masthead__mark">${mark}</div>
        <div>
          <strong>${esc(t(site.name, site.nameZh))}</strong>
          <small>${editorMode ? esc(t("Personal editor", "个人编辑器")) : esc(t(site.title, site.titleZh))}</small>
        </div>
      </a>
      <nav class="masthead__nav" aria-label="Main navigation">
        ${nav
          .map(
            (n) =>
              `<a href="${n.href}" class="${state.page === n.id ? "is-active" : ""}">${esc(
                t(n.label, n.labelZh)
              )}</a>`
          )
          .join("")}
      </nav>
      <div class="masthead__actions">
        <button type="button" id="lang-toggle" aria-label="Toggle language">${state.lang === "en" ? "中" : "EN"}</button>
        <button type="button" id="theme-toggle" aria-label="Toggle theme">${state.theme === "light" ? "Dark" : "Light"}</button>
      </div>
    `;

    root.querySelector("#lang-toggle").addEventListener("click", () =>
      setLang(state.lang === "en" ? "zh" : "en")
    );
    root.querySelector("#theme-toggle").addEventListener("click", () =>
      setTheme(state.theme === "light" ? "dark" : "light")
    );
  }

  function renderTemplateGuide() {
    if (!D.site?.templateMode) return "";
    return `
      <section class="section guide-banner">
        <div class="guide-banner__inner">
          <h2>${esc(t("Getting started", "使用引导"))}</h2>
          <ol class="guide-steps">
            <li>${esc(t("Add content in", "修改博客和简历的全部内容主要通过导入json完成："))} <a href="admin.html"><strong>跳转到otimeleft.cc/admin.html</strong></a> ${esc(t("(save to browser)", "（导入并保存到浏览器）"))}</li>
            <li>${esc(t("Pick modules & export PDF on", "勾选模块并导出："))} <a href="resume.html">resume.html</a></li>
          </ol>
          <p class="guide-note">${esc(
            t("See README.md for deploy and entries.js workflow.", "部署与 entries.js 写法见 README.md。")
          )}</p>
          <button type="button" class="btn" id="dismiss-guide">${esc(t("Got it", "知道了"))}</button>
        </div>
      </section>
    `;
  }

  function bindTemplateGuide() {
    const btn = document.getElementById("dismiss-guide");
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (D.site) D.site.templateMode = false;
      const el = document.querySelector(".guide-banner");
      if (el) el.remove();
    });
  }

  function portraitInitials(site) {
    const raw = state.lang === "zh" ? site.nameZh : site.name;
    const parts = String(raw || "CV").trim().split(/\s+/);
    if (state.lang === "zh" && raw.length <= 4) return raw.slice(0, 2) || "CV";
    return (parts[0]?.[0] || "C") + (parts[1]?.[0] || "V");
  }

  function renderHome() {
    const root = document.getElementById("page-root");

    root.innerHTML = `
      <div class="page-transition">
        <section class="section home-nav">
          <div class="section__head">
            <span class="section__id">NAV</span>
            <h2 class="section__title">${esc(t("Applications", "应用导航"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Choose an application below. The original resume editor is one app among several.",
                "从下方选择应用。原简历编辑器只是其中一个功能。"
              )
            )}</p>
          </div>
          <div class="portal-grid">
            ${(D.apps || [])
              .map(
                (app) => `
              <a class="app-card" href="${app.href}">
                <span class="app-card__mark">${esc(app.mark)}</span>
                <span class="app-card__body">
                  <strong>${esc(t(app.title, app.titleZh))}</strong>
                  <small>${esc(t(app.desc, app.descZh))}</small>
                </span>
                <span class="app-card__arrow">→</span>
              </a>`
              )
              .join("")}
          </div>
        </section>
      </div>
    `;
  }

  function renderProjects() {
    const root = document.getElementById("page-root");
    const projectSections = PortfolioStore.sectionByKind(D, "projects");
    const cards = projectSections.flatMap((sec) => {
      const ids = D.lists?.[sec.listKey] || [];
      return ids.map((id) => ({ id, sec }));
    });

    root.innerHTML = `
      <div class="page-transition">
        <section class="section">
          <div class="section__head">
            <span class="section__id">01</span>
            <h2 class="section__title">${esc(t("Projects", "项目"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Projects appear here after you add them in admin.html.",
                "在 admin.html 添加项目后会显示在这里。"
              )
            )}</p>
          </div>
          <div class="card-grid">
            ${cards.length
              ? cards
                  .map(({ id, sec }) => {
                    const m = D.modules[id];
                    if (!m) return "";
                    return `
                  <article class="card">
                    <p class="meta" style="margin-bottom:0.35rem">${esc(t(sec.label, sec.labelZh))}</p>
                    <h3>${esc(t(m.title, m.titleZh))}${m.custom ? `<span class="tag-custom">${esc(t("custom", "临时"))}</span>` : ""}</h3>
                    <p class="meta">${esc(t(m.date, m.dateZh))}</p>
                    <p class="tech">${esc(t(m.tech, m.techZh || m.tech))}</p>
                    <ul style="margin:0;padding-left:1.1rem;color:var(--mist);font-size:0.9rem;line-height:1.6">
                      ${m.body
                        .map((_, i) => `<li>${esc(t(m.body[i], m.bodyZh[i]))}</li>`)
                        .join("")}
                    </ul>
                  </article>`;
                  })
                  .join("")
              : `<p style="color:var(--dim)">${esc(t("No projects yet.", "暂无项目"))}</p>`}
          </div>
        </section>
        <p class="no-print" style="margin-top:1rem;font-size:0.85rem;color:var(--dim)">
          <a href="admin.html">${esc(t("Add projects in admin →", "在后台添加项目 →"))}</a>
        </p>
      </div>
    `;
  }

  function renderAwards() {
    const root = document.getElementById("page-root");
    const featured = D.awardsFeatured;

    root.innerHTML = `
      <div class="page-transition">
        <section class="section">
          <div class="section__head">
            <span class="section__id">01</span>
            <h2 class="section__title">${esc(t("Honors & community", "荣誉与社区"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Volunteer recognition, training camps, media, and upstream open-source participation.",
                "志愿服务、训练营、媒体采访与上游开源参与。"
              )
            )}</p>
          </div>
          <div class="card-grid">
            ${featured ? `<article class="award-card featured">
              <h3>${esc(t(featured.title, featured.titleZh))}</h3>
              <p class="result">${esc(t(featured.result, featured.resultZh))}</p>
              <p>${esc(t(featured.blurb, featured.blurbZh))}</p>
            </article>` : ""}
            ${(D.awardsList || [])
              .map(
                (a) => `
              <article class="award-card">
                <h3>${esc(t(a.title, a.titleZh))}</h3>
                <p class="result">${esc(t(a.result, a.resultZh))}</p>
                <p>${esc(t(a.blurb, a.blurbZh))}</p>
              </article>`
              )
              .join("")}
          </div>
        </section>
      </div>
    `;
  }

  function renderPapers() {
    const root = document.getElementById("page-root");
    const papers = D.papers || [];

    root.innerHTML = `
      <div class="page-transition">
        <section class="section">
          <div class="section__head">
            <span class="section__id">01</span>
            <h2 class="section__title">${esc(t("Publications", "论文与报告"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Technical reports, preprints, and publication-track work.",
                "技术报告、预印本与论文方向的产出。"
              )
            )}</p>
          </div>
          <div class="paper-list">
            ${papers.length
              ? papers
                  .map(
                    (p) => `
              <article class="paper-card">
                <div class="paper-card__meta">
                  <span class="paper-card__level">${esc(t(p.levelLabel, p.levelLabelZh || p.levelLabel))}</span>
                  <span class="paper-card__venue">${esc(t(p.venue, p.venueZh))}</span>
                </div>
                <h3 class="paper-card__title">
                  ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(t(p.title, p.titleZh))}</a>` : esc(t(p.title, p.titleZh))}
                </h3>
                ${p.authors ? `<p class="paper-card__authors">${esc(t(p.authors, p.authorsZh || p.authors))}</p>` : ""}
                <p class="paper-card__intro">${esc(t(p.intro, p.introZh))}</p>
              </article>`
                  )
                  .join("")
              : `<p style="color:var(--dim);padding:1.5rem;border:1px dashed var(--line)">${esc(
                  t("No papers yet — add in admin.", "暂无论文，可在 admin.html 后台添加。")
                )}</p>`}
          </div>
        </section>
        <p class="no-print" style="margin-top:1rem;font-size:0.85rem;color:var(--dim)">
          <a href="admin.html">${esc(t("Manage in admin →", "在后台管理 →"))}</a>
        </p>
      </div>
    `;
  }

  function renderBlog() {
    const root = document.getElementById("page-root");
    const C = window.PORTFOLIO_CATALOG || {};
    const categories = C.blogCategories || [];
    const posts = C.posts || [];
    let selectedCategory = "all";

    function categoryLabel(cat) {
      const found = categories.find((c) => c.id === cat);
      return found ? t(found.labelEn, found.label) : cat;
    }

    function postRows(cat) {
      const visible = cat === "all" ? posts : posts.filter((p) => p.category === cat);
      if (!visible.length) {
        return `<div class="fp-empty">${esc(
          t("No documents archived in this category yet.", "该分类暂无归档文档。")
        )}</div>`;
      }

      return visible
        .map(
          (post) => `
        <article class="fp-row">
          <div class="fp-row__top">
            <span class="chip">${esc(categoryLabel(post.category))}</span>
            ${(post.tags || [])
              .map((tag) => `<span class="chip chip--muted">${esc(tag)}</span>`)
              .join("")}
          </div>
          <h3>${esc(t(post.titleEn, post.title))}</h3>
          <p>${esc(post.summary)}</p>
          <div class="fp-row__files">
            ${(post.files || [])
              .map(
                (file) =>
                  `<button type="button" class="file-open" data-post="${esc(post.id)}" data-href="${esc(file.href)}">${esc(file.label)}</button>`
              )
              .join("")}
          </div>
          <div class="fp-viewer" data-viewer="${esc(post.id)}" hidden></div>
        </article>`
        )
        .join("");
    }

    function isPdf(href) {
      return /\.pdf(?:\?.*)?$/i.test(href);
    }

    function bindFileButtons(scope) {
      scope.querySelectorAll(".file-open").forEach((btn) => {
        btn.addEventListener("click", () => {
          const postId = btn.dataset.post;
          const href = btn.dataset.href;
          const viewer = scope.querySelector(`[data-viewer="${postId}"]`);
          if (!viewer) return;
          if (viewer.hidden) {
            viewer.hidden = false;
            if (isPdf(href)) {
              viewer.innerHTML = `
                <div class="viewer-toolbar">
                  <span>${esc(t("PDF preview", "PDF 预览"))}</span>
                  <button type="button" data-close-viewer>${esc(t("Close", "关闭"))}</button>
                </div>
                <iframe class="pdf-frame" src="${esc(encodeURI(href))}" title="${esc(t("PDF preview", "PDF 预览"))}"></iframe>`;
            } else {
              viewer.innerHTML = `<div class="viewer-loading">${esc(t("Loading…", "加载中…"))}</div>`;
              fetch(encodeURI(href))
                .then((res) => {
                  if (!res.ok) throw new Error("HTTP " + res.status);
                  return res.text();
                })
                .then((text) => {
                  viewer.innerHTML = `
                    <div class="viewer-toolbar">
                      <span>${esc(t("Source preview", "源码预览"))}</span>
                      <button type="button" data-close-viewer>${esc(t("Close", "关闭"))}</button>
                    </div>
                    <pre class="file-viewer"><code>${esc(text)}</code></pre>`;
                  bindViewerClose(viewer);
                })
                .catch((err) => {
                  viewer.innerHTML = `
                    <div class="viewer-toolbar">
                      <span>${esc(t("Preview failed", "预览失败"))}</span>
                      <button type="button" data-close-viewer>${esc(t("Close", "关闭"))}</button>
                    </div>
                    <div class="fp-empty">${esc(err.message)}</div>`;
                  bindViewerClose(viewer);
                });
            }
            bindViewerClose(viewer);
          } else {
            viewer.hidden = true;
            viewer.innerHTML = "";
          }
        });
      });
    }

    function bindViewerClose(viewer) {
      const btn = viewer.querySelector("[data-close-viewer]");
      if (btn) {
        btn.addEventListener("click", () => {
          viewer.hidden = true;
          viewer.innerHTML = "";
        });
      }
    }

    function drawList() {
      const list = root.querySelector("#blog-list");
      if (!list) return;
      list.innerHTML = postRows(selectedCategory);
      bindFileButtons(list);
      root.querySelectorAll(".cat-tabs button").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.category === selectedCategory);
      });
    }

    root.innerHTML = `
      <div class="page-transition">
        <section class="section">
          <div class="section__head">
            <span class="section__id">BL</span>
            <h2 class="section__title">${esc(t("Blog / Library", "博客 / 资料库"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Local LaTeX sources, compiled PDFs, and papers grouped by domain.",
                "本地 LaTeX 源码、编译 PDF 与论文，按领域分组。"
              )
            )}</p>
          </div>

          <div class="cat-tabs" role="tablist" aria-label="${esc(t("Categories", "分类"))}">
            <button type="button" class="is-active" data-category="all">${esc(t("All", "全部"))}</button>
            ${categories
              .map(
                (cat) =>
                  `<button type="button" data-category="${cat.id}">${esc(t(cat.labelEn, cat.label))}</button>`
              )
              .join("")}
          </div>

          <div id="blog-list" class="fp-list">${postRows(selectedCategory)}</div>
        </section>
      </div>
    `;

    bindFileButtons(root.querySelector("#blog-list"));
    root.querySelectorAll(".cat-tabs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedCategory = btn.dataset.category;
        drawList();
      });
    });
  }

  function renderRepos() {
    const root = document.getElementById("page-root");
    const C = window.PORTFOLIO_CATALOG || {};
    const repos = C.repos || [];

    root.innerHTML = `
      <div class="page-transition">
        <section class="section">
          <div class="section__head">
            <span class="section__id">RE</span>
            <h2 class="section__title">${esc(t("Open Source Repositories", "开源仓库记录"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Repositories reviewed with usage notes and contribution context.",
                "看过的开源仓库，附体验与贡献上下文。"
              )
            )}</p>
          </div>
          ${
            (C.accounts || []).length
              ? `
          <div class="fp-accounts">
            ${(C.accounts || [])
              .map(
                (account) =>
                  `<span class="chip">${esc(account.name || account.login)}${account.email ? ` · ${esc(account.email)}` : ""}${account.status ? ` · ${esc(account.status)}` : ""}</span>`
              )
              .join("")}
          </div>`
              : ""
          }
          <div class="fp-table-wrap">
            <table class="fp-table">
              <thead>
                <tr>
                  <th>${esc(t("Repository", "仓库"))}</th>
                  <th>${esc(t("Domain", "领域"))}</th>
                  <th>${esc(t("Notes", "体验 / 总结"))}</th>
                  <th>${esc(t("Link", "链接"))}</th>
                </tr>
              </thead>
              <tbody>
                ${repos
                  .map(
                    (repo) => `
                  <tr>
                    <td><a href="${esc(repo.url)}" target="_blank" rel="noopener">${esc(repo.owner)}/<strong>${esc(repo.name)}</strong></a></td>
                    <td>${esc(repo.domain)}</td>
                    <td>
                      ${esc(repo.summary)}
                      <div class="fp-row__tags">${(repo.tags || [])
                        .map((tag) => `<span class="chip chip--muted">${esc(tag)}</span>`)
                        .join("")}</div>
                    </td>
                    <td><a href="${esc(repo.url)}" target="_blank" rel="noopener">GitHub ↗</a></td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function renderContributions() {
    const root = document.getElementById("page-root");
    const C = window.PORTFOLIO_CATALOG || {};
    const items = C.contributions || [];

    function statusBadge(status) {
      if (status === "merged") return `<span class="status status--merged">${esc(t("Merged", "已合入"))}</span>`;
      if (status === "closed") return `<span class="status status--closed">${esc(t("Not merged", "未合入"))}</span>`;
      return `<span class="status status--open">${esc(t("Open", "开放中"))}</span>`;
    }

    function openDiff(item, kind, viewer) {
      const text = kind === "patch" ? item.patchText || item.diffText : item.diffText || item.patchText;
      if (text) {
        viewer.hidden = false;
        viewer.innerHTML = `
          <div class="viewer-toolbar">
            <span>${kind === "patch" ? esc(t("Patch preview", "Patch 预览")) : esc(t("Diff preview", "Diff 预览"))}</span>
            <button type="button" data-close-viewer>${esc(t("Close", "关闭"))}</button>
          </div>
          <pre class="file-viewer diff-viewer"><code>${esc(text)}</code></pre>`;
        const btn = viewer.querySelector("[data-close-viewer]");
        if (btn) btn.addEventListener("click", () => { viewer.hidden = true; viewer.innerHTML = ""; });
        return;
      }

      const file = kind === "patch" ? item.patchFile || item.patch : item.diffFile || item.diff;
      if (!file) {
        viewer.innerHTML = `<div class="fp-empty">${esc(t("No diff file configured.", "未配置 diff 文件。"))}</div>`;
        return;
      }
      viewer.hidden = false;
      viewer.innerHTML = `<div class="viewer-loading">${esc(t("Loading diff…", "加载 diff…"))}</div>`;
      fetch(encodeURI(file))
        .then((res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then((text) => {
          viewer.innerHTML = `
            <div class="viewer-toolbar">
              <span>${kind === "patch" ? esc(t("Patch preview", "Patch 预览")) : esc(t("Diff preview", "Diff 预览"))}</span>
              <button type="button" data-close-viewer>${esc(t("Close", "关闭"))}</button>
            </div>
            <pre class="file-viewer diff-viewer"><code>${esc(text)}</code></pre>`;
          const btn = viewer.querySelector("[data-close-viewer]");
          if (btn) {
            btn.addEventListener("click", () => {
              viewer.hidden = true;
              viewer.innerHTML = "";
            });
          }
        })
        .catch((err) => {
          viewer.innerHTML = `
            <div class="viewer-toolbar">
              <span>${esc(t("Preview failed", "预览失败"))}</span>
              <button type="button" data-close-viewer>${esc(t("Close", "关闭"))}</button>
            </div>
            <div class="fp-empty">${esc(err.message)}</div>`;
          const btn = viewer.querySelector("[data-close-viewer]");
          if (btn) {
            btn.addEventListener("click", () => {
              viewer.hidden = true;
              viewer.innerHTML = "";
            });
          }
        });
    }

    root.innerHTML = `
      <div class="page-transition">
        <section class="section">
          <div class="section__head">
            <span class="section__id">CO</span>
            <h2 class="section__title">${esc(t("Contribution Records", "贡献记录"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Merged and unmerged upstream work; diffs are rendered inside this page from browser-cache records.",
                "合入与未合入的上游工作；diff 从浏览器缓存记录中读取并页内渲染。"
              )
            )}</p>
          </div>
          ${
            items.length
              ? `
          <div class="fp-table-wrap">
            <table class="fp-table">
              <thead>
                <tr>
                  <th>${esc(t("Pull Request", "Pull Request"))}</th>
                  <th>${esc(t("Status", "状态"))}</th>
                  <th>${esc(t("Summary", "说明"))}</th>
                  <th>${esc(t("Diff", "Diff"))}</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (item) => `
                  <tr>
                    <td>
                      <strong>${esc(item.repo)}#${item.number || "—"}</strong>
                      <div class="fp-muted">${esc(item.title)}</div>
                    </td>
                    <td>${statusBadge(item.status)}</td>
                    <td>${esc(item.summary)}</td>
                    <td class="fp-actions">
                      <button type="button" class="diff-open" data-id="${esc(item.id || item.number)}" data-kind="diff">${esc(t("View diff", "查看 diff"))}</button>
                      <button type="button" class="diff-open" data-id="${esc(item.id || item.number)}" data-kind="patch">${esc(t("View patch", "查看 patch"))}</button>
                    </td>
                  </tr>
                  <tr class="diff-row" id="diff-view-${esc(item.id || item.number)}" hidden>
                    <td colspan="4"><div class="fp-viewer"></div></td>
                  </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>`
              : `<div class="fp-empty">${esc(
                  t("No local contribution records yet. Import them in the Personal Editor.",
                    "暂无本地贡献记录，请在个人编辑器中导入。")
                )} <a href="editor.html">${esc(t("Open editor", "打开编辑器"))}</a></div>`
          }
        </section>
      </div>
    `;

    root.querySelectorAll(".diff-open").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const kind = btn.dataset.kind;
        const item = items.find((x) => String(x.id || x.number) === id);
        const row = root.querySelector(`#diff-view-${id}`);
        if (!item || !row) return;
        const viewer = row.querySelector(".fp-viewer");
        row.hidden = false;
        openDiff(item, kind, viewer);
      });
    });
  }

  function renderEditor() {
    const root = document.getElementById("page-root");
    const store = window.LocalCatalogStore;
    const apps = D.editorApps || [];

    root.innerHTML = `
      <div class="page-transition">
        <section class="section">
          <div class="section__head">
            <span class="section__id">ED</span>
            <h2 class="section__title">${esc(t("Personal Editor", "个人编辑器"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Independent CV/content editor. Personal content stays in this browser only.",
                "独立的简历/内容编辑器；个人信息仅保存在当前浏览器。"
              )
            )}</p>
          </div>
          <div class="portal-grid">
            ${apps
              .map(
                (app) => `
              <a class="app-card" href="${app.href}">
                <span class="app-card__mark">${esc(app.mark)}</span>
                <span class="app-card__body">
                  <strong>${esc(t(app.title, app.titleZh))}</strong>
                  <small>${esc(t(app.desc, app.descZh))}</small>
                </span>
                <span class="app-card__arrow">→</span>
              </a>`
              )
              .join("")}
          </div>
        </section>

        <section class="section">
          <div class="section__head">
            <span class="section__id">LC</span>
            <h2 class="section__title">${esc(t("Local catalog cache", "本地目录缓存"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Repository, contribution, and account data are read from localStorage and never embedded in the static site.",
                "仓库、贡献与账户数据只从 localStorage 读取，不写入静态站点。"
              )
            )}</p>
          </div>
          <div class="local-catalog">
            <div class="local-catalog__toolbar">
              <button type="button" class="btn btn--primary" id="local-import">${esc(t("Import JSON", "导入 JSON"))}</button>
              <button type="button" class="btn" id="local-file-import">${esc(t("Load file", "读取文件"))}</button>
              <button type="button" class="btn" id="local-export">${esc(t("Export JSON", "导出 JSON"))}</button>
              <button type="button" class="btn" id="local-clear">${esc(t("Clear cache", "清空缓存"))}</button>
              <input type="file" id="local-file" accept=".json,application/json" hidden />
              <span id="local-status" class="local-status"></span>
            </div>
            <textarea id="local-json" spellcheck="false" aria-label="Local catalog JSON"></textarea>
            <p class="fp-muted">${esc(
              t(
                "Schema: accounts[]; repos[]{owner,name,url,domain,summary,tags}; contributions[]{id,repo,number,title,status,summary,diffText,patchText}.",
                "格式：accounts[]；repos[]{owner,name,url,domain,summary,tags}；contributions[]{id,repo,number,title,status,summary,diffText,patchText}。"
              )
            )}</p>
          </div>
        </section>
      </div>
    `;

    const textarea = root.querySelector("#local-json");
    const status = root.querySelector("#local-status");
    const fileInput = root.querySelector("#local-file");

    function refreshJson(message) {
      textarea.value = store ? store.exportJson() : "{}";
      if (message) status.textContent = message;
      setTimeout(() => {
        status.textContent = "";
      }, 2500);
    }

    refreshJson();

    root.querySelector("#local-import").addEventListener("click", () => {
      try {
        if (!store) throw new Error("LocalCatalogStore not loaded");
        store.importJson(textarea.value, "replace");
        refreshJson(esc(t("Saved to browser cache.", "已保存到浏览器缓存。")));
      } catch (err) {
        status.textContent = err.message;
      }
    });

    root.querySelector("#local-export").addEventListener("click", () => {
      const blob = new Blob([textarea.value], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "otimeleft-local-catalog.json";
      a.click();
      URL.revokeObjectURL(url);
    });

    root.querySelector("#local-clear").addEventListener("click", () => {
      if (!store) return;
      store.clear();
      refreshJson(esc(t("Local cache cleared.", "本地缓存已清空。")));
    });

    root.querySelector("#local-file").addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          store.importJson(String(reader.result || ""), "replace");
          refreshJson(esc(t("Imported from file.", "已从文件导入。")));
        } catch (err) {
          status.textContent = err.message;
        }
      };
      reader.readAsText(file);
    });

    root.querySelector("#local-file-import").addEventListener("click", () => fileInput.click());
  }

  function buildPdfHeader() {
    const site = D.site;
    return `
      <header>
        <h1>${esc(t(site.name, site.nameZh))}</h1>
        <div class="pdf-contact">
          ${site.age ? esc(t(site.age + " years old", site.age + "岁")) + "<br>" : ""}
          ${site.nationality || site.nationalityZh ? esc(t("Nationality: " + site.nationality, "国籍：" + site.nationalityZh)) + "<br><br>" : ""}
          Email: ${esc(site.email)}<br>
          Phone: ${esc(site.phone)}<br><br>
          GitHub: <a href="${site.github}">${esc(site.githubLabel)}</a><br><br>
          ${esc(t(site.education, site.educationZh))}
        </div>
      </header>
    `;
  }

  function buildPdfModuleHtml(id) {
    const m = D.modules[id];
    if (!m) return "";

    if (m.type === "header-edu") {
      return buildPdfHeader();
    }

    if (m.type === "job") {
      return `
        <div class="pdf-job">
          <h3>${esc(t(m.title, m.titleZh))} <span class="pdf-date">${esc(t(m.date, m.dateZh))}</span></h3>
          <ul>${m.body.map((_, i) => `<li>${esc(t(m.body[i], m.bodyZh[i]))}</li>`).join("")}</ul>
        </div>
      `;
    }

    if (m.type === "project") {
      return `
        <div class="pdf-project">
          <h3>${esc(t(m.title, m.titleZh))} <span class="pdf-date">${esc(t(m.date, m.dateZh))}</span></h3>
          <p class="pdf-tech">${esc(t(m.tech, m.techZh || m.tech))}</p>
          <ul>${m.body.map((_, i) => `<li>${esc(t(m.body[i], m.bodyZh[i]))}</li>`).join("")}</ul>
        </div>
      `;
    }

    if (m.type === "list") {
      return `
        <ul>
          ${m.items
            .map(
              (item) =>
                `<li>${item.highlight ? "<strong>" : ""}${esc(t(item.en, item.zh))}${
                  item.highlight ? "</strong>" : ""
                }</li>`
            )
            .join("")}
        </ul>
      `;
    }

    if (m.type === "skill") {
      return `<li><strong>${esc(t(m.label, m.labelZh))}:</strong> ${esc(t(m.text, m.textZh))}</li>`;
    }

    if (m.type === "papers") {
      const papers = D.papers || [];
      if (!papers.length) return "";
      return `<ul>${papers
        .map(
          (p) =>
            `<li><strong>${esc(t(p.title, p.titleZh))}</strong> — ${esc(t(p.venue, p.venueZh))}${
              p.link ? ` (<a href="${esc(p.link)}">link</a>)` : ""
            }<br>${esc(t(p.intro, p.introZh))}</li>`
        )
        .join("")}</ul>`;
    }

    return "";
  }

  function buildPdfDocument() {
    const groups = groupModules();
    const sections = PortfolioStore.getSections(D);

    let html = "";
    sections.forEach((section) => {
      const g = groups[section.id];
      if (!g) return;

      if (section.kind === "profile") {
        const ids = g.ids.filter((id) => state.selectedModules.has(id));
        if (ids.length || state.selectedModules.has("education")) {
          html += buildPdfHeader();
        }
        return;
      }

      if (section.kind === "papers") {
        if (!state.selectedModules.has("papers")) return;
        const papers = D.papers || [];
        if (!papers.length) return;
        html += `<h2>${esc(t(section.label, section.labelZh))}</h2>`;
        html += buildPdfModuleHtml("papers");
        return;
      }

      const ids = g.ids.filter((id) => state.selectedModules.has(id));
      if (!ids.length) return;

      const title = esc(t(section.label, section.labelZh));
      if (section.kind === "skills") {
        html += `<h2>${title}</h2><ul>`;
        ids.forEach((id) => {
          html += buildPdfModuleHtml(id);
        });
        html += "</ul>";
        return;
      }

      html += `<h2>${title}</h2>`;
      ids.forEach((id) => {
        html += buildPdfModuleHtml(id);
      });
    });

    return `<div class="pdf-doc" id="pdf-export-root">${html}</div>`;
  }

  function renderResume() {
    const root = document.getElementById("page-root");
    const groups = groupModules();

    const checkboxGroups = PortfolioStore.getSections(D)
      .filter((s) => s.kind !== "profile")
      .map((section) => {
        const g = groups[section.id];
        if (!g || !g.ids.length) {
          if (section.kind === "papers" && (D.papers || []).length) {
            return `
          <div class="module-group">
            <h3>${esc(t(section.label, section.labelZh))}</h3>
            <label>
              <input type="checkbox" data-module="papers" ${state.selectedModules.has("papers") ? "checked" : ""}>
              ${esc(t("Publications list", "论文列表"))}
            </label>
          </div>`;
          }
          return "";
        }
        return `
          <div class="module-group">
            <h3>${esc(t(section.label, section.labelZh))}</h3>
            ${g.ids
              .map(
                (id) => `
              <label>
                <input type="checkbox" data-module="${id}" ${state.selectedModules.has(id) ? "checked" : ""}>
                ${esc(moduleLabel(id))}${D.modules[id]?.custom ? ` <span class="tag-custom-inline">${esc(t("temp", "临时"))}</span>` : ""}
              </label>`
              )
              .join("")}
          </div>`;
      })
      .join("");

    root.innerHTML = `
      <div class="page-transition">
        <section class="section">
          <div class="section__head">
            <span class="section__id">01</span>
            <h2 class="section__title">${esc(t("Resume builder", "简历组合器"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Choose a preset for your target role, fine-tune modules, then export a PDF — same idea as a research portfolio site, but composable for wide job search.",
                "先选岗位预设，再勾选模块，导出 PDF。参考学术主页的多页结构，但可按求职方向自由组合。"
              )
            )}</p>
          </div>

          <div class="resume-layout">
            <div id="pdf-preview-wrap">${buildPdfDocument()}</div>

            <aside class="resume-panel no-print">
              <h2>${esc(t("Modules", "模块"))}</h2>
              <label for="preset-select">${esc(t("Preset", "预设"))}</label>
              <select id="preset-select">
                ${D.presets
                  .map(
                    (p) =>
                      `<option value="${p.id}">${esc(t(p.label, p.labelZh))}</option>`
                  )
                  .join("")}
              </select>
              ${checkboxGroups}
              <div class="resume-actions">
                <button type="button" class="btn btn--primary" id="export-pdf">${esc(
                  t("Export PDF", "导出 PDF")
                )}</button>
                <button type="button" class="btn" id="print-pdf">${esc(t("Print", "打印"))}</button>
                <a class="btn" href="admin.html">${esc(t("Admin", "后台管理"))}</a>
              </div>
            </aside>
          </div>
        </section>
      </div>
    `;

    const presetSelect = root.querySelector("#preset-select");
    const activePreset =
      D.presets.find(
        (p) =>
          p.modules.length === state.selectedModules.size &&
          p.modules.every((id) => state.selectedModules.has(id))
      ) || D.presets.find((p) => p.id === "full");
    presetSelect.value = activePreset ? activePreset.id : "full";
    presetSelect.addEventListener("change", () => {
      const preset = D.presets.find((p) => p.id === presetSelect.value);
      if (preset) {
        state.selectedModules = new Set(preset.modules);
        syncCheckboxes();
        updatePreview();
      }
    });

    root.querySelectorAll("input[data-module]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) state.selectedModules.add(input.dataset.module);
        else state.selectedModules.delete(input.dataset.module);
        updatePreview();
      });
    });

    root.querySelector("#export-pdf").addEventListener("click", exportPdf);
    root.querySelector("#print-pdf").addEventListener("click", () => window.print());
  }

  function syncCheckboxes() {
    document.querySelectorAll("input[data-module]").forEach((input) => {
      input.checked = state.selectedModules.has(input.dataset.module);
    });
  }

  function updatePreview() {
    const wrap = document.getElementById("pdf-preview-wrap");
    if (wrap) wrap.innerHTML = buildPdfDocument();
  }

  function exportPdf() {
    const el = document.getElementById("pdf-export-root");
    if (!el || typeof html2pdf === "undefined") {
      window.print();
      return;
    }

    const site = D.site;
    const filename =
      state.lang === "zh"
        ? `${site.nameZh}_简历.pdf`
        : `${site.name.replace(/\s+/g, "_")}_Resume.pdf`;

    html2pdf()
      .set({
        margin: [0.4, 0.4, 0.4, 0.4],
        filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(el)
      .save();
  }

  function render() {
    renderMasthead();
    if (state.page === "home") renderHome();
    else if (state.page === "projects") renderProjects();
    else if (state.page === "papers") renderPapers();
    else if (state.page === "awards") renderAwards();
    else if (state.page === "resume") renderResume();
    else if (state.page === "blog") renderBlog();
    else if (state.page === "repos") renderRepos();
    else if (state.page === "contributions") renderContributions();
    else if (state.page === "editor") renderEditor();
  }

  function init() {
    setTheme(state.theme);
    if (state.page === "resume") initResumeSelection();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
