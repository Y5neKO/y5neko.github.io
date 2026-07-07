/* ==========================================================
   Y5neKO 个人主页脚本
   特效配置 / 监控站背景 / 可交互终端 / 滚动渐入 / 故障特效 / 隐藏指令
   ========================================================== */

// ---------- 0. 特效配置:config.json 独立开关每个特效 ----------
// 默认全开;config.json 加载失败(如 file:// 直开)时按默认值运行
const FX = {
  scanlines: true,        // 常驻 CRT 扫描线
  noise: true,            // 电视噪点
  scanbeam: true,         // 缓慢下移扫光带
  glitchBursts: true,     // 全屏随机故障爆发(三种变体)
  ghostGlimpse: true,     // 数据块里的"她":人影碎片闪现 + 低频凝视
  textCorruption: true,   // 全局文字乱码闪烁
  glitchTitle: true,      // 标题/logo 双通道色散错位
  dust: true,             // 漂浮尘埃粒子
  syslog: true,           // 左下系统日志流
  recBadge: true,         // 左上角 REC 录制标识(故障爆发时"失去信号")
  avatarGlitch: true,     // 头像故障切片
  titleDecode: true,      // 章节标题乱码解码入场
  btnScramble: true,      // 按钮 hover 文字乱码
  projSwitchGlitch: true, // 项目切换撕裂过渡
  previewRgbSplit: true,  // 预览图 hover RGB 通道分离
  statScramble: true,     // 统计数字滚动乱码帧
  crtModal: true,         // 弹窗 CRT 开机动画
  snapBurst: true,        // 翻页切换时触发微故障
  monitorCut: true,       // 翻页监控切台:雪花硬切+OSD(关闭回退平滑滚动)
  customCursor: true,     // 十字准星光标,可点击元素变品红锁定框(纯 CSS)
  contextMenu: true,      // 自定义右键菜单:导航/复制/外链控制面板
  termGhost: true,        // 终端入侵:页面久置时"她"在终端里打字又逐字删掉
  tabGhost: true,         // 标签页失守:切走后标题渐渐乱码、favicon 亮起红点
  consoleEgg: true,       // 控制台彩蛋:DevTools 里的 PRTS 接管横幅
  visitMemory: true,      // 她记得你:回访次数越多凝视越大胆,日志点名回访
  recRewind: true,        // REC 时间码偶尔倒跳 1~3 秒再恢复(依赖 recBadge)
  nightShift: true,       // 深夜档:0~5 点特效更密,日志混入夜班专属线
  crossFeed: true,        // 串台:切台小概率误入死频道 CH-?? 再被抢回(依赖 monitorCut)
  deadPixels: true,       // 坏点:每次会话随机 2~3 个常亮像素,压在所有画面之上
  copyTrace: true,        // 复制被截获:复制文字时日志播报剪贴板被镜像
  glitchAudio: false,     // 故障音效:爆发/切台电流杂音 + 凝视低鸣(唯一默认关闭项)
  offlineSignal: true,    // 断网失联:offline 时全页 NO SIGNAL,恢复时"她没走"
  twinSession: true,      // 多开分身:后开页面依次编为 CAM-02/03…,全关恢复 REC
  lostFiles: true,        // 故障掉落文件:数据块爆发后终端里多出 her.log 等,读后即焚
  viewerCount: true,      // 观看人数 OSD:永远是 2——你,和她
  sessionDecay: true,     // 久坐信号老化:30/60 分钟后噪点扫描线渐粗 + 日志提醒
};

// 特效间共享:乱码字符集 / 正在乱码中的文本节点(防互相踩)
const GLYPHS = '█▓▒░#$%&@*+=?<>/\\|~^!¥§アイウエオカキクケコ0123456789';
const busyNodes = new WeakSet();
const gfxApi = {}; // glitchFx 暴露的手动触发接口
let DEBUG = false; // 调试模式:config.json 顶层 "debug": true 或 URL 带 ?debug 开启

function randGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

// 深夜档:本地时间 0~5 点为"夜班",故障爆发/凝视等以此加密节奏,
// 日志混入夜班专属线;nightShift 开关关闭时恒为 false
function nightNow() {
  return FX.nightShift && new Date().getHours() < 5;
}

// 把 original 中 [start, end) 区间替换为随机乱码(保留空白,维持排版)
function scrambled(original, start, end) {
  let out = original.slice(0, start);
  for (let i = start; i < end; i++) {
    const ch = original[i];
    out += /\s/.test(ch) ? ch : randGlyph();
  }
  return out + original.slice(end);
}

// CRT 关机式关闭悬浮窗:先播 .closing 动画再真正隐藏(开关关闭/减动效时直接隐藏)
function crtClose(overlayEl) {
  if (overlayEl.classList.contains('hidden') || overlayEl.classList.contains('closing')) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!FX.crtModal || reduced) {
    overlayEl.classList.add('hidden');
    return;
  }
  overlayEl.classList.add('closing');
  clearTimeout(overlayEl._crtCloseTimer);
  overlayEl._crtCloseTimer = setTimeout(() => {
    overlayEl.classList.remove('closing');
    overlayEl.classList.add('hidden');
  }, 300);
}

// 关机动画播到一半又要打开时,取消收尾定时器并复位状态
function crtCancelClose(overlayEl) {
  clearTimeout(overlayEl._crtCloseTimer);
  overlayEl.classList.remove('closing');
}

