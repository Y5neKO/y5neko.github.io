/* ==========================================================
   Y0lay 个人主页脚本
   代码雨 / 樱花 / 打字机 / 滚动渐入 / 数字滚动 / Konami 彩蛋
   ========================================================== */

// ---------- 1. 背景:尘埃粒子 / 系统日志流 / 雷达扫描 ----------
(function wastelandBg() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  resize();
  window.addEventListener('resize', resize);

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#cfcdc2';
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

  frame(); // 减少动态效果时也保留一帧静态尘埃

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

  if (!reduced) logLine();

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

  if (!reduced) blip();
})();

// ---------- 2. 可交互模拟终端 ----------
(function terminal() {
  const body = document.getElementById('terminal-body');
  const output = document.getElementById('term-output');
  const input = document.getElementById('term-input');

  const history = [];
  let histPos = -1;

  // 虚拟文件系统(纯装饰)
  const files = {
    'about.json': [
      '{',
      '  "name": "y0lay",',
      '  "role": "全栈开发 / 安全研究",',
      '  "stack": ["TypeScript", "Python", "Go"],',
      '  "focus": "Web 安全与工程化"',
      '}',
    ].join('\n'),
    'motto.txt': '能自动化的绝不手动,能复现的必有日志。',
    'todo.md': '- [x] 重构部署脚本\n- [ ] 修复上周的 bug\n- [ ] 修复修 bug 时引入的新 bug',
    '.secret': '在页面任意位置输入:↑↑↓↓←→←→BA',
  };
  const dirs = ['projects/', 'archive/'];

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
    print('<span class="prompt">y0lay@dev:~$</span> ' + esc(cmd), 'line-cmd');
  }

  function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
  }

  const commands = {
    help() {
      print('<span class="out-cyan">可用命令:</span>');
      print('  help        显示本帮助');
      print('  whoami      我是谁');
      print('  neofetch    系统信息');
      print('  ls [-a]     列出文件');
      print('  cat <file>  查看文件内容');
      print('  about       跳转到「关于」');
      print('  skills      跳转到「技能树」');
      print('  projects    跳转到「装备栏」');
      print('  contact     跳转到「召唤阵」');
      print('  echo <msg>  复读机');
      print('  date        现在几点了');
      print('  history     命令历史');
      print('  clear       清屏');
      print('<span class="out-dim">提示:↑↓ 翻历史,Tab 补全</span>');
    },
    whoami() {
      print('y0lay — <span class="out-pink">全栈开发 / 安全研究</span>');
    },
    neofetch() {
      print('<span class="out-cyan">   ██  ██</span>       <span class="out-pink">y0lay</span>@<span class="out-pink">dev</span>');
      print('<span class="out-cyan">    ████</span>        -----------------');
      print('<span class="out-cyan">     ██</span>         <span class="out-purple">OS:</span> Arch Linux x86_64');
      print('<span class="out-cyan">     ██</span>         <span class="out-purple">Shell:</span> zsh 5.9');
      print('                <span class="out-purple">Editor:</span> VS Code + Vim 键位');
      print('                <span class="out-purple">Uptime:</span> 42 days, 3:14');
      print('                <span class="out-purple">Memory:</span> 12.4GiB / 64GiB');
    },
    ls(args) {
      const showAll = args.includes('-a');
      const names = [...dirs.map((d) => '<span class="out-cyan">' + d + '</span>'),
                     ...Object.keys(files)
                       .filter((f) => showAll || !f.startsWith('.'))
                       .map(esc)];
      print(names.join('   '));
    },
    cat(args) {
      const name = args[0];
      if (!name) { print('cat: 缺少文件名,用法 cat <file>', 'out-err'); return; }
      if (files[name] !== undefined) {
        files[name].split('\n').forEach((l) => print('<span class="out-green">' + esc(l) + '</span>'));
      } else if (dirs.includes(name) || dirs.includes(name + '/')) {
        print('cat: ' + esc(name) + ': Is a directory', 'out-err');
      } else {
        print('cat: ' + esc(name) + ': No such file or directory', 'out-err');
      }
    },
    cd() {
      print('cd: 前端模拟终端,无实际文件系统', 'out-dim');
    },
    about() { print('scrolling to #about ...', 'out-dim'); scrollToSection('about'); },
    skills() { print('scrolling to #skills ...', 'out-dim'); scrollToSection('skills'); },
    projects() { print('scrolling to #projects ...', 'out-dim'); scrollToSection('projects'); },
    contact() { print('scrolling to #contact ...', 'out-dim'); scrollToSection('contact'); },
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
        : [...Object.keys(files), ...dirs];
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

  // 点终端任意处聚焦输入框
  body.addEventListener('click', () => input.focus());

  // 开机欢迎语
  print('<span class="out-cyan">y0lay-terminal v2.6.0</span> <span class="out-dim">(kernel 6.9.0-wasteland)</span>');
  print('<span class="out-dim">Last login: from 127.0.0.1</span>');
  print('');
  print('输入 <span class="out-cyan">help</span> 查看可用命令。');
  print('');
})();

