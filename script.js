/* ==========================================================================
   ALLIANCE MEDIA — interaction layer (vanilla, no dependencies)
   Everything degrades gracefully; prefers-reduced-motion disables motion.
   ========================================================================== */
(function () {
  'use strict';

  var staticMode = /[?&]static\b/.test(location.search);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || staticMode;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var docEl = document.documentElement;

  if (staticMode) {
    var qaStyle = document.createElement('style');
    qaStyle.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}' +
      '.reveal,.reveal-child>*{opacity:1!important;transform:none!important}' +
      '.split-line>span{transform:none!important}.preloader,.hero__bar{display:none!important}' +
      '.hero{min-height:860px!important}.page-banner--media{min-height:640px!important}';
    document.head.appendChild(qaStyle);
  }

  /* ------------------------------------------------------------ preloader */
  function initPreloader() {
    var pre = document.querySelector('.preloader');
    var seen = false;
    try { seen = sessionStorage.getItem('am_seen') === '1'; } catch (e) {}
    if (!pre || reduced) { docEl.classList.add('is-loaded'); return; }
    if (seen || location.hash) {
      pre.classList.add('preloader--instant');
      requestAnimationFrame(function () { docEl.classList.add('is-loaded'); });
      return;
    }
    try { sessionStorage.setItem('am_seen', '1'); } catch (e) {}
    window.setTimeout(function () { docEl.classList.add('is-loaded'); }, 2050);
  }

  /* --------------------------------------------------------------- cursor */
  function initCursor() {
    if (!finePointer || reduced) return;
    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    ring.innerHTML = '<span>View</span>';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var x = -100, y = -100, rx = -100, ry = -100;
    document.addEventListener('mousemove', function (e) {
      x = e.clientX; y = e.clientY;
      dot.style.transform = 'translate(' + (x - 2.5) + 'px,' + (y - 2.5) + 'px)';
      document.body.classList.remove('cursor-hidden');
    });
    document.addEventListener('mouseleave', function () { document.body.classList.add('cursor-hidden'); });

    (function loop() {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      ring.style.transform = 'translate(' + (rx - ring.offsetWidth / 2) + 'px,' + (ry - ring.offsetHeight / 2) + 'px)';
      requestAnimationFrame(loop);
    })();

    document.addEventListener('mouseover', function (e) {
      var view = e.target.closest('[data-cursor="view"]');
      var link = e.target.closest('a, button, .slate-row');
      ring.classList.toggle('is-view', !!view);
      ring.classList.toggle('is-link', !!link && !view);
    });
  }

  /* ------------------------------------------------------ header behavior */
  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastY = 0;
    function onScroll() {
      var yPos = window.scrollY;
      header.classList.toggle('is-scrolled', yPos > 40);
      if (document.body.classList.contains('menu-open')) { lastY = yPos; return; }
      if (yPos > 220 && yPos > lastY + 6) header.classList.add('is-hidden');
      else if (yPos < lastY - 6 || yPos < 220) header.classList.remove('is-hidden');
      lastY = yPos;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------- mobile menu */
  function initMenu() {
    var toggle = document.querySelector('.menu-toggle');
    var menu = document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ------------------------------------------------------ scroll progress */
  function initProgress() {
    var bar = document.querySelector('.scroll-progress');
    if (!bar) return;
    function onScroll() {
      var h = docEl.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------- split-line headlines */
  function initSplit() {
    if (reduced) return;
    document.querySelectorAll('[data-split]').forEach(function (el) {
      var frag = document.createDocumentFragment();
      var li = 0;
      el.childNodes.forEach(function (node) { frag.appendChild(node.cloneNode(true)); });
      // Wrap each line (split on <br>) in a mask
      var parts = [];
      var current = document.createElement('span');
      frag.childNodes.forEach(function (n) { current.appendChild(n.cloneNode(true)); });
      // simple approach: split innerHTML on <br>
      var html = el.innerHTML.split(/<br\s*\/?\s*>/i);
      el.innerHTML = html.map(function (line, i) {
        return '<span class="split-line"><span style="--li:' + i + '">' + line + '</span></span>';
      }).join('');
    });
  }

  /* ----------------------------------------------------- reveal on scroll */
  function initReveal() {
    var targets = document.querySelectorAll('.reveal, .reveal-child, [data-split], .stat');
    if (!('IntersectionObserver' in window) || reduced) {
      targets.forEach(function (t) { t.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  function initStagger() {
    document.querySelectorAll('.reveal-child').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--ri', i);
      });
    });
  }

  /* ------------------------------------------------------------- counters */
  function initCounters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length) return;
    function animate(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (reduced || !target) { return; }
      var dur = 1800, t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 4);
        el.firstChild.nodeValue = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
      }
      el.firstChild.nodeValue = '0';
      requestAnimationFrame(step);
    }
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* -------------------------------------------------------- 3D tilt */
  function initTilt() {
    if (!finePointer || reduced) return;
    document.querySelectorAll('.poster-frame').forEach(function (frame) {
      var card = frame.querySelector('.poster-tilt');
      if (!card) return;
      frame.addEventListener('mousemove', function (e) {
        var r = frame.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'rotateY(' + (px * 9) + 'deg) rotateX(' + (py * -9) + 'deg) translateZ(0)';
      });
      frame.addEventListener('mouseleave', function () {
        card.style.transition = 'transform 0.7s cubic-bezier(0.16,1,0.3,1)';
        card.style.transform = 'rotateY(0) rotateX(0)';
        window.setTimeout(function () { card.style.transition = 'transform 0.18s linear'; }, 700);
      });
    });
  }

  /* ------------------------------------------------------ magnetic buttons */
  function initMagnetic() {
    if (!finePointer || reduced) return;
    document.querySelectorAll('.btn, .header-cta').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var mx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var my = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        btn.style.transform = 'translate(' + (mx * 4) + 'px,' + (my * 3) + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }

  /* ------------------------------------------------ slate floating poster */
  function initSlateFloat() {
    if (!finePointer || reduced) return;
    var list = document.querySelector('.slate-list');
    if (!list) return;
    var float = document.createElement('div');
    float.className = 'slate-float';
    float.innerHTML = '<img alt="" />';
    document.body.appendChild(float);
    var img = float.querySelector('img');
    var fx = 0, fy = 0, tx = 0, ty = 0, on = false;

    list.addEventListener('mousemove', function (e) {
      tx = e.clientX + 28; ty = e.clientY - 130;
      var row = e.target.closest('.slate-row');
      var src = row && row.getAttribute('data-img');
      if (src) {
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
        if (!on) { float.classList.add('is-on'); on = true; fx = tx; fy = ty; }
      } else if (on) { float.classList.remove('is-on'); on = false; }
    });
    list.addEventListener('mouseleave', function () { float.classList.remove('is-on'); on = false; });

    (function loop() {
      fx += (tx - fx) * 0.12; fy += (ty - fy) * 0.12;
      float.style.left = fx + 'px'; float.style.top = fy + 'px';
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------- hero gold dust */
  function initDust() {
    if (reduced) return;
    var canvas = document.querySelector('.hero__dust');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w, h, parts = [];
    var N = window.innerWidth < 760 ? 26 : 54;

    function resize() {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    }
    window.addEventListener('resize', resize); resize();

    for (var i = 0; i < N; i++) {
      parts.push({
        x: Math.random() * w, y: Math.random() * h,
        r: (Math.random() * 1.6 + 0.5) * devicePixelRatio,
        vx: (Math.random() - 0.5) * 0.12 * devicePixelRatio,
        vy: -(Math.random() * 0.22 + 0.06) * devicePixelRatio,
        a: Math.random() * 0.5 + 0.15,
        tw: Math.random() * Math.PI * 2
      });
    }
    (function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.tw += 0.02;
        if (p.y < -6 || p.x < -6 || p.x > w + 6) { p.x = Math.random() * w; p.y = h + 6; }
        var alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(232, 202, 121,' + alpha.toFixed(3) + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    })();
  }

  /* --------------------------------------------------------- hero parallax */
  function initParallax() {
    if (reduced) return;
    var media = document.querySelector('.hero__media, .page-banner__media');
    var inner = document.querySelector('.hero__inner');
    if (!media) return;
    window.addEventListener('scroll', function () {
      var yPos = window.scrollY;
      if (yPos > window.innerHeight * 1.2) return;
      media.style.transform = 'translateY(' + yPos * 0.28 + 'px)';
      if (inner) {
        inner.style.transform = 'translateY(' + yPos * 0.12 + 'px)';
        inner.style.opacity = Math.max(0, 1 - yPos / (window.innerHeight * 0.72));
      }
    }, { passive: true });
  }

  /* -------------------------------------------------------------- marquee */
  function initMarquee() {
    document.querySelectorAll('.marquee__track').forEach(function (track) {
      track.innerHTML += track.innerHTML; // duplicate for seamless -50% loop
    });
  }

  /* ---------------------------------------------------------- back to top */
  function initToTop() {
    var btn = document.querySelector('.to-top');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('is-on', window.scrollY > 700);
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------------------ boot */
  initPreloader();
  initCursor();
  initHeader();
  initMenu();
  initProgress();
  initSplit();
  initStagger();
  initReveal();
  initCounters();
  initTilt();
  initMagnetic();
  initSlateFloat();
  initDust();
  initParallax();
  initMarquee();
  initToTop();
})();
