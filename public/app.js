/* Progressive enhancement only — content is fully visible and readable
   without JS; this file adds the scroll-driven motion on top. */
(() => {
  const docEl = document.documentElement;
  docEl.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----- reveal on scroll, with per-child stagger ----- */
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
  });

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll('[data-reveal], [data-stagger]').forEach((el) => io.observe(el));

  /* ----- active nav link ----- */
  const links = [...document.querySelectorAll('.nav a')];
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting && map.has(e.target.id)) {
        links.forEach((l) => l.classList.remove('active'));
        map.get(e.target.id).classList.add('active');
      }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['about', 'skills', 'experience', 'projects', 'contact'].forEach((id) => {
    const el = document.getElementById(id); if (el) spy.observe(el);
  });

  /* ----- pointer tilt on project cards (fine pointers only) ----- */
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

  /* ----- scroll-linked frame loop: progress bar, topbar, parallax,
           velocity-reactive marquee, back-to-top, scroll cue ----- */
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
    if (topbar) {
      topbar.classList.toggle('scrolled', y > 12);
      if (y < 400 || delta < -2) topbar.classList.remove('hide');
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
