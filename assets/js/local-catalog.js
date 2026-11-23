/**
 * 本地目录存储：仓库、贡献、账户等个人信息只保存在浏览器 localStorage。
 */
(function (global) {
  "use strict";

  const KEY = "otimeleft-local-catalog-v1";

  function defaults() {
    return {
      version: 1,
      updatedAt: null,
      accounts: [],
      repos: [],
      contributions: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return defaults();
      return { ...defaults(), ...data };
    } catch {
      return defaults();
    }
  }

  function save(data) {
    data.version = 1;
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  function exportJson() {
    return JSON.stringify(load(), null, 2);
  }

  function importJson(raw, mode) {
    let data;
    try {
      data = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      throw new Error("JSON 格式无效");
    }
    if (!data || typeof data !== "object") throw new Error("JSON 根对象无效");

    const next = mode === "merge" ? load() : defaults();
    if (Array.isArray(data.accounts)) next.accounts = data.accounts;
    if (Array.isArray(data.repos)) next.repos = data.repos;
    if (Array.isArray(data.contributions)) next.contributions = data.contributions;
    if (data.notes) next.notes = data.notes;
    return save(next);
  }

  function applyTo(catalog) {
    const local = load();
    catalog.accounts = local.accounts || [];
    catalog.repos = [...(catalog.repos || []), ...(local.repos || [])];
    catalog.contributions = [
      ...(catalog.contributions || []),
      ...(local.contributions || []),
    ];
    return catalog;
  }

  global.LocalCatalogStore = {
    KEY,
    defaults,
    load,
    save,
    clear,
    exportJson,
    importJson,
    applyTo,
  };

  if (global.PORTFOLIO_CATALOG) {
    applyTo(global.PORTFOLIO_CATALOG);
  }
})(window);