// ---------- 3. 滚动渐入 + 技能条 + 数字滚动 ----------
(function scrollEffects() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');

      // 技能条填充
      entry.target.querySelectorAll('.skill-fill').forEach((bar) => {
        bar.style.width = bar.dataset.width + '%';
      });

      // 数字滚动
      entry.target.querySelectorAll('.stat-num').forEach((num) => {
        const target = +num.dataset.target;
        const duration = 1400;
        const start = performance.now();
        (function step(now) {
          const p = Math.min((now - start) / duration, 1);
          num.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        })(start);
      });

      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
})();

// ---------- 4. 移动端菜单 ----------
(function mobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.querySelector('.nav-links');
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') links.classList.remove('open');
  });
})();

// ---------- 5. Konami 秘技彩蛋 ----------
(function konami() {
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
                'KeyB', 'KeyA'];
  let pos = 0;
  const egg = document.getElementById('easter-egg');

  document.addEventListener('keydown', (e) => {
    pos = (e.code === code[pos]) ? pos + 1 : (e.code === code[0] ? 1 : 0);
    if (pos === code.length) {
      pos = 0;
      egg.classList.remove('hidden');
    }
  });

  document.getElementById('easter-close').addEventListener('click', () => {
    egg.classList.add('hidden');
  });
})();

// ---------- 6. 全屏故障艺术特效 ----------
(function glitchFx() {
  // 尊重系统的"减少动态效果"设置
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  const bands = document.querySelectorAll('.gfx-band');

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

  // 随机故障爆发:随机化条带位置后挂上 glitching 类
  function burst() {
    bands.forEach((b) => {
      b.style.top = Math.random() * 100 + '%';
      b.style.height = 4 + Math.random() * 42 + 'px';
      b.style.setProperty('--shift', (Math.random() * 18 - 9).toFixed(1) + 'px');
    });
    root.classList.add('glitching');
    setTimeout(() => root.classList.remove('glitching'), 240);
    schedule();
  }

  function schedule() {
    setTimeout(burst, 2600 + Math.random() * 5400);
  }

  schedule();
})();

// ---------- 7. 全局文字乱码闪烁 ----------
// 随机抓取页面文本节点,把其中一段字符临时替换成乱码,抖几帧后恢复原文。
// 只改 nodeValue 不动 DOM 结构,恢复时按快照原样写回,对内容零破坏。
(function textCorruption() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const GLYPHS = '█▓▒░#$%&@*+=?<>/\\|~^!¥§アイウエオカキクケコ0123456789';
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT']);
  const busy = new WeakSet(); // 正在乱码中的节点,防止重复处理

  function randGlyph() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }

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

  // 把 original 中 [start, end) 区间替换为随机乱码(保留空白字符,维持排版)
  function scrambled(original, start, end) {
    let out = original.slice(0, start);
    for (let i = start; i < end; i++) {
      const ch = original[i];
      out += /\s/.test(ch) ? ch : randGlyph();
    }
    return out + original.slice(end);
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

  function burst() {
    const nodes = collectNodes().filter((n) => !busy.has(n));
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

  schedule();
})();

// ---------- 8. 控制台招呼(程序员的仪式感) ----------
console.log(
  '%cY0LAY TERMINAL%c build 2026.07 · 源码: https://github.com/Y5neKO/Personal_Page',
  'color:#0b0b0c;background:#ffd802;font-size:14px;font-weight:bold;padding:2px 8px;',
  'color:#77766e;font-size:12px;padding-left:8px;'
);
