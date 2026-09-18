/* ==================================================================== *
 * Beat controller for the home stage.
 *
 * The page does not scroll. Wheel, keys, swipes and the section list all
 * do the same thing: move to a beat. The media plate is one fixed
 * window behind the copy, sized to enclose the tallest beat and never
 * moved once solved — only the clip inside it slides. The copy holds
 * its own position too; instead of sliding a full screen height, each
 * beat's children rise into place with a staggered clip reveal, since a
 * full-screen slide would fight the picture it is standing on.
 * ==================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var page = document.getElementById("page");
  if (!page) return;

  var copies = toArray(page.querySelectorAll(".copy"));
  if (!copies.length) return;

  var copiesBox = page.querySelector(".copies");
  var mediaBeats = toArray(page.querySelectorAll(".media-beat"));
  var navButtons = toArray(page.querySelectorAll(".sections button"));
  var stepButtons = toArray(page.querySelectorAll(".step-controls button"));
  var footer = page.querySelector(".site-footer");
  var last = copies.length - 1;

  /* Must match --dur-plate in style.css: how long a departing beat's
     clip keeps playing while it slides out of the fixed window. */
  var PLATE_MS = 1050;
  /* The copy's reveal has no single CSS duration to mirror — each child
     animates on its own inline transition, staggered — so these live
     here rather than as a --dur-copy token. */
  var ENTER_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
  var EXIT_EASE = "cubic-bezier(0.4, 0, 0.9, 0.4)";
  var ENTER_STAGGER_MS = 90;
  var EXIT_STAGGER_MS = 40;
  /* The outgoing block has to clear the plate before the incoming one
     rises, or the two overlap on the same picture. */
  var ENTER_DELAY_MS = 260;
  /* How long a departing beat stays painted before it is hidden. */
  var EXIT_LOCK_MS = 500;
  /* One wheel/key/swipe gesture's cooldown, tuned to the reveal's own
     pace rather than to the full length of its longest child transition. */
  var LOCK_MS = 820;
  /* The clips' own aspect ratio (280 / 484) — the plate is solved to
     this exactly, so nothing inside it is ever cropped. */
  var PLATE_ASPECT = 0.5787;

  /* A gesture has to clear this before it moves a beat, so a nudge or the
     tail of a horizontal swipe does nothing. About one firm mouse notch. */
  var WHEEL_THRESHOLD = 90;
  /* Quiet gap that ends a wheel gesture. Long enough to outlast the gaps
     inside a trackpad's momentum tail. */
  var WHEEL_QUIET_MS = 200;
  /* A momentum tail only ever decays. A delta back near the gesture's peak
     is a fresh push, not the tail, so it re-arms. */
  var WHEEL_REARM_RATIO = 0.7;

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var index = -1;
  var busy = false;
  var busyTimer = null;
  var wheelAccum = 0;
  var wheelIdle = null;
  var wheelArmed = true;
  var wheelPeak = 0;
  var maxCopyH = 0;
  var solvedFor = 0;
  var resizeTimer = null;

  function toArray(list) {
    return Array.prototype.slice.call(list);
  }

  function reduced() {
    return motionQuery.matches;
  }

  /* ------------------------------------------------------------------ *
   * The plate
   * ------------------------------------------------------------------ */
  /* Monotonic: the plate must not shrink once seen, so the running
     tallest only ever grows (a webfont swap or a line wrap hit for the
     first time can only make a beat taller than it first measured). */
  function measureCopies() {
    var tallest = maxCopyH;
    copies.forEach(function (el) {
      tallest = Math.max(tallest, el.getBoundingClientRect().height, el.offsetHeight);
    });
    maxCopyH = tallest;
    return tallest;
  }

  /* The plate has to enclose the widest measure and the tallest of the
     six beats with even insets, while keeping the clips' own aspect
     ratio so nothing inside it is cropped — so it is solved from both,
     not guessed. Width comes from the copy's own width; height from
     whichever of the copy's height or the aspect-locked width demands
     more. The result is centred in the band above the footer (equal top
     and bottom reserve, sized for the footer's real height so the
     closing beat never overlaps it), and the copy is then centred
     inside the solved plate. */
  function solvePlate() {
    if (!copiesBox) return;

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var phone = vw <= 760;
    var mid = vw <= 1200;
    var r = copiesBox.getBoundingClientRect();
    var tallest = measureCopies();
    solvedFor = tallest;

    var insetL = phone ? 20 : mid ? 40 : 56;
    var insetR = phone ? 20 : mid ? 80 : 110;
    var padY = phone ? 42 : mid ? 52 : 64;
    var edge = phone ? 20 : 40;

    var left = Math.max(edge, Math.round(r.left - insetL));
    var availW = vw - left - edge;
    var wNeed = Math.round(r.width) + insetL + insetR;
    var hNeed = tallest + padY * 2;

    var footerH = footer ? Math.ceil(footer.getBoundingClientRect().height) : 0;
    var pad = Math.max(phone ? 168 : 74, footerH + 14);
    var band = Math.max(160, vh - pad * 2);

    var h = Math.min(band, Math.max(hNeed, Math.round(Math.min(availW, Math.max(wNeed, 0)) * PLATE_ASPECT)));
    var w = Math.min(availW, Math.max(wNeed, Math.round(h / PLATE_ASPECT)));
    h = Math.min(band, Math.max(h, Math.round(w * PLATE_ASPECT)));
    /* If the band cannot hold the copy with its full padding, the
       padding yields before the picture is cropped or the copy hangs
       off the plate. */
    h = Math.max(h, Math.min(band, tallest + 24));

    var top = Math.round(pad + (band - h) / 2);
    var copyTop = Math.round(top + (h - tallest) / 2);

    page.style.setProperty("--plate-top", top + "px");
    page.style.setProperty("--plate-left", left + "px");
    page.style.setProperty("--plate-w", w + "px");
    page.style.setProperty("--plate-h", h + "px");
    page.style.setProperty("--copy-top", copyTop + "px");
  }

  /* ------------------------------------------------------------------ *
   * Copy — staggered rise-and-clip reveal
   * ------------------------------------------------------------------ */
  /* Snaps a beat's children to the hidden, pre-reveal state with no
     transition. Used on every beat but the first at boot, so the first
     time each one is actually entered it rises from nothing instead of
     flashing its settled content for the length of ENTER_DELAY_MS. */
  function primeHidden(article) {
    toArray(article.children).forEach(function (child) {
      child.style.transition = "none";
      child.style.opacity = "0";
      child.style.transform = "translate3d(0, 26px, 0)";
      child.style.clipPath = "inset(-0.14em 0 100% 0)";
    });
  }

  function revealIn(article) {
    var children = toArray(article.children);
    var instant = reduced();
    children.forEach(function (child, i) {
      child.style.transition = "none";
      child.style.opacity = "0";
      child.style.transform = "translate3d(0, 26px, 0)";
      child.style.clipPath = "inset(-0.14em 0 100% 0)";
      /* Forces the hidden state above to paint before the transition
         below is turned back on, or the browser coalesces both and the
         reveal never plays. */
      void child.offsetHeight;
      if (!instant) {
        var delay = i * ENTER_STAGGER_MS;
        child.style.transition =
          "transform 0.86s " + ENTER_EASE + " " + delay + "ms, " +
          "opacity 0.62s " + ENTER_EASE + " " + delay + "ms, " +
          "clip-path 0.86s " + ENTER_EASE + " " + delay + "ms";
      }
      child.style.opacity = "1";
      child.style.transform = "translate3d(0, 0, 0)";
      child.style.clipPath = "inset(-0.14em 0 -0.22em 0)";
    });
  }

  function revealOut(article) {
    var children = toArray(article.children);
    var instant = reduced();
    children.forEach(function (child, i) {
      if (!instant) {
        var delay = (children.length - 1 - i) * EXIT_STAGGER_MS;
        child.style.transition =
          "transform 0.42s " + EXIT_EASE + " " + delay + "ms, " +
          "opacity 0.34s " + EXIT_EASE + " " + delay + "ms";
      } else {
        child.style.transition = "none";
      }
      child.style.opacity = "0";
      child.style.transform = "translate3d(0, -14px, 0)";
    });
  }

  /* ------------------------------------------------------------------ *
   * Media — inner slide inside the fixed window
   * ------------------------------------------------------------------ */
  function parkMedia(el, i, current) {
    el.classList.remove("is-current", "is-past", "is-future");
    el.classList.add(
      i === current ? "is-current" : i < current ? "is-past" : "is-future"
    );
  }

  /* The clips are the one thing here that costs something to keep moving,
     so only the beat on screen plays. Its two neighbours are fetched, so
     the next wipe never lands on an unpainted frame; everything further
     out stays at `preload="none"` until it is needed. A beat that is
     leaving keeps playing until its slide is over, or it would freeze
     halfway out of the window. */
  function setPlayback(beat, i) {
    var video = beat.querySelector("video");
    if (!video) return;
    var current = i === index;
    var adjacent = Math.abs(i - index) === 1;

    if (current && !reduced()) {
      var played = video.play();
      if (played && played.catch) {
        played.catch(function () {});
      }
      return;
    }

    if (adjacent && video.preload === "none") {
      video.preload = "auto";
      video.load();
    }

    if (current) {
      video.pause();
      return;
    }

    window.setTimeout(function () {
      if (mediaBeats.indexOf(beat) === index) return;
      video.pause();
    }, reduced() ? 0 : PLATE_MS);
  }

  /* ------------------------------------------------------------------ *
   * Navigation
   * ------------------------------------------------------------------ */
  function go(next, options) {
    next = Math.max(0, Math.min(last, next));
    if (next === index) return;

    var opts = options || {};
    var previous = index;
    index = next;

    if (previous >= 0) {
      revealOut(copies[previous]);
    }

    copies.forEach(function (el, i) {
      el.classList.toggle("is-current", i === index);
      el.classList.toggle("is-leaving", i === previous);
    });

    if (previous >= 0) {
      window.setTimeout(function () {
        if (index !== previous) copies[previous].classList.remove("is-leaving");
      }, reduced() ? 0 : EXIT_LOCK_MS);
    }

    var entering = copies[index];
    window.setTimeout(
      function () {
        if (copies[index] === entering) revealIn(entering);
      },
      previous >= 0 && !reduced() ? ENTER_DELAY_MS : 0
    );

    mediaBeats.forEach(function (el, i) {
      parkMedia(el, i, index);
      setPlayback(el, i);
    });
    navButtons.forEach(function (button, i) {
      button.classList.toggle("is-selected", i === index);
      button.setAttribute("aria-current", i === index ? "true" : "false");
    });

    var active = copies[index];
    page.dataset.theme = active.dataset.theme || "dark";
    page.classList.toggle("is-ending", active.hasAttribute("data-ending"));

    if (stepButtons.length === 2) {
      stepButtons[0].disabled = index === 0;
      stepButtons[1].disabled = index === last;
    }

    if (active.id && !opts.silent) {
      var target = index === 0 ? window.location.pathname : "#" + active.id;
      history.replaceState(null, "", target);
    }

    /* A beat can measure taller than the one the plate was solved for —
       a webfont swap, or a line wrapping for the first time at a width
       it hasn't hit before — in which case the plate has to grow to
       match, or this beat would overhang it. */
    if (measureCopies() !== solvedFor) solvePlate();

    lock();
  }

  function lock() {
    busy = true;
    window.clearTimeout(busyTimer);
    busyTimer = window.setTimeout(function () {
      busy = false;
    }, reduced() ? 0 : LOCK_MS);
  }

  function step(direction) {
    if (busy) return;
    go(index + direction);
  }

  /* ------------------------------------------------------------------ *
   * Input
   * ------------------------------------------------------------------ */
  /* Not every browser measures a wheel in pixels; in line or page mode the
     raw deltaY is a handful of units and would never reach the threshold. */
  function wheelDelta(event) {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  /* One gesture moves one beat.
   *
   * A trackpad keeps sending a decaying tail of deltas for up to a second
   * after the fingers lift. Accumulating those used to re-trigger the
   * moment the slide unlocked, so a single flick carried the page two or
   * three beats. Now a gesture is disarmed once it has stepped, and only
   * re-arms when the wheel falls quiet — or when a delta comes back near
   * the gesture's peak, which a decaying tail never does but a fresh push
   * or a steady mouse wheel does. */
  page.addEventListener(
    "wheel",
    function (event) {
      event.preventDefault();

      var delta = wheelDelta(event);
      var size = Math.abs(delta);

      /* Any activity postpones the end of the gesture. */
      window.clearTimeout(wheelIdle);
      wheelIdle = window.setTimeout(endWheelGesture, WHEEL_QUIET_MS);

      if (size > wheelPeak) wheelPeak = size;

      if (!wheelArmed && !busy && size >= wheelPeak * WHEEL_REARM_RATIO) {
        wheelArmed = true;
        wheelPeak = size;
      }

      if (busy || !wheelArmed) {
        wheelAccum = 0;
        return;
      }

      wheelAccum += delta;
      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;

      var direction = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      wheelArmed = false;
      step(direction);
    },
    { passive: false }
  );

  function endWheelGesture() {
    wheelAccum = 0;
    wheelPeak = 0;
    wheelArmed = true;
  }

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    var tag = event.target && event.target.tagName;
    var onControl = tag === "BUTTON" || tag === "A" || tag === "INPUT";

    switch (event.key) {
      case "ArrowDown":
      case "PageDown":
        event.preventDefault();
        step(1);
        break;
      case "ArrowUp":
      case "PageUp":
        event.preventDefault();
        step(-1);
        break;
      case " ":
        if (onControl) return;
        event.preventDefault();
        step(event.shiftKey ? -1 : 1);
        break;
      case "Home":
        event.preventDefault();
        go(0);
        break;
      case "End":
        event.preventDefault();
        go(last);
        break;
    }
  });

  var touchY = null;
  page.addEventListener(
    "touchstart",
    function (event) {
      touchY = event.touches[0].clientY;
    },
    { passive: true }
  );

  page.addEventListener(
    "touchend",
    function (event) {
      if (touchY === null) return;
      var delta = touchY - event.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(delta) < 40) return;
      step(delta > 0 ? 1 : -1);
    },
    { passive: true }
  );

  navButtons.forEach(function (button, i) {
    button.addEventListener("click", function () {
      go(i);
    });
  });

  stepButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      step(Number(button.dataset.step) || 1);
    });
  });

  window.addEventListener("hashchange", function () {
    go(beatFromHash(), { silent: true });
  });

  /* Someone turning reduced motion on should stop the clip they are
     looking at, not just the next transition. */
  addMotionListener(function () {
    mediaBeats.forEach(function (el, i) {
      setPlayback(el, i);
    });
  });

  function addMotionListener(handler) {
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener("change", handler);
    } else if (motionQuery.addListener) {
      motionQuery.addListener(handler);
    }
  }

  function beatFromHash() {
    var id = window.location.hash.slice(1);
    if (!id) return 0;
    for (var i = 0; i < copies.length; i++) {
      if (copies[i].id === id) return i;
    }
    return 0;
  }

  /* The plate is solved from rendered copy and viewport size, so it has
     to be re-solved whenever either changes: on resize (debounced — the
     solve is cheap, but there is no reason to run it on every intermediate
     frame of a drag-resize), and once the webfont has replaced the
     fallback face, since that changes the copy's own metrics. */
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(solvePlate, 100);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(solvePlate);
  }

  /* ------------------------------------------------------------------ *
   * Start
   * ------------------------------------------------------------------ */
  copies.forEach(function (el) {
    primeHidden(el);
  });
  mediaBeats.forEach(function (el, i) {
    parkMedia(el, i, 0);
  });
  solvePlate();

  index = -1;
  go(beatFromHash(), { silent: true });
  busy = false;
  window.clearTimeout(busyTimer);
})();
