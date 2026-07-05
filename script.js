/* ==========================================================
   Y0lay 个人主页脚本
   代码雨 / 樱花 / 打字机 / 滚动渐入 / 数字滚动 / Konami 彩蛋
   ========================================================== */

// ---------- 1. 代码雨背景 ----------
(function matrixRain() {
  const canvas = document.getElementById('matrix-canvas');
  const ctx = canvas.getContext('2d');
  const chars = 'アイウエオカキクケコサシスセソ01{}<>=;$#λΣ&|!?*+ネムラリ';
  const fontSize = 16;
  let columns = 0;
  let drops = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));
  }

  resize();
  window.addEventListener('resize', resize);

  function draw() {
    // 半透明覆盖形成拖尾
    ctx.fillStyle = 'rgba(13, 8, 33, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      // 粉青交替,偶尔高亮白
      const r = Math.random();
      ctx.fillStyle = r > 0.975 ? '#ffffff' : (i % 2 ? '#7df9ff' : '#ff2e88');
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 55);
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
      '  "job": "全栈开发 / 安全爱好者",',
      '  "anime": ["EVA", "攻壳机动队", "JOJO"],',
      '  "motto": "代码和老婆,我全都要!"',
      '}',
    ].join('\n'),
    'motto.txt': '写代码是为了给老婆们攒手办钱。',
    'todo.md': '- [x] 补完本季度新番\n- [ ] 修好上周的 bug\n- [ ] 修好修 bug 时写出的新 bug',
    '.secret': '试试在页面任意位置输入秘技:↑↑↓↓←→←→BA',
  };
  const dirs = ['projects/', '老婆们/'];

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
    print('<span class="prompt">y0lay@akihabara:~$</span> ' + esc(cmd), 'line-cmd');
  }

  function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
  }

  const commands = {
    help() {
      print('<span class="out-cyan">可用命令:</span>');
      print('  help        显示本帮助');
      print('  whoami      我是谁');
      print('  neofetch    系统信息(二次元版)');
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
      print('y0lay —— <span class="out-pink">全栈码农</span>,二次元浓度 <span class="out-cyan">120%</span>,发量余额不足');
    },
    neofetch() {
      print('<span class="out-cyan">        ∧,,,∧</span>      <span class="out-pink">y0lay</span>@<span class="out-pink">akihabara</span>');
      print('<span class="out-cyan">       (  ̳• · • ̳)</span>     -----------------');
      print('<span class="out-cyan">       /    づ♡</span>     <span class="out-purple">OS:</span> ArchLinux(纸糊的)');
      print('                    <span class="out-purple">Shell:</span> zsh + 颜文字补全');
      print('                    <span class="out-purple">Editor:</span> VS Code + Vim 键位');
      print('                    <span class="out-purple">Uptime:</span> 熬夜追番中,勿 kill');
      print('                    <span class="out-purple">Memory:</span> 老婆名字 998MB / 代码 26MB');
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
        print('cat: ' + esc(name) + ': 这是个目录啊喂 (#`Д´)', 'out-err');
      } else {
        print('cat: ' + esc(name) + ': 没有这个文件', 'out-err');
      }
    },
    cd(args) {
      const target = args[0] || '~';
      if (target === '老婆们' || target === '老婆们/') {
        print('cd: 权限不足:该目录受次元壁保护 (T▽T)', 'out-err');
      } else {
        print('cd: 这是前端模拟终端,哪儿也去不了 (¬_¬)', 'out-dim');
      }
    },
    about() { print('正在传送至「关于」...', 'out-dim'); scrollToSection('about'); },
    skills() { print('正在展开技能树...', 'out-dim'); scrollToSection('skills'); },
    projects() { print('正在打开装备栏...', 'out-dim'); scrollToSection('projects'); },
    contact() { print('正在绘制召唤阵...', 'out-dim'); scrollToSection('contact'); },
    echo(args) { print(esc(args.join(' ')) || ''); },
    date() {
      print(new Date().toLocaleString('zh-CN') + ' <span class="out-dim">// 又是没有新番看的一天吗</span>');
    },
    history() {
      history.forEach((cmd, i) => print('<span class="out-dim">' + (i + 1) + '</span>  ' + esc(cmd)));
    },
    clear() { output.innerHTML = ''; },
    sudo(args) {
      if (args.join(' ').includes('rm -rf')) {
        print('sudo: 已阻止危险操作。这可是我的主页!(╯°□°)╯︵ ┻━┻', 'out-err');
      } else {
        print('sudo: y0lay 不在 sudoers 名单里。此事将被上报给老婆。', 'out-err');
      }
    },
    exit() { print('exit: 想跑?这个终端没有出口 (¬‿¬)', 'out-dim'); },
    vim() { print('vim: 进去容易出来难,为了你好还是别开了', 'out-dim'); },
    ping(args) { print('PING ' + esc(args[0] || '二次元') + ': 次元壁阻隔,100% packet loss', 'out-dim'); },
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
  print('<span class="out-cyan">Welcome to y0lay OS v2.6.0</span> <span class="out-dim">(kernel: 二次元 6.0-akihabara)</span>');
  print('');
  print('输入 <span class="out-cyan">help</span> 查看可用命令,或者随便敲点什么 (๑•̀ㅂ•́)و✧');
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

// ---------- 7. 控制台招呼(程序员的仪式感) ----------
console.log(
  '%c(ノ≧∀≦)ノ 欢迎光临 Y0lay 的秘密基地!\n%c既然都打开控制台了,不如来一起写代码?',
  'color:#ff2e88;font-size:16px;font-weight:bold;',
  'color:#7df9ff;font-size:12px;'
);
