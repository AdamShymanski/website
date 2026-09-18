/* ==================================================================== *
 * Beat controller for the home stage.
 *
 * The page does not scroll. Wheel, keys, swipes and the section list all
 * do the same thing: move to a beat. The media plate is one fixed
 * window behind the copy, sized to enclose the tallest beat and never
 * moved once solved — only the clip inside it slides. The copy holds
 * its own position too; instead of sliding a full screen height, the
 * headline travels one rendered line at a time out of a mask of its own
 * and the rest of the beat follows as whole blocks, since a full-screen
 * slide would fight the picture it is standing on. Everything travels
 * the way the gesture went: forward, the copy leaves upward and the next
 * beat comes up from below; backward, both reverse.
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
  /* A masked line carries its own edge, so it can run tighter and closer
     behind the line above it than a whole block can. */
  var LINE_ENTER_MS = 780;
  var LINE_EXIT_MS = 400;
  var LINE_ENTER_STAGGER_MS = 62;
  var LINE_EXIT_STAGGER_MS = 34;
  /* How far a line travels, as a share of its own height. A line does not
     clear its mask at 100%: the mask is taller than the line box by the
     padding it carries for the glyphs, and a .mark band hangs 0.1255em
     below the line box on top of that (see .line and --mark-band-y in
     style.css). 130% clears both edges with room to spare; on an
     expo-out curve the extra distance is spent in the first few frames
     and reads as one line-height of movement either way. */
  var LINE_TRAVEL = 130;
  /* The outgoing block has to clear the plate before the incoming one
     rises, or the two overlap on the same picture. */
  var ENTER_DELAY_MS = 230;
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
  /* Which way the last move went: 1 forward (down the list), -1 back.
     The reveal reads it, so a swipe up and a swipe down do not play the
     same animation. */
  var travel = 1;

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

    if (phone) {
      solvePhonePlate(tallest);
      return;
    }

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

  /* A phone is too narrow to set the copy over the picture: the plate
     there would be a tall box the 484:280 clip is cropped to a sliver
     of, and magnified in the process. So on a phone the copy stands on
     the page under the section list, and the plate is a full-bleed band
     at the clip's own aspect, anchored to the bottom of the stage above
     the footer's reserve, so the closing beat's footer never covers it
     and the band sits in the same place on every beat.

     On a short phone the tallest beat's copy and a full band do not both
     fit. Rather than shrink the picture to a strip, the band keeps its
     size and runs up under the end of the copy, and its top is faded
     into the page (--plate-fade, the height of a mask in style.css) far
     enough past the overlap that the text never stands on the picture at
     full strength. Only past a limit does the band give up height. */
  function solvePhonePlate(tallest) {
    var stage = copiesBox.offsetParent || page;
    var stageBox = stage.getBoundingClientRect();
    var stageH = stage.clientHeight || window.innerHeight;
    var sections = page.querySelector(".sections");
    var navBottom = sections ? sections.getBoundingClientRect().bottom - stageBox.top : 140;

    var copyTop = Math.round(navBottom + 40);
    var footerH = footer ? Math.ceil(footer.getBoundingClientRect().height) : 0;
    var bottom = stageH - footerH - 12;
    var w = window.innerWidth;
    var h = Math.round(w * PLATE_ASPECT);
    var copyEnd = copyTop + tallest + 28;
    var maxOverlap = Math.round(h * 0.4);
    var overlap = Math.max(0, copyEnd - (bottom - h));
    if (overlap > maxOverlap) {
      h = Math.max(120, h - (overlap - maxOverlap));
      overlap = Math.max(0, copyEnd - (bottom - h));
    }
    var fade = overlap ? Math.min(h, Math.round(overlap * 1.8) + 24) : 0;

    page.style.setProperty("--plate-fade", fade + "px");
    page.style.setProperty("--plate-top", Math.round(bottom - h) + "px");
    page.style.setProperty("--plate-left", "0px");
    page.style.setProperty("--plate-w", w + "px");
    page.style.setProperty("--plate-h", h + "px");
    page.style.setProperty("--copy-top", copyTop + "px");
  }

  /* ------------------------------------------------------------------ *
   * Copy — cutting the headline into lines
   * ------------------------------------------------------------------ */
  /* The headline reads far better if each rendered line rises out of a
     window of its own than if the whole paragraph moves as one, so the
     paragraph is cut into one `.line` per line box once it has been laid
     out. The cut is made at the breaks the browser itself chose, which is
     what keeps `.mark` intact: a mark running over two lines becomes one
     span per line, which is exactly the fragment box-decoration-break:
     clone was already painting.

     Because the cut depends on where the text wraps, it has to be redone
     whenever the wrap can change — a resize, or the webfont replacing the
     fallback face — so the paragraph's original markup is parked on the
     element and every pass starts from that rather than from the last
     pass's output. */
  function headlines(article) {
    return toArray(article.children).filter(function (child) {
      return child.tagName === "P" && !child.classList.contains("sub");
    });
  }

  /* Every text node under the paragraph, each tagged with the element it
     sits in (a `.mark`, or nothing), so a fragment of it can be given the
     same element back when the lines are rebuilt. */
  function collectText(node, owner, out) {
    toArray(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        out.push({ node: child, owner: owner });
      } else if (child.nodeType === 1) {
        collectText(child, child, out);
      }
    });
    return out;
  }

  function splitLines(p) {
    if (p.getAttribute("data-copy-src") === null) {
      p.setAttribute("data-copy-src", p.innerHTML);
    } else {
      p.classList.remove("is-split");
      p.innerHTML = p.getAttribute("data-copy-src");
    }
    /* An unsplit paragraph is a reveal unit in its own right and may be
       carrying that reveal's inline styles. The nodes below replace it,
       so those have to go or they would hide the lines. splitAll parks
       every beat again straight after, so clearing them is safe even if
       the cut below bails out. */
    p.style.transition = "";
    p.style.opacity = "";
    p.style.transform = "";
    p.style.clipPath = "";

    var texts = collectText(p, null, []);
    if (!texts.length) return;

    /* One rect per character is more work than one per word, but a word
       can itself be broken across lines and this cannot miss that. The
       copy is a couple of hundred characters and nothing is written back
       until the measuring is done, so it costs one layout. */
    var range = document.createRange();
    var pieces = [];

    texts.forEach(function (entry) {
      var value = entry.node.nodeValue;
      var start = 0;
      var top = null;
      for (var i = 0; i < value.length; i++) {
        range.setStart(entry.node, i);
        range.setEnd(entry.node, i + 1);
        var rect = range.getClientRects()[0];
        /* The space a line broke at has no box of its own. */
        if (!rect) continue;
        var y = Math.round(rect.top);
        if (top === null) {
          top = y;
        } else if (Math.abs(y - top) > 1) {
          pieces.push({ owner: entry.owner, text: value.slice(start, i), top: top });
          start = i;
          top = y;
        }
      }
      pieces.push({ owner: entry.owner, text: value.slice(start), top: top });
    });

    var lines = [];
    var lineTop = null;
    pieces.forEach(function (piece) {
      if (!piece.text) return;
      /* Whitespace that never got a box belongs to the line it followed. */
      if (piece.top === null) {
        if (lines.length) lines[lines.length - 1].push(piece);
        return;
      }
      if (lineTop === null || Math.abs(piece.top - lineTop) > 1) {
        lines.push([]);
        lineTop = piece.top;
      }
      lines[lines.length - 1].push(piece);
    });
    if (!lines.length) return;

    p.textContent = "";
    lines.forEach(function (parts) {
      var line = document.createElement("span");
      var inner = document.createElement("span");
      line.className = "line";
      inner.className = "line-in";
      parts.forEach(function (piece, i) {
        var text = piece.text;
        /* The space the line broke at would otherwise sit at the head or
           the tail of a line that is now a block of its own. */
        if (i === 0) text = text.replace(/^\s+/, "");
        if (i === parts.length - 1) text = text.replace(/\s+$/, "");
        if (!text) return;
        if (piece.owner) {
          var clone = piece.owner.cloneNode(false);
          clone.appendChild(document.createTextNode(text));
          inner.appendChild(clone);
        } else {
          inner.appendChild(document.createTextNode(text));
        }
      });
      if (!inner.childNodes.length) return;
      line.appendChild(inner);
      p.appendChild(line);
    });
    p.classList.add("is-split");
  }

  /* Re-cuts every beat and puts each one back where it was: the beat on
     screen settled, the rest parked hidden — the cut throws away the very
     nodes the reveal wrote its inline styles on. */
  function splitAll() {
    copies.forEach(function (article) {
      headlines(article).forEach(splitLines);
    });
    copies.forEach(function (article, i) {
      if (i === index) settle(article);
      else primeHidden(article);
    });
  }

  /* ------------------------------------------------------------------ *
   * Copy — staggered, direction-aware reveal
   * ------------------------------------------------------------------ */
  /* One unit of the reveal: a masked line of the headline, or a whole
     block (the sub-line, the action row, the wordmarks). A line travels
     inside its own window and needs no fade to hide its edges; a block
     has no window, so it fades and rises instead. */
  function unitsOf(article) {
    var units = [];
    toArray(article.children).forEach(function (child) {
      var lines = child.classList.contains("is-split")
        ? toArray(child.querySelectorAll(".line-in"))
        : [];
      if (lines.length) {
        lines.forEach(function (line) {
          units.push({ el: line, line: true });
        });
      } else {
        units.push({ el: child, line: false });
      }
    });
    return units;
  }

  /* `from` is the side the unit waits on: 1 below the copy, -1 above it. */
  function park(unit, from) {
    var style = unit.el.style;
    style.transition = "none";
    if (unit.line) {
      style.transform = "translate3d(0, " + from * LINE_TRAVEL + "%, 0)";
    } else {
      style.opacity = "0";
      style.transform = "translate3d(0, " + from * 26 + "px, 0)";
      style.clipPath =
        from > 0 ? "inset(-0.14em 0 100% 0)" : "inset(100% 0 -0.22em 0)";
    }
  }

  function land(unit) {
    var style = unit.el.style;
    style.transform = "translate3d(0, 0, 0)";
    if (!unit.line) {
      style.opacity = "1";
      style.clipPath = "inset(-0.14em 0 -0.22em 0)";
    }
  }

  /* Snaps a beat to the hidden, pre-reveal state with no transition. Used
     on every beat but the first at boot, so the first time each one is
     actually entered it rises from nothing instead of flashing its
     settled content for the length of ENTER_DELAY_MS. */
  function primeHidden(article) {
    unitsOf(article).forEach(function (unit) {
      park(unit, travel);
    });
  }

  function settle(article) {
    unitsOf(article).forEach(function (unit) {
      unit.el.style.transition = "none";
      land(unit);
    });
  }

  function revealIn(article, direction) {
    var instant = reduced();
    var delay = 0;
    unitsOf(article).forEach(function (unit) {
      park(unit, direction);
      /* Forces the parked state above to paint before the transition
         below is turned back on, or the browser coalesces both and the
         reveal never plays. */
      void unit.el.offsetHeight;
      if (!instant) {
        unit.el.style.transition = unit.line
          ? "transform " + LINE_ENTER_MS + "ms " + ENTER_EASE + " " + delay + "ms"
          : "transform 0.86s " + ENTER_EASE + " " + delay + "ms, " +
            "opacity 0.62s " + ENTER_EASE + " " + delay + "ms, " +
            "clip-path 0.86s " + ENTER_EASE + " " + delay + "ms";
        delay += unit.line ? LINE_ENTER_STAGGER_MS : ENTER_STAGGER_MS;
      }
      land(unit);
    });
  }

  function revealOut(article, direction) {
    var instant = reduced();
    var delay = 0;
    /* A beat leaves from the bottom up, so the line the eye finished on
       is the first one gone. */
    unitsOf(article)
      .reverse()
      .forEach(function (unit) {
        var style = unit.el.style;
        if (!instant) {
          style.transition = unit.line
            ? "transform " + LINE_EXIT_MS + "ms " + EXIT_EASE + " " + delay + "ms"
            : "transform 0.42s " + EXIT_EASE + " " + delay + "ms, " +
              "opacity 0.34s " + EXIT_EASE + " " + delay + "ms";
          delay += unit.line ? LINE_EXIT_STAGGER_MS : EXIT_STAGGER_MS;
        } else {
          style.transition = "none";
        }
        if (unit.line) {
          style.transform = "translate3d(0, " + -direction * LINE_TRAVEL + "%, 0)";
        } else {
          style.opacity = "0";
          style.transform = "translate3d(0, " + -direction * 14 + "px, 0)";
        }
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
    /* Everything the copy does from here reads this: the beat leaves the
       way the gesture was going and the next one arrives from the side
       the gesture came from. */
    travel = previous < 0 || next > previous ? 1 : -1;
    var direction = travel;
    index = next;

    if (previous >= 0) {
      revealOut(copies[previous], direction);
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
        if (copies[index] === entering) revealIn(entering, direction);
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

  /* The headline's line cut and the plate are both read off rendered
     copy and viewport size, so both have to be redone whenever either
     changes: on resize (debounced — neither is expensive, but there is no
     reason to run them on every intermediate frame of a drag-resize), and
     once the webfont has replaced the fallback face, since that changes
     where the copy wraps and how tall it is. The cut comes first; the
     plate is solved from what it leaves behind. */
  function relayout() {
    splitAll();
    solvePlate();
  }

  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(relayout, 100);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(relayout);
  }

  /* ------------------------------------------------------------------ *
   * Start
   * ------------------------------------------------------------------ */
  /* index is still -1 here, so this cuts every headline into lines and
     parks all six beats hidden — no beat is on screen yet to settle. */
  splitAll();
  mediaBeats.forEach(function (el, i) {
    parkMedia(el, i, 0);
  });
  solvePlate();

  index = -1;
  go(beatFromHash(), { silent: true });
  busy = false;
  window.clearTimeout(busyTimer);
})();
