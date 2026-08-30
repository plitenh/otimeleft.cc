/**
 * 内容存储 + 简历分区（模块抬头）默认配置
 */
(function (global) {
  "use strict";

  const STORE_KEY = "portfolio-admin-store-v1";

  const DEFAULT_SECTIONS = [
    {
      id: "profile",
      label: "Profile",
      labelZh: "基本信息",
      kind: "profile",
      order: 0,
      locked: true,
    },
    {
      id: "experience",
      label: "Work Experience",
      labelZh: "工作经历",
      kind: "jobs",
      listKey: "work",
      order: 1,
    },
    {
      id: "projects",
      label: "Project Experience",
      labelZh: "项目经历",
      kind: "projects",
      listKey: "projects",
      order: 2,
    },
    {
      id: "papers",
      label: "Publications",
      labelZh: "论文与报告",
      kind: "papers",
      order: 3,
    },
    {
      id: "honors",
      label: "Volunteer & Open Source",
      labelZh: "志愿与开源经历",
      kind: "list",
      moduleId: "opensource",
      order: 4,
    },
    {
      id: "skills",
      label: "Technical Skills",
      labelZh: "技术栈与核心能力",
      kind: "skills",
      listKey: "skills",
      order: 5,
    },
  ];

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function slugId(text) {
    const base = String(text || "section")
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);
    return base || "section";
  }

  function ensureSections(portfolio) {
    if (!portfolio.sections || !portfolio.sections.length) {
      portfolio.sections = deepClone(DEFAULT_SECTIONS);
    }
    portfolio.sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return portfolio.sections;
  }

  function getSections(portfolio) {
    return ensureSections(portfolio);
  }

  function resolveListKey(sectionId, sections) {
    const s = sections?.find((x) => x.id === sectionId);
    if (s?.listKey) return s.listKey;
    const map = { experience: "work", projects: "projects", skills: "skills" };
    return map[sectionId] || sectionId;
  }

  function sectionByKind(portfolio, kind) {
    return getSections(portfolio).filter((s) => s.kind === kind);
  }

  function snapshot(portfolio) {
    ensureSections(portfolio);
    return {
      version: 2,
      updatedAt: new Date().toISOString(),
      site: deepClone(portfolio.site || {}),
      sections: deepClone(portfolio.sections),
      modules: deepClone(portfolio.modules || {}),
      lists: deepClone(portfolio.lists || {}),
      homeHighlights: deepClone(portfolio.homeHighlights || []),
      awardsFeatured: portfolio.awardsFeatured
        ? deepClone(portfolio.awardsFeatured)
        : null,
      awardsList: deepClone(portfolio.awardsList || []),
      papers: deepClone(portfolio.papers || []),
      presets: deepClone(portfolio.presets || []),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      return data;
    } catch {
      return null;
    }
  }

  function save(store) {
    store.version = 2;
    store.updatedAt = new Date().toISOString();
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    return store;
  }

  function saveFromPortfolio(portfolio) {
    return save(snapshot(portfolio));
  }

  function applyStoreToPortfolio(portfolio, store) {
    if (!store) return false;
    if (store.site) portfolio.site = { ...portfolio.site, ...store.site };
    if (store.sections) portfolio.sections = store.sections;
    if (store.modules) portfolio.modules = store.modules;
    if (store.lists) portfolio.lists = store.lists;
    if (store.homeHighlights) portfolio.homeHighlights = store.homeHighlights;
    portfolio.awardsFeatured = store.awardsFeatured ?? portfolio.awardsFeatured;
    if (store.awardsList) portfolio.awardsList = store.awardsList;
    if (store.papers) portfolio.papers = store.papers;
    if (store.presets) portfolio.presets = store.presets;
    ensureSections(portfolio);
    return true;
  }

  function apply(portfolio) {
    return applyStoreToPortfolio(portfolio, load());
  }

  function clear() {
    localStorage.removeItem(STORE_KEY);
  }

  function hasStore() {
    return Boolean(localStorage.getItem(STORE_KEY));
  }

  function exportJson(portfolio) {
    return JSON.stringify(snapshot(portfolio), null, 2);
  }

  /** 解析并导入 JSON；mode: replace | merge */
  function importJson(portfolio, raw, mode = "replace") {
    let data;
    try {
      data = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      throw new Error("JSON 格式无效");
    }
    if (!data || typeof data !== "object") {
      throw new Error("JSON 根对象无效");
    }

    if (mode === "merge") {
      if (data.site) portfolio.site = { ...portfolio.site, ...data.site };
      if (data.sections) portfolio.sections = data.sections;
      if (data.modules) {
        portfolio.modules = { ...portfolio.modules, ...data.modules };
      }
      if (data.lists) {
        portfolio.lists = { ...portfolio.lists, ...data.lists };
      }
      if (data.homeHighlights) {
        portfolio.homeHighlights = [
          ...portfolio.homeHighlights,
          ...data.homeHighlights,
        ];
      }
      if (data.awardsFeatured) portfolio.awardsFeatured = data.awardsFeatured;
      if (data.awardsList) {
        portfolio.awardsList = [...(portfolio.awardsList || []), ...data.awardsList];
      }
      if (data.papers) {
        portfolio.papers = [...(portfolio.papers || []), ...data.papers];
      }
      if (data.presets) portfolio.presets = data.presets;
    } else {
      applyStoreToPortfolio(portfolio, data);
    }

    ensureSections(portfolio);
    saveFromPortfolio(portfolio);
    return portfolio;
  }

  function createListModule(portfolio, section) {
    const moduleId = section.moduleId || `list-${section.id}`;
    if (!portfolio.modules[moduleId]) {
      portfolio.modules[moduleId] = {
        type: "list",
        pdfGroup: section.id,
        title: section.label,
        titleZh: section.labelZh,
        items: [],
      };
    } else {
      portfolio.modules[moduleId].pdfGroup = section.id;
      portfolio.modules[moduleId].title = section.label;
      portfolio.modules[moduleId].titleZh = section.labelZh;
    }
    section.moduleId = moduleId;
    return moduleId;
  }

  function addSection(portfolio, input) {
    ensureSections(portfolio);
    let id = slugId(input.label || input.labelZh);
    let n = 2;
    while (portfolio.sections.some((s) => s.id === id)) {
      id = `${slugId(input.label)}-${n}`;
      n += 1;
    }
    const maxOrder = portfolio.sections.reduce(
      (m, s) => Math.max(m, s.order ?? 0),
      0
    );
    const section = {
      id,
      label: input.label || "New Section",
      labelZh: input.labelZh || input.label || "新分区",
      kind: input.kind || "jobs",
      order: maxOrder + 1,
    };
    if (section.kind === "jobs" || section.kind === "projects" || section.kind === "skills") {
      section.listKey = input.listKey || id;
      if (!portfolio.lists[section.listKey]) portfolio.lists[section.listKey] = [];
    }
    if (section.kind === "list") {
      createListModule(portfolio, section);
    }
    if (section.kind === "papers") {
      portfolio.modules.papers = portfolio.modules.papers || {
        type: "papers",
        pdfGroup: "papers",
        title: section.label,
        titleZh: section.labelZh,
      };
    }
    portfolio.sections.push(section);
    return section;
  }

  function deleteSection(portfolio, sectionId) {
    const section = portfolio.sections.find((s) => s.id === sectionId);
    if (!section || section.locked) return false;

    Object.keys(portfolio.modules).forEach((id) => {
      if (portfolio.modules[id].pdfGroup === sectionId) {
        delete portfolio.modules[id];
      }
    });

    if (section.listKey && portfolio.lists[section.listKey]) {
      delete portfolio.lists[section.listKey];
    }
    if (section.moduleId) {
      delete portfolio.modules[section.moduleId];
    }
    if (section.kind === "papers") {
      delete portfolio.modules.papers;
    }

    portfolio.presets.forEach((p) => {
      p.modules = p.modules.filter((m) => {
        if (m === sectionId) return false;
        if (section.moduleId && m === section.moduleId) return false;
        if (section.kind === "papers" && m === "papers") return false;
        return true;
      });
    });

    portfolio.sections = portfolio.sections.filter((s) => s.id !== sectionId);
    return true;
  }

  global.PortfolioStore = {
    STORE_KEY,
    DEFAULT_SECTIONS,
    snapshot,
    load,
    save,
    saveFromPortfolio,
    apply,
    applyStoreToPortfolio,
    clear,
    hasStore,
    exportJson,
    importJson,
    ensureSections,
    getSections,
    resolveListKey,
    sectionByKind,
    addSection,
    deleteSection,
    createListModule,
    slugId,
  };
})(window);
