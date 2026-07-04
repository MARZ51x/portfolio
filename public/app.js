/* Progressive enhancement only — content is fully visible and readable
   without JS; this file adds scroll-driven motion, theming, the command
   palette, and the live GitHub section on top. */
(() => {
  const docEl = document.documentElement;
  docEl.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= theme toggle ================= */
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const syncThemeMeta = () => {
    if (themeMeta) themeMeta.content = docEl.dataset.theme === 'dark' ? '#16130f' : '#f3efe6';
  };
  syncThemeMeta();

  let themeAnimTimer;
  const setTheme = (t) => {
    docEl.classList.add('theme-anim');
    clearTimeout(themeAnimTimer);
    themeAnimTimer = setTimeout(() => docEl.classList.remove('theme-anim'), 400);
    if (t === 'dark') docEl.dataset.theme = 'dark';
    else delete docEl.dataset.theme;
    try { localStorage.setItem('theme', t); } catch (e) {}
    syncThemeMeta();
  };
  const toggleTheme = () => setTheme(docEl.dataset.theme === 'dark' ? 'light' : 'dark');
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // follow the system theme live — but only while the user hasn't picked one
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    try { if (localStorage.getItem('theme')) return; } catch (err) {}
    if (e.matches) docEl.dataset.theme = 'dark';
    else delete docEl.dataset.theme;
    syncThemeMeta();
  });

  /* ================= mobile nav ================= */
  const menuBtn = document.querySelector('.menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (menuBtn && mobileNav) {
    const setMenu = (open) => {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mobileNav.hidden = !open;
    };
    menuBtn.addEventListener('click', () => setMenu(mobileNav.hidden));
    mobileNav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobileNav.hidden) { setMenu(false); menuBtn.focus(); }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 760 && !mobileNav.hidden) setMenu(false);
    });
  }

  /* ================= toast ================= */
  const toast = document.querySelector('.toast');
  let toastTimer;
  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  };

  /* ================= reveal on scroll, with per-child stagger ================= */
  const setStaggerIndexes = (group) => {
    [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
  };
  document.querySelectorAll('[data-stagger]').forEach(setStaggerIndexes);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('[data-reveal], [data-stagger]').forEach((el) => io.observe(el));

  /* ================= animated count-up stats ================= */
  const counters = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      counters.unobserve(e.target);
      const el = e.target;
      const end = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (reduceMotion || !isFinite(end)) { el.textContent = end + suffix; continue; }
      const t0 = performance.now();
      const dur = 1300;
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(end * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.6 });
  document.querySelectorAll('.stat-num').forEach((el) => counters.observe(el));

  /* ================= active nav link (desktop + mobile) ================= */
  const links = [...document.querySelectorAll('.nav a, .mobile-nav a[href^="#"]')];
  const map = new Map();
  links.forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(a);
  });
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting && map.has(e.target.id)) {
        links.forEach((l) => { l.classList.remove('active'); l.removeAttribute('aria-current'); });
        map.get(e.target.id).forEach((l) => { l.classList.add('active'); l.setAttribute('aria-current', 'true'); });
      }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['about', 'skills', 'experience', 'projects', 'contact'].forEach((id) => {
    const el = document.getElementById(id); if (el) spy.observe(el);
  });

  /* ================= live GitHub repos ================= */
  const ghSection = document.getElementById('github');
  const repoGrid = document.querySelector('.repo-grid');
  if (ghSection && repoGrid && window.fetch) {
    const LANG_COLORS = {
      TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
      HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219', C: '#555555',
      Dart: '#00B4AB', Shell: '#89e051', Dockerfile: '#384d54',
    };
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    fetch('https://api.github.com/users/MARZ51x/repos?sort=pushed&per_page=12')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((repos) => {
        const top = repos.filter((r) => !r.fork && !r.archived).slice(0, 6);
        if (!top.length) return;
        repoGrid.innerHTML = top.map((r) => {
          const updated = new Date(r.pushed_at)
            .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const lang = r.language
            ? `<span class="repo-lang"><i style="background:${LANG_COLORS[r.language] || 'var(--muted)'}"></i>${esc(r.language)}</span>`
            : '';
          const stars = r.stargazers_count ? `<span>★ ${r.stargazers_count}</span>` : '';
          return `<a class="repo" href="${esc(r.html_url)}" target="_blank" rel="noopener">
            <h3>${esc(r.name)}</h3>
            <p class="repo-desc">${esc(r.description || 'No description yet.')}</p>
            <p class="repo-meta">${lang}${stars}<span>Updated ${updated}</span></p>
          </a>`;
        }).join('');
        setStaggerIndexes(repoGrid);
        ghSection.hidden = false;
      })
      .catch(() => { /* API unreachable or rate-limited — section stays hidden */ });
  }

  /* ================= command palette (Ctrl/Cmd+K) ================= */
  const palette = document.querySelector('.palette');
  const paletteBtn = document.querySelector('.palette-btn');
  if (palette && paletteBtn) {
    const input = palette.querySelector('.palette-input');
    const list = palette.querySelector('.palette-list');
    const isMac = /Mac|iPhone|iPad/i.test(navigator.platform || '');
    const modKbd = paletteBtn.querySelector('[data-mod]');
    if (modKbd && isMac) modKbd.textContent = '⌘';

    const goTo = (sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    const buildCommands = () => {
      const cmds = [
        { label: 'Go to About', hint: 'Navigate', run: () => goTo('#about') },
        { label: 'Go to Skills', hint: 'Navigate', run: () => goTo('#skills') },
        { label: 'Go to Experience', hint: 'Navigate', run: () => goTo('#experience') },
        { label: 'Go to Projects', hint: 'Navigate', run: () => goTo('#projects') },
      ];
      if (ghSection && !ghSection.hidden) {
        cmds.push({ label: 'Go to On GitHub', hint: 'Navigate', run: () => goTo('#github') });
      }
      cmds.push(
        { label: 'Go to Certifications & Education', hint: 'Navigate', run: () => goTo('#credentials') },
        { label: 'Go to Contact', hint: 'Navigate', run: () => goTo('#contact') },
        { label: 'Toggle light / dark theme', hint: 'Theme', run: toggleTheme },
        { label: 'Play Sirtet', hint: 'sirtet-two.vercel.app', run: () => window.open('https://sirtet-two.vercel.app', '_blank', 'noopener') },
        { label: 'Open GitHub profile', hint: 'github.com/MARZ51x', run: () => window.open('https://github.com/MARZ51x', '_blank', 'noopener') },
        { label: 'Open LinkedIn', hint: 'linkedin.com', run: () => window.open('https://www.linkedin.com/in/marz-baltz/', '_blank', 'noopener') },
        {
          label: 'Copy email address', hint: 'acamar.baltazar@gmail.com',
          run: () => {
            const email = 'acamar.baltazar@gmail.com';
            if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(email)
                .then(() => showToast('Email copied to clipboard'))
                .catch(() => showToast(email));
            } else showToast(email);
          },
        },
        { label: 'Send an email', hint: 'mailto', run: () => { location.href = 'mailto:acamar.baltazar@gmail.com'; } },
      );
      return cmds;
    };

    let commands = [];
    let filtered = [];
    let selected = 0;

    const render = () => {
      const q = input.value.trim().toLowerCase();
      filtered = commands.filter((c) => c.label.toLowerCase().includes(q) || (c.hint || '').toLowerCase().includes(q));
      selected = Math.min(selected, Math.max(filtered.length - 1, 0));
      list.innerHTML = filtered.length
        ? filtered.map((c, i) =>
            `<li role="option" id="palette-opt-${i}" aria-selected="${i === selected}" data-i="${i}">
              <span>${c.label}</span><span class="cmd-hint">${c.hint || ''}</span>
            </li>`).join('')
        : '<li class="palette-empty" aria-disabled="true">No matching commands</li>';
      if (filtered.length) input.setAttribute('aria-activedescendant', `palette-opt-${selected}`);
      else input.removeAttribute('aria-activedescendant');
    };

    let paletteReturnFocus = null;
    const openPalette = () => {
      paletteReturnFocus = document.activeElement;
      commands = buildCommands();
      selected = 0;
      input.value = '';
      palette.hidden = false;
      document.body.style.overflow = 'hidden';
      render();
      input.focus();
    };
    const closePalette = () => {
      palette.hidden = true;
      document.body.style.overflow = '';
      if (paletteReturnFocus?.focus) paletteReturnFocus.focus();
      paletteReturnFocus = null;
    };
    const runSelected = () => {
      const cmd = filtered[selected];
      if (!cmd) return;
      closePalette();
      cmd.run();
    };

    paletteBtn.addEventListener('click', openPalette);
    palette.querySelector('.palette-backdrop').addEventListener('click', closePalette);
    input.addEventListener('input', () => { selected = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); selected = Math.min(selected + 1, filtered.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selected = Math.max(selected - 1, 0); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); runSelected(); }
      else if (e.key === 'Tab') { e.preventDefault(); } // the input is the dialog's only focusable — trap focus
    });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-i]');
      if (li) { selected = +li.dataset.i; runSelected(); }
    });
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        palette.hidden ? openPalette() : closePalette();
      } else if (e.key === 'Escape' && !palette.hidden) {
        closePalette();
      }
    });
  }

  /* ================= pointer tilt on project cards ================= */
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.project').forEach((card) => {
      card.addEventListener('pointermove', (ev) => {
        const r = card.getBoundingClientRect();
        const rx = ((ev.clientY - r.top) / r.height - 0.5) * -3;
        const ry = ((ev.clientX - r.left) / r.width - 0.5) * 3;
        card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ================= scroll-linked frame loop: progress bar, topbar,
                       parallax, velocity-reactive marquee ================= */
  const progressBar = document.querySelector('.scroll-progress span');
  const topbar = document.querySelector('.topbar');
  const toTop = document.querySelector('.to-top');
  const parallaxEls = [...document.querySelectorAll('[data-parallax]')];
  const marqueeTrack = document.querySelector('.marquee-track');

  let marqueeHalf = 0;
  const measureMarquee = () => {
    if (marqueeTrack) marqueeHalf = marqueeTrack.scrollWidth / 2;
  };
  measureMarquee();
  window.addEventListener('resize', measureMarquee);

  let lastY = window.scrollY;
  let velocity = 0;   // smoothed px/frame
  let marqueeX = 0;

  const frame = () => {
    const y = window.scrollY;
    const delta = y - lastY;
    lastY = y;
    velocity += (delta - velocity) * 0.12;

    // progress bar
    if (progressBar) {
      const max = docEl.scrollHeight - window.innerHeight;
      progressBar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    }

    // topbar: shadow once scrolled, hide going down / show going up
    // (never hide while the mobile menu is open)
    if (topbar) {
      topbar.classList.toggle('scrolled', y > 12);
      const menuOpen = mobileNav && !mobileNav.hidden;
      if (menuOpen || y < 400 || delta < -2) topbar.classList.remove('hide');
      else if (delta > 2) topbar.classList.add('hide');
    }

    // back-to-top button + hero scroll cue
    if (toTop) toTop.classList.toggle('show', y > 700);
    document.body.classList.toggle('scrolled-past', y > 120);

    if (!reduceMotion) {
      // parallax: drift relative to distance from viewport center
      for (const el of parallaxEls) {
        const parent = el.parentElement.getBoundingClientRect();
        if (parent.bottom < -200 || parent.top > window.innerHeight + 200) continue;
        const centerDelta = parent.top + parent.height / 2 - window.innerHeight / 2;
        const f = parseFloat(el.dataset.parallax) || 0;
        el.style.transform = `translate3d(0, ${(centerDelta * f).toFixed(1)}px, 0)`;
      }

      // marquee: base drift plus scroll velocity (fast scroll speeds it
      // up, scrolling back up reverses it), with a playful skew
      if (marqueeTrack && marqueeHalf > 0) {
        marqueeX -= 0.5 + Math.max(-14, Math.min(14, velocity)) * 0.6;
        marqueeX %= marqueeHalf;
        if (marqueeX > 0) marqueeX -= marqueeHalf;
        const skew = Math.max(-6, Math.min(6, -velocity * 0.35));
        marqueeTrack.style.transform =
          `translate3d(${marqueeX.toFixed(1)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
      }
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
