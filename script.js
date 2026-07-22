/* ==========================================================================
   ALLIANCE MEDIA — interaction layer v2 (vanilla, no dependencies)
   Subtle, professional motion only. prefers-reduced-motion disables it all.
   `?static` in the URL freezes everything (QA / screenshot mode).
   ========================================================================== */
(function () {
  'use strict';

  var staticMode = /[?&]static\b/.test(location.search);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || staticMode;
  var docEl = document.documentElement;

  if (staticMode) {
    var qaStyle = document.createElement('style');
    qaStyle.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}' +
      '.reveal,.reveal-child>*{opacity:1!important;transform:none!important}';
    document.head.appendChild(qaStyle);
  }

  /* ------------------------------------------------------ header behavior */
  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 10); }
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

  /* ----------------------------------------------------- reveal on scroll */
  function initStagger() {
    document.querySelectorAll('.reveal-child').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--ri', i);
      });
    });
  }

  function initReveal() {
    var targets = document.querySelectorAll('.reveal, .reveal-child');
    if (!('IntersectionObserver' in window) || reduced) {
      targets.forEach(function (t) { t.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ------------------------------------------------------------- counters */
  function initCounters() {
    var nums = document.querySelectorAll('[data-count]');
    if (!nums.length || !('IntersectionObserver' in window)) return;
    function animate(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (reduced || !target) return;
      var dur = 1400, t0 = null;
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
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* --------------------------------------------------------------- ticker */
  function initTicker() {
    document.querySelectorAll('.ticker__track').forEach(function (track) {
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
  initHeader();
  initMenu();
  initProgress();
  initStagger();
  initReveal();
  initCounters();
  initTicker();
  initToTop();
})();
