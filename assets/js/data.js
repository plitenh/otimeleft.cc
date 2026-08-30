/** 站点配置 — 改姓名、联系方式等；经历内容在 entries.js 或 admin.html */
window.PORTFOLIO = {
  site: {
    name: "Your Name",
    nameZh: "你的姓名",
    title: "Your headline · e.g. Systems · Software Engineering",
    titleZh: "一句话方向 · 例如：系统软件 · 后端开发",
    affiliation: "Your affiliation · School or Company",
    affiliationZh: "学校或单位 · 专业/岗位",
    email: "you@example.com",
    phone: "",
    github: "https://github.com/yourname",
    githubLabel: "github.com/yourname",
    age: "",
    nationality: "",
    nationalityZh: "",
    education: "Degree · School · Major (years)",
    educationZh: "学历 · 学校 · 专业（年份）",
    thesis:
      "A short intro in English: what you do, what you're looking for, and what you're good at. Two or three sentences is enough.",
    thesisZh:
      "用中文写一段简短自我介绍：做什么方向、求职意向、核心优势。两三句话即可。",
    tags: ["Tag 1", "Tag 2", "Tag 3"],
    links: [
      { label: "GitHub", url: "https://github.com/yourname" },
      { label: "Email", url: "mailto:you@example.com" },
    ],
    stats: [
      { value: "—", label: "Stat 1", labelZh: "数据项 1" },
      { value: "—", label: "Stat 2", labelZh: "数据项 2" },
    ],
    templateMode: true,
  },

  nav: [
    { id: "home", href: "index.html", label: "Home", labelZh: "主页" },
    { id: "resume", href: "resume.html", label: "Resume", labelZh: "简历" },
    { id: "projects", href: "projects.html", label: "Projects", labelZh: "项目" },
    { id: "papers", href: "papers.html", label: "Papers", labelZh: "论文" },
    { id: "awards", href: "awards.html", label: "Honors", labelZh: "荣誉" },
  ],

  /** 简历 PDF / 组合器分区抬头（可在 admin「模块抬头」增删改） */
  sections: [
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
  ],

  presets: [
    {
      id: "systems",
      label: "Systems / Backend",
      labelZh: "系统 / 后端",
      modules: ["education"],
    },
    {
      id: "embedded",
      label: "Embedded / Hardware",
      labelZh: "嵌入式 / 硬件",
      modules: ["education"],
    },
    {
      id: "frontend",
      label: "Frontend / Full-stack",
      labelZh: "前端 / 全栈",
      modules: ["education"],
    },
    {
      id: "full",
      label: "Full profile",
      labelZh: "完整版",
      modules: ["education"],
    },
  ],
};
