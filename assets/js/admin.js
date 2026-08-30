(function () {
  "use strict";

  const D = window.PORTFOLIO;
  let activeSection = "jobs";
  let modalState = null;

  const SECTIONS = [
    { id: "section-headers", label: "模块抬头", type: "sectionMeta" },
    { id: "jobs", label: "工作经历", listKey: "work", type: "job" },
    { id: "projects", label: "项目", listKey: "projects", type: "project" },
    { id: "papers", label: "论文", type: "paper" },
    { id: "awards", label: "荣誉", type: "award" },
    { id: "skills", label: "技能", listKey: "skills", type: "skill" },
    { id: "highlights", label: "主页卡片", type: "highlight" },
    { id: "opensource", label: "开源条目", type: "opensource" },
  ];

  function esc(s) {
    const el = document.createElement("span");
    el.textContent = s ?? "";
    return el.innerHTML;
  }

  function lines(text) {
    if (!text) return [];
    return String(text)
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}`;
  }

  function persist() {
    PortfolioStore.saveFromPortfolio(D);
    updateStoreHint();
  }

  function updateStoreHint() {
    const el = document.getElementById("admin-store-hint");
    if (!el) return;
    const store = PortfolioStore.load();
    el.textContent = store
      ? `已加载后台数据 · 更新于 ${new Date(store.updatedAt).toLocaleString()}`
      : "当前为 entries.js 默认数据（尚未保存过后台修改）";
  }

  function removeFromPresets(id) {
    D.presets.forEach((p) => {
      p.modules = p.modules.filter((m) => m !== id);
    });
  }

  function ensureOpensource() {
    if (!D.modules.opensource) {
      const honors = PortfolioStore.getSections(D).find(
        (s) => s.moduleId === "opensource" || s.id === "honors"
      );
      D.modules.opensource = {
        type: "list",
        pdfGroup: honors?.id || "honors",
        title: honors?.label || "Volunteer & Open Source",
        titleZh: honors?.labelZh || "志愿与开源经历",
        items: [],
      };
    }
  }

  function ensurePapersModule() {
    const papersSec = PortfolioStore.getSections(D).find((s) => s.kind === "papers");
    if (D.papers.length && !D.modules.papers) {
      D.modules.papers = {
        type: "papers",
        pdfGroup: papersSec?.id || "papers",
        title: papersSec?.label || "Publications",
        titleZh: papersSec?.labelZh || "论文与报告",
      };
    }
    if (!D.papers.length && D.modules.papers) {
      delete D.modules.papers;
      removeFromPresets("papers");
    }
  }

  function sectionSelectHtml(kind, selectedId) {
    const items = PortfolioStore.sectionByKind(D, kind);
    if (!items.length) return "";
    return `
      <label>
        <span>所属分区（简历抬头）</span>
        <select name="pdfGroup">
          ${items
            .map(
              (s) =>
                `<option value="${esc(s.id)}" ${s.id === selectedId ? "selected" : ""}>${esc(s.labelZh || s.label)}</option>`
            )
            .join("")}
        </select>
      </label>
    `;
  }

  function kindLabel(kind) {
    const map = {
      profile: "基本信息",
      jobs: "工作经历类",
      projects: "项目类",
      papers: "论文",
      list: "列表条目",
      skills: "技能类",
    };
    return map[kind] || kind;
  }

  function renderNav() {
    const nav = document.getElementById("admin-nav");
    nav.innerHTML = SECTIONS.map(
      (s) =>
        `<button type="button" class="${s.id === activeSection ? "is-active" : ""}" data-section="${s.id}">${esc(s.label)}</button>`
    ).join("");
    nav.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSection = btn.dataset.section;
        render();
      });
    });
  }

  function adminGuideHtml() {
    if (!D.site?.templateMode) return "";
    return `
      <div class="admin-guide">
        <h2>使用引导</h2>
        <ol>
          <li>左侧选分类 → 点「+ 新增」或「编辑」</li>
          <li>改完点顶栏 <strong>保存</strong>（写入本机浏览器）</li>
          <li>姓名、邮箱：编辑 <code>assets/js/data.js</code></li>
          <li>「模块抬头」可自定义简历分区名称（工作经历、技能等）</li>
          <li>支持 <strong>导入 / 导出 JSON</strong> 备份与迁移</li>
          <li>简历 PDF：<a href="resume.html">resume.html</a> 勾选模块后导出</li>
        </ol>
      </div>
    `;
  }

  function renderMain() {
    const main = document.getElementById("admin-main");
    const section = SECTIONS.find((s) => s.id === activeSection);
    main.innerHTML = `
      ${adminGuideHtml()}
      <div class="admin-section-head">
        <h1>${esc(section.label)}</h1>
        <button type="button" class="btn btn--primary" data-action="add">+ 新增</button>
      </div>
      <div id="admin-list"></div>
    `;
    main.querySelector("[data-action=add]").addEventListener("click", () => openModal("create", section.type));
    renderList(section);
  }

  function renderList(section) {
    const wrap = document.getElementById("admin-list");
    if (section.type === "sectionMeta") {
      wrap.innerHTML = tableSectionHeaders();
      bindSectionHeaderActions();
      return;
    }
    if (section.type === "job") {
      wrap.innerHTML = tableJobs();
      bindJobActions();
      return;
    }
    if (section.type === "project") {
      wrap.innerHTML = tableProjects();
      bindProjectActions();
      return;
    }
    if (section.type === "paper") {
      wrap.innerHTML = tablePapers();
      bindPaperActions();
      return;
    }
    if (section.type === "award") {
      wrap.innerHTML = tableAwards();
      bindAwardActions();
      return;
    }
    if (section.type === "skill") {
      wrap.innerHTML = tableSkills();
      bindSkillActions();
      return;
    }
    if (section.type === "highlight") {
      wrap.innerHTML = tableHighlights();
      bindHighlightActions();
      return;
    }
    if (section.type === "opensource") {
      wrap.innerHTML = tableOpensource();
      bindOpensourceActions();
    }
  }

  function tableSectionHeaders() {
    const sections = PortfolioStore.getSections(D);
    if (!sections.length) return `<div class="admin-empty">暂无分区</div>`;
    return `
      <table class="admin-table">
        <thead><tr><th>ID</th><th>中文抬头</th><th>英文抬头</th><th>类型</th><th></th></tr></thead>
        <tbody>
          ${sections
            .map(
              (s) => `<tr>
                <td><code>${esc(s.id)}</code></td>
                <td>${esc(s.labelZh)}</td>
                <td>${esc(s.label)}</td>
                <td>${esc(kindLabel(s.kind))}${s.locked ? " · 锁定" : ""}</td>
                <td class="actions">
                  <button type="button" class="btn" data-edit-section="${esc(s.id)}">编辑</button>
                  ${s.locked ? "" : `<button type="button" class="btn" data-del-section="${esc(s.id)}">删除</button>`}
                </td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <p style="margin-top:1rem;font-size:0.82rem;color:var(--dim)">删除分区会同时删除该分区下所有简历模块内容。</p>
    `;
  }

  function bindSectionHeaderActions() {
    document.querySelectorAll("[data-edit-section]").forEach((btn) => {
      btn.addEventListener("click", () =>
        openModal("edit", "sectionMeta", { id: btn.dataset.editSection })
      );
    });
    document.querySelectorAll("[data-del-section]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("删除该分区及下属内容？")) return;
        PortfolioStore.deleteSection(D, btn.dataset.delSection);
        persist();
        render();
      });
    });
  }

  function listEntriesForKind(kind) {
    return PortfolioStore.sectionByKind(D, kind).flatMap((sec) =>
      (D.lists[sec.listKey] || []).map((id) => ({ id, sec }))
    );
  }

  function tableJobs() {
    const entries = listEntriesForKind("jobs");
    if (!entries.length) return `<div class="admin-empty">暂无工作经历</div>`;
    return `
      <table class="admin-table">
        <thead><tr><th>分区</th><th>标题</th><th>时间</th><th>主页</th><th></th></tr></thead>
        <tbody>
          ${entries
            .map(({ id, sec }) => {
              const m = D.modules[id];
              if (!m) return "";
              const onHome = (D.lists.homeWork || []).includes(id);
              return `<tr>
                <td>${esc(sec.labelZh || sec.label)}</td>
                <td>${esc(m.titleZh || m.title)}</td>
                <td>${esc(m.dateZh || m.date)}</td>
                <td>${onHome ? "是" : "否"}</td>
                <td class="actions">
                  <button type="button" class="btn" data-edit-job="${esc(id)}">编辑</button>
                  <button type="button" class="btn" data-del-job="${esc(id)}">删除</button>
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;
  }

  function bindJobActions() {
    document.querySelectorAll("[data-edit-job]").forEach((btn) => {
      btn.addEventListener("click", () => openModal("edit", "job", { id: btn.dataset.editJob }));
    });
    document.querySelectorAll("[data-del-job]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("删除这条工作经历？")) return;
        const id = btn.dataset.delJob;
        removeFromAllLists(id);
        D.lists.homeWork = (D.lists.homeWork || []).filter((x) => x !== id);
        delete D.modules[id];
        removeFromPresets(id);
        persist();
        render();
      });
    });
  }

  function tableProjects() {
    const entries = listEntriesForKind("projects");
    if (!entries.length) return `<div class="admin-empty">暂无项目</div>`;
    return `
      <table class="admin-table">
        <thead><tr><th>分区</th><th>项目</th><th>时间</th><th>技术栈</th><th></th></tr></thead>
        <tbody>
          ${entries
            .map(({ id, sec }) => {
              const m = D.modules[id];
              if (!m) return "";
              return `<tr>
                <td>${esc(sec.labelZh || sec.label)}</td>
                <td>${esc(m.titleZh || m.title)}</td>
                <td>${esc(m.dateZh || m.date)}</td>
                <td>${esc(m.techZh || m.tech || "")}</td>
                <td class="actions">
                  <button type="button" class="btn" data-edit-project="${esc(id)}">编辑</button>
                  <button type="button" class="btn" data-del-project="${esc(id)}">删除</button>
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;
  }

  function bindProjectActions() {
    document.querySelectorAll("[data-edit-project]").forEach((btn) => {
      btn.addEventListener("click", () => openModal("edit", "project", { id: btn.dataset.editProject }));
    });
    document.querySelectorAll("[data-del-project]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("删除这个项目？")) return;
        const id = btn.dataset.delProject;
        removeFromAllLists(id);
        delete D.modules[id];
        removeFromPresets(id);
        persist();
        render();
      });
    });
  }

  function tablePapers() {
    const papers = D.papers || [];
    if (!papers.length) return `<div class="admin-empty">暂无论文，点击「新增」添加</div>`;
    return `
      <table class="admin-table">
        <thead><tr><th>标题</th><th>出处</th><th>链接</th><th></th></tr></thead>
        <tbody>
          ${papers
            .map((p) => `<tr>
              <td>${esc(p.titleZh || p.title)}</td>
              <td>${esc(p.venueZh || p.venue)}</td>
              <td>${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">打开</a>` : "—"}</td>
              <td class="actions">
                <button type="button" class="btn" data-edit-paper="${esc(p.id)}">编辑</button>
                <button type="button" class="btn" data-del-paper="${esc(p.id)}">删除</button>
              </td>
            </tr>`)
            .join("")}
        </tbody>
      </table>`;
  }

  function bindPaperActions() {
    document.querySelectorAll("[data-edit-paper]").forEach((btn) => {
      btn.addEventListener("click", () => openModal("edit", "paper", { id: btn.dataset.editPaper }));
    });
    document.querySelectorAll("[data-del-paper]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("删除这篇论文？")) return;
        D.papers = D.papers.filter((p) => p.id !== btn.dataset.delPaper);
        ensurePapersModule();
        persist();
        render();
      });
    });
  }

  function tableAwards() {
    const rows = [];
    if (D.awardsFeatured) {
      rows.push({ type: "featured", data: D.awardsFeatured });
    }
    (D.awardsList || []).forEach((a, i) => rows.push({ type: "list", index: i, data: a }));
    if (!rows.length) return `<div class="admin-empty">暂无荣誉</div>`;
    return `
      <table class="admin-table">
        <thead><tr><th>标题</th><th>结果</th><th>类型</th><th></th></tr></thead>
        <tbody>
          ${rows
            .map((r) => `<tr>
              <td>${esc(r.data.titleZh || r.data.title)}</td>
              <td>${esc(r.data.resultZh || r.data.result)}</td>
              <td>${r.type === "featured" ? "置顶" : "普通"}</td>
              <td class="actions">
                <button type="button" class="btn" data-edit-award="${r.type}" data-index="${r.index ?? ""}">编辑</button>
                <button type="button" class="btn" data-del-award="${r.type}" data-index="${r.index ?? ""}">删除</button>
              </td>
            </tr>`)
            .join("")}
        </tbody>
      </table>`;
  }

  function bindAwardActions() {
    document.querySelectorAll("[data-edit-award]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.editAward;
        const index = btn.dataset.index === "" ? null : Number(btn.dataset.index);
        openModal("edit", "award", { kind, index });
      });
    });
    document.querySelectorAll("[data-del-award]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("删除这条荣誉？")) return;
        const kind = btn.dataset.delAward;
        const index = btn.dataset.index === "" ? null : Number(btn.dataset.index);
        if (kind === "featured") D.awardsFeatured = null;
        else D.awardsList.splice(index, 1);
        persist();
        render();
      });
    });
  }

  function tableSkills() {
    const entries = listEntriesForKind("skills");
    if (!entries.length) return `<div class="admin-empty">暂无技能条目</div>`;
    return `
      <table class="admin-table">
        <thead><tr><th>分区</th><th>分类</th><th>内容</th><th></th></tr></thead>
        <tbody>
          ${entries
            .map(({ id, sec }) => {
              const m = D.modules[id];
              if (!m) return "";
              return `<tr>
                <td>${esc(sec.labelZh || sec.label)}</td>
                <td>${esc(m.labelZh || m.label)}</td>
                <td>${esc((m.textZh || m.text || "").slice(0, 80))}</td>
                <td class="actions">
                  <button type="button" class="btn" data-edit-skill="${esc(id)}">编辑</button>
                  <button type="button" class="btn" data-del-skill="${esc(id)}">删除</button>
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;
  }

  function bindSkillActions() {
    document.querySelectorAll("[data-edit-skill]").forEach((btn) => {
      btn.addEventListener("click", () => openModal("edit", "skill", { id: btn.dataset.editSkill }));
    });
    document.querySelectorAll("[data-del-skill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("删除这条技能？")) return;
        const id = btn.dataset.delSkill;
        removeFromAllLists(id);
        delete D.modules[id];
        removeFromPresets(id);
        persist();
        render();
      });
    });
  }

  function tableHighlights() {
    const items = D.homeHighlights || [];
    if (!items.length) return `<div class="admin-empty">暂无主页卡片</div>`;
    return `
      <table class="admin-table">
        <thead><tr><th>标题</th><th>链接</th><th></th></tr></thead>
        <tbody>
          ${items
            .map(
              (h, i) => `<tr>
                <td>${esc(h.titleZh || h.title)}</td>
                <td>${esc(h.href || "")}</td>
                <td class="actions">
                  <button type="button" class="btn" data-edit-highlight="${i}">编辑</button>
                  <button type="button" class="btn" data-del-highlight="${i}">删除</button>
                </td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  function bindHighlightActions() {
    document.querySelectorAll("[data-edit-highlight]").forEach((btn) => {
      btn.addEventListener("click", () => openModal("edit", "highlight", { index: Number(btn.dataset.editHighlight) }));
    });
    document.querySelectorAll("[data-del-highlight]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("删除这张卡片？")) return;
        D.homeHighlights.splice(Number(btn.dataset.delHighlight), 1);
        persist();
        render();
      });
    });
  }

  function tableOpensource() {
    ensureOpensource();
    const items = D.modules.opensource.items || [];
    if (!items.length) return `<div class="admin-empty">暂无开源条目</div>`;
    return `
      <table class="admin-table">
        <thead><tr><th>内容</th><th>高亮</th><th></th></tr></thead>
        <tbody>
          ${items
            .map(
              (item, i) => `<tr>
                <td>${esc((item.zh || item.en || "").slice(0, 100))}</td>
                <td>${item.highlight ? "是" : "否"}</td>
                <td class="actions">
                  <button type="button" class="btn" data-edit-os="${i}">编辑</button>
                  <button type="button" class="btn" data-del-os="${i}">删除</button>
                </td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  function bindOpensourceActions() {
    document.querySelectorAll("[data-edit-os]").forEach((btn) => {
      btn.addEventListener("click", () => openModal("edit", "opensource", { index: Number(btn.dataset.editOs) }));
    });
    document.querySelectorAll("[data-del-os]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("删除这条开源条目？")) return;
        ensureOpensource();
        D.modules.opensource.items.splice(Number(btn.dataset.delOs), 1);
        persist();
        render();
      });
    });
  }

  function presetCheckboxes(selected = []) {
    return `<div class="admin-check-row">${D.presets
      .map(
        (p) =>
          `<label><input type="checkbox" name="preset" value="${esc(p.id)}" ${selected.includes(p.id) ? "checked" : ""} /> ${esc(p.labelZh || p.label)}</label>`
      )
      .join("")}</div>`;
  }

  function field(name, label, value, type = "text") {
    if (type === "textarea") {
      return `<label><span>${esc(label)}</span><textarea name="${name}">${esc(value ?? "")}</textarea></label>`;
    }
    return `<label><span>${esc(label)}</span><input name="${name}" type="${type}" value="${esc(value ?? "")}" /></label>`;
  }

  function openModal(mode, type, ref = {}) {
    modalState = { mode, type, ref };
    const modal = document.getElementById("admin-modal");
    const title = document.getElementById("admin-modal-title");
    const form = document.getElementById("admin-modal-form");
    title.textContent = mode === "create" ? `新增 — ${type}` : `编辑 — ${type}`;

    let html = "";
    if (type === "sectionMeta") {
      const s = ref.id ? D.sections.find((x) => x.id === ref.id) : null;
      html = `
        ${ref.id ? field("id", "分区 ID（不可改）", s?.id) : ""}
        ${field("label", "抬头 EN", s?.label)}
        ${field("labelZh", "抬头 ZH", s?.labelZh)}
        ${
          mode === "create"
            ? `<label><span>分区类型</span>
          <select name="kind">
            <option value="jobs">工作经历类（多条岗位）</option>
            <option value="projects">项目类</option>
            <option value="skills">技能类</option>
            <option value="list">列表条目（开源/荣誉等）</option>
            <option value="papers">论文列表</option>
          </select></label>`
            : `<p style="font-size:0.82rem;color:var(--dim)">类型：${esc(kindLabel(s?.kind))}</p>`
        }
      `;
    } else if (type === "job") {
      const m = ref.id ? D.modules[ref.id] : {};
      const presets = ref.id
        ? D.presets.filter((p) => p.modules.includes(ref.id)).map((p) => p.id)
        : ["full"];
      const pdfGroup = m?.pdfGroup || "experience";
      html = `
        ${sectionSelectHtml("jobs", pdfGroup)}
        ${field("title", "标题 EN", m?.title)}
        ${field("titleZh", "标题 ZH", m?.titleZh)}
        ${field("date", "时间 EN", m?.date)}
        ${field("dateZh", "时间 ZH", m?.dateZh)}
        ${field("bodyText", "要点 EN（每行一条）", (m?.body || []).join("\n"), "textarea")}
        ${field("bodyTextZh", "要点 ZH", (m?.bodyZh || []).join("\n"), "textarea")}
        <label class="admin-check-row"><input type="checkbox" name="showOnHome" ${(D.lists.homeWork || []).includes(ref.id) ? "checked" : ""} /> 显示在主页近期经历</label>
        <label><span>简历预设</span>${presetCheckboxes(presets)}</label>
      `;
    } else if (type === "project") {
      const m = ref.id ? D.modules[ref.id] : {};
      const presets = ref.id
        ? D.presets.filter((p) => p.modules.includes(ref.id)).map((p) => p.id)
        : ["full"];
      const pdfGroup = m?.pdfGroup || "projects";
      html = `
        ${sectionSelectHtml("projects", pdfGroup)}
        ${field("title", "标题 EN", m?.title)}
        ${field("titleZh", "标题 ZH", m?.titleZh)}
        ${field("date", "时间", m?.date)}
        ${field("tech", "技术栈 EN", m?.tech)}
        ${field("techZh", "技术栈 ZH", m?.techZh)}
        ${field("bodyText", "描述 EN", (m?.body || []).join("\n"), "textarea")}
        ${field("bodyTextZh", "描述 ZH", (m?.bodyZh || []).join("\n"), "textarea")}
        <label><span>简历预设</span>${presetCheckboxes(presets)}</label>
      `;
    } else if (type === "paper") {
      const p = ref.id ? D.papers.find((x) => x.id === ref.id) : {};
      html = `
        ${field("title", "标题 EN", p?.title)}
        ${field("titleZh", "标题 ZH", p?.titleZh)}
        ${field("authors", "作者 EN", p?.authors)}
        ${field("authorsZh", "作者 ZH", p?.authorsZh)}
        ${field("venue", "出处 EN", p?.venue)}
        ${field("venueZh", "出处 ZH", p?.venueZh)}
        ${field("levelLabel", "类型标签 EN", p?.levelLabel || "Preprint")}
        ${field("levelLabelZh", "类型标签 ZH", p?.levelLabelZh)}
        ${field("link", "链接 URL", p?.link)}
        ${field("intro", "简介 EN", p?.intro, "textarea")}
        ${field("introZh", "简介 ZH", p?.introZh, "textarea")}
        <label><span>简历预设</span>${presetCheckboxes(ref.id ? D.presets.filter((x) => x.modules.includes("papers")).map((x) => x.id) : [])}</label>
      `;
    } else if (type === "award") {
      const a =
        ref.kind === "featured"
          ? D.awardsFeatured
          : D.awardsList[ref.index];
      html = `
        ${field("title", "标题 EN", a?.title)}
        ${field("titleZh", "标题 ZH", a?.titleZh)}
        ${field("result", "结果 EN", a?.result)}
        ${field("resultZh", "结果 ZH", a?.resultZh)}
        ${field("blurb", "简介 EN", a?.blurb, "textarea")}
        ${field("blurbZh", "简介 ZH", a?.blurbZh, "textarea")}
        <label class="admin-check-row"><input type="checkbox" name="featured" ${ref.kind === "featured" || mode === "create" ? "" : ""} ${a && D.awardsFeatured === a ? "checked" : ref.kind === "featured" ? "checked" : ""} /> 置顶荣誉卡片</label>
      `;
    } else if (type === "skill") {
      const m = ref.id ? D.modules[ref.id] : {};
      const presets = ref.id
        ? D.presets.filter((p) => p.modules.includes(ref.id)).map((p) => p.id)
        : ["full"];
      const pdfGroup = m?.pdfGroup || "skills";
      html = `
        ${sectionSelectHtml("skills", pdfGroup)}
        ${field("label", "分类 EN", m?.label)}
        ${field("labelZh", "分类 ZH", m?.labelZh)}
        ${field("text", "内容 EN", m?.text, "textarea")}
        ${field("textZh", "内容 ZH", m?.textZh, "textarea")}
        <label><span>简历预设</span>${presetCheckboxes(presets)}</label>
      `;
    } else if (type === "highlight") {
      const h = D.homeHighlights[ref.index] || {};
      html = `
        ${field("title", "标题 EN", h?.title)}
        ${field("titleZh", "标题 ZH", h?.titleZh)}
        ${field("body", "描述 EN", h?.body, "textarea")}
        ${field("bodyZh", "描述 ZH", h?.bodyZh, "textarea")}
        ${field("href", "链接", h?.href || "resume.html")}
      `;
    } else if (type === "opensource") {
      ensureOpensource();
      const item = D.modules.opensource.items[ref.index] || {};
      html = `
        ${field("en", "内容 EN", item?.en, "textarea")}
        ${field("zh", "内容 ZH", item?.zh, "textarea")}
        <label class="admin-check-row"><input type="checkbox" name="highlight" ${item?.highlight ? "checked" : ""} /> 简历中高亮</label>
      `;
    }

    form.innerHTML = html;
    modal.hidden = false;

    form.onsubmit = (e) => {
      e.preventDefault();
      saveModal(new FormData(form));
    };
  }

  function closeModal() {
    document.getElementById("admin-modal").hidden = true;
    modalState = null;
  }

  function selectedPresets(form) {
    return [...form.querySelectorAll('input[name="preset"]:checked')].map((el) => el.value);
  }

  function applyPresets(moduleId, presetIds) {
    D.presets.forEach((p) => {
      const has = presetIds.includes(p.id);
      const idx = p.modules.indexOf(moduleId);
      if (has && idx === -1) p.modules.push(moduleId);
      if (!has && idx !== -1) p.modules.splice(idx, 1);
    });
  }

  function removeFromAllLists(id) {
    Object.keys(D.lists || {}).forEach((key) => {
      D.lists[key] = (D.lists[key] || []).filter((x) => x !== id);
    });
  }

  function pushToList(id, listKey) {
    if (!D.lists[listKey]) D.lists[listKey] = [];
    if (!D.lists[listKey].includes(id)) D.lists[listKey].unshift(id);
  }

  function saveModal(fd) {
    const { mode, type, ref } = modalState;

    if (type === "sectionMeta") {
      const data = Object.fromEntries(fd.entries());
      if (mode === "create") {
        PortfolioStore.addSection(D, {
          label: data.label,
          labelZh: data.labelZh,
          kind: data.kind || "jobs",
        });
      } else {
        const s = D.sections.find((x) => x.id === ref.id);
        if (s) {
          s.label = data.label;
          s.labelZh = data.labelZh;
          if (s.moduleId && D.modules[s.moduleId]) {
            D.modules[s.moduleId].title = data.label;
            D.modules[s.moduleId].titleZh = data.labelZh;
          }
          if (s.kind === "papers" && D.modules.papers) {
            D.modules.papers.title = data.label;
            D.modules.papers.titleZh = data.labelZh;
          }
        }
      }
    }

    if (type === "job") {
      const data = Object.fromEntries(fd.entries());
      const id = ref.id || uid("work");
      const pdfGroup = data.pdfGroup || "experience";
      const listKey = PortfolioStore.resolveListKey(pdfGroup, D.sections);
      D.modules[id] = {
        type: "job",
        pdfGroup,
        title: data.title,
        titleZh: data.titleZh,
        date: data.date,
        dateZh: data.dateZh || data.date,
        body: lines(data.bodyText),
        bodyZh: lines(data.bodyTextZh),
        previewLines: 2,
      };
      removeFromAllLists(id);
      pushToList(id, listKey);
      const showHome = fd.get("showOnHome") === "on";
      D.lists.homeWork = D.lists.homeWork || [];
      if (showHome && !D.lists.homeWork.includes(id)) D.lists.homeWork.push(id);
      if (!showHome) D.lists.homeWork = D.lists.homeWork.filter((x) => x !== id);
      applyPresets(id, selectedPresets(document.getElementById("admin-modal-form")));
    }

    if (type === "project") {
      const data = Object.fromEntries(fd.entries());
      const id = ref.id || uid("project");
      const pdfGroup = data.pdfGroup || "projects";
      const listKey = PortfolioStore.resolveListKey(pdfGroup, D.sections);
      D.modules[id] = {
        type: "project",
        pdfGroup,
        title: data.title,
        titleZh: data.titleZh,
        date: data.date,
        dateZh: data.date,
        tech: data.tech,
        techZh: data.techZh,
        body: lines(data.bodyText),
        bodyZh: lines(data.bodyTextZh),
      };
      removeFromAllLists(id);
      pushToList(id, listKey);
      applyPresets(id, selectedPresets(document.getElementById("admin-modal-form")));
    }

    if (type === "paper") {
      const data = Object.fromEntries(fd.entries());
      const id = ref.id || uid("paper");
      const entry = {
        id,
        title: data.title,
        titleZh: data.titleZh,
        authors: data.authors,
        authorsZh: data.authorsZh,
        venue: data.venue,
        venueZh: data.venueZh,
        level: "preprint",
        levelLabel: data.levelLabel || "Preprint",
        levelLabelZh: data.levelLabelZh,
        link: data.link,
        intro: data.intro,
        introZh: data.introZh,
        image: "",
      };
      const idx = D.papers.findIndex((p) => p.id === id);
      if (idx >= 0) D.papers[idx] = entry;
      else D.papers.unshift(entry);
      ensurePapersModule();
      const presets = selectedPresets(document.getElementById("admin-modal-form"));
      if (presets.length) applyPresets("papers", presets);
    }

    if (type === "award") {
      const data = Object.fromEntries(fd.entries());
      const entry = {
        title: data.title,
        titleZh: data.titleZh,
        result: data.result,
        resultZh: data.resultZh,
        blurb: data.blurb,
        blurbZh: data.blurbZh,
      };
      const featured = fd.get("featured") === "on";
      if (mode === "edit" && ref.kind === "featured") D.awardsFeatured = null;
      if (mode === "edit" && ref.kind === "list") D.awardsList.splice(ref.index, 1);
      if (featured) D.awardsFeatured = entry;
      else D.awardsList.unshift(entry);
    }

    if (type === "skill") {
      const data = Object.fromEntries(fd.entries());
      const id = ref.id || uid("skills");
      const pdfGroup = data.pdfGroup || "skills";
      const listKey = PortfolioStore.resolveListKey(pdfGroup, D.sections);
      D.modules[id] = {
        type: "skill",
        pdfGroup,
        label: data.label,
        labelZh: data.labelZh,
        text: data.text,
        textZh: data.textZh,
      };
      removeFromAllLists(id);
      pushToList(id, listKey);
      applyPresets(id, selectedPresets(document.getElementById("admin-modal-form")));
    }

    if (type === "highlight") {
      const data = Object.fromEntries(fd.entries());
      const entry = {
        title: data.title,
        titleZh: data.titleZh,
        body: data.body,
        bodyZh: data.bodyZh,
        href: data.href || "resume.html",
      };
      if (mode === "edit") D.homeHighlights[ref.index] = entry;
      else D.homeHighlights.unshift(entry);
    }

    if (type === "opensource") {
      ensureOpensource();
      const data = Object.fromEntries(fd.entries());
      const entry = {
        en: data.en,
        zh: data.zh,
        highlight: fd.get("highlight") === "on",
      };
      if (mode === "edit") D.modules.opensource.items[ref.index] = entry;
      else D.modules.opensource.items.unshift(entry);
    }

    persist();
    closeModal();
    render();
  }

  function render() {
    renderNav();
    renderMain();
  }

  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  document.getElementById("admin-save").addEventListener("click", () => {
    persist();
    alert("已保存到浏览器 localStorage");
  });

  document.getElementById("admin-reset").addEventListener("click", () => {
    if (!confirm("清空后台数据并恢复 entries.js 默认？")) return;
    PortfolioStore.clear();
    PortfolioAPI.clearCustomEntries();
    location.reload();
  });

  document.getElementById("admin-export-json").addEventListener("click", async () => {
    const json = PortfolioStore.exportJson(D);
    try {
      await navigator.clipboard.writeText(json);
      alert("JSON 已复制到剪贴板");
    } catch {
      prompt("复制以下 JSON：", json);
    }
  });

  const importFile = document.getElementById("admin-import-file");
  document.getElementById("admin-import-json").addEventListener("click", () => {
    const mode = confirm(
      "确定 = 完全替换当前内容\n取消 = 合并导入（保留已有并叠加 JSON）"
    )
      ? "replace"
      : "merge";
    const pendingMode = mode;
    importFile.onchange = () => {
      const file = importFile.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          PortfolioStore.importJson(D, reader.result, pendingMode);
          alert("导入成功，页面将刷新");
          location.reload();
        } catch (e) {
          alert(e.message || "导入失败");
        }
        importFile.value = "";
      };
      reader.readAsText(file);
    };
    importFile.click();
  });

  document.getElementById("admin-modal-submit").addEventListener("click", () => {
    document.getElementById("admin-modal-form").requestSubmit();
  });

  updateStoreHint();
  render();
})();
