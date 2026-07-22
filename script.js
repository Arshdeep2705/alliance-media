/* ==========================================================================
   ALLIANCE MEDIA — motion & interaction v3 (vanilla, dependency-free)
   One coherent language: masks, line reveals, premium easing, film pacing.
   prefers-reduced-motion and ?static freeze everything gracefully.
   ========================================================================== */
(function () {
  'use strict';

  var staticMode = /[?&]static\b/.test(location.search);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || staticMode;
  var docEl = document.documentElement;

  if (staticMode) {
    var qa = document.createElement('style');
    qa.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}' +
      '.reveal,.reveal-child>*{opacity:1!important;transform:none!important}' +
      '.reveal-mask,.reveal-wipe{clip-path:none!important}' +
      '.ident{display:none!important}.hero__media{clip-path:inset(0)!important}' +
      '.hero__title .t-line>span{transform:none!important}.flagship__art{transform:none!important}';
    document.head.appendChild(qa);
  }

  /* ------------------------------------------------- opening ident (~1.4s) */
  function initIdent() {
    var ident = document.querySelector('.ident');
    if (!ident) { docEl.classList.add('no-ident'); return; }
    var seen = false;
    try { seen = sessionStorage.getItem('am_v3') === '1'; } catch (e) {}
    if (reduced || seen || location.hash) {
      ident.classList.add('ident--off');
      docEl.classList.add('no-ident', 'is-open');
      return;
    }
    try { sessionStorage.setItem('am_v3', '1'); } catch (e) {}
    requestAnimationFrame(function () { docEl.classList.add('is-ident'); });
    window.setTimeout(function () { docEl.classList.add('is-open'); }, 780);
  }

  /* ------------------------------------------------------ header behavior */
  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var lastY = 0;
    function onScroll() {
      var y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 24);
      if (!document.body.classList.contains('menu-open')) {
        if (y > 480 && y > lastY + 8) header.classList.add('is-hidden');
        else if (y < lastY - 8 || y < 480) header.classList.remove('is-hidden');
      }
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------- mobile menu */
  function initMenu() {
    var toggle = document.querySelector('.menu-toggle');
    var menu = document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;
    function setOpen(open) {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    toggle.addEventListener('click', function () { setOpen(!document.body.classList.contains('menu-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setOpen(false); toggle.focus(); }
    });
  }

  /* ------------------------------------------------------ scroll progress */
  function initProgress() {
    var bar = document.querySelector('.scroll-progress');
    if (!bar) return;
    window.addEventListener('scroll', function () {
      var h = docEl.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    }, { passive: true });
  }

  /* ----------------------------------------------------- reveal on scroll
     NOTE: deliberately NOT IntersectionObserver — Chromium applies the
     target's own clip-path to the intersection, so elements hidden with
     zero-area clip-path (.reveal-mask/.reveal-wipe) would never fire.
     getBoundingClientRect ignores clip-path, so a cheap rAF-throttled
     check is the reliable path. Also reveals anything scrolled PAST
     (anchor jumps), so nothing can stay invisible. */
  function initReveal() {
    document.querySelectorAll('.reveal-child').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) { child.style.setProperty('--ri', i); });
    });
    var targets = Array.prototype.slice.call(
      document.querySelectorAll('.reveal, .reveal-child, .reveal-mask, .reveal-wipe, .rule-draw')
    );
    if (reduced) { targets.forEach(function (t) { t.classList.add('is-in'); }); return; }
    var pending = false;
    function check() {
      pending = false;
      var vh = window.innerHeight;
      for (var i = targets.length - 1; i >= 0; i--) {
        var r = targets[i].getBoundingClientRect();
        if (r.top < vh * 0.92) { // entering viewport, or already above it
          targets[i].classList.add('is-in');
          targets.splice(i, 1);
        }
      }
      if (!targets.length) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    }
    function onScroll() {
      if (!pending) { pending = true; requestAnimationFrame(check); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', onScroll);
    check();
  }

  /* ------------------------------------------------------------- counters */
  function initCounters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length || !('IntersectionObserver' in window)) return;
    function animate(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (reduced || !target) return;
      var dur = 1600, t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        el.firstChild.nodeValue = Math.round(target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      }
      el.firstChild.nodeValue = '0';
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ------------------------------------------------- ribbon / ticker loops */
  function initLoops() {
    document.querySelectorAll('.ribbon__track, .ticker__track').forEach(function (track) {
      track.innerHTML += track.innerHTML;
    });
  }

  /* ------------------------------------- flagship art: scroll-driven scale */
  function initFlagship() {
    var art = document.querySelector('.flagship__art');
    if (!art || reduced) return;
    function onScroll() {
      var r = art.getBoundingClientRect();
      var vh = window.innerHeight;
      // progress: 0 when the art's top enters the viewport bottom, 1 when its top reaches 30% vh
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));
      var s = 0.86 + 0.14 * p;
      art.style.setProperty('--fs', s.toFixed(4));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* ----------------------------------------------- cinema mode (trailer) */
  function initCinema() {
    var stage = document.querySelector('[data-cinema]');
    if (!stage) return;
    var src = stage.getAttribute('data-cinema');
    var poster = stage.getAttribute('data-cinema-poster') || '';
    var modal = document.createElement('div');
    modal.className = 'cinema';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Trailer — cinema view');
    modal.innerHTML =
      '<div class="cinema__frame">' +
      '<video controls playsinline preload="metadata" width="1280" height="536"' + (poster ? ' poster="' + poster + '"' : '') + '>' +
      '<source src="' + src + '" type="video/mp4" /></video>' +
      '<div class="cinema__bar"><span>Echoes of Us · Official trailer</span>' +
      '<button class="cinema__close" type="button">Close' +
      '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button></div></div>';
    document.body.appendChild(modal);
    var video = modal.querySelector('video');
    var closeBtn = modal.querySelector('.cinema__close');
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      modal.classList.add('is-on');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
      try { video.play().catch(function () {}); } catch (e) {}
    }
    function close() {
      modal.classList.remove('is-on');
      document.body.style.overflow = '';
      try { video.pause(); } catch (e) {}
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    stage.addEventListener('click', open);
    stage.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-on')) close(); });
    // simple focus trap
    modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusables = modal.querySelectorAll('video, button');
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* --------------------------------------------- slate atmosphere (desktop) */
  function initSlateAtmo() {
    var wrap = document.querySelector('.slate-wrap');
    var atmo = document.querySelector('.slate-atmo');
    if (!wrap || !atmo) return;
    var layers = atmo.children;
    function clear() { Array.prototype.forEach.call(layers, function (l) { l.classList.remove('is-on'); }); }
    wrap.addEventListener('mouseover', function (e) {
      var row = e.target.closest('.slate-row');
      if (!row) return;
      var key = row.getAttribute('data-atmo');
      clear();
      var layer = atmo.querySelector('[data-atmo-layer="' + key + '"]') || atmo.querySelector('.atmo-tone');
      if (layer) layer.classList.add('is-on');
    });
    wrap.addEventListener('mouseleave', clear);
    wrap.addEventListener('focusin', function (e) {
      var row = e.target.closest('.slate-row');
      if (!row) { clear(); return; }
      clear();
      var layer = atmo.querySelector('[data-atmo-layer="' + row.getAttribute('data-atmo') + '"]') || atmo.querySelector('.atmo-tone');
      if (layer) layer.classList.add('is-on');
    });
  }

  /* ---------------------------------------------------------- back to top */
  function initToTop() {
    var btn = document.querySelector('.to-top');
    if (!btn) return;
    window.addEventListener('scroll', function () { btn.classList.toggle('is-on', window.scrollY > 800); }, { passive: true });
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); });
  }

  initIdent();
  initHeader();
  initMenu();
  initProgress();
  initReveal();
  initCounters();
  initLoops();
  initFlagship();
  initCinema();
  initSlateAtmo();
  initToTop();
})();
