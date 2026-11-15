/* ==========================================================
   17K FORTNITE — script.js
   ========================================================== */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const body = document.body;

  /* ---------- Immagini mancanti ---------- */
  $$('img').forEach((img) => {
    const fail = () => {
      img.classList.add('img-missing');
      const media = img.closest('.founder__media');
      if (media) media.classList.add('no-img');
    };
    if (img.complete && img.naturalWidth === 0) fail();
    else img.addEventListener('error', fail);
  });

  /* ---------- Titolo hero: split in lettere ---------- */
  $$('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    Array.from(text).forEach((ch, i) => {
      const outer = document.createElement('span');
      const inner = document.createElement('span');
      outer.className = 'char';
      outer.setAttribute('aria-hidden', 'true');
      inner.style.setProperty('--i', i);
      inner.textContent = ch === ' ' ? '\u00A0' : ch;
      outer.appendChild(inner);
      el.appendChild(outer);
    });
  });

  /* ---------- Preloader ---------- */
  const preloader = $('#preloader');
  const bar = $('#preloaderBar');
  const count = $('#preloaderCount');

  const startSite = () => {
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    if (preloader) preloader.classList.add('is-done');
  };

  if (!preloader || reduceMotion) {
    startSite();
  } else {
    body.classList.add('is-loading');
    let loaded = document.readyState === 'complete';
    let progress = 0;
    window.addEventListener('load', () => { loaded = true; });
    setTimeout(() => { loaded = true; }, 3500);

    const tick = () => {
      const target = loaded ? 100 : 88;
      progress = Math.min(target, progress + Math.max(0.35, (target - progress) * 0.045));
      bar.style.transform = `scaleX(${progress / 100})`;
      count.textContent = String(Math.round(progress)).padStart(3, '0');
      if (progress >= 100) setTimeout(startSite, 350);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Anno footer ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Marquee: duplica il gruppo per il loop ---------- */
  const track = $('#marqueeTrack');
  if (track && track.children.length === 1) {
    track.appendChild(track.children[0].cloneNode(true));
  }

  /* ---------- Scroll: navbar, progress bar, parallax ---------- */
  const nav = $('#nav');
  const progressBar = $('#scrollProgress');
  const parallaxEls = $$('[data-parallax]');
  let ticking = false;

  const updateParallax = () => {
    if (reduceMotion) return;
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const rect = el.parentElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      const offset = clamp((rect.top + rect.height / 2 - vh / 2) / vh, -1, 1);
      const amount = parseFloat(el.dataset.parallax) || 0;
      const unit = el.dataset.unit || 'px';
      const axis = el.dataset.axis === 'x' ? 'X' : 'Y';
      el.style.transform = `translate${axis}(${(offset * amount).toFixed(2)}${unit})`;
    });
  };

  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle('is-scrolled', y > 40);
    progressBar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    updateParallax();
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Link attivo nella navbar ---------- */
  const navLinks = $$('[data-nav]');
  if ('IntersectionObserver' in window) {
    const sectionObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    $$('section[id]').forEach((s) => sectionObs.observe(s));
  }

  /* ---------- Menu mobile ---------- */
  const toggle = $('#navToggle');
  const menu = $('#menu');
  const setMenu = (open) => {
    body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
  };
  toggle.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 900) setMenu(false); });

  /* ---------- Contatori ---------- */
  const runCounter = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const pad = parseInt(el.dataset.pad, 10) || 0;
    if (reduceMotion) { el.textContent = String(target).padStart(pad, '0'); return; }
    const duration = 1600;
    const t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = String(Math.round(target * eased)).padStart(pad, '0');
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- Effetto scramble sul testo ---------- */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const scramble = (el) => {
    if (reduceMotion || el._scrambling) return;
    const final = el.dataset.text || (el.dataset.text = el.textContent);
    el._scrambling = true;
    let frame = 0;
    const step = () => {
      const revealed = Math.floor(frame / 3);
      let out = '';
      for (let i = 0; i < final.length; i++) {
        out += (i < revealed || final[i] === ' ')
          ? final[i]
          : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      frame++;
      if (revealed < final.length) requestAnimationFrame(step);
      else { el.textContent = final; el._scrambling = false; }
    };
    step();
  };

  /* ---------- Reveal allo scroll ---------- */
  const revealTargets = $$('.reveal, .section__title, .section__head, .showcase__frame, [data-count], [data-scramble]');
  const onReveal = (el) => {
    el.classList.add('is-visible');
    if (el.hasAttribute('data-count')) runCounter(el);
    if (el.hasAttribute('data-scramble')) scramble(el);
  };

  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        onReveal(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach((el) => revealObs.observe(el));
  } else {
    revealTargets.forEach(onReveal);
  }

  /* ---------- Interazioni solo mouse ---------- */
  if (finePointer && !reduceMotion) {

    /* Cursore custom */
    const dot = $('#cursor');
    const ring = $('#cursorRing');
    document.documentElement.classList.add('has-cursor');
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my, cursorVisible = false;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (!cursorVisible) {
        cursorVisible = true; rx = mx; ry = my;
        dot.style.opacity = ring.style.opacity = '1';
      }
    });
    document.documentElement.addEventListener('mouseleave', () => {
      cursorVisible = false;
      dot.style.opacity = ring.style.opacity = '0';
    });
    document.addEventListener('mouseover', (e) => {
      ring.classList.toggle('is-hover', !!e.target.closest('a, button, .tilt, .pillar'));
    });
    window.addEventListener('mousedown', () => ring.classList.add('is-down'));
    window.addEventListener('mouseup', () => ring.classList.remove('is-down'));

    const cursorLoop = () => {
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(cursorLoop);
    };
    cursorLoop();

    /* Bottoni magnetici */
    $$('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(x * 0.25).toFixed(1)}px, ${(y * 0.35).toFixed(1)}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    /* Tilt 3D sulle card dei founder */
    $$('.tilt').forEach((card) => {
      const name = $('[data-scramble]', card);
      card.addEventListener('mouseenter', () => { if (name) scramble(name); });
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', `${((px - 0.5) * 14).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((0.5 - py) * 14).toFixed(2)}deg`);
        card.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
      });
      card.addEventListener('mouseleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    /* Parallax del mouse nella hero */
    const hero = $('.hero');
    hero.addEventListener('mousemove', (e) => {
      hero.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3));
      hero.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3));
    });

    /* Spotlight nella sezione Join */
    const join = $('.join');
    join.addEventListener('mousemove', (e) => {
      const r = join.getBoundingClientRect();
      join.style.setProperty('--mx', `${e.clientX - r.left}px`);
      join.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  /* ---------- Canvas hero: rete di particelle ---------- */
  const canvas = $('#heroCanvas');
  if (canvas && canvas.getContext && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    const LINK = 140;
    const MOUSE_LINK = 190;
    const mouse = { x: -9999, y: -9999 };
    let w = 0, h = 0, points = [], raf = 0, running = false, lastWidth = 0;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const total = clamp(Math.round((w * h) / 15000), 26, 110);
      points = Array.from({ length: total }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.36,
        vy: (Math.random() - 0.5) * 0.36,
        r: Math.random() * 1.4 + 0.4
      }));
      lastWidth = window.innerWidth;
    };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.fill();

        for (let j = i + 1; j < points.length; j++) {
          const q = points[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            ctx.strokeStyle = `rgba(255,255,255,${((1 - Math.sqrt(d2) / LINK) * 0.16).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }

        const md = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (md < MOUSE_LINK) {
          ctx.strokeStyle = `rgba(255,255,255,${((1 - md / MOUSE_LINK) * 0.45).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    build();

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth !== lastWidth || Math.abs(canvas.clientHeight - h) > 120) build();
      }, 200);
    });

    const heroEl = canvas.parentElement;
    heroEl.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    heroEl.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
      }).observe(canvas);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (canvas.getBoundingClientRect().bottom > 0) start();
    });
  }
})();
