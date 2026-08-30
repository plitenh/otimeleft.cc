/**
 * Portfolio 经历注册 API
 * ─────────────────────
 * 在 entries.js 里用工厂函数添加经历；简历页表单走同一套接口（存 localStorage）。
 *
 * 示例：
 *   R.job({ title: "...", titleZh: "...", date: "2026.01 – Present", bodyText: "一行一条\n第二行", presets: ["full"] });
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "portfolio-custom-entries-v1";

  function slug(prefix, text) {
    const base = String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28);
    return `${prefix}-${base || "item"}`;
  }

  function lines(text) {
    if (Array.isArray(text)) return text.filter(Boolean);
    if (!text) return [];
    return String(text)
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function uniqueId(registry, prefix, seed) {
    let id = slug(prefix, seed);
    let n = 2;
    while (registry.modules[id]) {
      id = `${slug(prefix, seed)}-${n}`;
      n += 1;
    }
    return id;
  }

  class PortfolioRegistry {
    constructor() {
      this.modules = {
        education: { type: "header-edu", pdfGroup: "profile" },
      };
      this.lists = {
        work: [],
        projects: [],
        skills: [],
        homeWork: [],
      };
      this.homeHighlights = [];
      this.awardsFeatured = null;
      this.awardsList = [];
      this.papers = [];
      this._presetAdds = [];
    }

    _pushList(listKey, id) {
      if (!this.lists[listKey]) this.lists[listKey] = [];
      if (!this.lists[listKey].includes(id)) this.lists[listKey].push(id);
    }

    _sections() {
      return global.PORTFOLIO?.sections || PortfolioStore.DEFAULT_SECTIONS;
    }

    _listKeyForGroup(pdfGroup, input) {
      if (input.listKey) return input.listKey;
      return PortfolioStore.resolveListKey(pdfGroup, this._sections());
    }

    /** 工作经历 → 主页时间线（可选）+ 简历 PDF 模块 */
    job(input) {
      const id = input.id || uniqueId(this, "work", input.title);
      const pdfGroup = input.pdfGroup || "experience";
      const listKey = this._listKeyForGroup(pdfGroup, input);
      const mod = {
        type: "job",
        pdfGroup,
        title: input.title,
        titleZh: input.titleZh,
        date: input.date,
        dateZh: input.dateZh || input.date,
        body: lines(input.body || input.bodyText),
        bodyZh: lines(input.bodyZh || input.bodyTextZh),
        previewLines: input.previewLines ?? 2,
        custom: Boolean(input.custom),
      };
      this.modules[id] = mod;
      this._pushList(listKey, id);
      if (input.showOnHome || input.home) this.home(id);
      if (input.presets) this.preset(input.presets, id);
      if (input.allPresets) this.presetAll(id);
      return id;
    }

    /** 项目 → 项目页 + 简历 PDF */
    project(input) {
      const id = input.id || uniqueId(this, "project", input.title);
      const pdfGroup = input.pdfGroup || "projects";
      const listKey = this._listKeyForGroup(pdfGroup, input);
      this.modules[id] = {
        type: "project",
        pdfGroup,
        title: input.title,
        titleZh: input.titleZh,
        date: input.date,
        dateZh: input.dateZh || input.date,
        tech: input.tech,
        techZh: input.techZh || input.tech,
        body: lines(input.body || input.bodyText),
        bodyZh: lines(input.bodyZh || input.bodyTextZh),
        custom: Boolean(input.custom),
      };
      this._pushList(listKey, id);
      if (input.presets) this.preset(input.presets, id);
      if (input.allPresets) this.presetAll(id);
      return id;
    }

    /** 技能条 → 仅简历 PDF */
    skill(input) {
      const id = input.id || uniqueId(this, "skills", input.label);
      const pdfGroup = input.pdfGroup || "skills";
      const listKey = this._listKeyForGroup(pdfGroup, input);
      this.modules[id] = {
        type: "skill",
        pdfGroup,
        label: input.label,
        labelZh: input.labelZh,
        text: input.text,
        textZh: input.textZh,
        custom: Boolean(input.custom),
      };
      this._pushList(listKey, id);
      if (input.presets) this.preset(input.presets, id);
      if (input.allPresets) this.presetAll(id);
      return id;
    }

    /** 论文 → 论文页 + 可选简历 PDF */
    paper(input) {
      const id = input.id || uniqueId(this, "paper", input.title);
      const entry = {
        id,
        title: input.title,
        titleZh: input.titleZh || input.title,
        authors: input.authors || "",
        authorsZh: input.authorsZh || input.authors || "",
        venue: input.venue || "",
        venueZh: input.venueZh || input.venue || "",
        level: input.level || "preprint",
        levelLabel: input.levelLabel || input.level || "Preprint",
        levelLabelZh: input.levelLabelZh || input.levelLabel || "",
        link: input.link || "",
        intro: input.intro || "",
        introZh: input.introZh || input.intro || "",
        image: input.image || "",
        custom: Boolean(input.custom),
      };
      this.papers.push(entry);
      if (input.presets) this.preset(input.presets, "papers");
      if (input.allPresets) this.presetAll("papers");
      return id;
    }

    /** 主页方向卡片 */
    highlight(input) {
      this.homeHighlights.push({
        title: input.title,
        titleZh: input.titleZh,
        body: input.body,
        bodyZh: input.bodyZh,
        href: input.href || "resume.html",
        custom: Boolean(input.custom),
      });
      return this.homeHighlights.length - 1;
    }

    /** 荣誉页卡片；alsoResume 时同步进简历「志愿与开源」列表 */
    award(input) {
      const entry = {
        title: input.title,
        titleZh: input.titleZh,
        result: input.result,
        resultZh: input.resultZh,
        blurb: input.blurb,
        blurbZh: input.blurbZh,
        featured: Boolean(input.featured),
        custom: Boolean(input.custom),
      };
      if (input.featured) this.awardsFeatured = entry;
      else this.awardsList.push(entry);
      if (input.alsoResume) {
        this.opensourceItem({
          en: `${input.title} — ${input.result}. ${input.blurb}`,
          zh: `${input.titleZh} — ${input.resultZh}。${input.blurbZh}`,
          highlight: input.featured,
        });
      }
      return entry;
    }

    /** 简历 PDF 里的开源/志愿 bullet（写入 opensource 模块） */
    opensourceItem(input) {
      this._ensureOpensource();
      const item = {
        en: input.en || input.text,
        zh: input.zh || input.textZh,
        highlight: Boolean(input.highlight),
        custom: Boolean(input.custom),
      };
      this.modules.opensource.items.push(item);
      return item;
    }

    /** 置顶荣誉（荣誉页大卡片） */
    featuredAward(input) {
      return this.award({ ...input, featured: true });
    }

    /** 指定模块出现在主页「近期经历」 */
    home(moduleId) {
      if (!this.lists.homeWork.includes(moduleId)) this.lists.homeWork.push(moduleId);
      return this;
    }

    /** 登记：稍后写入某个 preset 的 modules 列表（在 buildInto 时执行） */
    preset(presetIds, moduleId) {
      const ids = Array.isArray(presetIds) ? presetIds : [presetIds];
      ids.forEach((presetId) => {
        this._presetAdds.push({ presetId, moduleId });
      });
      return this;
    }

    /** 加入所有已声明的 preset */
    presetAll(moduleId) {
      this._presetAdds.push({ presetId: "*", moduleId });
      return this;
    }

    _ensureOpensource() {
      if (!this.modules.opensource) {
        const honors = this._sections().find((s) => s.moduleId === "opensource" || s.id === "honors");
        this.modules.opensource = {
          type: "list",
          pdfGroup: honors?.id || "honors",
          title: honors?.label || "Volunteer & Open Source",
          titleZh: honors?.labelZh || honors?.titleZh || "志愿与开源经历",
          items: [],
        };
      }
    }

    exportPayload() {
      return {
        modules: this.modules,
        lists: this.lists,
        homeHighlights: this.homeHighlights,
        awardsFeatured: this.awardsFeatured,
        awardsList: this.awardsList,
        papers: this.papers,
        presetAdds: this._presetAdds.slice(),
      };
    }

    /** 合并进 window.PORTFOLIO（site / nav / presets 保留在 data.js） */
    buildInto(target) {
      const payload = this.exportPayload();
      target.modules = payload.modules;
      target.lists = payload.lists;
      target.homeHighlights = payload.homeHighlights;
      target.awardsFeatured = payload.awardsFeatured;
      target.awardsList = payload.awardsList;
      target.papers = payload.papers;

      PortfolioStore.ensureSections(target);

      if (!target.modules.papers && payload.papers.length) {
        const papersSec = target.sections.find((s) => s.kind === "papers");
        target.modules.papers = {
          type: "papers",
          pdfGroup: papersSec?.id || "papers",
          title: papersSec?.label || "Publications",
          titleZh: papersSec?.titleZh || papersSec?.labelZh || "论文与报告",
        };
      }

      if (target.presets && payload.presetAdds.length) {
        payload.presetAdds.forEach(({ presetId, moduleId }) => {
          if (presetId === "*") {
            target.presets.forEach((p) => {
              if (!p.modules.includes(moduleId)) p.modules.push(moduleId);
            });
          } else {
            const p = target.presets.find((x) => x.id === presetId);
            if (p && !p.modules.includes(moduleId)) p.modules.push(moduleId);
          }
        });
      }

      // full 预设自动包含所有非 custom 模块（custom 由用户勾选）
      const full = target.presets && target.presets.find((p) => p.id === "full");
      if (full) {
        Object.keys(payload.modules).forEach((id) => {
          if (id !== "education" && !full.modules.includes(id)) full.modules.push(id);
        });
      }

      return target;
    }
  }

  function readCustomRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function writeCustomRaw(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  /** 把 localStorage 里的自定义经历灌进 registry */
  function applyCustomEntries(registry) {
    readCustomRaw().forEach((entry) => {
      const data = { ...entry.data, custom: true };
      switch (entry.kind) {
        case "job":
          registry.job(data);
          break;
        case "project":
          registry.project(data);
          break;
        case "skill":
          registry.skill(data);
          break;
        case "award":
          registry.award(data);
          break;
        case "opensource":
          registry.opensourceItem(data);
          break;
        case "highlight":
          registry.highlight(data);
          break;
        default:
          break;
      }
      if (entry.presetIds && entry.moduleId) {
        registry.preset(entry.presetIds, entry.moduleId);
      }
    });
  }

  /** 运行时添加并持久化（简历页表单用） */
  function persistEntry(kind, data, options = {}) {
    const registry = new PortfolioRegistry();
    applyCustomEntries(registry);
    let moduleId = null;

    switch (kind) {
      case "job":
        moduleId = registry.job(data);
        break;
      case "project":
        moduleId = registry.project(data);
        break;
      case "skill":
        moduleId = registry.skill(data);
        break;
      case "award":
        registry.award(data);
        break;
      case "opensource":
        registry.opensourceItem(data);
        moduleId = "opensource";
        break;
      case "highlight":
        registry.highlight(data);
        break;
      default:
        throw new Error(`Unknown kind: ${kind}`);
    }

    const stored = readCustomRaw();
    stored.push({
      kind,
      data,
      moduleId,
      presetIds: options.presetIds || null,
      createdAt: new Date().toISOString(),
    });
    writeCustomRaw(stored);

    if (options.presetIds && moduleId && moduleId !== "opensource") {
      const last = stored[stored.length - 1];
      last.presetIds = options.presetIds;
      writeCustomRaw(stored);
    }

    return { moduleId, registry };
  }

  function clearCustomEntries() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function listCustomEntries() {
    return readCustomRaw();
  }

  /** 生成可粘贴进 entries.js 的代码片段 */
  function snippetForEntry(entry) {
    const d = entry.data;
    const esc = (s) => JSON.stringify(s);
    switch (entry.kind) {
      case "job":
        return `R.job({
  title: ${esc(d.title)},
  titleZh: ${esc(d.titleZh)},
  date: ${esc(d.date)},
  dateZh: ${esc(d.dateZh || d.date)},
  bodyText: ${esc((d.body || []).join("\n") || d.bodyText || "")},
  bodyTextZh: ${esc((d.bodyZh || []).join("\n") || d.bodyTextZh || "")},
  showOnHome: ${Boolean(d.showOnHome || d.home)},
  presets: ${JSON.stringify(entry.presetIds || ["full"])},
});`;
      case "project":
        return `R.project({
  title: ${esc(d.title)},
  titleZh: ${esc(d.titleZh)},
  date: ${esc(d.date)},
  tech: ${esc(d.tech || "")},
  techZh: ${esc(d.techZh || d.tech || "")},
  bodyText: ${esc((d.body || []).join("\n") || d.bodyText || "")},
  bodyTextZh: ${esc((d.bodyZh || []).join("\n") || d.bodyTextZh || "")},
  presets: ${JSON.stringify(entry.presetIds || ["full"])},
});`;
      case "skill":
        return `R.skill({
  label: ${esc(d.label)},
  labelZh: ${esc(d.labelZh)},
  text: ${esc(d.text)},
  textZh: ${esc(d.textZh)},
  presets: ${JSON.stringify(entry.presetIds || ["full"])},
});`;
      case "award":
        return `R.award({
  title: ${esc(d.title)},
  titleZh: ${esc(d.titleZh)},
  result: ${esc(d.result)},
  resultZh: ${esc(d.resultZh)},
  blurb: ${esc(d.blurb)},
  blurbZh: ${esc(d.blurbZh)},
  featured: ${Boolean(d.featured)},
  alsoResume: ${Boolean(d.alsoResume)},
});`;
      case "opensource":
        return `R.opensourceItem({
  en: ${esc(d.en || d.text)},
  zh: ${esc(d.zh || d.textZh)},
  highlight: ${Boolean(d.highlight)},
});`;
      case "highlight":
        return `R.highlight({
  title: ${esc(d.title)},
  titleZh: ${esc(d.titleZh)},
  body: ${esc(d.body)},
  bodyZh: ${esc(d.bodyZh)},
  href: ${esc(d.href || "resume.html")},
});`;
      default:
        return "";
    }
  }

  global.PortfolioRegistry = PortfolioRegistry;
  global.PortfolioAPI = {
    create: () => new PortfolioRegistry(),
    applyCustomEntries,
    persistEntry,
    clearCustomEntries,
    listCustomEntries,
    snippetForEntry,
    snippetsAll: () => readCustomRaw().map(snippetForEntry).join("\n\n"),
    STORAGE_KEY,
  };
})(window);