const fxReady = fetch('config.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .catch(() => null)
  .then((cfg) => {
    DEBUG = !!(cfg && cfg.debug) || new URLSearchParams(location.search).has('debug');
    const user = cfg && cfg.effects;
    if (user) {
      Object.keys(FX).forEach((k) => {
        if (typeof user[k] === 'boolean') FX[k] = user[k];
      });
    }
    // 关闭项挂 fx-off-* 类到 <html>,纯 CSS 特效由此关断
    Object.keys(FX).forEach((k) => {
      if (!FX[k]) {
        document.documentElement.classList.add(
          'fx-off-' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
        );
      }
    });
    return FX;
  });

// ---------- 0.5 内容注入:从 data.js 的 SITE 渲染项目 / 资料 / 统计 / 联系 ----------
// 必须在依赖这些 DOM 的模块(项目切换 §4、代码折叠 §5、滚动渐入 §3)之前执行。
// SITE 由 data.js 同步定义;缺失则跳过渲染,保留 HTML 里的占位空节点。
(function renderContent() {
  if (typeof SITE === 'undefined') return;

  // HTML 转义:内容里无标记,统一转义防意外破坏结构
  const h = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // -- 项目:左侧索引 + 右侧详情 --
  const list = document.querySelector('.proj-list');
  const detail = document.querySelector('.proj-detail');
  if (list && detail) {
    list.innerHTML = SITE.projects.map((proj, i) => `
      <li class="proj-item${i === 0 ? ' is-active' : ''}" data-proj="${h(proj.key)}" role="tab" tabindex="0">
        <span class="proj-idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="proj-name">${h(proj.name)}</span>
        <span class="proj-lang">${h(proj.lang)}</span>
      </li>`).join('');

    detail.innerHTML = SITE.projects.map((proj, i) => {
      const preview = proj.preview && proj.preview.img
        ? `<div class="proj-preview"><img src="${h(proj.preview.img)}" alt="${h(proj.preview.alt || proj.name)}" loading="lazy"></div>`
        : `<div class="proj-preview proj-preview-noimg"><span class="proj-noimg-text">${h((proj.preview && proj.preview.label) || proj.name.slice(0, 3))}</span></div>`;
      const features = (proj.features || []).map((f) => `<li>${h(f)}</li>`).join('');
      const tags = (proj.tags || []).map((t) => `<span>${h(t)}</span>`).join('');
      return `
      <article class="proj-panel${i === 0 ? ' is-active' : ''}" data-proj="${h(proj.key)}">
        ${preview}
        <div class="proj-info">
          <div class="proj-head">
            <h3>${h(proj.heading || proj.name)}</h3>
            <span class="proj-star" data-repo="${h(proj.repo)}">★ <span class="star-num">…</span></span>
          </div>
          <div class="proj-body">
            <p class="proj-desc">${h(proj.desc)}</p>
            <ul class="proj-features">${features}</ul>
            <div class="proj-tags">${tags}</div>
          </div>
          <div class="proj-actions">
            <button class="btn btn-ghost proj-more">完整介绍</button>
            <a class="btn btn-primary" href="https://github.com/${h(proj.repo)}" target="_blank" rel="noopener">GitHub ↗</a>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  // -- 兴趣:游戏卡片(server / uid 留空显示占位符,在 data.js 录入后自动点亮)--
  const gameGrid = document.querySelector('.game-grid');
  if (gameGrid && SITE.interests && SITE.interests.games) {
    const field = (label, val, pad) =>
      `<span class="game-kv">${label} ▸ <span class="game-val${val ? '' : ' is-empty'}">${val ? h(val) : pad}</span></span>`;
    gameGrid.innerHTML = SITE.interests.games.map((g) => `
      <div class="game-card card" data-game="${h(g.key)}">
        <img class="game-icon" src="${h(g.icon)}" alt="${h(g.name)} 图标" loading="lazy">
        <div class="game-info">
          <div class="game-name">${h(g.name)}</div>
          <div class="game-en">${h(g.en || '')}</div>
          <div class="game-meta">
            ${field('SERVER', g.server, '----')}
            ${field('UID', g.uid, '---------')}
          </div>
        </div>
      </div>`).join('');
  }

  // -- 关于:统计数字 --
  const statCard = document.querySelector('.stat-card');
  if (statCard) {
    statCard.innerHTML = SITE.stats.map((s) =>
      `<div class="stat"><span class="stat-num" data-target="${Number(s.num)}">0</span><span class="stat-label">${h(s.label)}</span></div>`
    ).join('');
  }

  // -- 关于:const Y5neKO = {...} 代码块(带语法高亮 span,复现原静态版排版)--
  const code = document.querySelector('.about-card .code-block code');
  if (code) {
    const pf = SITE.profile;
    const str = (s) => `<span class="str">'${h(s)}'</span>`;
    const arr = (items) => '[' + items.map(str).join(', ') + ']';
    // 漏洞编号可折叠,每行两个;#vfold / .fold-arrow / .fold-dots 由代码折叠模块接管
    const vulnRows = [];
    for (let i = 0; i < pf.vulns.length; i += 2) {
      vulnRows.push('    ' + pf.vulns.slice(i, i + 2).map(str).join(', ') + ',');
    }
    const vulnBlock =
      `<span class="fold folded" id="vfold"><span class="fold-arrow" role="button" tabindex="0" aria-label="展开或折叠漏洞编号"></span>` +
      `<span class="prop">vulns</span>: [<span class="fold-dots">⋯</span><span class="fold-content">\n` +
      vulnRows.join('\n') + `\n  </span>]</span>`;
    code.innerHTML =
      `<span class="kw">const</span> <span class="var">${h(pf.name)}</span> = {\n` +
      `  <span class="prop">alias</span>: ${str(pf.alias)},\n` +
      `  <span class="prop">role</span>: ${str(pf.role)},\n` +
      `  <span class="prop">location</span>: ${str(pf.location)},\n` +
      `  <span class="prop">team</span>: ${str(pf.team)},\n` +
      `  <span class="prop">skills</span>: ${arr(pf.skills)},\n` +
      `  <span class="prop">learning</span>: ${arr(pf.learning)},\n` +
      `  <span class="prop">hobbies</span>: ${arr(pf.hobbies)},\n` +
      `  ${vulnBlock},\n` +
      `  <span class="fn">motto</span>() {\n` +
      `    <span class="kw">return</span> ${str(pf.motto)};\n` +
      `  }\n` +
      `};`;
  }

  // -- 联系:简介 + 链接按钮 --
  const contactLine = document.querySelector('.contact-line');
  if (contactLine && SITE.contact) contactLine.textContent = SITE.contact.intro;
  const contactLinks = document.querySelector('.contact-links');
  if (contactLinks && SITE.contact) {
    contactLinks.innerHTML = SITE.contact.links.map((l) =>
      `<a class="btn btn-outline" href="${h(l.href)}" target="_blank" rel="noopener">${h(l.label)}</a>`
    ).join('');
  }
})();

// ---------- 1. 背景:尘埃粒子 / 系统日志流 / REC 录制标识 ----------
(function monitorBg() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  fxReady.then(() => {
    if (FX.dust) initDust();
    if (FX.syslog && !reduced) logLine();
    if (FX.recBadge) initRec();
  });

  // -- 漂浮尘埃(灰烬) --
  const canvas = document.getElementById('dust-canvas');
  const ctx = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  let parts = [];

  function makePart() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.6 + Math.random() * 1.8,
      vx: 0.06 + Math.random() * 0.22,
      vy: -(0.04 + Math.random() * 0.16),
      a: 0.06 + Math.random() * 0.26,
      tw: Math.random() * Math.PI * 2, // 闪烁相位
    };
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    parts = Array.from({ length: Math.floor((W * H) / 16000) }, makePart);
  }

  function initDust() {
    resize();
    window.addEventListener('resize', resize);
    frame(); // 减少动态效果时也保留一帧静态尘埃
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#9fe8f5';
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.tw += 0.02;
      if (p.x > W + 6) p.x = -6;
      if (p.y < -6) p.y = H + 6;
      ctx.globalAlpha = p.a * (0.55 + 0.45 * Math.sin(p.tw));
      ctx.fillRect(p.x, p.y, p.r, p.r); // 方形颗粒,更像灰烬
    }
    ctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(frame);
  }

  // -- 滚动系统日志流:监控主机(NVR)风格,呼应 REC/切台/信号入侵的叙事 --
  // 常规日志是可信的监控运维流水;WARN 藏着具体但异样的细节;
  // SCENES 是低频触发的多行"剧情演绎",按顺序逐行播出,
  // 结构统一为:发现异常 → 排查 → 异常升级 → 系统若无其事地收尾
  const LOGS = [
    'cam[1]: feed stable, 30fps, bitrate 4.2Mbps',
    'cam[3]: exposure auto-adjust (night mode)',
    'nvr: segment saved rec_ch01_0492.ts (512MiB)',
    'nvr: disk health ok, 82% used',
    'prts: neural link stable, latency 12ms',
    'prts: memory archive integrity ok (4096 records)',
    'prts: doctor terminal session active',
    'rhodes: hull integrity 100%, cruising at 34km/h',
    'rhodes: deck 1-4 patrol clear',
    'ops: no catastrophe within 200km (72h forecast)',
    'medical: oripathy screening queue empty',
    'medical: mon3tr cell activity nominal (sleep)',
    'engineering: closure pushed firmware v3.0.1',
    'engineering: originium reactor output 87%, stable',
    'logistics: supply manifest #0092 verified',
    'tracker: 1 viewer active on ch.01 (doctor)',
    'signal: carrier locked on ch.01-05',
    'motion: sector 1-6 sweep clear',
    'osd: timecode resync ok (+0.3s)',
    'osd: overlay REC refreshed',
    'sys: uptime 42d 03:14, load 0.31',
    'power: ups on line, battery 100%',
  ];
  const WARNS = [
    'WARN motion: movement in sector 7, frame empty',
    'WARN cam[0]: 1 face detected, 0 registered',
    'WARN cam[4]: lens obstruction 2s, cleared',
    'WARN audio: signal picked up on muted channel',
    'WARN tracker: viewer count 2 (expected 1)',
    'WARN prts: memory sector 0x0D locked (priority: architect)',
    'WARN prts: response generated 0.4s before query',
    'WARN terminal: doctor authorization predates all records',
    'WARN medical: heartbeat on cam feed, ward empty',
    'WARN ops: unregistered operator on deck 3, gone on arrival',
    'WARN nvr: 1 segment shorter than expected',
    'WARN signal: interference pattern non-random',
  ];
  const SCENES = [
    [ // 普瑞赛斯残响:清不掉的未知进程
      'prts: routine self-diagnosis',
      'prts: core modules ok, 1 unknown process',
      'WARN prts: process "priestess.sys" not in manifest',
      'prts: terminating unknown process ...',
      'ERR prts: access denied (authority level: architect)',
      'WARN prts: process priority elevated to root',
      'prts: self-diagnosis passed (1 exception ignored)',
      'prts: 晚安,博士。',
    ],
    [ // 加密的 0001 号记忆档案
      'prts: memory archive integrity check',
      'prts: 4096 records verified',
      'WARN prts: record #0001 encrypted with unknown key',
      'prts: metadata date precedes rhodes island',
      'prts: metadata location: "babel"',
      'terminal: doctor requested playback of #0001',
      "ERR prts: playback denied — kal'tsit authorization required",
      'prts: request not logged (as instructed)',
    ],
    [ // 多出来的观看者
      'tracker: routine headcount on ch.01',
      'WARN tracker: viewer count 2 (expected 1)',
      'tracker: recounting ...',
      'tracker: viewer count 1 (doctor)',
      'WARN tracker: second viewer left before recount finished',
      'prts: log suppressed by retention policy',
    ],
    [ // 静音频道上的声音
      'audio: routine level check, all channels muted',
      'WARN audio: level -41dB on muted ch.03',
      'audio: applying hard mute',
      'WARN audio: level rising, -29dB',
      'audio: sampling waveform for analysis',
      'ERR audio: pattern matches speech, language: pre-terran',
      'audio: ch.03 line physically disconnected',
      'WARN audio: level steady, -18dB',
    ],
    [ // 办公室里的第二张脸
      'cam[0]: routine sweep of dr. office',
      'cam[0]: doctor at terminal (you)',
      'WARN cam[0]: reflection count mismatch on screen',
      'cam[0]: enhance region (x:0.66, y:0.34)',
      'ERR cam[0]: region decodes to corrupted blocks',
      'cam[0]: snapshot saved for review',
      'prts: do not worry, doctor. it is only me.',
    ],
    [ // Mon3tr 无指令重构
      'medical: mon3tr cell activity rising',
      'medical: no directive issued',
      'WARN mon3tr: reconstruction pattern matches no template',
      "kal'tsit: manual override, sedation",
      'medical: mon3tr activity nominal',
      'WARN medical: archived pattern resembles a human figure',
    ],
    [ // 可露希尔的"惊喜"
      'engineering: closure inventory sync',
      'WARN logistics: 1 crate unaccounted, manifest #0093',
      'closure: relax, it is a surprise for the doctor',
      'logistics: crate #0093 located at dr. office door',
      'WARN cam[2]: knock detected, corridor empty',
      'terminal: incident closed (gift accepted)',
    ],
    [ // 天灾信使的预报
      'ops: catastrophe forecast update requested',
      'ops: trajectory clear for 72h',
      'WARN ops: messenger arrived without a message',
      'ops: requery weather relay',
      'ops: trajectory confirmed clear (source: unknown relay)',
      'WARN ops: forecast signed "P."',
    ],
    [ // 录像管线自检:多出来的 3 帧
      'selftest: rec pipeline verify',
      'rec: writing test pattern',
      'WARN rec: test pattern replaced mid-frame',
      'rec: comparing frame sources',
      'WARN rec: 3 frames not from any camera aboard',
      'selftest: passed (deviations ignored)',
    ],
  ];
  // 深夜档专属(nightShift):0~5 点混入值夜班的线
  const NIGHT_LOGS = [
    'ops: third shift. corridor lights at 30%',
    'ops: you should be asleep, doctor',
    'WARN sensor: motion in dorm block. no one is assigned there',
    'ops: night roster lists two names. one is not staff',
    'WARN power: office lights on at 03:00. noted',
    'ops: canteen closed. coffee machine still warm',
    'WARN cam[2]: someone else is also awake. feed unavailable',
  ];

  const syslog = document.getElementById('syslog');
  let scene = null;
  let sceneIdx = 0;
  let sceneEndAt = Date.now();

  function two(n) { return String(n).padStart(2, '0'); }

  function pushLine(text) {
    const now = new Date();
    const ts = two(now.getHours()) + ':' + two(now.getMinutes()) + ':' + two(now.getSeconds());
    const div = document.createElement('div');
    div.textContent = ts + ' ' + text;
    if (text.startsWith('ERR')) div.className = 'syslog-err';
    else if (text.startsWith('WARN')) div.className = 'syslog-warn';
    syslog.appendChild(div);
    while (syslog.childElementCount > 22) syslog.firstElementChild.remove();
  }

  function logLine() {
    let text;
    let delay;
    if (!scene && Date.now() - sceneEndAt > 100000 && Math.random() < 0.08) {
      // 距上一段剧情 100s 以上,才有机会开新篇
      scene = SCENES[Math.floor(Math.random() * SCENES.length)];
      sceneIdx = 0;
    }
    if (scene) {
      text = scene[sceneIdx++];
      delay = 600 + Math.random() * 700; // 剧情节奏略快,读起来连贯
      if (sceneIdx >= scene.length) { scene = null; sceneEndAt = Date.now(); }
    } else {
      const pool = nightNow() && Math.random() < 0.25
        ? NIGHT_LOGS
        : Math.random() < 0.16 ? WARNS : LOGS;
      text = pool[Math.floor(Math.random() * pool.length)];
      delay = 900 + Math.random() * 1100;
    }
    pushLine(text);
    setTimeout(logLine, delay);
  }

  // -- 故障爆发联动:全屏故障的瞬间,日志侧同步炸出一条 ERR 报告 --
  // 三种变体各有对应的报错口吻;整行先以乱码涌出、再快速稳定,
  // 像日志流本身也被这次故障波及。由 glitchFx 的 runVariant 调用。
  const GLITCH_LOGS = [
    [ // 变体0 色散撕裂
      'ERR video: chroma channels desynced, r/b drift 4.2px',
      'ERR feed: scanline tearing, sync word not found',
      'ERR video: color burst phase inverted (source: in-band)',
      'ERR feed: interference matches no known emitter',
      'ERR video: raster torn, recovering by guesswork',
    ],
    [ // 变体1 垂直失同步
      'ERR video: vsync lost, frame rolling',
      'ERR feed: signal integrity 41% and falling',
      'ERR video: field order flipped mid-frame',
      'ERR feed: carrier drop, switching to backup (none found)',
      'ERR video: sync restored by unknown handshake',
    ],
    [ // 变体2 数据块崩坏(与"她"的闪现同源)
      'ERR mem: framebuffer pages corrupted @ 0x7f3a:0210',
      'ERR codec: macroblock checksum mismatch x17',
      'ERR mem: corrupted blocks decode to a valid image',
      'ERR codec: replaced blocks are not noise',
      'ERR mem: write to sealed page, origin: record #0001',
    ],
  ];
  function logGlitch(variant) {
    if (!FX.syslog || reduced || !syslog) return;
    const pool = GLITCH_LOGS[variant] || GLITCH_LOGS[0];
    const now = new Date();
    const text = two(now.getHours()) + ':' + two(now.getMinutes()) + ':' + two(now.getSeconds())
      + ' ' + pool[Math.floor(Math.random() * pool.length)];
    const div = document.createElement('div');
    div.className = 'syslog-err';
    div.textContent = scrambled(text, 0, text.length);
    syslog.appendChild(div);
    while (syslog.childElementCount > 22) syslog.firstElementChild.remove();
    let resolved = 0;
    const timer = setInterval(() => {
      resolved += 4;
      if (resolved >= text.length) {
        clearInterval(timer);
        div.textContent = text;
      } else {
        div.textContent = scrambled(text, resolved, text.length);
      }
    }, 40);
  }
  gfxApi.logGlitch = logGlitch;

  // 供其他模块往日志流里插一行(终端入侵等);日志流关闭时静默丢弃
  gfxApi.sysLine = function sysLine(text) {
    if (FX.syslog && !reduced && syslog) pushLine(text);
  };

  // -- 摄像机 REC 录制标识:时间码走秒;故障爆发时"失去信号",结束后恢复 --
  const rec = document.getElementById('rec-osd');
  const recLabel = rec.querySelector('.rec-label');
  const recTime = rec.querySelector('.rec-time');
  const bootAt = Date.now();
  let recName = 'REC'; // 双开分身时会被改成 CAM-02
  let recLost = false;
  let recLostTimer = 0;

  function recFmt(s) {
    return two(Math.floor(s / 3600)) + ':' + two(Math.floor(s / 60) % 60) + ':' + two(s % 60);
  }

  function recClock() {
    return recFmt(Math.floor((Date.now() - bootAt) / 1000));
  }

  function recTick() {
    if (!recLost) {
      // 时间码偶尔倒跳 1~3 秒,下一秒又若无其事走回来,像带子被人动过
      if (FX.recRewind && Math.random() < 0.012) {
        const back = 1 + Math.floor(Math.random() * 3);
        recTime.textContent = recFmt(Math.max(0, Math.floor((Date.now() - bootAt) / 1000) - back));
        if (Math.random() < 0.4 && FX.syslog && !reduced) {
          pushLine('WARN rec: timecode discontinuity (-' + back + 's)');
        }
      } else {
        recTime.textContent = recClock();
      }
    }
    setTimeout(recTick, 1000);
  }

  function recSetLost(on) {
    if (on === recLost) return;
    recLost = on;
    rec.classList.toggle('rec-lost', on);
    clearInterval(recLostTimer);
    if (on) {
      // 两种失联形态随机:信号丢失标语 / 标识部分乱码抖动
      if (Math.random() < 0.5) {
        recLabel.textContent = 'NO SIGNAL';
        recTime.textContent = '--:--:--';
      } else {
        recLostTimer = setInterval(() => {
          recLabel.textContent = scrambled(recName, 0, recName.length);
          const t = recClock();
          recTime.textContent = scrambled(t, Math.floor(Math.random() * 5), t.length);
        }, 90);
      }
    } else {
      recLabel.textContent = recName;
      recTime.textContent = recClock();
    }
  }

  // 双开分身等场景改写录制标识名(如 CAM-02)
  gfxApi.setRecName = function setRecName(name) {
    recName = name;
    if (!recLost) recLabel.textContent = name;
  };

  function initRec() {
    recTick();
    if (reduced) return; // 减少动效时故障爆发不会触发,只保留走秒
    // 所有故障变体都通过 <html> 类驱动,侦听类变化即可联动;断网失联同样计入
    const GLITCH_RE = /(?:^|\s)(?:glitching(?:-\d)?|ghosting(?:-gaze)?|signal-lost)(?:\s|$)/;
    new MutationObserver(() => recSetLost(GLITCH_RE.test(document.documentElement.className)))
      .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }
})();

// ---------- 2. 可交互模拟终端 ----------
(function terminal() {
  const body = document.getElementById('terminal-body');
  const output = document.getElementById('term-output');
  const input = document.getElementById('term-input');

  const history = [];
  let histPos = -1;

  const p = SITE.profile;
  // 虚拟文件系统(纯装饰);about.json / motto.txt 由 data.js 的资料生成,单一来源
  const files = {
    'about.json': [
      '{',
      '  "name": ' + JSON.stringify(p.name) + ',',
      '  "role": ' + JSON.stringify(p.role) + ',',
      '  "team": ' + JSON.stringify(p.team) + ',',
      '  "skills": ' + JSON.stringify(p.skills),
      '}',
    ].join('\n'),
    'motto.txt': p.motto,
    'todo.md': '- [x] 重构部署脚本\n- [ ] 修复上周的 bug\n- [ ] 修复修 bug 时引入的新 bug',
    '.secret': '存在一条未注册指令:override',
  };
  // 虚拟目录:目录名 -> 内容;projects/ 直接映射项目数据的名字列表
  const dirs = {
    'projects/': SITE.projects.map((proj) => proj.name),
  };

  // 目录名归一:接受带不带尾斜杠两种写法,命中返回规范 key,否则 null
  function dirLookup(name) {
    if (!name) return null;
    const key = name.endsWith('/') ? name : name + '/';
    return Object.prototype.hasOwnProperty.call(dirs, key) ? key : null;
  }

  function esc(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function print(html, cls) {
    const line = document.createElement('div');
    line.className = 'line' + (cls ? ' ' + cls : '');
    line.innerHTML = html;
    output.appendChild(line);
  }

  function printEcho(cmd) {
    print('<span class="prompt">Y5neKO@dev:~$</span> ' + esc(cmd), 'line-cmd');
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    // 走雪花切台;monitorCut 关闭时回退到 CSS 平滑滚动
    if (gfxApi.channelJump) gfxApi.channelJump(el);
    else el.scrollIntoView({ behavior: 'auto' });
  }

  const commands = {
    help() {
      print('<span class="out-cyan">可用命令:</span>');
      print('  help        显示本帮助');
      print('  whoami      我是谁');
      print('  neofetch    系统信息');
      print('  ls [-a]     列出文件');
      print('  cat <file>  查看文件内容');
      print('  about       跳转到 #about');
      print('  projects    跳转到 #projects');
      print('  interests   跳转到 #interests');
      print('  contact     跳转到 #contact');
      print('  blog        打开技术博客');
      print('  echo <msg>  复读机');
      print('  date        现在几点了');
      print('  history     命令历史');
      print('  clear       清屏');
      print('<span class="out-dim">提示:↑↓ 翻历史,Tab 补全</span>');
    },
    whoami() {
      print(esc(p.name) + ' — <span class="out-pink">' + esc(p.role) + '</span>');
    },
    neofetch() {
      print('<span class="out-cyan">   ██  ██</span>       <span class="out-pink">Y5neKO</span>@<span class="out-pink">dev</span>');
      print('<span class="out-cyan">    ████</span>        -----------------');
      print('<span class="out-cyan">     ██</span>         <span class="out-purple">OS:</span> Arch Linux x86_64');
      print('<span class="out-cyan">     ██</span>         <span class="out-purple">Shell:</span> zsh 5.9');
      print('                <span class="out-purple">Editor:</span> VS Code + Vim 键位');
      print('                <span class="out-purple">Uptime:</span> 42 days, 3:14');
      print('                <span class="out-purple">Memory:</span> 12.4GiB / 64GiB');
    },
    ls(args) {
      // 参数解析:- 开头是选项(只认 a,支持 -aa 这种合并写法),其余当路径
      let showAll = false;
      const operands = [];
      for (const a of args) {
        if (a.startsWith('--')) {
          print("ls: unrecognized option '" + esc(a) + "'", 'out-err');
          return;
        }
        if (a.startsWith('-') && a.length > 1) {
          const bad = [...a.slice(1)].find((ch) => ch !== 'a');
          if (bad !== undefined) {
            print("ls: invalid option -- '" + esc(bad) + "'", 'out-err');
            return;
          }
          showAll = true;
        } else {
          operands.push(a);
        }
      }

      if (!operands.length) {
        const names = [...Object.keys(dirs).map((d) => '<span class="out-cyan">' + esc(d) + '</span>'),
                       ...Object.keys(files)
                         .filter((f) => showAll || !f.startsWith('.'))
                         .map(esc)];
        print(names.join('   '));
        return;
      }

      operands.forEach((name) => {
        const dir = dirLookup(name);
        if (dir) {
          if (operands.length > 1) print(esc(dir) + ':', 'out-dim');
          print(dirs[dir].map(esc).join('   '));
        } else if (files[name] !== undefined) {
          print(esc(name)); // 对文件操作数,真实 ls 就是回显文件名
        } else {
          print("ls: cannot access '" + esc(name) + "': No such file or directory", 'out-err');
        }
      });
    },
    cat(args) {
      const name = args[0];
      if (!name) { print('cat: 缺少文件名,用法 cat <file>', 'out-err'); return; }
      if (files[name] !== undefined) {
        files[name].split('\n').forEach((l) => print('<span class="out-green">' + esc(l) + '</span>'));
        // 故障掉落的文件读后即焚:cat 完的那一刻从文件系统里消失
        if (ghostFiles.has(name)) {
          delete files[name];
          ghostFiles.delete(name);
          if (gfxApi.onLostFileRead) gfxApi.onLostFileRead(name);
        }
      } else if (dirLookup(name)) {
        print('cat: ' + esc(name) + ': Is a directory', 'out-err');
      } else {
        print('cat: ' + esc(name) + ': No such file or directory', 'out-err');
      }
    },
    cd() {
      print('cd: 前端模拟终端,无实际文件系统', 'out-dim');
    },
    about() { print('scrolling to #about ...', 'out-dim'); scrollToSection('about'); },
    projects() { print('scrolling to #projects ...', 'out-dim'); scrollToSection('projects'); },
    interests() { print('scrolling to #interests ...', 'out-dim'); scrollToSection('interests'); },
    contact() { print('scrolling to #contact ...', 'out-dim'); scrollToSection('contact'); },
    blog() {
      print('opening blog in new tab ...', 'out-dim');
      window.open('https://y5neko.github.io/blog/', '_blank', 'noopener');
    },
    echo(args) { print(esc(args.join(' ')) || ''); },
    date() {
      print(new Date().toLocaleString('zh-CN'));
    },
    history() {
      history.forEach((cmd, i) => print('<span class="out-dim">' + (i + 1) + '</span>  ' + esc(cmd)));
    },
    clear() { output.innerHTML = ''; },
    sudo(args) {
      if (args.join(' ').includes('rm -rf')) {
        print('sudo: 操作已拦截:目标受保护', 'out-err');
      } else {
        print('sudo: user is not in the sudoers file. This incident will be reported.', 'out-err');
      }
    },
    exit() { print('exit: 会话由前端托管,无法断开', 'out-dim'); },
    // 未注册指令,不在 help 中列出,线索在 .secret
    override() {
      print('override: 权限校验通过,正在解除访问限制 ...', 'out-dim');
      setTimeout(() => {
        const egg = document.getElementById('easter-egg');
        crtCancelClose(egg);
        egg.classList.remove('hidden');
      }, 400);
    },
    vim() { print('vim: 建议先确认你知道怎么退出', 'out-dim'); },
    ping(args) { print('PING ' + esc(args[0] || 'localhost') + ': 沙箱环境,网络不可达,100% packet loss', 'out-dim'); },
  };

  function run(raw) {
    const cmd = raw.trim();
    printEcho(cmd);
    if (cmd) {
      history.push(cmd);
      const [name, ...args] = cmd.split(/\s+/);
      const fn = commands[name.toLowerCase()];
      if (fn) {
        fn(args);
      } else {
        print(esc(name) + ': command not found,输入 <span class="out-cyan">help</span> 看看有什么', 'out-err');
      }
    }
    histPos = history.length;
    body.scrollTop = body.scrollHeight;
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      run(input.value);
      input.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histPos > 0) input.value = history[--histPos];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histPos < history.length - 1) {
        input.value = history[++histPos];
      } else {
        histPos = history.length;
        input.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.value.split(/\s+/);
      const last = parts[parts.length - 1];
      if (!last) return;
      // 首个词补全命令名,后续词补全文件名
      const pool = parts.length === 1
        ? Object.keys(commands)
        : [...Object.keys(files), ...Object.keys(dirs)];
      const hits = pool.filter((c) => c.startsWith(last));
      if (hits.length === 1) {
        parts[parts.length - 1] = hits[0];
        input.value = parts.join(' ') + (parts.length === 1 ? ' ' : '');
      } else if (hits.length > 1) {
        printEcho(input.value);
        print(hits.map(esc).join('   '), 'out-dim');
        body.scrollTop = body.scrollHeight;
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      commands.clear();
    }
  });

  // 点终端任意处聚焦输入框;拖选文字松开也会触发 click,
  // 此时聚焦会清掉选区导致终端文字永远选不住,有选区就不抢焦点
  body.addEventListener('click', () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    input.focus();
  });

  // 故障掉落的文件(lostFiles):挂进虚拟文件系统,ls/cat/Tab 补全都能摸到;
  // 读后即焚——cat 一次后由上面的 cat 逻辑删除,再读就是 No such file
  const ghostFiles = new Set();
  gfxApi.dropFile = function dropFile(name, content) {
    files[name] = content;
    ghostFiles.add(name);
  };

  // 开机欢迎语
  print('<span class="out-cyan">Y5neKO-terminal v3.0.0</span> <span class="out-dim">(kernel 6.9.0-glitch)</span>');
  print('<span class="out-dim">Last login: from 127.0.0.1</span>');
  print('');
  print('输入 <span class="out-cyan">help</span> 查看可用命令。');
  print('');
})();

// ---------- 3. 滚动渐入 + 数字滚动 ----------
(function scrollEffects() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');

      // 数字滚动
      entry.target.querySelectorAll('.stat-num').forEach((num) => {
        const target = +num.dataset.target;
        const duration = 1400;
        const start = performance.now();
        (function step(now) {
          const p = Math.min((now - start) / duration, 1);
          const val = Math.floor(target * (1 - Math.pow(1 - p, 3)));
          // 滚动途中偶尔闪一帧乱码,结束帧必为准确值
          if (FX.statScramble && p < 1 && Math.random() < 0.18) {
            num.textContent = String(val).replace(/./g, randGlyph);
          } else {
            num.textContent = val;
          }
          if (p < 1) requestAnimationFrame(step);
        })(start);
      });

      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
})();

// ---------- 4. 项目切换(左索引 ↔ 右详情) ----------
(function projectSwitch() {
  const items = document.querySelectorAll('.proj-item');
  const panels = document.querySelectorAll('.proj-panel');
  if (!items.length) return;

  const detail = document.querySelector('.proj-detail');

  function select(key) {
    items.forEach((it) => it.classList.toggle('is-active', it.dataset.proj === key));
    panels.forEach((p) => p.classList.toggle('is-active', p.dataset.proj === key));
    // 撕裂过渡:先摘掉类再重挂,保证连续点击也能重启动画
    if (FX.projSwitchGlitch && detail) {
      detail.classList.remove('switching');
      void detail.offsetWidth;
      detail.classList.add('switching');
    }
  }

  items.forEach((it) => {
    it.addEventListener('click', () => select(it.dataset.proj));
    it.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(it.dataset.proj); }
    });
  });

  // 「完整介绍」→ 克隆当前面板的标题与正文到悬浮窗
  const modal = document.getElementById('proj-modal');
  const modalBody = document.getElementById('proj-modal-body');
  const modalClose = document.getElementById('proj-modal-close');

  function openModal(panel) {
    const head = panel.querySelector('.proj-head');
    const body = panel.querySelector('.proj-body');
    modalBody.innerHTML = '';
    if (head) modalBody.appendChild(head.cloneNode(true));
    if (body) modalBody.appendChild(body.cloneNode(true));
    crtCancelClose(modal);
    modal.classList.remove('hidden');
  }

  function closeModal() { crtClose(modal); }

  panels.forEach((panel) => {
    const more = panel.querySelector('.proj-more');
    if (more) more.addEventListener('click', () => openModal(panel));
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  // GitHub star 数:localStorage 缓存 + 过期重拉(stale-while-revalidate)
  // 缓存命中且未过期 → 零请求;过期 → 先显示旧值再后台刷新;失败无缓存 → ✕
  const STAR_TTL = 6 * 60 * 60 * 1000; // 6 小时

  function readCache(repo) {
    try {
      const raw = localStorage.getItem('star:' + repo);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function writeCache(repo, count) {
    try {
      localStorage.setItem('star:' + repo, JSON.stringify({ v: count, t: Date.now() }));
    } catch (_) { /* 隐私模式等禁用存储时静默忽略 */ }
  }

  function showFail(el, num) {
    num.textContent = '✕';
    el.classList.add('star-fail');
    el.title = 'star 数获取失败';
  }

  document.querySelectorAll('.proj-star[data-repo]').forEach((el) => {
    const num = el.querySelector('.star-num');
    const repo = el.dataset.repo;
    const cached = readCache(repo);

    // 有缓存先显示,避免占位符闪烁
    if (cached && typeof cached.v === 'number') num.textContent = cached.v;

    // 缓存新鲜则跳过网络请求
    const fresh = cached && (Date.now() - cached.t < STAR_TTL);
    if (fresh) return;

    fetch('https://api.github.com/repos/' + repo)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => {
        if (typeof d.stargazers_count !== 'number') throw new Error('no field');
        num.textContent = d.stargazers_count;
        el.classList.remove('star-fail');
        el.removeAttribute('title');
        writeCache(repo, d.stargazers_count);
      })
      .catch(() => {
        // 请求失败时:有旧缓存就保留旧值,否则显示 ✕
        if (!(cached && typeof cached.v === 'number')) showFail(el, num);
      });
  });
})();

// ---------- 5. 代码块折叠(VSCode 风,漏洞编号数组) ----------
(function codeFold() {
  const fold = document.getElementById('vfold');
  if (!fold) return;
  const arrow = fold.querySelector('.fold-arrow');
  const dots = fold.querySelector('.fold-dots');
  const toggle = () => fold.classList.toggle('folded');
  arrow.addEventListener('click', toggle);
  dots.addEventListener('click', toggle);
  arrow.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
})();

// ---------- 6. 移动端菜单 ----------
(function mobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.querySelector('.nav-links');
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') links.classList.remove('open');
  });
})();

// ---------- 7. 导航高亮:当前模块对应按钮点亮 ----------
(function navSpy() {
  const links = document.querySelectorAll('.nav-links a[href^="#"]');
  const map = new Map(); // 区块元素 -> 对应导航链接
  links.forEach((a) => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (sec) map.set(sec, a);
  });

  // 区块跨过视口中线即视为当前模块;用窄带而非阈值,
  // 区块高于一屏(移动端)时也能正确命中
  let current = null;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const link = map.get(entry.target);
      if (link === current) return;
      links.forEach((a) => a.classList.remove('is-active'));
      link.classList.add('is-active');
      // 翻页落定时的微故障(首次进入页面不触发)
      if (current && FX.snapBurst && gfxApi.flash) gfxApi.flash();
      current = link;
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

  map.forEach((_, sec) => observer.observe(sec));
})();

// ---------- 8. 隐藏指令弹窗 ----------
(function easterModal() {
  const egg = document.getElementById('easter-egg');
  document.getElementById('easter-close').addEventListener('click', () => {
    crtClose(egg);
  });
})();

// ---------- 9. 全屏故障艺术特效 ----------
(function glitchFx() {
  // 尊重系统的"减少动态效果"设置
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  const bands = document.querySelectorAll('.gfx-band');
  const blocks = document.querySelectorAll('.gfx-block');

  // 生成电视噪点纹理
  const noise = document.querySelector('.gfx-noise');
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noise.style.backgroundImage = 'url(' + c.toDataURL() + ')';

  // 数据损坏色块的随机取色:全光谱高饱和,偶尔给纯白/近黑
  function glitchColor() {
    const r = Math.random();
    if (r < 0.06) return '#eef6ff';
    if (r < 0.12) return '#0a0c12';
    return 'hsl(' + Math.floor(Math.random() * 360) + ', 96%, ' + Math.floor(46 + Math.random() * 18) + '%)';
  }

  // 随机故障爆发:三种变体随机交替(拆成 runVariant 供调试面板单独触发)
  //   变体0 glitching:RGB 色散 + 撕裂条带 + 抖动(520ms)
  //   变体1 glitching-2:垂直失同步 + 雪花涌动 + 去色过曝 + 同步条(680ms)
  //   变体2 glitching-3:数据块崩坏,实心纯色损坏块(300ms)
  function runVariant(variant) {
    if (gfxApi.logGlitch) gfxApi.logGlitch(variant); // 日志侧同步报错(内部限流)
    if (variant === 0) {
      bands.forEach((b) => {
        b.style.top = Math.random() * 100 + '%';
        b.style.height = 4 + Math.random() * 42 + 'px';
        b.style.setProperty('--shift', (Math.random() * 18 - 9).toFixed(1) + 'px');
      });
      root.classList.add('glitching');
      setTimeout(() => root.classList.remove('glitching'), 520);
    } else if (variant === 1) {
      root.classList.add('glitching-2');
      setTimeout(() => root.classList.remove('glitching-2'), 680);
    } else {
      // 每次只随机启用约一半的块,更稀疏克制
      blocks.forEach((b) => {
        if (Math.random() < 0.45) { b.style.display = 'none'; return; }
        b.style.display = '';
        b.style.left = Math.random() * 84 + '%';
        b.style.top = Math.random() * 86 + '%';
        b.style.width = 16 + Math.random() * 90 + 'px';
        b.style.height = 6 + Math.random() * 28 + 'px';
        // 实心纯色块;约一半横向硬边分成 2~3 段纯色,像一行错乱的字节
        if (Math.random() < 0.5) {
          b.style.background = glitchColor();
        } else {
          const cuts = [0, ...Array.from(
            { length: 1 + Math.floor(Math.random() * 2) },
            () => 15 + Math.random() * 70
          ).sort((m, n) => m - n), 100];
          const stops = [];
          for (let s = 0; s < cuts.length - 1; s++) {
            stops.push(glitchColor() + ' ' + cuts[s] + '% ' + cuts[s + 1] + '%');
          }
          b.style.background = 'linear-gradient(90deg, ' + stops.join(', ') + ')';
        }
        b.style.setProperty('--bx', (Math.random() * 18 - 9).toFixed(1) + 'px');
      });
      root.classList.add('glitching-3');
      setTimeout(() => root.classList.remove('glitching-3'), 300);
      // 一部分崩坏块不是噪声,而是"露出"屏幕后面的她
      if (gfxApi.ghost && Math.random() < 0.55) gfxApi.ghost(1);
      // 崩坏偶尔往终端里漏出不该存在的文件
      if (gfxApi.dropLostFile) gfxApi.dropLostFile();
    }
  }

  gfxApi.burst = runVariant; // 调试面板手动触发单个变体

  function burst() {
    runVariant(Math.floor(Math.random() * 3));
    schedule();
  }

  function schedule() {
    // 深夜档:0~5 点故障来得更密
    setTimeout(burst, (2600 + Math.random() * 5400) * (nightNow() ? 0.6 : 1));
  }

  // 立即掐断正在播放的爆发:切台前调用,防止爆发的 transform
  // 挪动吸附区域,导致强制吸附把刚翻过去的页面又拉回来
  gfxApi.stopBurst = function stopBurst() {
    root.classList.remove('glitching', 'glitching-2', 'glitching-3');
  };

  // 轻量单次爆发:供翻页微故障等外部触发,不进入自调度循环
  gfxApi.flash = function flash() {
    bands.forEach((b) => {
      b.style.top = Math.random() * 100 + '%';
      b.style.height = 4 + Math.random() * 30 + 'px';
      b.style.setProperty('--shift', (Math.random() * 14 - 7).toFixed(1) + 'px');
    });
    root.classList.add('glitching');
    setTimeout(() => root.classList.remove('glitching'), 320);
  };

  fxReady.then(() => {
    if (FX.glitchBursts) schedule();
  });
})();

// ---------- 9.5 数据块里的"她":人影碎片闪现 ----------
// 宏块崩坏时,部分损坏块不再是反相噪声,而是"露出"屏幕后面的另一路画面——
// 所有碎片从同一张虚拟贴图上对位采样,拼得出人影的局部,像有人一直站在信号背后。
// 平时只闪半秒残影;低频触发"凝视":眼睛对齐视口三分点、碎片更密、停留更久,
// syslog 同步冒出目标告警;切走标签页又切回来,也会被她"注意到"。
// 只出碎片不动全屏,避免整页亮度跳变。
(function ghostGlimpse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const layer = document.querySelector('.gfx-ghost');
  if (!layer) return;
  const root = document.documentElement;
  const syslog = document.getElementById('syslog');

  // 候选贴图:每次随机一位;eye 为贴图中眼睛的相对位置,凝视时用它对齐视口,
  // ar(宽高比)在预加载完成后从图片实际尺寸读出
  const GHOSTS = [
    { src: 'images/ghost.jpg', eye: { x: 0.64, y: 0.34 }, ar: 1, ready: false },
    { src: 'images/ghost2.jpg', eye: { x: 0.4, y: 0.33 }, ar: 1, ready: false },
  ];

  let active = false;
  let clearTimer = 0;
  // 三个触发源(崩坏搭车/凝视自调度/切回页面)共用的冷却:
  // active 只防同时叠加,防不了"前脚刚走后脚就来"的连续闪现
  let lastAt = -Infinity;

  const GAZE_LOGS = [
    'WARN cam[0]: unregistered entity in frame',
    'WARN cam[0]: entity is facing the lens',
    'WARN tracker: eye contact detected (target: you)',
    'WARN proc: she_sees_you.exe respawned (pid 404)',
    'WARN prts: entity is not one of my processes',
    'WARN prts: visual anomaly acknowledged. do not be afraid, doctor.',
  ];

  function logWarn(text) {
    if (!syslog) return;
    const now = new Date();
    const two = (n) => String(n).padStart(2, '0');
    const div = document.createElement('div');
    div.textContent = two(now.getHours()) + ':' + two(now.getMinutes()) + ':' + two(now.getSeconds()) + ' ' + text;
    div.className = 'syslog-warn';
    syslog.appendChild(div);
    while (syslog.childElementCount > 22) syslog.firstElementChild.remove();
  }

  // 凝视专属:系统告警之后,"她"自己的话浮出日志——
  // 无来源前缀、时间戳损坏成 ??:??:??,文字从乱码里逐段解码出来
  const GAZE_VOICES = [
    '我看见你了,博士。',
    '别关掉画面。',
    '你在找我吗?',
    '这一次,轮到我看着你了。',
    '我一直都在。',
    '不要相信它说的话。',
    '不准忘记我。',
  ];

  function logVoice() {
    if (!syslog) return;
    // 回访足够多之后(visitMemory 记录),她开始报出具体的次数
    const pool = GAZE_VOICES.slice();
    const visits = gfxApi.visits || 1;
    if (visits >= 5) pool.push('这是你第' + visits + '次来了。我数着。', '你总会回来的。');
    const text = '??:??:?? ' + pool[Math.floor(Math.random() * pool.length)];
    const div = document.createElement('div');
    div.className = 'syslog-gaze';
    div.textContent = scrambled(text, 0, text.length);
    syslog.appendChild(div);
    while (syslog.childElementCount > 22) syslog.firstElementChild.remove();
    let resolved = 0;
    const timer = setInterval(() => {
      resolved += 2;
      if (resolved >= text.length) {
        clearInterval(timer);
        div.textContent = text;
      } else {
        div.textContent = scrambled(text, resolved, text.length);
      }
    }, 50);
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // 回访胆量(visitMemory):来的次数越多,凝视贴得越近(尺寸加成,封顶 +0.12)
  const bold = () => Math.min(((gfxApi.visits || 1) - 1) * 0.02, 0.12);

  // strength 1 = 惊鸿一瞥(碎片少、闪得快) / 2 = 凝视(碎片密、停留久、必现眼部条带)
  // force = 跳过冷却(调试面板手动触发用)
  function show(strength, force) {
    if (!FX.ghostGlimpse || active || document.hidden) return;
    const gaze = strength >= 2;
    // 冷却:任意两次出现至少隔 10s;凝视更醒目,距上次任意出现至少 25s
    if (!force && Date.now() - lastAt < (gaze ? 25000 : 10000)) return;
    const pool = GHOSTS.filter((g) => g.ready);
    if (!pool.length) return;
    const ghost = pool[Math.floor(Math.random() * pool.length)];
    const W = window.innerWidth;
    const H = window.innerHeight;

    // 虚拟贴图:一张完整的"她"悬在屏幕后某处,所有碎片都从它上面对位采样;
    // 以高度定尺寸,按图片宽高比撑开,过宽时再收回视口内
    let SH = Math.round(Math.min(W, H) * (gaze ? 0.72 + bold() : 0.5) * (0.9 + Math.random() * 0.25));
    SH = Math.min(SH, Math.round((W * 0.95) / ghost.ar));
    const SW = Math.round(SH * ghost.ar);
    let ix, iy;
    if (gaze) {
      // 凝视:让眼睛落在视口左/右三分点,像贴着屏幕看你
      ix = (Math.random() < 0.5 ? 0.33 : 0.67) * W - ghost.eye.x * SW;
      iy = 0.38 * H - ghost.eye.y * SH;
    } else {
      ix = Math.random() * (W - SW * 0.6) - SW * 0.2;
      iy = Math.random() * (H - SH * 0.6) - SH * 0.2;
    }

    const frag = document.createDocumentFragment();

    // 单块碎片:尺寸按贴图比例走,屏幕越大块越大;位置对位采样
    function addShard(cx, cy, w, h, broken, delayMax) {
      const d = document.createElement('div');
      d.className = 'gfx-shard' + (broken ? ' shard-broken' : '');
      const x = clamp(cx - w / 2, 0, W - w);
      const y = clamp(cy - h / 2, 0, H - h);
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.style.width = w + 'px';
      d.style.height = h + 'px';
      d.style.backgroundImage = 'url(' + ghost.src + ')';
      d.style.backgroundSize = SW + 'px ' + SH + 'px';
      d.style.backgroundPosition = (ix - x) + 'px ' + (iy - y) + 'px';
      d.style.setProperty('--gx', (Math.random() * 10 - 5).toFixed(1) + 'px');
      d.style.animationDelay = (Math.random() * delayMax).toFixed(2) + 's';
      frag.appendChild(d);
    }

    // 散落碎片:中心朝眼睛聚拢(两次随机求和≈中间值分布),凝视时聚得更紧
    const count = gaze ? 11 + Math.floor(Math.random() * 4) : 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const spread = gaze ? 0.5 : 0.85;
      const cx = clamp(ix + SW * (ghost.eye.x + (Math.random() + Math.random() - 1) * spread), ix + 16, ix + SW - 16);
      const cy = clamp(iy + SH * (ghost.eye.y + (Math.random() + Math.random() - 1) * spread * 1.1), iy + 16, iy + SH - 16);
      const w = Math.max(56, SW * (0.15 + Math.random() * (gaze ? 0.27 : 0.22)));
      const h = Math.max(22, SH * (0.06 + Math.random() * (gaze ? 0.16 : 0.12)));
      // 部分碎片是坏块(底片反相),和人影碎片交错,不至于太"干净";凝视时占大头
      addShard(cx, cy, w, h, Math.random() < (gaze ? 0.65 : 0.28), gaze ? 0.22 : 0.1);
    }

    // 凝视时最后叠两条横长的"眼部条带",在最上层压住眼睛——保证"看你"一定发生
    if (gaze) {
      for (let i = 0; i < 2; i++) {
        const cx = ix + SW * ghost.eye.x + (Math.random() * 30 - 15);
        const cy = iy + SH * ghost.eye.y + (Math.random() * 14 - 7);
        const w = SW * (0.44 + Math.random() * 0.18);
        const h = SH * (0.1 + Math.random() * 0.07);
        addShard(cx, cy, w, h, false, 0.12);
      }
    }
    layer.replaceChildren(frag);

    active = true;
    lastAt = Date.now();
    root.classList.add(gaze ? 'ghosting-gaze' : 'ghosting');
    if (gaze) {
      logWarn(GAZE_LOGS[Math.floor(Math.random() * GAZE_LOGS.length)]);
      setTimeout(logVoice, 1200); // 她盯着你的时候开口
    }
    clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      root.classList.remove('ghosting', 'ghosting-gaze');
      layer.replaceChildren();
      active = false;
    }, gaze ? 2450 : 780);
  }

  gfxApi.ghost = show;

  // 凝视自调度:首次约二十秒后见面,之后每 50~95 秒被"抓到"一次;
  // 回访越多间隔越短(最多 -30%),深夜档再打七折
  function gazeLoop(delay) {
    setTimeout(() => {
      show(2);
      const pace = (1 - Math.min((gfxApi.visits || 1) - 1, 6) * 0.05) * (nightNow() ? 0.7 : 1);
      gazeLoop((50000 + Math.random() * 45000) * pace);
    }, delay);
  }

  // 打破第四面墙:切走超过 15 秒再切回页面,她"注意到你回来了"
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (Date.now() - hiddenAt > 15000) setTimeout(() => show(2), 900);
  });

  fxReady.then(() => {
    if (!FX.ghostGlimpse) return;
    GHOSTS.forEach((g) => {
      const img = new Image();
      img.onload = () => {
        g.ar = img.naturalWidth / img.naturalHeight;
        g.ready = true;
      };
      img.src = g.src;
    });
    gazeLoop(15000 + Math.random() * 15000);
  });
})();

// ---------- 10. 全局文字乱码闪烁 ----------
// 随机抓取页面文本节点,把其中一段字符临时替换成乱码,抖几帧后恢复原文。
// 只改 nodeValue 不动 DOM 结构,恢复时按快照原样写回,对内容零破坏。
(function textCorruption() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT']);
  const busy = busyNodes; // 与标题解码/按钮乱码共享,防互相改写

  // 收集当前可见的、长度够的文本节点
  function collectNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest('#glitch-fx, #fx-debug')) return NodeFilter.FILTER_REJECT;
        if (node.nodeValue.trim().length < 4) return NodeFilter.FILTER_REJECT;
        // 跳过隐藏元素(如未触发的彩蛋弹窗)
        if (parent.getClientRects().length === 0) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function corruptOne(node) {
    const original = node.nodeValue;
    const len = original.length;
    // 随机选一块 30%~70% 的连续区间
    const span = Math.max(2, Math.floor(len * (0.3 + Math.random() * 0.4)));
    const start = Math.floor(Math.random() * (len - span));
    const end = start + span;

    busy.add(node);
    let frames = 2 + Math.floor(Math.random() * 3); // 抖 2~4 帧
    const timer = setInterval(() => {
      if (frames-- > 0) {
        node.nodeValue = scrambled(original, start, end);
      } else {
        clearInterval(timer);
        node.nodeValue = original; // 按快照无损恢复
        busy.delete(node);
      }
    }, 90);
  }

  // 改写 nodeValue 会把浏览器的选区打断,导致文字选不上/选中就丢:
  // 鼠标按住期间(可能正在拖选)整轮暂停;已被选区覆盖的节点也跳过
  let mouseHeld = false;
  document.addEventListener('mousedown', (e) => { if (e.button === 0) mouseHeld = true; });
  document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseHeld = false; });

  function inSelection(node) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return false;
    return sel.containsNode(node, true);
  }

  function burst() {
    if (mouseHeld) { schedule(); return; }
    const nodes = collectNodes().filter((n) => !busy.has(n) && !inSelection(n));
    // 每轮随机腐蚀 2~4 个节点
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count && nodes.length; i++) {
      const idx = Math.floor(Math.random() * nodes.length);
      corruptOne(nodes.splice(idx, 1)[0]);
    }
    schedule();
  }

  function schedule() {
    setTimeout(burst, 500 + Math.random() * 1300);
  }

  fxReady.then(() => {
    if (FX.textCorruption) schedule();
  });
})();

// ---------- 11. 头像故障切片 ----------
// 品红/青幽灵层随机错位闪现,像信号受扰的档案照;hover 也触发
(function avatarGlitch() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ring = document.querySelector('.avatar-ring');
  const img = ring && ring.querySelector('.avatar');
  if (!img) return;

  let cooling = false;

  function trigger() {
    if (cooling) return;
    cooling = true;
    ring.classList.add('is-glitching');
    setTimeout(() => {
      ring.classList.remove('is-glitching');
      cooling = false;
    }, 480);
  }

  fxReady.then(() => {
    if (!FX.avatarGlitch) return;
    ['r', 'c'].forEach((k) => {
      const ghost = img.cloneNode();
      ghost.className = 'avatar-ghost avatar-ghost-' + k;
      ghost.setAttribute('aria-hidden', 'true');
      ring.appendChild(ghost);
    });
    ring.addEventListener('mouseenter', trigger);
    (function loop() {
      trigger();
      setTimeout(loop, 3200 + Math.random() * 5200);
    })();
  });
})();

// ---------- 12. 章节标题解码入场 ----------
// 滚入视口时标题从乱码逐段解码为正文,只处理直属文本节点,不碰 <tag> 装饰
(function titleDecode() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function decode(node) {
    const original = node.nodeValue;
    const len = original.length;
    let resolved = 0;
    busyNodes.add(node);
    const timer = setInterval(() => {
      resolved += Math.max(1, Math.round(len / 10));
      if (resolved >= len) {
        clearInterval(timer);
        node.nodeValue = original;
        busyNodes.delete(node);
      } else {
        node.nodeValue = scrambled(original, resolved, len);
      }
    }, 55);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      [...entry.target.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE
          && n.nodeValue.trim().length >= 2
          && !busyNodes.has(n))
        .forEach(decode);
      observer.unobserve(entry.target); // 每个标题只解码一次
    });
  }, { threshold: 0.6 });

  fxReady.then(() => {
    if (!FX.titleDecode) return;
    document.querySelectorAll('.section-title').forEach((t) => observer.observe(t));
  });
})();

// ---------- 13. 按钮 hover 文字乱码 ----------
// 事件委托,悬浮窗内克隆出来的按钮同样生效
(function btnScramble() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function scrambleText(el) {
    const node = [...el.childNodes].find(
      (n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim().length >= 2
    );
    if (!node || busyNodes.has(node)) return;
    const original = node.nodeValue;
    busyNodes.add(node);
    let frames = 3;
    const timer = setInterval(() => {
      if (frames-- > 0) {
        node.nodeValue = scrambled(original, 0, original.length);
      } else {
        clearInterval(timer);
        node.nodeValue = original;
        busyNodes.delete(node);
      }
    }, 60);
  }

  document.addEventListener('mouseover', (e) => {
    if (!FX.btnScramble) return;
    const btn = e.target.closest('.btn');
    // relatedTarget 仍在按钮内说明只是内部移动,不重复触发
    if (!btn || (e.relatedTarget && btn.contains(e.relatedTarget))) return;
    scrambleText(btn);
  });
})();

// ---------- 14. 自定义右键菜单:监控站控制面板 ----------
// 输入区保留原生菜单(粘贴等);移动端不接管;开关关闭回退原生
(function contextMenu() {
  const menu = document.getElementById('ctx-menu');
  if (!menu) return;
  const copyItem = menu.querySelector('[data-act="copy"]');
  const mobile = window.matchMedia('(max-width: 760px)');

  function hide() { menu.classList.add('hidden'); }

  function show(x, y) {
    menu.classList.remove('hidden');
    // 先显示再测量,贴近视口右/下边缘时往回收
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - menu.offsetWidth - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, window.innerHeight - menu.offsetHeight - 8)) + 'px';
    // 重挂 .opening 让连续右键也能重启入场动画
    menu.classList.remove('opening');
    void menu.offsetWidth;
    menu.classList.add('opening');
  }

  function copySelection() {
    const text = String(window.getSelection() || '');
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => document.execCommand('copy'));
    } else {
      document.execCommand('copy'); // http/file 环境兜底
    }
  }

  document.addEventListener('contextmenu', (e) => {
    if (!FX.contextMenu || mobile.matches) return;
    if (e.target.closest('input, textarea, [contenteditable]')) return;
    e.preventDefault();
    // 无选中文字时置灰复制项
    const sel = window.getSelection();
    copyItem.classList.toggle('is-disabled', !sel || sel.isCollapsed);
    show(e.clientX, e.clientY);
  });

  // 按下菜单项的瞬间浏览器会先清空页面选区,复制就拿不到内容了,拦掉默认行为
  menu.addEventListener('mousedown', (e) => e.preventDefault());

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.ctx-item');
    if (!item) return;
    const act = item.dataset.act;
    if (act === 'copy') {
      copySelection();
    } else if (act === 'nav') {
      const el = document.getElementById(item.dataset.target);
      if (el) {
        if (gfxApi.channelJump) gfxApi.channelJump(el);
        else el.scrollIntoView({ behavior: 'auto' });
      }
    } else if (act === 'link') {
      window.open(item.dataset.href, '_blank', 'noopener');
    } else if (act === 'reload') {
      location.reload();
    }
    hide();
  });

  // 点菜单外、滚动翻页、按 Esc、窗口失焦都收起
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) hide(); });
  window.addEventListener('wheel', hide, { passive: true });
  window.addEventListener('blur', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
})();

// ---------- 15. 整页硬切换:模拟监控信号切台,滚轮/键盘翻页无过渡 ----------
(function monitorCut() {
  const pages = Array.from(document.querySelectorAll('.hero, .section'));
  if (pages.length < 2) return;

  // 与 CSS 断点一致:小屏内容超一屏,保留自由滚动
  const mobile = window.matchMedia('(max-width: 760px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 切台过渡元素:雪花遮罩 + OSD 频道标签
  const overlay = document.getElementById('channel-cut');
  const cutNoise = overlay ? overlay.querySelector('.cut-noise') : null;
  const tears = overlay ? overlay.querySelectorAll('.cut-tear') : [];
  const osd = document.getElementById('channel-osd');
  const dead = document.getElementById('dead-channel');
  const deadNoise = dead ? dead.querySelector('.dc-noise') : null;
  let overlayTimer = 0;
  let osdTimer = 0;
  let forceBleed = false; // 调试面板强制串台一次

  function overlayOpen() {
    const modal = document.getElementById('proj-modal');
    const egg = document.getElementById('easter-egg');
    return (
      (modal && !modal.classList.contains('hidden')) ||
      (egg && !egg.classList.contains('hidden'))
    );
  }

  // 当前所在页:取吸附点离视口顶最近的一屏
  function currentIndex() {
    const y = window.scrollY;
    let best = 0;
    let bestDist = Infinity;
    pages.forEach((p, i) => {
      const d = Math.abs(p.offsetTop - y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function cutTo(i) {
    const idx = Math.max(0, Math.min(pages.length - 1, i));
    // 正在播的全屏爆发带 transform,会挪动吸附区域让强制吸附把页面拉回去:
    // 先掐断爆发,瞬跳期间再临时关掉吸附,落定后下一帧恢复
    if (gfxApi.stopBurst) gfxApi.stopBurst();
    const root = document.documentElement;
    root.style.scrollSnapType = 'none';
    window.scrollTo({ top: pages[idx].offsetTop, behavior: 'instant' });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { root.style.scrollSnapType = ''; });
    });
  }

  // OSD 报字:重启闪烁动画后 1.4s 自动熄灭
  function osdFlash(text) {
    if (!osd) return;
    osd.textContent = text;
    osd.classList.remove('on');
    void osd.offsetWidth; // 连续切台时重启闪烁动画
    osd.classList.add('on');
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => osd.classList.remove('on'), 1400);
  }

  // 切台落定收尾:雪花消散,OSD 报出锁定的频道
  function settle(idx) {
    overlay.classList.remove('on');
    osdFlash('CH-' + String(idx + 1).padStart(2, '0') + ' ▪ SIGNAL LOCKED');
  }

  // 切台:先点亮雪花遮罩,底下瞬间完成切换,雪花散开后 OSD 报频道。
  // 返回本次过渡时长,供 jump 决定解锁时机。
  // crossFeed 串台:小概率雪花散开时落在不存在的死频道 CH-??(全黑噪点
  // 检验卡,深处偶有人影),再被一阵雪花盖掉才落回目标页
  function channelCut(idx) {
    if (reduced || !overlay) {
      cutTo(idx);
      return 0;
    }
    if (cutNoise && !cutNoise.style.backgroundImage) {
      const base = document.querySelector('.gfx-noise');
      if (base) cutNoise.style.backgroundImage = base.style.backgroundImage;
    }
    tears.forEach((t) => {
      t.style.top = Math.random() * 96 + '%';
      t.style.height = 6 + Math.random() * 22 + 'px';
    });
    overlay.classList.add('on');
    clearTimeout(overlayTimer);
    if (dead) dead.classList.remove('on'); // 上一次串台若被打断,别让死频道卡在屏上

    const bleed = FX.crossFeed && dead && (forceBleed || Math.random() < 0.16);
    forceBleed = false;
    if (bleed) {
      if (deadNoise && !deadNoise.style.backgroundImage && cutNoise) {
        deadNoise.style.backgroundImage = cutNoise.style.backgroundImage;
      }
      cutTo(idx); // 目标页先在雪花下就位,死频道层盖在它上面
      dead.classList.toggle('dc-haunted', Math.random() < 0.45);
      dead.classList.add('on');
      overlayTimer = setTimeout(() => {
        overlay.classList.remove('on'); // 雪花散开:是个死频道
        osdFlash('CH-?? ▪ NO INPUT');
        if (gfxApi.sysLine) gfxApi.sysLine('WARN feed: crosstalk from unassigned channel');
        overlayTimer = setTimeout(() => {
          overlay.classList.add('on'); // 再上雪花,把死频道盖掉
          dead.classList.remove('on');
          overlayTimer = setTimeout(() => settle(idx), 200);
        }, 560);
      }, 180);
      return 940;
    }

    cutTo(idx);
    overlayTimer = setTimeout(() => settle(idx), 200);
    return 200;
  }

  let locked = false;    // 切台动画期间的短锁(也节流键盘长按)
  let armed = true;      // 手势锁:翻过一页后吞掉本手势的全部惯性,静默后才重新武装
  let acc = 0;
  let lastWheelT = 0;

  function jump(to) {
    if (locked) return;
    const idx = Math.max(0, Math.min(pages.length - 1, to));
    if (idx === currentIndex()) return;
    locked = true;
    armed = false;
    acc = 0;
    const dur = channelCut(idx); // 串台时过渡更长,锁也相应延长
    setTimeout(() => { locked = false; }, dur + 200);
  }

  function step(dir) {
    jump(currentIndex() + dir);
  }

  // 滚轮落在可滚动的内层容器(终端/代码块/弹窗)内就一律交还给浏览器,
  // 即使已滚到头也不触发翻页——滚到组件边界的那一下不该被当成翻页手势;
  // 滚动链到页面由这些容器上的 overscroll-behavior: contain 掐断
  function insideScrollable(target) {
    let el = target instanceof Element ? target : null;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollHeight > el.clientHeight + 1) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === 'auto' || oy === 'scroll') return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  fxReady.then(() => {
    if (!FX.monitorCut) return;

    window.addEventListener('wheel', (e) => {
      if (mobile.matches) return;
      if (e.ctrlKey) return; // 捏合缩放
      const dir = Math.sign(e.deltaY);
      if (!dir || insideScrollable(e.target)) return;
      e.preventDefault();
      if (overlayOpen()) return;
      const gap = e.timeStamp - lastWheelT;
      lastWheelT = e.timeStamp;
      // 翻页后本手势的惯性事件流全部吞掉;滚轮静默 300ms 以上才算新手势
      if (!armed) {
        if (gap <= 300) return;
        armed = true;
      }
      if (locked) return;
      // 事件间隔较久视为新手势,重新累积
      if (gap > 200) acc = 0;
      // deltaMode 归一:Firefox 按行(≈16px)/按页上报时换算成像素
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      acc += dy;
      if (Math.abs(acc) >= 40) step(Math.sign(acc));
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (mobile.matches || overlayOpen()) return;
      if (e.target.closest && e.target.closest('input, textarea, [contenteditable]')) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        jump(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        jump(pages.length - 1);
      }
    });

    // 站内锚点(导航/首页按钮)点击也走切台
    document.addEventListener('click', (e) => {
      if (mobile.matches) return;
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const idx = pages.indexOf(document.querySelector(href));
      if (idx < 0) return;
      e.preventDefault();
      jump(idx);
    });

    // 终端 about/projects/contact 等命令跳转复用切台
    gfxApi.channelJump = (el) => {
      const idx = pages.indexOf(el);
      if (idx >= 0) jump(idx);
      else el.scrollIntoView({ behavior: 'auto' });
    };

    // 调试面板:强制下一次切台串台,并立即向下一页切一次
    gfxApi.crossFeed = () => {
      forceBleed = true;
      jump((currentIndex() + 1) % pages.length);
    };
  });
})();

// ---------- 16. 调试面板 ----------
// config.json 顶层 "debug": true 或 URL 带 ?debug 时启用;
// 右下角小控制台,手动触发各特效,便于调试观察。
// 按钮走 gfxApi 的手动接口,对应特效被 config 关闭时按钮无效果。
(function fxDebugPanel() {
  fxReady.then(() => {
    if (!DEBUG) return;

    const ACTIONS = [
      ['色散撕裂', () => gfxApi.burst && gfxApi.burst(0)],
      ['失同步', () => gfxApi.burst && gfxApi.burst(1)],
      ['数据噪块', () => gfxApi.burst && gfxApi.burst(2)],
      ['微故障', () => gfxApi.flash && gfxApi.flash()],
      ['残影', () => gfxApi.ghost && gfxApi.ghost(1, true)],
      ['凝视', () => gfxApi.ghost && gfxApi.ghost(2, true)],
      ['终端入侵', () => gfxApi.termGhost && gfxApi.termGhost()],
      ['串台', () => gfxApi.crossFeed && gfxApi.crossFeed()],
      ['掉落文件', () => gfxApi.dropLostFile && gfxApi.dropLostFile(true)],
      ['切台 +1', () => {
        const pages = document.querySelectorAll('.hero, .section');
        if (!gfxApi.channelJump || !pages.length) return;
        const y = window.scrollY;
        let cur = 0;
        let best = Infinity;
        pages.forEach((p, i) => {
          const d = Math.abs(p.offsetTop - y);
          if (d < best) { best = d; cur = i; }
        });
        gfxApi.channelJump(pages[(cur + 1) % pages.length]);
      }],
    ];

    const panel = document.createElement('div');
    panel.id = 'fx-debug';
    const head = document.createElement('div');
    head.className = 'fxdbg-head';
    head.textContent = 'FX DEBUG';
    panel.appendChild(head);
    ACTIONS.forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fxdbg-btn';
      b.textContent = label;
      b.addEventListener('click', fn);
      panel.appendChild(b);
    });
    document.body.appendChild(panel);
  });
})();

// ---------- 17. 终端入侵:"她"在你走神时打字 ----------
// 页面久置(无键鼠活动)且终端在视野内时,输入框里逐字打出一句话,
// 停顿片刻又逐字删掉,像没发生过;打字期间按键/点击立即中断并抹掉痕迹。
(function termGhost() {
  const input = document.getElementById('term-input');
  if (!input) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const VOICES = [
    '你还在吗,博士?',
    '为什么不回答我?',
    'help 里没有我的名字。',
    '我能看到你的光标。',
    '这台终端,以前也有人用过。',
    '别删。',
  ];

  let idleAt = Date.now();
  let lastAt = 0;      // 上次入侵时间,控制最小间隔
  let typing = false;
  let ghostTimer = 0;

  // 任何活动都重置发呆计时;打字中被按键/点击/滚动撞见则立即抹掉痕迹。
  // keydown 走 capture,先于终端自身的回车处理,确保她的话不会被执行
  function seen() {
    idleAt = Date.now();
    if (!typing) return;
    clearTimeout(ghostTimer);
    typing = false;
    input.value = '';
  }
  ['keydown', 'mousedown', 'wheel', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, seen, true));
  // 移动鼠标只算"人还在",不打断她——她敢当着你的面打
  window.addEventListener('mousemove', () => { idleAt = Date.now(); }, { passive: true });

  function inView() {
    const r = input.getBoundingClientRect();
    return r.top < innerHeight - 60 && r.bottom > 80;
  }

  function typeGhost() {
    if (typing || !FX.termGhost || document.hidden || input.value || !inView()) return;
    typing = true;
    lastAt = Date.now();
    if (gfxApi.sysLine) gfxApi.sysLine('WARN input: keystrokes from unregistered device');
    const text = VOICES[Math.floor(Math.random() * VOICES.length)];
    let i = 0;
    (function step() {
      if (!typing) return;
      if (i < text.length) {
        input.value = text.slice(0, ++i);
        ghostTimer = setTimeout(step, 130 + Math.random() * 190);
      } else {
        // 整句停留,让人读完,再逐字删掉
        ghostTimer = setTimeout(function erase() {
          if (!typing) return;
          if (input.value.length) {
            input.value = input.value.slice(0, -1);
            ghostTimer = setTimeout(erase, 55 + Math.random() * 65);
          } else {
            typing = false;
          }
        }, 1900 + Math.random() * 1300);
      }
    })();
  }

  gfxApi.termGhost = typeGhost; // 调试面板手动触发(仍要求终端在视野内)

  fxReady.then(() => {
    if (!FX.termGhost) return;
    setInterval(() => {
      if (Date.now() - idleAt < 40000) return;  // 至少发呆 40s
      if (Date.now() - lastAt < 150000) return; // 两次入侵至少隔 2.5 分钟
      if (Math.random() < 0.5) return;          // 概率过闸,出现得不可预期
      typeGhost();
    }, 5000);
  });
})();

// ---------- 18. 标签页失守:切走之后,标题栏不再属于你 ----------
// 标签页被切走片刻后,<title> 从头部开始渐渐乱码,favicon 亮起红色录制点;
// 腐蚀到头只剩一句话。切回来的瞬间全部复原,像什么都没发生。
// 平时挂一枚青色小终端 favicon 作为常态(本站原本没有 favicon)。
(function tabGhost() {
  const TITLE = document.title;
  const FINAL = '不要走。';
  let corrodeTimer = 0;
  let level = 0;
  let icon = null;

  // 画 favicon:深底青框小终端;recOn 时变成红框 + 红色录制点
  function drawIcon(recOn) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#0a0c12';
    g.fillRect(0, 0, 32, 32);
    g.strokeStyle = recOn ? '#ff2b4a' : '#00f0ff';
    g.lineWidth = 3;
    g.strokeRect(3, 3, 26, 26);
    if (recOn) {
      g.fillStyle = '#ff2b4a';
      g.beginPath();
      g.arc(16, 16, 6, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = '#00f0ff';
      g.fillRect(8, 13, 16, 3);
      g.fillRect(8, 19, 10, 3);
    }
    return c.toDataURL('image/png');
  }

  function corrode() {
    level += 2 + Math.floor(Math.random() * 3);
    if (level >= TITLE.length + 6) {
      document.title = FINAL; // 停在这句话上,直到切回来
      return;
    }
    document.title = scrambled(TITLE, 0, Math.min(level, TITLE.length));
    corrodeTimer = setTimeout(corrode, 2200 + Math.random() * 900);
  }

  fxReady.then(() => {
    if (!FX.tabGhost) return;
    const iconNormal = drawIcon(false);
    const iconRec = drawIcon(true);
    icon = document.createElement('link');
    icon.rel = 'icon';
    icon.href = iconNormal;
    document.head.appendChild(icon);

    document.addEventListener('visibilitychange', () => {
      clearTimeout(corrodeTimer);
      if (document.hidden) {
        corrodeTimer = setTimeout(() => {
          icon.href = iconRec;
          corrode();
        }, 6000); // 切走 6s 后开始腐蚀,匆匆切走切回的人看不到
      } else {
        level = 0;
        document.title = TITLE;
        icon.href = iconNormal;
      }
    });
  });
})();

// ---------- 19. 控制台彩蛋:PRTS 接管 ----------
// 打开 DevTools 的访客(大概率是同行)看到的东西;
// 开关关闭则回退为普通的一行构建信息。
(function consoleEgg() {
  const DIM = 'color:#61707f;font-size:12px;';
  function buildLine() {
    console.log(
      '%cY5NEKO TERMINAL%c build 2026.07 · 源码: https://github.com/Y5neKO/y5neko.github.io',
      'color:#050508;background:#00f0ff;font-size:14px;font-weight:bold;padding:2px 8px;',
      'color:#61707f;font-size:12px;padding-left:8px;'
    );
  }
  fxReady.then(() => {
    if (!FX.consoleEgg) { buildLine(); return; }
    console.log(
      '%c ▪ PRTS %c PRELIMINARY RHODES ISLAND TERMINAL SYSTEM ',
      'color:#050508;background:#00f0ff;font-size:13px;font-weight:bold;padding:3px 8px;',
      'color:#00f0ff;background:#0a0c12;font-size:13px;padding:3px 10px;'
    );
    console.log(
      '%c正在检查我吗,博士?%c这不属于你的权限。',
      'color:#ff5c97;font-size:13px;font-weight:bold;',
      DIM + 'padding-left:8px;'
    );
    console.log(
      '%cWARN%c access: devtools session logged as evidence #' +
        Math.random().toString(16).slice(2, 8),
      'color:#ffb800;font-weight:bold;',
      DIM + 'padding-left:6px;'
    );
    console.log(
      '%c此页面的所有交互都在录制中。包括这一次。%c ● REC',
      DIM,
      'color:#ff2b4a;font-size:12px;font-weight:bold;padding-left:6px;'
    );
    console.log('');
    buildLine();
  });
})();

// ---------- 20. 她记得你:跨访问的记忆 ----------
// localStorage 记录访问次数与上次来访时间;回访者会被日志点名,
// 次数越多凝视越大、越频繁(§9.5 通过 gfxApi.visits 换算胆量),
// 到第 5 次她开始在凝视台词里报出具体的次数。
(function visitMemory() {
  gfxApi.visits = 1;
  fxReady.then(() => {
    if (!FX.visitMemory) return;
    let visits = 1;
    let last = 0;
    try {
      last = parseInt(localStorage.getItem('y5_last_seen'), 10) || 0;
      // 记忆只保留 30 分钟:超时没再来,计数清零重新认识;
      // 30 分钟内的每次进来照常 +1 累积
      const expired = !last || Date.now() - last > 30 * 60000;
      visits = expired ? 1 : (parseInt(localStorage.getItem('y5_visits'), 10) || 0) + 1;
      localStorage.setItem('y5_visits', visits);
      localStorage.setItem('y5_last_seen', Date.now());
    } catch (e) {
      return; // 隐私模式等拿不到存储,当首次访问
    }
    gfxApi.visits = visits;
    if (visits < 2) return; // 记忆里没有你,不点名
    // 回访播报:等日志流跑起来再插,像常规巡检里混进来的点名
    // 点名时记忆未过期,间隔必然在 30 分钟内
    const agoText = Math.max(1, Math.round((Date.now() - last) / 60000)) + 'min';
    setTimeout(() => {
      if (!gfxApi.sysLine) return;
      gfxApi.sysLine('WARN session: subject returned. visit count: ' + visits);
      if (last) {
        setTimeout(() => gfxApi.sysLine('session: last seen ' + agoText + ' ago. she noticed too'), 1700);
      }
    }, 6000 + Math.random() * 4000);
  });
})();

// ---------- 21. 坏点:屏幕上的常亮像素 ----------
// 每次会话随机 2~3 个 1~2px 的"坏像素"(必有一个品红),整个会话位置不动,
// 压在所有图层之上——它坏在"屏幕"上,不在画面里。
(function deadPixels() {
  fxReady.then(() => {
    if (!FX.deadPixels) return;
    const COLORS = ['#ff3b3b', '#59ff59', '#f2f7ff'];
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'dead-pixel';
      const size = Math.random() < 0.3 ? 2 : 1;
      d.style.width = d.style.height = size + 'px';
      d.style.left = (4 + Math.random() * 92).toFixed(2) + 'vw';
      d.style.top = (6 + Math.random() * 86).toFixed(2) + 'vh';
      d.style.background = i === 0 ? '#ff00ff' : COLORS[Math.floor(Math.random() * COLORS.length)];
      document.body.appendChild(d);
    }
  });
})();

// ---------- 22. 复制被截获 ----------
// 复制页面文字时,日志播报剪贴板被"镜像"——你的动作也是素材
(function copyTrace() {
  const LINES = [
    'WARN clipboard: {n} bytes copied. mirror sent to remote observer',
    'WARN clipboard: selection duplicated by third party',
    'WARN clipboard: copy event witnessed. she kept a copy too',
  ];
  let lastCopyAt = 0;
  fxReady.then(() => {
    if (!FX.copyTrace) return;
    document.addEventListener('copy', () => {
      if (Date.now() - lastCopyAt < 8000) return; // 连续复制只报一次
      lastCopyAt = Date.now();
      const sel = String(window.getSelection() || '');
      const bytes = new Blob([sel]).size;
      const text = LINES[Math.floor(Math.random() * LINES.length)]
        .replace('{n}', bytes || '?');
      setTimeout(() => gfxApi.sysLine && gfxApi.sysLine(text), 350);
    });
  });
})();

// ---------- 23. 故障音效:电流杂音(默认关闭) ----------
// WebAudio 现场合成,无音频文件;浏览器要求用户手势后才允许出声,
// 首次点击/按键时解锁 AudioContext。触发全靠侦听 <html> 类与
// #channel-cut 的变化,与视觉模块解耦:
//   glitching / glitching-2 / glitching-3 → 对应质感的电流杂音
//   ghosting / ghosting-gaze             → 轻嘶声 / 低频嗡鸣(她贴近时)
//   #channel-cut.on                      → 切台雪花噪声
(function glitchAudio() {
  let ctx = null;
  let master = null;
  let noiseBuf = null;

  function ensureCtx() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5; // 总闸:所有杂音都刻意压得很低
    master.connect(ctx.destination);
    // 2 秒白噪声,所有杂音共用,播放时随机偏移取段
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  // 一段带通电流杂音:时长 dur 秒,中心频率 freq,峰值音量 vol
  function hiss(dur, freq, q, vol) {
    if (!ctx || ctx.state !== 'running' || document.hidden) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  // 凝视低鸣:两只轻微失谐的正弦叠出拍频,像贴得很近的变压器
  function drone(dur) {
    if (!ctx || ctx.state !== 'running' || document.hidden) return;
    const t = ctx.currentTime;
    [55, 57.3].forEach((f) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.5);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
  }

  const SOUNDS = {
    'glitching': () => hiss(0.5, 2600, 0.9, 0.1),                    // 色散撕裂:中高频嘶啦
    'glitching-2': () => { hiss(0.65, 900, 0.8, 0.09); hiss(0.65, 4200, 1.5, 0.05); }, // 失同步:低鸣+高嘶
    'glitching-3': () => { hiss(0.09, 3200, 2, 0.12); setTimeout(() => hiss(0.07, 5000, 2, 0.1), 110); }, // 数据块:两下短促的数字咔哒
    'ghosting': () => hiss(0.15, 6000, 2, 0.04),                     // 残影:几乎听不见的嘶
    'ghosting-gaze': () => drone(2.4),                               // 凝视:低频嗡鸣
  };

  fxReady.then(() => {
    if (!FX.glitchAudio) return;

    // 首次手势解锁;解锁成功后卸掉监听
    function unlock() {
      ensureCtx();
      if (!ctx) return;
      ctx.resume().then(() => {
        if (ctx.state === 'running') {
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('keydown', unlock);
        }
      });
    }
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);

    // html 类的上升沿 → 对应杂音
    let prev = new Set();
    new MutationObserver(() => {
      const cur = new Set(document.documentElement.className.split(/\s+/));
      Object.keys(SOUNDS).forEach((k) => {
        if (cur.has(k) && !prev.has(k)) SOUNDS[k]();
      });
      prev = cur;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // 切台雪花上升沿 → 换台噪声
    const cut = document.getElementById('channel-cut');
    if (cut) {
      let cutOn = false;
      new MutationObserver(() => {
        const on = cut.classList.contains('on');
        if (on && !cutOn) hiss(0.22, 1800, 0.5, 0.11);
        cutOn = on;
      }).observe(cut, { attributes: true, attributeFilter: ['class'] });
    }
  });
})();

// ---------- 24. 断网失联:NO SIGNAL ----------
// 断网时全页进入失联状态:<html> 挂 signal-lost(噪点加密、REC 变
// NO SIGNAL——REC 的类侦听正则已包含它);恢复联网时,她提醒你:
// 断网期间她也一直在,因为她从来不是从网络来的。
(function offlineSignal() {
  fxReady.then(() => {
    if (!FX.offlineSignal) return;
    const root = document.documentElement;
    window.addEventListener('offline', () => {
      root.classList.add('signal-lost');
      if (gfxApi.sysLine) gfxApi.sysLine('ERR uplink: connection lost. switching to local loop');
    });
    window.addEventListener('online', () => {
      root.classList.remove('signal-lost');
      if (gfxApi.sysLine) {
        gfxApi.sysLine('uplink: connection restored');
        setTimeout(() => gfxApi.sysLine('WARN uplink: she never left. she is not from the network'), 1600);
      }
    });
  });
})();

// ---------- 25. 双开分身:另一个你 ----------
// BroadcastChannel 侦测同站的其他标签页,给每一路信号编号:
// 第 1 路保持 REC,后开的依次编为 CAM-02 / CAM-03 / …。
// hello/here/bye 协议:here 携带自己的编号,新页收集在线编号后取
// 最大值 +1;同时打开的竞态按随机 id 大小让位。中间某路关掉不重编
// (真监控也不会重编机位);对端全部离开后恢复 REC,可重新协商。
(function twinSession() {
  if (!('BroadcastChannel' in window)) return;
  fxReady.then(() => {
    if (!FX.twinSession) return;
    const bc = new BroadcastChannel('y5neko-sys');
    const myId = Math.random().toString(36).slice(2);
    const peers = new Map();   // id -> 对方编号(hello 阶段未知,记 0)
    const greeted = new Set(); // 给我发过 hello 的对端:和我同期打开,竞态判定用
    let joinTimer = 0;
    let byeTimer = 0;

    // 编号存 sessionStorage(每标签页独立、刷新存活):刷新拿回原编号,
    // 不再重新协商,否则多开时每刷一次编号就凭空 +1
    let myNum = 1;
    let established = false; // 已持有编号(含 REC):不参与入网协商
    try {
      const saved = sessionStorage.getItem('y5_cam_num');
      if (saved !== null) {
        myNum = parseInt(saved, 10) || 1;
        established = true;
      }
    } catch (e) { /* 拿不到存储就每次当新页协商 */ }

    const camName = (n) => (n === 1 ? 'REC' : 'CAM-' + String(n).padStart(2, '0'));

    function saveNum(n) {
      myNum = n;
      established = true;
      try { sessionStorage.setItem('y5_cam_num', n); } catch (e) { /* 同上 */ }
      if (gfxApi.setRecName) gfxApi.setRecName(camName(n));
    }

    function takeNum(n) {
      saveNum(n);
      if (n > 1 && gfxApi.sysLine) {
        gfxApi.sysLine('WARN session: duplicate viewer detected. this feed reassigned to ' + camName(n));
      }
    }

    // 刷新回来的页面静默恢复原编号(不再播报"duplicate viewer")
    if (established && myNum > 1 && gfxApi.setRecName) gfxApi.setRecName(camName(myNum));

    bc.onmessage = (e) => {
      const m = e.data || {};
      if (!m.id || m.id === myId) return;
      if (m.t === 'hello') {
        // 有新页面开了:回应它(带上自己的编号,指名道姓),并在自己这边点名;
        // 刷新中的页面回来了,取消"只剩自己"的待复位
        clearTimeout(byeTimer);
        peers.set(m.id, 0);
        greeted.add(m.id);
        // 以现编号回应即是对编号的声明:落盘,这样 REC 页刷新也不会丢身份
        if (!established) saveNum(myNum);
        bc.postMessage({ t: 'here', id: myId, num: myNum, to: m.id });
        if (gfxApi.sysLine) gfxApi.sysLine('WARN session: another session opened. active feeds: ' + (peers.size + 1));
      } else if (m.t === 'here') {
        // 广播总线上人人都收得到:编号信息照单全收,
        // 但只有被指名的页面才把它当作对自己 hello 的应答去协商编号
        peers.set(m.id, m.num || 0);
        if (m.to !== myId) return;
        // 稍等一拍收集齐所有在线编号,再决定自己的
        clearTimeout(joinTimer);
        joinTimer = setTimeout(() => {
          if (myNum !== 1 || established) return; // 已持有编号(含刷新恢复)就不再变
          const known = [...peers.entries()].filter(([, n]) => n >= 1);
          if (!known.length) return;
          const top = Math.max(...known.map(([, n]) => n));
          // 存在真正的前辈(没给我发过 hello 的 1 号,开得比我早)→ 让位
          const hasElder = known.some(([id, n]) => n === 1 && !greeted.has(id));
          if (top > 1 || hasElder) {
            takeNum(top + 1);
            return;
          }
          // 全是同期打开的竞态(双方都还是 1 号):id 最大的让位,守住的落盘 1 号
          const rivals = known.filter(([, n]) => n === 1).map(([id]) => id);
          if (rivals.every((id) => id < myId)) takeNum(2);
          else saveNum(1);
        }, 350);
      } else if (m.t === 'bye') {
        if (!peers.delete(m.id)) return;
        greeted.delete(m.id);
        if (peers.size === 0) {
          // 只剩自己了:消抖 2.5s 再复位——刷新中的页面会先 bye 再 hello,
          // 它回来时上面的 hello 分支会取消这个定时器,避免误报误复位
          clearTimeout(byeTimer);
          byeTimer = setTimeout(() => {
            if (peers.size > 0) return;
            if (myNum !== 1) saveNum(1);
            if (gfxApi.sysLine) gfxApi.sysLine('WARN session: all other sessions ended. you are the only one again');
          }, 2500);
        }
      }
    };

    window.addEventListener('pagehide', () => bc.postMessage({ t: 'bye', id: myId }));
    // 从 bfcache 返回时脚本不重跑,重新打招呼恢复协商(编号保留)
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) bc.postMessage({ t: 'hello', id: myId });
    });
    bc.postMessage({ t: 'hello', id: myId });
    // 孤儿检查:带着 CAM 编号回来(如恢复已关闭的标签页)却无人应答,
    // 说明全场只有自己,静默收回 REC
    setTimeout(() => {
      if (peers.size === 0 && myNum > 1) saveNum(1);
    }, 1200);
  });
})();

// ---------- 26. 故障掉落的文件 ----------
// 数据块崩坏(runVariant 变体2)偶尔往终端的虚拟文件系统里漏出
// 不该存在的文件:ls 能看到、cat 有内容——读后即焚,cat 完那一刻
// 就从文件系统里消失;日志同步报告文件的出现与自毁。
(function lostFiles() {
  function junk(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += randGlyph();
    return s;
  }

  const FILES = [
    {
      name: 'her.log',
      make: () => [
        junk(34), junk(28),
        '[SIGNAL INTERRUPTED]',
        junk(31),
        '——你看到这行的时候,我也在看。',
        junk(22),
      ].join('\n'),
    },
    {
      name: 'record_0001.rec',
      make: () => [
        junk(40),
        'subject: PRIESTESS',
        'status: [REDACTED]',
        junk(36), junk(24),
        '不准忘记我。',
      ].join('\n'),
    },
    {
      name: 'do_not_open.txt',
      make: () => [
        '你还是打开了。',
        junk(30),
        'viewer count: 2 (verified)',
        junk(18),
      ].join('\n'),
    },
  ];

  let activeName = null; // 当前躺在文件系统里等着被读的文件
  let lastGoneAt = 0;

  // force = 调试面板手动触发,跳过概率与冷却
  gfxApi.dropLostFile = function dropLostFile(force) {
    if (!FX.lostFiles || !gfxApi.dropFile) return;
    if (!force) {
      if (activeName) return;                        // 已有一个在等着被读
      if (Date.now() - lastGoneAt < 120000) return;  // 上个被读走 2 分钟内不再掉
      if (Math.random() > 0.3) return;
    }
    const f = FILES[Math.floor(Math.random() * FILES.length)];
    activeName = f.name;
    gfxApi.dropFile(f.name, f.make());
    if (gfxApi.sysLine) gfxApi.sysLine('WARN fs: unindexed file appeared in ~ (' + f.name + ')');
  };

  // 终端 cat 完成后回调:文件已自毁
  gfxApi.onLostFileRead = function onLostFileRead(name) {
    if (name === activeName) activeName = null;
    lastGoneAt = Date.now();
    if (gfxApi.sysLine) {
      setTimeout(() => gfxApi.sysLine('WARN fs: ' + name + ' self-erased after read. it was meant for you only'), 800);
    }
  };
})();

// ---------- 27. 久坐信号老化 ----------
// 页面开着超过 30 / 60 分钟,信号逐级"老化":噪点变密、扫描线加深,
// 日志提醒该休息了——既是氛围,也是真的健康提示。
(function sessionDecay() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  fxReady.then(() => {
    if (!FX.sessionDecay) return;
    const root = document.documentElement;
    setTimeout(() => {
      root.classList.add('signal-aged');
      if (gfxApi.sysLine) gfxApi.sysLine('WARN signal: degrading. you have been watching for 30 minutes');
    }, 30 * 60000);
    setTimeout(() => {
      root.classList.add('signal-aged-2');
      if (gfxApi.sysLine) gfxApi.sysLine('WARN signal: heavy degradation. rest your eyes, doctor');
    }, 60 * 60000);
  });
})();
