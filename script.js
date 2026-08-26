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
  var jumpTs = 0; // last programmatic hash-jump; header must not auto-hide on arrival

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
    var phone = window.innerWidth <= 760 || (navigator.connection && navigator.connection.saveData);
    if (reduced || seen || location.hash || phone) {
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
      if (Date.now() - jumpTs < 900) { header.classList.remove('is-hidden'); lastY = y; return; }
      if (!document.body.classList.contains('menu-open')) {
        if (y > 480 && y > lastY + 8) header.classList.add('is-hidden');
        else if (y < lastY - 8 || y < 480) header.classList.remove('is-hidden');
      }
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------- mobile menu (full focus management) */
  function initMenu() {
    var toggle = document.querySelector('.menu-toggle');
    var menu = document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;
    var inertTargets = ['main', 'footer', '.site-header .main-nav', '.header-cta']
      .map(function (s) { return document.querySelector(s); }).filter(Boolean);
    function setOpen(open) {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      inertTargets.forEach(function (el) { try { el.inert = open; } catch (e) {} });
      if (open) {
        var first = menu.querySelector('a');
        window.setTimeout(function () { if (first) first.focus(); }, reduced ? 0 : 250);
      } else {
        toggle.focus();
      }
    }
    toggle.addEventListener('click', function () { setOpen(!document.body.classList.contains('menu-open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (!document.body.classList.contains('menu-open')) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'Tab') { // trap focus within menu + toggle
        var items = Array.prototype.slice.call(menu.querySelectorAll('a'));
        items.push(toggle);
        var idx = items.indexOf(document.activeElement);
        if (e.shiftKey && (idx === 0 || idx === -1)) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
  }

  /* ------------------------------- hash navigation (native + assists)
     The browser's own fragment navigation is the source of truth: CSS
     `[id]{scroll-margin-top:92px}` lands every target below the fixed
     header, and Chrome's fragment anchoring self-corrects when late
     media/fonts shift layout (it re-snaps until the user scrolls).
     Fighting it with scrollTo is impossible pre-gesture — so we don't.
     The ident is skipped on hash URLs (initIdent), so the native jump
     is never trapped behind the intro. We only assist: keep the header
     visible on arrival, and re-assert the fragment once after load in
     case a browser skipped the initial anchor. */
  function initHashNav() {
    function assist() {
      jumpTs = Date.now();
      var h = document.querySelector('.site-header');
      if (h) h.classList.remove('is-hidden');
    }
    if (location.hash) {
      assist();
      window.addEventListener('load', function () {
        assist();
        var target;
        try { target = document.querySelector(location.hash); } catch (e) { target = null; }
        // if the anchor was somehow missed (e.g. hash set before element parsed), re-assert it
        if (target && Math.abs(target.getBoundingClientRect().top) > window.innerHeight) {
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, { once: true });
    }
    window.addEventListener('hashchange', assist);
  }

  /* --------------------------------- page transitions (film cut, ~380ms) */
  function initTransitions() {
    var curtain = document.createElement('div');
    curtain.className = 'curtain';
    curtain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(curtain);

    // entry: lift the curtain if we arrived via an internal cut
    var arrived = false;
    try { arrived = sessionStorage.getItem('am_cut') === '1'; sessionStorage.removeItem('am_cut'); } catch (e) {}
    if (arrived && !reduced && !document.querySelector('.ident:not(.ident--off)')) {
      curtain.classList.add('is-entry');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { curtain.classList.add('is-lift'); });
      });
      window.setTimeout(function () { curtain.classList.remove('is-entry', 'is-lift'); }, 700);
    }
    // restore instantly when coming back from bfcache
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) curtain.classList.remove('is-cut', 'is-entry', 'is-lift');
    });
    if (reduced) return;

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (/^(https?:)?\/\//.test(href) && a.origin !== location.origin) return;
      if (/^(mailto:|tel:|#)/.test(href)) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return; // same-page anchor
      e.preventDefault();
      try { sessionStorage.setItem('am_cut', '1'); } catch (err) {}
      curtain.classList.add('is-cut');
      window.setTimeout(function () { location.href = a.href; }, 390);
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

  /* --------------------------- flagship: sticky scroll story (chapters) */
  function initFlagship() {
    var story = document.querySelector('.flagship--story');
    var art = document.querySelector('.flagship__art');
    if (!art) return;
    var cells = story ? story.querySelectorAll('.flagship__cell') : [];
    var deskMQ = window.matchMedia('(min-width: 961px)');
    if (reduced) { Array.prototype.forEach.call(cells, function (c) { c.classList.add('is-on'); }); return; }
    function onScroll() {
      if (!deskMQ.matches || !story) {
        // mobile / no story wrapper: simple grow-on-approach
        var r0 = art.getBoundingClientRect();
        var p0 = Math.min(1, Math.max(0, (window.innerHeight - r0.top) / (window.innerHeight * 0.9)));
        art.style.setProperty('--fs', (0.9 + 0.1 * p0).toFixed(4));
        Array.prototype.forEach.call(cells, function (c) { c.classList.add('is-on'); });
        return;
      }
      var scroll = story.querySelector('.flagship__scroll');
      var r = scroll.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      // chapter 1 (0–0.45): the framed art expands to full frame
      var s = 0.82 + 0.18 * Math.min(1, p / 0.45);
      art.style.setProperty('--fs', s.toFixed(4));
      // chapters 2–4: synopsis, credits, honours enter in narrative order
      var gates = [0.45, 0.62, 0.78];
      Array.prototype.forEach.call(cells, function (c, i) {
        c.classList.toggle('is-on', p >= (gates[i] || 0.8));
      });
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
    var barTitle = stage.getAttribute('data-cinema-title') || 'Echoes of Us · Official trailer';
    var modal = document.createElement('div');
    modal.className = 'cinema';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Trailer — cinema view');
    modal.innerHTML =
      '<div class="cinema__frame">' +
      '<video controls playsinline preload="metadata" width="1280" height="536"' + (poster ? ' poster="' + poster + '"' : '') + '>' +
      '<source src="' + src + '" type="video/mp4" /></video>' +
      '<div class="cinema__bar"><span>' + barTitle + '</span>' +
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
  initHashNav();
  initTransitions();
})();
