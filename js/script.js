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
  radar: true,            // 右下雷达扫描
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
};

// 特效间共享:乱码字符集 / 正在乱码中的文本节点(防互相踩)
const GLYPHS = '█▓▒░#$%&@*+=?<>/\\|~^!¥§アイウエオカキクケコ0123456789';
const busyNodes = new WeakSet();
const gfxApi = {}; // glitchFx 暴露的手动触发接口

function randGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
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

// ---------- 1. 背景:尘埃粒子 / 系统日志流 / 雷达扫描 ----------
(function monitorBg() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  fxReady.then(() => {
    if (FX.dust) initDust();
    if (FX.syslog && !reduced) logLine();
    if (FX.radar && !reduced) blip();
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

  // -- 滚动系统日志流 --
  const syslog = document.getElementById('syslog');
  const LOGS = [
    'sensor[3]: relay heartbeat ok (12ms)',
    'net: uplink latency 46ms, jitter 3ms',
    'build: cache hit ratio 94.2%',
    'watchdog: service "blog" healthy',
    'auth: session token rotated',
    'fs: journal sync complete (0 errors)',
    'sys: gc pause 3ms, heap 12.4MiB',
    'cron: backup snapshot created',
    'net: retry backoff 2000ms on ch.7',
    'kernel: thermal zone 0 at 41C',
  ];
  const WARNS = [
    'WARN power: grid voltage fluctuation',
    'WARN sensor[7]: signal degraded',
    'WARN net: packet loss 2.1% on uplink',
    'WARN storage: sector remap on /dev/sda',
  ];

  function two(n) { return String(n).padStart(2, '0'); }

  function logLine() {
    const now = new Date();
    const ts = two(now.getHours()) + ':' + two(now.getMinutes()) + ':' + two(now.getSeconds());
    const warn = Math.random() < 0.16;
    const pool = warn ? WARNS : LOGS;
    const div = document.createElement('div');
    div.textContent = ts + ' ' + pool[Math.floor(Math.random() * pool.length)];
    if (warn) div.className = 'syslog-warn';
    syslog.appendChild(div);
    while (syslog.childElementCount > 22) syslog.firstElementChild.remove();
    setTimeout(logLine, 900 + Math.random() * 1100);
  }

  // -- 雷达目标点 --
  const radar = document.getElementById('radar');

  function blip() {
    const dot = document.createElement('span');
    dot.className = 'radar-blip';
    const ang = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * 46;
    dot.style.left = 60 + Math.cos(ang) * dist + 'px';
    dot.style.top = 60 + Math.sin(ang) * dist + 'px';
    radar.appendChild(dot);
    setTimeout(() => dot.remove(), 3000);
    setTimeout(blip, 1800 + Math.random() * 3200);
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

  // 随机故障爆发:两种变体随机交替
  //   变体1 glitching:RGB 色散 + 撕裂条带 + 抖动(520ms)
  //   变体2 glitching-2:垂直失同步 + 雪花涌动 + 去色过曝 + 同步条(680ms)
  //   变体3 glitching-3:数据块崩坏,随机矩形块反相色偏错位(620ms)
  function burst() {
    const variant = Math.floor(Math.random() * 3);
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
        b.style.width = 36 + Math.random() * 120 + 'px';
        b.style.height = 14 + Math.random() * 46 + 'px';
        b.style.setProperty('--bx', (Math.random() * 18 - 9).toFixed(1) + 'px');
      });
      root.classList.add('glitching-3');
      setTimeout(() => root.classList.remove('glitching-3'), 300);
      // 一部分崩坏块不是噪声,而是"露出"屏幕后面的她
      if (gfxApi.ghost && Math.random() < 0.55) gfxApi.ghost(1);
    }
    schedule();
  }

  function schedule() {
    setTimeout(burst, 2600 + Math.random() * 5400);
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
// 平时只闪半秒残影;低频触发"凝视":眼睛对齐视口三分点、碎片聚拢、全屏压暗,
// syslog 同步冒出目标告警;切走标签页又切回来,也会被她"注意到"。
(function ghostGlimpse() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const layer = document.querySelector('.gfx-ghost');
  if (!layer) return;
  const root = document.documentElement;
  const syslog = document.getElementById('syslog');

  const SRC = 'images/ghost.jpg';
  const EYE = { x: 0.64, y: 0.34 }; // 贴图中眼睛的相对位置,凝视时用它对齐视口
  let ready = false;

  let active = false;
  let clearTimer = 0;

  const GAZE_LOGS = [
    'WARN cam[0]: unregistered entity in frame',
    'WARN cam[0]: entity is facing the lens',
    'WARN tracker: eye contact detected (target: you)',
    'WARN proc: she_sees_you.exe respawned (pid 404)',
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

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // strength 1 = 惊鸿一瞥(碎片少、闪得快) / 2 = 凝视(碎片密、停留久、压暗全屏)
  function show(strength) {
    if (!FX.ghostGlimpse || !ready || active || document.hidden) return;
    const gaze = strength >= 2;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // 虚拟贴图:一张完整的"她"悬在屏幕后某处,所有碎片都从它上面对位采样
    const S = Math.round(Math.min(W, H) * (gaze ? 0.72 : 0.5) * (0.9 + Math.random() * 0.25));
    let ix, iy;
    if (gaze) {
      // 凝视:让眼睛落在视口左/右三分点,像贴着屏幕看你
      ix = (Math.random() < 0.5 ? 0.33 : 0.67) * W - EYE.x * S;
      iy = 0.38 * H - EYE.y * S;
    } else {
      ix = Math.random() * (W - S * 0.6) - S * 0.2;
      iy = Math.random() * (H - S * 0.6) - S * 0.2;
    }

    const count = gaze ? 12 + Math.floor(Math.random() * 5) : 5 + Math.floor(Math.random() * 4);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div');
      // 少数碎片仍是坏块(反相冷调),和人影碎片交错,不至于太"干净"
      d.className = 'gfx-shard' + (Math.random() < 0.28 ? ' shard-broken' : '');
      // 碎片中心朝眼睛聚拢(两次随机求和≈中间值分布),凝视时聚得更紧
      const spread = gaze ? 0.55 : 0.9;
      const cx = clamp(ix + S * (EYE.x + (Math.random() + Math.random() - 1) * spread), ix + 16, ix + S - 16);
      const cy = clamp(iy + S * (EYE.y + (Math.random() + Math.random() - 1) * spread * 1.1), iy + 16, iy + S - 16);
      const w = 40 + Math.random() * (gaze ? 170 : 120);
      const h = 14 + Math.random() * (gaze ? 90 : 52);
      const x = clamp(cx - w / 2, 0, W - w);
      const y = clamp(cy - h / 2, 0, H - h);
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.style.width = w + 'px';
      d.style.height = h + 'px';
      d.style.backgroundImage = 'url(' + SRC + ')';
      d.style.backgroundSize = S + 'px ' + S + 'px';
      d.style.backgroundPosition = (ix - x) + 'px ' + (iy - y) + 'px';
      d.style.setProperty('--gx', (Math.random() * 10 - 5).toFixed(1) + 'px');
      d.style.animationDelay = (Math.random() * (gaze ? 0.22 : 0.1)).toFixed(2) + 's';
      frag.appendChild(d);
    }
    layer.replaceChildren(frag);

    active = true;
    root.classList.add(gaze ? 'ghosting-gaze' : 'ghosting');
    if (gaze) logWarn(GAZE_LOGS[Math.floor(Math.random() * GAZE_LOGS.length)]);
    clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      root.classList.remove('ghosting', 'ghosting-gaze');
      layer.replaceChildren();
      active = false;
    }, gaze ? 2450 : 780);
  }

  gfxApi.ghost = show;

  // 凝视自调度:首次约二十秒后见面,之后每 50~95 秒被"抓到"一次
  function gazeLoop(delay) {
    setTimeout(() => {
      show(2);
      gazeLoop(50000 + Math.random() * 45000);
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
    const img = new Image();
    img.onload = () => { ready = true; };
    img.src = SRC;
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
        if (parent.closest('#glitch-fx')) return NodeFilter.FILTER_REJECT;
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
  let overlayTimer = 0;
  let osdTimer = 0;

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

  // 切台:先点亮雪花遮罩,底下瞬间完成切换,约 200ms 后消散并由 OSD 报频道
  function channelCut(idx) {
    if (reduced || !overlay) {
      cutTo(idx);
      return;
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
    cutTo(idx);
    clearTimeout(overlayTimer);
    overlayTimer = setTimeout(() => {
      overlay.classList.remove('on');
      if (!osd) return;
      osd.textContent = 'CH-' + String(idx + 1).padStart(2, '0') + ' ▪ SIGNAL LOCKED';
      osd.classList.remove('on');
      void osd.offsetWidth; // 连续切台时重启闪烁动画
      osd.classList.add('on');
      clearTimeout(osdTimer);
      osdTimer = setTimeout(() => osd.classList.remove('on'), 1400);
    }, 200);
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
    channelCut(idx);
    setTimeout(() => { locked = false; }, 400);
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
  });
})();

// ---------- 16. 控制台招呼(程序员的仪式感) ----------
console.log(
  '%cY5NEKO TERMINAL%c build 2026.07 · 源码: https://github.com/Y5neKO/Personal_Page',
  'color:#050508;background:#00f0ff;font-size:14px;font-weight:bold;padding:2px 8px;',
  'color:#61707f;font-size:12px;padding-left:8px;'
);
