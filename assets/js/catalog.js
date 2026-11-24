/** 多应用导航站内容数据：博客、开源仓库、贡献记录。 */
window.PORTFOLIO_CATALOG = {
  blogCategories: [
    { id: "microelectronics", label: "微电", labelEn: "Microelectronics" },
    { id: "bsd", label: "BSD", labelEn: "BSD" },
    { id: "nix", label: "Nix", labelEn: "Nix" },
    { id: "fanet", label: "FANET", labelEn: "FANET" },
    { id: "paper", label: "论文阅读", labelEn: "Papers" },
    { id: "llm-safety", label: "大模型安全", labelEn: "LLM Safety" },
  ],

  posts: [
    {
      id: "ecc-signoff-checklist",
      category: "microelectronics",
      title: "ECC 签核清单",
      titleEn: "ECC signoff checklist",
      summary:
        "以检查即测试组织 DRC/LVS/STA/LEC/Harden/Area，区分机器契约与人类证据。",
      tags: ["signoff", "ECC"],
      files: [
        { label: "PDF", href: "assets/library/notes/ecc/checklist_ecc.pdf" },
        { label: "TeX", href: "assets/library/notes/ecc/checklist_ecc.tex" },
        { label: "Figures TeX", href: "assets/library/notes/ecc/checklist_ecc_figures.tex" },
      ],
    },
    {
      id: "ecc-cts-notes",
      category: "microelectronics",
      title: "ECC CTS 笔记",
      titleEn: "ECC clock-tree synthesis notes",
      summary: "时钟树综合、skippable flow 与 no-clock 设计相关的流程记录。",
      tags: ["CTS", "ECC"],
      files: [
        { label: "PDF", href: "assets/library/notes/ecc/cts_ecc.pdf" },
        { label: "TeX", href: "assets/library/notes/ecc/cts_ecc.tex" },
      ],
    },
    {
      id: "ecc-routing-notes",
      category: "microelectronics",
      title: "ECC 布线笔记",
      titleEn: "ECC routing notes",
      summary: "布局布线、DRC/LVS 检查与签核证据链的笔记。",
      tags: ["routing", "signoff"],
      files: [
        { label: "PDF", href: "assets/library/notes/ecc/routing_ecc.pdf" },
        { label: "TeX", href: "assets/library/notes/ecc/routing_ecc.tex" },
      ],
    },
    {
      id: "freebsd-build-and-test",
      category: "bsd",
      title: "FreeBSD 构建与 fuzz",
      titleEn: "FreeBSD build and fuzz",
      summary: "FreeBSD 源码树构建、测试与交叉环境记录。",
      tags: ["FreeBSD", "build"],
      files: [
        { label: "PDF", href: "assets/library/notes/bsd/freebsd_build_and_test.pdf" },
        { label: "TeX", href: "assets/library/notes/bsd/freebsd_build_and_test.tex" },
        { label: "Markdown", href: "assets/library/notes/bsd/FREEBSD_BUILD_AND_TEST.md" },
      ],
    },
    {
      id: "osos-freebsd-build-and-test",
      category: "bsd",
      title: "OSOS FreeBSD 构建与 fuzz",
      titleEn: "OSOS FreeBSD build and fuzz",
      summary: "OSOS 工作区中的 FreeBSD LaTeX 构建/测试笔记。",
      tags: ["FreeBSD", "OSOS"],
      files: [
        { label: "PDF", href: "assets/library/notes/bsd/osos-freebsd_build_and_test.pdf" },
        { label: "TeX", href: "assets/library/notes/bsd/osos-freebsd_build_and_test.tex" },
      ],
    },
    {
      id: "osos-latex-preamble",
      category: "bsd",
      title: "OSOS LaTeX 导言区",
      titleEn: "OSOS LaTeX preamble",
      summary: "OSOS 文档共用的 LaTeX preamble。",
      tags: ["LaTeX"],
      files: [
        { label: "TeX", href: "assets/library/notes/bsd/osos-preamble.tex" },
      ],
    },
    {
      id: "zjc-55nm-drm",
      category: "microelectronics",
      title: "ZJCX 55nm Design Rule Manual",
      titleEn: "ZJCX 55nm Design Rule Manual",
      summary: "55nm 设计规则手册，用于 DRC/LVS 规则理解与签核。",
      tags: ["PDK", "DRC"],
      files: [
        { label: "PDF", href: "assets/library/papers/microelectronics/ZJCX 55nm Design Rule Manual_V1.1.9.pdf" },
      ],
    },
    {
      id: "icsprout-calibre-lvs",
      category: "microelectronics",
      title: "ICsprout + Calibre LVS 快速上手",
      titleEn: "ICsprout + Calibre LVS quick start",
      summary: "ICsprout 与 Calibre LVS 联用快速入门。",
      tags: ["LVS", "Calibre"],
      files: [
        { label: "PDF", href: "assets/library/papers/microelectronics/quick-start_on_ICsprout_calibrelvs.pdf" },
      ],
    },
    {
      id: "razavi-delay-locked-loop",
      category: "microelectronics",
      title: "The Delay-Locked Loop [A Circuit for All Seasons]",
      titleEn: "The Delay-Locked Loop [A Circuit for All Seasons]",
      summary:
        "Behzad Razavi 在 IEEE Solid-State Circuits Magazine 的 DLL 教程：延迟锁定环的结构、锁定范围及其在时钟系统中的作用。",
      tags: ["DLL", "clocking", "Razavi"],
      files: [
        { label: "PDF", href: "assets/library/papers/microelectronics/BR_SSCM_3_2018.pdf" },
      ],
    },
    {
      id: "nix-eda-toolchain",
      category: "nix",
      title: "Nix EDA 工具链",
      titleEn: "Nix EDA toolchain",
      summary:
        "用 Nix 锁定 Magic、Netgen、KLayout、OpenROAD 等 EDA 工具，消除环境漂移。",
      tags: ["Nix", "EDA tools"],
      files: [
        { label: "Note", href: "assets/library/notes/nix/nix-eda-toolchain.md" },
      ],
    },
    {
      id: "fanet-routing-resilience",
      category: "fanet",
      title: "FANET 路由韧性",
      titleEn: "FANET routing resilience",
      summary: "面向 FANET 的路由韧性与抗毁性研究。",
      tags: ["FANET", "routing"],
      files: [
        { label: "PDF", href: "assets/library/papers/fanet/FANET_Routing_Resilience.pdf" },
      ],
    },
    {
      id: "fanet-energy-clustering",
      category: "fanet",
      title: "节能分簇",
      titleEn: "Energy-efficient clustering",
      summary: "无人机自组网中的节能分簇方案。",
      tags: ["FANET", "clustering"],
      files: [
        { label: "PDF", href: "assets/library/papers/fanet/Energy_Efficient_Clustering.pdf" },
      ],
    },
    {
      id: "fanet-ml-cluster-routing-6g",
      category: "fanet",
      title: "6G 机器学习分簇路由",
      titleEn: "ML cluster routing for 6G",
      summary: "结合机器学习与分簇路由的 6G FANET 研究。",
      tags: ["FANET", "6G", "ML"],
      files: [
        { label: "PDF", href: "assets/library/papers/fanet/ML_Cluster_Routing_6G.pdf" },
      ],
    },
    {
      id: "fanet-topology-path-planning",
      category: "fanet",
      title: "拓扑与路径规划",
      titleEn: "Topology and path planning",
      summary: "FANET 拓扑管理与路径规划方法。",
      tags: ["FANET", "path planning"],
      files: [
        { label: "PDF", href: "assets/library/papers/fanet/Topology_Path_Planning.pdf" },
      ],
    },
    {
      id: "fanet-real-world-experiments",
      category: "fanet",
      title: "真实场景 FANET 实验",
      titleEn: "Real-world FANET experiments",
      summary: "真实环境中的飞行自组网实验与评估。",
      tags: ["FANET", "experiments"],
      files: [
        { label: "PDF", href: "assets/library/papers/fanet/Real_World_FANET_Experiments.pdf" },
      ],
    },
    {
      id: "fanet-real-time-surveillance",
      category: "fanet",
      title: "实时监视 FANET",
      titleEn: "Real-time surveillance FANET",
      summary: "面向实时监视任务的 FANET 路由与资源方案。",
      tags: ["FANET", "surveillance"],
      files: [
        { label: "PDF", href: "assets/library/papers/fanet/Real_Time_Surveillance.pdf" },
      ],
    },
    {
      id: "neurips2026-internal-safety-collapse",
      category: "llm-safety",
      title: "[NeurIPS 2026] Safety failures in coding agents and frontier LLMs",
      titleEn: "Internal Safety Collapse in LLMs and Coding Agents",
      summary:
        "研究 coding agent 为完成任务而在良性任务中生成不安全内容的 Internal Safety Collapse，并验证前沿 LLM 仍存在内部安全坍塌。",
      tags: ["LLM safety", "NeurIPS 2026", "coding agents"],
      files: [
        { label: "PDF", href: "assets/library/papers/llm-safety/NeurIPS2026_Internal_Safety_Collapse.pdf" },
      ],
    },
  ],

  repos: [
    {
      owner: "openecos-projects",
      name: "ecc",
      url: "https://github.com/openecos-projects/ecc",
      domain: "EDA flow",
      summary:
        "以 Nix 锁定环境的 RTL-to-GDS 流程；关注 signoff、no-clock、CTS 与 PPA 导出。",
      tags: ["signoff", "no-clock", "cts"],
    },
    {
      owner: "openecos-projects",
      name: "icsprout55-pdk",
      url: "https://github.com/openecos-projects/icsprout55-pdk",
      domain: "PDK",
      summary: "55nm PDK 与 DRC/LVS 规则资料。",
      tags: ["PDK", "55nm"],
    },
    {
      owner: "fossi-foundation",
      name: "nix-eda",
      url: "https://github.com/fossi-foundation/nix-eda",
      domain: "Nix packaging",
      summary: "确定性 EDA 工具链打包，用于不可变签核环境。",
      tags: ["Nix", "EDA tools"],
    },
    {
      owner: "freebsd",
      name: "src",
      url: "https://git.freebsd.org/src.git",
      domain: "BSD",
      summary: "FreeBSD 官方源码树，用于系统层构建与 fuzz。",
      tags: ["FreeBSD", "src"],
    },
  ],

  contributions: [],
};
