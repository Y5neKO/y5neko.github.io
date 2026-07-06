/* ==========================================================
   站点内容数据源(单一事实来源)
   —— 项目 / 个人资料 / 统计 / 联系方式集中在此,页面各处由 script.js
      读取本文件渲染,改信息 / 加项目只需编辑这里,无需动 HTML。

   加一个项目:往 projects 数组末尾复制一个 { } 对象改内容即可。
     key      唯一标识(小写,作 data-proj)
     name     左侧索引显示名
     heading  详情面板标题(省略则同 name)
     lang     语言标签(左侧索引右对齐显示)
     repo     GitHub 仓库 "用户/仓库",用于 ★ star 数与跳转
     preview  { img, alt } 用截图 / { label } 用三字母占位块
     desc     一句话简介
     features 特性条目数组
     tags     底部技术标签数组
   ========================================================== */
const SITE = {
  // ---- 个人资料:about 代码块 + 终端 whoami / about.json / motto.txt 共用 ----
  profile: {
    name: 'Y5neKO',
    alias: 'Y5ねこ / Y5n3K0',
    role: '网络安全 / 渗透测试 / CTFer',
    location: 'Chengdu, China',
    team: 'Y5Sec',
    skills: ['Java', 'Python', 'PHP', 'C'],
    learning: ['Reverse', 'PWN', 'CodeAudit'],
    hobbies: ['Anime', 'Novel', 'Music'],
    vulns: [
      'CVE-2024-39071', 'CVE-2024-39072',
      'CNVD-2024-29955', 'CNVD-2024-39609',
      'CNVD-2024-39888', 'CNVD-2024-42668',
      'CNVD-2024-43066', 'CNVD-2024-44216',
      'CNVD-2024-45972', 'CNVD-2026-23984',
      'CNVD-2026-25278',
    ],
    motto: 'Walk between the black and white.',
  },

  // ---- 统计数字(滚动动画目标值)----
  stats: [
    { num: 72, label: '开源仓库' },
    { num: 127, label: 'GitHub 关注者' },
    { num: 11, label: 'CVE / CNVD 编号' },
    { num: 8, label: '混迹安全圈(年)' },
  ],

  // ---- 项目 ----
  projects: [
    {
      key: 'shiroexp',
      name: 'ShiroEXP',
      lang: 'Java',
      repo: 'Y5neKO/ShiroEXP',
      preview: { img: 'images/shiroexp.png', alt: 'ShiroEXP 界面预览' },
      desc: 'Shiro漏洞综合利用工具',
      features: [
        '爆破rememberMe',
        '漏洞探测(Shiro550、Shiro721)',
        '探测回显链',
        '探测依赖（FindClassByURLDNS、FindClassByBomb）',
        '命令执行',
        '注入内存马',
        '全局代理',
      ],
      tags: ['Java', 'JDK 8u431'],
    },
    {
      key: 'closure',
      name: 'ClosureVulnScanner',
      heading: 'CVS - ClosureVulnScanner',
      lang: 'Python',
      repo: 'Y5neKO/ClosureVulnScanner',
      preview: { img: 'images/closure.png', alt: 'ClosureVulnScanner 图标' },
      desc: '基于Python的Web综合漏洞扫描器,名字取自 Arknights® Closure',
      features: [
        'v0.1:实现了基础功能，包括指纹、exp、poc、多线程以及代理等功能',
        'v0.2:重构了代码结构，优化多线程算法，修复了部分bug',
      ],
      tags: ['Python 3.8.0', 'Arknights'],
    },
    {
      key: 'mon3tr',
      name: 'Mon3trProject',
      lang: 'Python',
      repo: 'Y5neKO/Mon3trProject',
      preview: { img: 'images/mon3tr.png', alt: 'Mon3trProject 界面预览' },
      desc: 'Mon3tr流量加密客户端,名字取自 Arknights® Mon3tr',
      features: [
        'Webshell Management Client,目前仅用作个人用途，因此开发方向主观性较强，且代码比较随意(菜)，欢迎大佬们提Issue或者pull完善算法',
        'v0.2:当前仅支持php，新增二级混淆模板，进一步提升了混淆效果，目前能过几乎所有静态查杀；新增shell模式，优化命令执行效率',
      ],
      tags: ['Python 3.8.10', 'PHP', 'Arknights'],
    },
    {
      key: 'ycrypto',
      name: 'YCryptoTools',
      lang: 'Java',
      repo: 'Y5neKO/YCryptoTools',
      preview: { label: 'YCT' },
      desc: '前端加解密 BurpSuite 插件,加解密请求响应数据,方便渗透测试中分析 HTTP 流量',
      features: [
        '预置请求参数匹配规则(GET参数、POST参数、GET和POST参数)',
        '预置请求参数格式匹配(x-www、JSON)',
        '内置算法:URL、AES、DES、RSA、BASE64、MD5、SHA-1、SM2、SM3、SM4',
      ],
      tags: ['Java', 'BurpSuite Plugin', 'JDK 8u421'],
    },
    {
      key: 'quickred',
      name: 'QuickRedTools',
      lang: 'Java',
      repo: 'Y5neKO/QuickRedTools',
      preview: { label: 'QRT' },
      desc: '基于 JavaFX 开发的渗透测试快速启动工具',
      features: [
        '环境管理:支持配置 Java、Python、Go、Gem、Node.js 等多种开发环境',
        '工具分类管理,便于归类各类渗透工具',
        '一键启动,支持自定义启动参数与工作目录',
        '配置数据 JSON 持久化,重启不丢失',
      ],
      tags: ['Java', 'JavaFX'],
    },
    {
      key: 'ssreport',
      name: 'SSReportTools',
      lang: 'Java',
      repo: 'Y5neKO/SSReportTools',
      preview: { label: 'SST' },
      desc: '基于 JavaFX 开发的图形化安服/渗透测试报告自动生成工具,安服渗透仔摸鱼划水必备',
      features: [
        '占位符 + OpenXML 解析替换,自动生成安服/渗透测试报告',
        '漏洞库编辑与自定义报告模板制作',
        'AI 辅助生成漏洞描述',
        'TODO:批量生成报告',
      ],
      tags: ['Java', 'JavaFX', 'JDK 8'],
    },
    {
      key: 'suo5node',
      name: 'Suo5forNodejs',
      lang: 'JavaScript',
      repo: 'Y5neKO/Suo5forNodejs',
      preview: { label: 'S5N' },
      desc: '适用于 Node.js 环境下的 Suo5 内存马',
      features: [
        'Next.js 自动检测,支持全双工/半双工/短连接三种模式',
        '适配 CVE-2025-55182 / CVE-2025-66478(React Server Components RCE / Next.js RCE)',
        '兼容 Suo5 客户端 v2.0.0',
      ],
      tags: ['JavaScript', 'Node.js', 'Suo5'],
    },
    {
      key: 'ysock',
      name: 'YSOCK',
      lang: 'Go',
      repo: 'Y5neKO/YSOCK',
      preview: { label: 'YSK' },
      desc: '基于 Web 的 SOCKS5 隧道代理工具,通过 PHP/JSP/JSPX/ASPX/ASP 脚本在目标服务器建立加密隧道',
      features: [
        '多 Payload 支持:PHP / JSP / JSPX / ASPX / ASP',
        '三种传输模式自动切换:Full Duplex / Half Duplex / Classic',
        '加密通信:SHA256-CTR + HMAC-SHA256',
        '多路复用:单 HTTP 连接承载多个 SOCKS5 会话',
      ],
      tags: ['Go', 'SOCKS5', 'Web Shell'],
    },
  ],

  // ---- 兴趣:游戏 / 追番等,按块扩展 ----
  // 加一个游戏:复制一个 { } 改内容;server / uid 留空则显示占位符,待录入
  //   key     唯一标识(小写)
  //   name    中文名
  //   en      英文名(卡片副标)
  //   icon    官方图标路径(images/games/)
  //   server  游戏服务器(如 官服 / B服 / 国际服)
  //   uid     游戏内 UID
  interests: {
    games: [
      { key: 'arknights', name: '明日方舟', en: 'Arknights', icon: 'images/games/arknights.jpg', server: '中国 · 官服', uid: '403061027' },
      { key: 'endfield', name: '明日方舟：终末地', en: 'Arknights: Endfield', icon: 'images/games/endfield.jpg', server: '中国 · 官服', uid: '1315578679' },
      { key: 'bluearchive', name: '蔚蓝档案', en: 'Blue Archive', icon: 'images/games/bluearchive.jpg', server: '中国 · 官服', uid: '' },
      { key: 'genshin', name: '原神', en: 'Genshin Impact', icon: 'images/games/genshin.jpg', server: '中国 · 官服', uid: '106652539' },
      { key: 'wutheringwaves', name: '鸣潮', en: 'Wuthering Waves', icon: 'images/games/wutheringwaves.png', server: '中国 · 官服', uid: '134294442' },
    ],
  },

  // ---- 联系方式 ----
  contact: {
    intro: '合作意向或技术交流,可通过以下渠道联系。',
    links: [
      { label: 'GitHub', href: 'https://github.com/Y5neKO' },
      { label: 'Blog', href: 'https://y5neko.github.io/blog/' },
      { label: 'Bilibili', href: 'https://space.bilibili.com/35199034' },
    ],
  },
};
