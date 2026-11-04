(() => {
  'use strict';

  const stage = document.getElementById('stage');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;
  const curNumEl = document.getElementById('curNum');
  const curTitleEl = document.getElementById('curTitle');
  const pagerEl = document.getElementById('pager');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const fsBtn = document.getElementById('fsBtn');
  const progBar = document.getElementById('progBar');
  const sweep = document.getElementById('sweep');
  const hint = document.getElementById('hint');
  const cursorGlow = document.getElementById('cursorGlow');
  const b1 = document.getElementById('b1');
  const b2 = document.getElementById('b2');
  const b3 = document.getElementById('b3');

  // Posições de luz ambiente por slide (transição cinematográfica)
  const blobCoords = [
    [[72, 16], [14, 82], [50, 50]],
    [[18, 22], [82, 76], [42, 48]],
    [[78, 28], [16, 70], [54, 42]],
    [[24, 72], [78, 22], [48, 52]],
    [[76, 68], [22, 24], [52, 46]],
    [[30, 20], [82, 72], [58, 44]],
    [[68, 24], [20, 78], [46, 54]],
    [[22, 32], [78, 66], [50, 46]],
    [[74, 22], [18, 72], [44, 50]],
    [[26, 68], [76, 26], [52, 48]],
    [[70, 28], [24, 74], [48, 44]],
    [[50, 24], [50, 82], [50, 50]]
  ];

  // Escala proporcional do palco 1920x1080 para qualquer monitor
  function fitStage() {
    const sx = window.innerWidth / 1920;
    const sy = window.innerHeight / 1080;
    const s = Math.min(sx, sy);
    stage.style.setProperty('--s', s.toFixed(5));
  }
  window.addEventListener('resize', fitStage);
  fitStage();

  // Pager
  slides.forEach((s, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = `${String(idx + 1).padStart(2, '0')} — ${s.dataset.title || ''}`;
    btn.setAttribute('aria-label', `Slide ${idx + 1}`);
    btn.addEventListener('click', () => goTo(idx));
    pagerEl.appendChild(btn);
  });
  const pagerBtns = Array.from(pagerEl.children);

  // Contadores animados
  function animateCounters(slide) {
    const counters = slide.querySelectorAll('[data-count]');
    counters.forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const duration = 1200;
      const start = performance.now() + 420;
      function tick(now) {
        if (now < start) {
          requestAnimationFrame(tick);
          return;
        }
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = target * eased;
        el.textContent = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
        if (t < 1) requestAnimationFrame(tick);
      }
      el.textContent = '0';
      requestAnimationFrame(tick);
    });
  }

  let current = -1;
  let lockUntil = 0;

  function moveBlobs(idx) {
    const cfg = blobCoords[idx % blobCoords.length];
    const apply = (el, [x, y]) => {
      if (!el) return;
      el.style.transform = `translate3d(calc(${x}vw - 35vmax), calc(${y}vh - 35vmax), 0)`;
    };
    apply(b1, cfg[0]);
    apply(b2, cfg[1]);
    if (b3) {
      const [x, y] = cfg[2];
      b3.style.transform = `translate3d(calc(${x}vw - 25vmax), calc(${y}vh - 25vmax), 0)`;
    }
  }

  function goTo(index, fromHash = false) {
    const idx = Math.max(0, Math.min(total - 1, index));
    if (idx === current) return;

    const prev = current;
    current = idx;

    if (prev !== -1 && hint) hint.classList.add('gone');

    if (prev !== -1 && sweep) {
      sweep.classList.remove('run');
      void sweep.offsetWidth;
      sweep.classList.add('run');
    }

    slides.forEach((s, i) => {
      s.classList.toggle('active', i === idx);
      s.classList.toggle('past', i < idx);
      s.setAttribute('aria-hidden', i === idx ? 'false' : 'true');
    });

    pagerBtns.forEach((b, i) => b.classList.toggle('on', i === idx));

    curNumEl.textContent = String(idx + 1).padStart(2, '0');
    curTitleEl.textContent = slides[idx].dataset.title || '';
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === total - 1;
    progBar.style.width = `${((idx + 1) / total) * 100}%`;

    moveBlobs(idx);
    animateCounters(slides[idx]);

    if (!fromHash) {
      try {
        history.replaceState(null, '', `#slide-${idx + 1}`);
      } catch (_) {}
    }
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  // Fullscreen
  fsBtn.addEventListener('click', toggleFullscreen);
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  // Teclado
  window.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        next();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      case 'Backspace':
        e.preventDefault();
        prev();
        break;
      case 'Home':
        e.preventDefault();
        goTo(0);
        break;
      case 'End':
        e.preventDefault();
        goTo(total - 1);
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  });

  // Roda do mouse com debounce suave
  window.addEventListener('wheel', (e) => {
    const now = performance.now();
    if (now < lockUntil) return;
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 28) return;
    lockUntil = now + 720;
    if (delta > 0) next(); else prev();
  }, { passive: true });

  // Touch swipe
  let tx = 0, ty = 0;
  window.addEventListener('touchstart', (e) => {
    if (!e.touches[0]) return;
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  // Spotlight do cursor nos cards glass
  window.addEventListener('pointermove', (e) => {
    if (cursorGlow) {
      cursorGlow.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    }
    const active = slides[current];
    if (!active) return;
    active.querySelectorAll('.glass').forEach((card) => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--mx', `${x.toFixed(1)}%`);
      card.style.setProperty('--my', `${y.toFixed(1)}%`);
    });
  }, { passive: true });

  // Inicialização por hash (#slide-N)
  function initFromHash() {
    const m = (location.hash || '').match(/slide-(\d+)/i);
    const n = m ? parseInt(m[1], 10) - 1 : 0;
    goTo(isNaN(n) ? 0 : n, true);
  }
  window.addEventListener('hashchange', initFromHash);
  initFromHash();
})();
