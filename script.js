(() => {
  "use strict";

  // ?test=10 starts a 10-second countdown so the finale can be previewed.
  const testSeconds = Number(new URLSearchParams(location.search).get("test"));
  const TARGET = testSeconds > 0
    ? Date.now() + testSeconds * 1000
    : new Date(2027, 0, 1, 0, 0, 0).getTime();

  const FLIP_MS = 600; // two halves × --flip-duration in style.css
  const ENTRANCE_MS = 1900; // last staggered card-enter in style.css has finished
  const MOTION_KEY = "countdown-2027-motion";

  const root = document.documentElement;
  const countdownEl = document.getElementById("countdown");
  const introEl = document.querySelector(".intro");
  const finaleEl = document.getElementById("finale");
  const confettiEl = document.getElementById("confetti");
  const bgEl = document.getElementById("bg");
  const motionToggle = document.getElementById("motion-toggle");

  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const pad = (n) => String(n).padStart(2, "0");

  // Animations are on by default regardless of the OS reduced-motion setting;
  // the toggle button turns them off and the choice is remembered.
  let motion = true;
  try {
    motion = localStorage.getItem(MOTION_KEY) !== "off";
  } catch {}

  const units = {};
  countdownEl.querySelectorAll(".unit").forEach((unit) => {
    units[unit.dataset.unit] = [...unit.querySelectorAll(".flip-card")].map((el) => ({
      el,
      top: el.querySelector(".card-top span"),
      bottom: el.querySelector(".card-bottom span"),
      flipTop: el.querySelector(".flip-top span"),
      flipBottom: el.querySelector(".flip-bottom span"),
      value: null,
      timer: 0,
    }));
  });
  const allCards = Object.values(units).flat();

  allCards.forEach((card, i) => card.el.style.setProperty("--i", i));
  setTimeout(() => document.body.classList.remove("is-entering"), ENTRANCE_MS);

  // Announcing every second is too noisy for screen readers: expose the
  // time as a timer with a readable label instead of a polite live region.
  countdownEl.setAttribute("role", "timer");
  countdownEl.removeAttribute("aria-live");
  countdownEl.querySelectorAll(".unit").forEach((unit) => unit.setAttribute("aria-hidden", "true"));
  finaleEl.setAttribute("role", "status");

  /* ---------- Flip cards ---------- */

  function setDigit(card, value) {
    if (card.value === value) return;

    const prev = card.value;
    card.value = value;
    clearTimeout(card.timer);

    if (prev === null || !motion || document.hidden) {
      card.top.textContent = card.bottom.textContent = value;
      card.flipTop.textContent = card.flipBottom.textContent = value;
      card.el.classList.remove("flipping");
      return;
    }

    // Static halves: new digit on top, old digit below until the flap lands.
    card.top.textContent = value;
    card.bottom.textContent = prev;
    card.flipTop.textContent = prev;
    card.flipBottom.textContent = value;

    card.el.classList.remove("flipping");
    void card.el.offsetWidth; // restart the animation
    card.el.classList.add("flipping");

    card.timer = setTimeout(() => {
      card.bottom.textContent = value;
      card.el.classList.remove("flipping");
    }, FLIP_MS);
  }

  function setUnit(name, n) {
    const cards = units[name];
    const digits = String(Math.min(n, 10 ** cards.length - 1)).padStart(cards.length, "0");
    cards.forEach((card, i) => setDigit(card, digits[i]));
  }

  function render(total) {
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    setUnit("days", days);
    setUnit("hours", hours);
    setUnit("minutes", minutes);
    setUnit("seconds", seconds);

    countdownEl.setAttribute(
      "aria-label",
      `${days} დღე, ${hours} საათი, ${minutes} წუთი, ${seconds} წამი`
    );
    document.title = `${days}დ ${pad(hours)}:${pad(minutes)}:${pad(seconds)} — 2027`;
  }

  /* ---------- Clock ---------- */

  let tickTimer = 0;
  let celebrated = false;

  function tick() {
    clearTimeout(tickTimer);
    const diff = TARGET - Date.now();
    const remaining = Math.max(0, Math.ceil(diff / 1000));

    render(remaining);

    if (remaining === 0) {
      celebrate();
      return;
    }
    // Wake just after the displayed second changes to avoid drift.
    tickTimer = setTimeout(tick, (diff % 1000 || 1000) + 20);
  }

  function celebrate() {
    if (celebrated) return;
    celebrated = true;

    // Let the final 00 flip land before switching scenes.
    const alreadyOver = !countdownEl.querySelector(".flipping");
    setTimeout(() => {
      introEl.hidden = true;
      countdownEl.hidden = true;
      finaleEl.hidden = false;
      document.title = "გილოცავ 2027! 🎉";
      if (motion) launchConfetti();
    }, alreadyOver ? 0 : FLIP_MS + 300);
  }

  /* ---------- Effects ---------- */

  function launchConfetti() {
    if (confettiEl.childElementCount) {
      confettiEl.hidden = false;
      return;
    }

    const colors = ["#f5c86b", "#ffe7ad", "#ffffff", "#ff6b8b", "#6bd3ff", "#9b8cff"];
    const count = window.innerWidth < 600 ? 90 : 160;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const piece = document.createElement("i");
      piece.className = "confetti-piece";
      const spin = rand(360, 1080) * (Math.random() < 0.5 ? -1 : 1);
      piece.style.cssText =
        `--x:${rand(0, 100).toFixed(2)}%;` +
        `--size:${rand(6, 12).toFixed(1)}px;` +
        `--c:${pick(colors)};` +
        `--d:${rand(3.5, 7).toFixed(2)}s;` +
        `--delay:${rand(-7, 0).toFixed(2)}s;` +
        `--drift:${rand(-15, 15).toFixed(2)}vw;` +
        `--z:${rand(-300, 250).toFixed(0)}px;` +
        `--spin:${spin.toFixed(0)}deg`;
      frag.appendChild(piece);
    }

    confettiEl.appendChild(frag);
    confettiEl.hidden = false;
  }

  let starsBuilt = false;

  function buildStarfield() {
    if (starsBuilt) return;
    starsBuilt = true;

    const colors = ["#ffffff", "#ffe7ad", "#f5c86b", "#b9c7ff"];
    const count = window.innerWidth < 600 ? 60 : 120;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const star = document.createElement("span");
      star.className = "star";
      const duration = rand(10, 22);
      star.style.cssText =
        `--x:${rand(-70, 70).toFixed(2)}vw;` +
        `--y:${rand(-70, 70).toFixed(2)}vh;` +
        `--s:${rand(1, 3).toFixed(1)}px;` +
        `--c:${pick(colors)};` +
        `--d:${duration.toFixed(2)}s;` +
        `--delay:${(-rand(0, duration)).toFixed(2)}s`;
      frag.appendChild(star);
    }

    bgEl.appendChild(frag);
  }

  // Two tilted rings of light circling the countdown in 3D.
  const ORBIT_RINGS = [
    { count: 36, tilt: 16, speed: 0.12, color: "#f5c86b", size: 3.5, phase: 0 },
    { count: 28, tilt: -24, speed: -0.08, color: "#9fb4ff", size: 2.5, phase: 1.3 },
  ];
  const orbitDots = [];
  let orbitFrame = 0;

  function buildOrbits() {
    if (orbitDots.length) return;

    const frag = document.createDocumentFragment();
    ORBIT_RINGS.forEach((ring) => {
      const tilt = (ring.tilt * Math.PI) / 180;
      for (let i = 0; i < ring.count; i++) {
        const el = document.createElement("span");
        el.className = "orbit-dot";
        el.style.setProperty("--c", ring.color);
        el.style.setProperty("--s", `${ring.size}px`);
        frag.appendChild(el);
        orbitDots.push({
          el,
          speed: ring.speed,
          sinTilt: Math.sin(tilt),
          cosTilt: Math.cos(tilt),
          angle: (i / ring.count) * Math.PI * 2 + ring.phase,
        });
      }
    });
    bgEl.appendChild(frag);
  }

  function drawOrbits(time) {
    const t = time / 1000;
    const radius = Math.min(window.innerWidth * 0.46, 560);

    for (const dot of orbitDots) {
      const a = dot.angle + t * dot.speed;
      const depth = Math.sin(a); // -1 far side, 1 near side
      const x = Math.cos(a) * radius;
      const y = -depth * radius * dot.sinTilt;
      const z = depth * radius * dot.cosTilt * 0.8 - radius * 0.3;

      dot.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px)`;
      dot.el.style.opacity = (0.15 + ((depth + 1) / 2) * 0.85).toFixed(2);
    }

    orbitFrame = requestAnimationFrame(drawOrbits);
  }

  function startOrbits() {
    cancelAnimationFrame(orbitFrame);
    orbitFrame = requestAnimationFrame(drawOrbits);
  }

  function stopOrbits() {
    cancelAnimationFrame(orbitFrame);
  }

  /* ---------- Tilt (mouse and phone) ---------- */

  function setTilt(rx, ry) {
    countdownEl.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    countdownEl.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
  }

  let tiltFrame = 0;
  window.addEventListener("pointermove", (e) => {
    if (!motion || e.pointerType === "touch") return;
    cancelAnimationFrame(tiltFrame);
    tiltFrame = requestAnimationFrame(() => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      setTilt(-y * 14, x * 20);
    });
  });

  root.addEventListener("pointerleave", () => setTilt(0, 0));

  window.addEventListener("deviceorientation", (e) => {
    if (!motion || e.beta === null || e.gamma === null) return;
    setTilt(clamp((45 - e.beta) * 0.25, -10, 10), clamp(e.gamma * 0.35, -14, 14));
  });

  /* ---------- Motion toggle ---------- */

  function applyMotion() {
    root.classList.toggle("motion-off", !motion);
    motionToggle.setAttribute("aria-pressed", String(motion));

    if (motion) {
      buildStarfield();
      buildOrbits();
      startOrbits();
      if (celebrated && !finaleEl.hidden) launchConfetti();
      return;
    }

    stopOrbits();
    setTilt(0, 0);
    allCards.forEach((card) => {
      clearTimeout(card.timer);
      if (card.value !== null) card.bottom.textContent = card.value;
      card.el.classList.remove("flipping");
    });
  }

  motionToggle.addEventListener("click", () => {
    motion = !motion;
    try {
      localStorage.setItem(MOTION_KEY, motion ? "on" : "off");
    } catch {}
    applyMotion();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !celebrated) tick();
  });

  applyMotion();
  tick();
})();
