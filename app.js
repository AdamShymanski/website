/* Scroll-driven behaviour: theme wipe, image crossfade, reveal-on-scroll,
   and active-section nav. Ported from the design canvas. */
(function () {
  "use strict";

  var root = document.getElementById("page");
  if (!root) return;
  document.documentElement.classList.add("js");

  var narrowMQ = window.matchMedia("(max-width: 900px)");
  var slice = function (nl) { return Array.prototype.slice.call(nl); };

  var panels = slice(root.querySelectorAll("[data-panel]"));
  var reveals = slice(root.querySelectorAll("[data-reveal]"));
  var frame = root.querySelector("[data-imgframe]");
  var frameImgs = frame ? slice(frame.querySelectorAll("[data-img]")) : [];
  var navLinks = slice(root.querySelectorAll("[data-nav]"));
  var themeBase = root.querySelector(".theme-base");
  var themeWash = root.querySelector(".theme-wash");

  // Settled background colour for each theme (matches the CSS tokens).
  var THEME_BG = { dark: "#050505", bright: "#efece4" };

  reveals.forEach(function (el) {
    el.style.transitionDelay = (el.getAttribute("data-delay") || "0") + "ms";
  });

  var curTheme = "";
  var curPanel = "";
  var curSec = "";
  var lastY = window.pageYOffset || 0;
  var scrollDir = "down";
  var wipeId = 0;
  var themeReady = false;

  function applyImage(panelId) {
    var narrow = narrowMQ.matches;
    if (frame) {
      frame.style.opacity = narrow ? "0" : "1";
      frame.style.pointerEvents = narrow ? "none" : "auto";
    }
    frameImgs.forEach(function (el) {
      el.style.opacity = el.getAttribute("data-img") === panelId ? "1" : "0";
    });
  }

  function setNav(sec) {
    navLinks.forEach(function (a) {
      var on = a.getAttribute("data-nav") === sec;
      if (a.classList.contains("active") !== on) a.classList.toggle("active", on);
    });
  }

  // Slide the new theme colour vertically over the old one, entering from the
  // side the incoming content comes from (bottom when scrolling down, top when
  // scrolling up). Theme tokens flip instantly so incoming content is readable.
  function switchTheme(theme, dir) {
    root.setAttribute("data-theme", theme);
    var color = THEME_BG[theme] || THEME_BG.dark;

    if (!themeReady) {
      themeReady = true;
      if (themeBase) themeBase.style.background = color;
      return;
    }
    if (!themeWash || !themeBase) return;

    var start = dir === "up" ? "translateY(-100%)" : "translateY(100%)";
    var id = ++wipeId;

    themeWash.style.transition = "none";
    themeWash.style.background = color;
    themeWash.style.transform = start;
    themeWash.getBoundingClientRect(); // force reflow so the reset takes hold
    themeWash.style.transition = "transform 0.8s cubic-bezier(0.65, 0, 0.35, 1)";
    themeWash.style.transform = "translateY(0)";

    var settle = function () {
      if (id !== wipeId) return; // a newer wipe superseded this one
      themeBase.style.background = color;
      themeWash.style.transition = "none";
      themeWash.style.transform = start; // park off-screen for next time
    };
    themeWash.addEventListener("transitionend", settle, { once: true });
    setTimeout(settle, 900); // fallback if transitionend never fires
  }

  function updateActive() {
    var line = window.innerHeight * 0.42;
    var sec = "thesis";
    var panel = "thesis-1";
    panels.forEach(function (el) {
      if (el.getBoundingClientRect().top <= line) {
        sec = el.getAttribute("data-section");
        panel = el.id;
      }
    });
    if (sec !== curSec) { curSec = sec; setNav(sec); }
    var theme = sec === "work" ? "bright" : "dark";
    if (theme !== curTheme) { curTheme = theme; switchTheme(theme, scrollDir); }
    if (panel !== curPanel) { curPanel = panel; applyImage(panel); }
  }

  function revealCheck() {
    var H = window.innerHeight;
    reveals.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var vis = r.top < H * 0.85 && r.bottom > H * 0.15;
      if (el.classList.contains("in") !== vis) el.classList.toggle("in", vis);
    });
  }

  var raf = null;
  function onScroll() {
    var y = window.pageYOffset || 0;
    if (y > lastY) scrollDir = "down";
    else if (y < lastY) scrollDir = "up";
    lastY = y;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = null;
      updateActive();
      revealCheck();
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    applyImage(curPanel || "thesis-1");
    updateActive();
    revealCheck();
  });

  applyImage("thesis-1");

  var kick = function () { revealCheck(); updateActive(); };
  requestAnimationFrame(function () { kick(); requestAnimationFrame(kick); });
  [80, 250, 600, 1200].forEach(function (t) { setTimeout(kick, t); });
  window.addEventListener("load", kick);
})();
