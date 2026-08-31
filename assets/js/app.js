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
    root.innerHTML = `
      <a class="masthead__brand" href="index.html">
        <div class="masthead__mark">CV</div>
        <div>
          <strong>${esc(t(site.name, site.nameZh))}</strong>
          <small>${esc(t(site.title, site.titleZh))}</small>
        </div>
      </a>
      <nav class="masthead__nav" aria-label="Main navigation">
        ${D.nav
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
    const site = D.site;

    root.innerHTML = `
      <div class="page-transition">
        ${renderTemplateGuide()}
        <section class="section hero">
          <div>
            <p class="hero__kicker">${esc(t(site.affiliation, site.affiliationZh))}</p>
            <h1 class="hero__title">${esc(t(site.name, site.nameZh))}</h1>
            <p class="hero__role">${esc(t(site.title, site.titleZh))}</p>
            <p class="hero__text">${esc(t(site.thesis, site.thesisZh))}</p>
            <div class="hero__tags">
              ${site.tags.map((tag) => `<span>${esc(tag)}</span>`).join("")}
            </div>
            <div class="hero__actions">
              <a class="btn btn--primary" href="admin.html">${esc(t("Open admin", "打开后台"))}</a>
              <a class="btn btn--primary" href="resume.html">${esc(t("Build resume PDF", "组合简历并导出 PDF"))}</a>
              <a class="btn" href="projects.html">${esc(t("View projects", "查看项目"))}</a>
            </div>
            <div class="hero__contacts">
              ${site.email ? `<a href="mailto:${site.email}">${esc(site.email)}</a>` : ""}
              ${site.phone ? `<span>${esc(site.phone)}</span>` : ""}
              ${site.github ? `<a href="${site.github}" target="_blank" rel="noopener">${esc(site.githubLabel)}</a>` : ""}
            </div>
          </div>
          <aside class="hero__aside">
            <div class="portrait">
              <div class="portrait__placeholder">${esc(portraitInitials(site))}</div>
              <div class="portrait__meta">
                ${site.age || site.nationalityZh || site.nationality ? `<p>${esc(
                  [
                    site.age ? (state.lang === "zh" ? site.age + "岁" : site.age + " years old") : "",
                    t(site.nationality, site.nationalityZh),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                )}</p>` : ""}
                <h2>${esc(t(site.education, site.educationZh))}</h2>
              </div>
            </div>
            <div class="stat-grid">
              ${site.stats
                .map(
                  (s) =>
                    `<div class="stat"><strong>${esc(s.value)}</strong><span>${esc(
                      t(s.label, s.labelZh)
                    )}</span></div>`
                )
                .join("")}
            </div>
          </aside>
        </section>

        <section class="section">
          <div class="section__head">
            <span class="section__id">01</span>
            <h2 class="section__title">${esc(t("Focus areas", "方向概览"))}</h2>
            <p class="section__lede">${esc(
              t(
                "Modular profile — pick sections on the Resume page for different job targets.",
                "模块化主页：在简历页按岗位勾选模块，生成不同版本 PDF。"
              )
            )}</p>
          </div>
          <div class="card-grid">
            ${D.homeHighlights
              .map(
                (h) => `
              <a class="card" href="${h.href}">
                <h3>${esc(t(h.title, h.titleZh))}</h3>
                <p>${esc(t(h.body, h.bodyZh))}</p>
              </a>`
              )
              .join("")}
          </div>
        </section>

        <section class="section">
          <div class="section__head">
            <span class="section__id">02</span>
            <h2 class="section__title">${esc(t("Recent experience", "近期经历"))}</h2>
          </div>
          <div class="timeline">
            ${(D.lists?.homeWork?.length ? D.lists.homeWork : D.lists?.work?.slice(0, 3) || [])
              .map((id) => {
                const m = D.modules[id];
                if (!m) return "";
                const preview = m.previewLines ?? 2;
                return `
                  <article class="timeline__item">
                    <h3>${esc(t(m.title, m.titleZh))}${m.custom ? `<span class="tag-custom">${esc(t("custom", "临时"))}</span>` : ""}</h3>
                    <p class="date">${esc(t(m.date, m.dateZh))}</p>
                    <ul>${m.body
                      .slice(0, preview)
                      .map((_, i) => `<li>${esc(t(m.body[i], m.bodyZh[i]))}</li>`)
                      .join("")}</ul>
                  </article>`;
              })
              .join("")}
          </div>
        </section>
      </div>
    `;
    bindTemplateGuide();
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
