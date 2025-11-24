let root: HTMLDivElement | null = null;
let reticle: HTMLDivElement | null = null;
let locationBar: HTMLDivElement | null = null;
let trickContainer: HTMLDivElement | null = null;
let controlsCard: HTMLDivElement | null = null;
let controlsVisible = false;
let scoreEl: HTMLDivElement | null = null;
let timerEl: HTMLDivElement | null = null;
let hiscoreEl: HTMLDivElement | null = null;
let startMenu: HTMLDivElement | null = null;
let pauseMenu: HTMLDivElement | null = null;
let adminButton: HTMLButtonElement | null = null;
let pauseButton: HTMLButtonElement | null = null;
let onStartCallback: (() => void) | null = null;
let onResumeCallback: (() => void) | null = null;
let onPauseCallback: (() => void) | null = null;

export function initUI(): void {
  if (root) return;
  root = document.createElement("div");
  root.id = "hud-root";
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.pointerEvents = "none";
  document.body.appendChild(root);

  // Reticle
  reticle = document.createElement("div");
  reticle.style.position = "absolute";
  reticle.style.left = "20px";
  reticle.style.bottom = "20px";
  reticle.style.transform = "none";
  reticle.style.width = "56px";
  reticle.style.height = "56px";
  reticle.style.border = "2px solid rgba(0,0,0,0.65)";
  reticle.style.borderRadius = "999px";
  reticle.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  reticle.style.background = "rgba(255,255,255,0.5)";
  root.appendChild(reticle);

  // Inner dot
  const inner = document.createElement("div");
  inner.style.position = "absolute";
  inner.style.left = "50%";
  inner.style.top = "50%";
  inner.style.transform = "translate(-50%, -50%)";
  inner.style.width = "8px";
  inner.style.height = "8px";
  inner.style.borderRadius = "999px";
  inner.style.background = "rgba(0,0,0,0.75)";
  reticle.appendChild(inner);

  // Location bar (top center)
  locationBar = document.createElement("div");
  locationBar.style.position = "absolute";
  locationBar.style.left = "50%";
  locationBar.style.top = "18px";
  locationBar.style.transform = "translateX(-50%)";
  locationBar.style.padding = "6px 12px";
  locationBar.style.borderRadius = "999px";
  locationBar.style.background = "rgba(255,255,255,0.85)";
  locationBar.style.color = "#111";
  locationBar.style.fontWeight = "600";
  locationBar.style.fontSize = "14px";
  locationBar.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  locationBar.textContent = "";
  root.appendChild(locationBar);

  // Trick popup container
  trickContainer = document.createElement("div");
  trickContainer.style.position = "absolute";
  trickContainer.style.left = "50%";
  trickContainer.style.top = "64px";
  trickContainer.style.transform = "translateX(-50%)";
  trickContainer.style.display = "flex";
  trickContainer.style.flexDirection = "column";
  trickContainer.style.gap = "6px";
  root.appendChild(trickContainer);

  // Score (top-right)
  const scoreWrap = document.createElement("div");
  scoreWrap.style.position = "absolute";
  scoreWrap.style.right = "16px";
  scoreWrap.style.top = "14px";
  scoreWrap.style.display = "flex";
  scoreWrap.style.flexDirection = "column";
  scoreWrap.style.alignItems = "flex-end";
  scoreWrap.style.gap = "6px";
  root.appendChild(scoreWrap);

  scoreEl = document.createElement("div");
  scoreEl.style.padding = "6px 10px";
  scoreEl.style.borderRadius = "8px";
  scoreEl.style.background = "rgba(255,255,255,0.9)";
  scoreEl.style.color = "#111";
  scoreEl.style.fontWeight = "700";
  scoreEl.style.fontSize = "14px";
  scoreEl.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
  scoreEl.textContent = "Score: 0";
  scoreWrap.appendChild(scoreEl);

  hiscoreEl = document.createElement("div");
  hiscoreEl.style.padding = "4px 8px";
  hiscoreEl.style.borderRadius = "6px";
  hiscoreEl.style.background = "rgba(255,255,255,0.78)";
  hiscoreEl.style.color = "#333";
  hiscoreEl.style.fontSize = "12px";
  hiscoreEl.textContent = "Best: 0";
  scoreWrap.appendChild(hiscoreEl);

  // Timer (top-left)
  timerEl = document.createElement("div");
  timerEl.style.position = "absolute";
  timerEl.style.left = "16px";
  timerEl.style.top = "14px";
  timerEl.style.padding = "6px 10px";
  timerEl.style.borderRadius = "8px";
  timerEl.style.background = "rgba(255,255,255,0.9)";
  timerEl.style.color = "#111";
  timerEl.style.fontWeight = "700";
  timerEl.style.fontSize = "14px";
  timerEl.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
  timerEl.textContent = "02:00";
  root.appendChild(timerEl);

  // Controls overlay (toggle with Tab)
  controlsCard = document.createElement("div");
  controlsCard.style.position = "absolute";
  controlsCard.style.right = "14px";
  controlsCard.style.bottom = "14px";
  controlsCard.style.padding = "10px 12px";
  controlsCard.style.borderRadius = "8px";
  controlsCard.style.background = "rgba(255,255,255,0.9)";
  controlsCard.style.color = "#111";
  controlsCard.style.fontSize = "12px";
  controlsCard.style.lineHeight = "1.35";
  controlsCard.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
  controlsCard.style.pointerEvents = "auto";
  controlsCard.style.display = "block";
  controlsVisible = true;
  controlsCard.innerHTML =
    "Movement: Arrows or I/J/K/L<br/>Accelerate: Up / I<br/>Brake: Down / K<br/>Turn: Left/Right or J/L<br/>Push: Shift<br/>Jump/Pop: Space<br/><br/>Tricks (WASD):<br/>W/E: Spin<br/>A/Q: Grab<br/>D/F: Kickflip<br/>S: Shove-it<br/>Grind: Land on a rail";
  root.appendChild(controlsCard);

  // Admin button (top-right, below score)
  adminButton = document.createElement("button");
  adminButton.textContent = "Admin";
  adminButton.style.position = "absolute";
  adminButton.style.right = "16px";
  adminButton.style.top = "80px";
  adminButton.style.padding = "6px 12px";
  adminButton.style.borderRadius = "6px";
  adminButton.style.border = "none";
  adminButton.style.background = "rgba(100, 150, 255, 0.9)";
  adminButton.style.color = "#fff";
  adminButton.style.fontWeight = "600";
  adminButton.style.fontSize = "12px";
  adminButton.style.cursor = "pointer";
  adminButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  adminButton.style.pointerEvents = "auto";
  adminButton.onclick = () => {
    window.location.href = "/admin.html";
  };
  root.appendChild(adminButton);

  // Pause button (top-right, below admin)
  pauseButton = document.createElement("button");
  pauseButton.textContent = "Pause";
  pauseButton.style.position = "absolute";
  pauseButton.style.right = "16px";
  pauseButton.style.top = "110px";
  pauseButton.style.padding = "6px 12px";
  pauseButton.style.borderRadius = "6px";
  pauseButton.style.border = "none";
  pauseButton.style.background = "rgba(255, 150, 100, 0.9)";
  pauseButton.style.color = "#fff";
  pauseButton.style.fontWeight = "600";
  pauseButton.style.fontSize = "12px";
  pauseButton.style.cursor = "pointer";
  pauseButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  pauseButton.style.pointerEvents = "auto";
  pauseButton.onclick = () => {
    showPauseMenu();
    if (onPauseCallback) onPauseCallback();
  };
  root.appendChild(pauseButton);

  // Start menu
  startMenu = document.createElement("div");
  startMenu.style.position = "fixed";
  startMenu.style.left = "0";
  startMenu.style.top = "0";
  startMenu.style.width = "100%";
  startMenu.style.height = "100%";
  startMenu.style.background = "rgba(0, 0, 0, 0.85)";
  startMenu.style.display = "flex";
  startMenu.style.flexDirection = "column";
  startMenu.style.alignItems = "center";
  startMenu.style.justifyContent = "center";
  startMenu.style.gap = "20px";
  startMenu.style.zIndex = "1000";
  startMenu.style.pointerEvents = "auto";
  startMenu.innerHTML = `
    <h1 style="color: #fff; font-size: 48px; margin: 0; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">Just a Little World</h1>
    <p style="color: #ccc; font-size: 18px; margin: 0;">A skateboarding adventure</p>
    <button id="start-btn" style="
      padding: 14px 32px;
      font-size: 18px;
      font-weight: 700;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    ">Start Game</button>
    <p style="color: #888; font-size: 14px; margin-top: 20px;">Press ESC to pause during gameplay</p>
  `;
  document.body.appendChild(startMenu);

  const startBtn = startMenu.querySelector("#start-btn") as HTMLButtonElement;
  startBtn.onmouseenter = () => {
    startBtn.style.transform = "scale(1.05)";
    startBtn.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";
  };
  startBtn.onmouseleave = () => {
    startBtn.style.transform = "scale(1)";
    startBtn.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
  };
  startBtn.onclick = () => {
    hideStartMenu();
    if (onStartCallback) onStartCallback();
  };

  // Pause menu
  pauseMenu = document.createElement("div");
  pauseMenu.style.position = "fixed";
  pauseMenu.style.left = "0";
  pauseMenu.style.top = "0";
  pauseMenu.style.width = "100%";
  pauseMenu.style.height = "100%";
  pauseMenu.style.background = "rgba(0, 0, 0, 0.85)";
  pauseMenu.style.display = "none";
  pauseMenu.style.flexDirection = "column";
  pauseMenu.style.alignItems = "center";
  pauseMenu.style.justifyContent = "center";
  pauseMenu.style.gap = "20px";
  pauseMenu.style.zIndex = "1000";
  pauseMenu.style.pointerEvents = "auto";
  pauseMenu.innerHTML = `
    <h1 style="color: #fff; font-size: 42px; margin: 0; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">Paused</h1>
    <button id="resume-btn" style="
      padding: 14px 32px;
      font-size: 18px;
      font-weight: 700;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    ">Resume</button>
    <p style="color: #888; font-size: 14px;">Press ESC to resume</p>
  `;
  document.body.appendChild(pauseMenu);

  const resumeBtn = pauseMenu.querySelector("#resume-btn") as HTMLButtonElement;
  resumeBtn.onmouseenter = () => {
    resumeBtn.style.transform = "scale(1.05)";
    resumeBtn.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";
  };
  resumeBtn.onmouseleave = () => {
    resumeBtn.style.transform = "scale(1)";
    resumeBtn.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
  };
  resumeBtn.onclick = () => {
    hidePauseMenu();
    if (onResumeCallback) onResumeCallback();
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Tab") {
      e.preventDefault();
      controlsVisible = !controlsVisible;
      controlsCard!.style.display = controlsVisible ? "block" : "none";
    }
    if (e.code === "Escape") {
      e.preventDefault();
      if (pauseMenu && pauseMenu.style.display === "flex") {
        hidePauseMenu();
        if (onResumeCallback) onResumeCallback();
      } else if (startMenu && startMenu.style.display === "flex") {
        // Do nothing, already on start menu
      } else {
        showPauseMenu();
        if (onPauseCallback) onPauseCallback();
      }
    }
  });
}

export function setLocationLabel(text: string): void {
  if (!locationBar) return;
  locationBar.textContent = text;
}

export function showTrickPopup(text: string): void {
  if (!trickContainer) return;
  const el = document.createElement("div");
  el.style.padding = "6px 10px";
  el.style.borderRadius = "6px";
  el.style.background = "rgba(20,20,25,0.85)";
  el.style.color = "#fff";
  el.style.fontSize = "13px";
  el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)";
  el.style.opacity = "0";
  el.style.transform = "translateY(-6px)";
  el.style.transition = "opacity 200ms ease, transform 200ms ease";
  el.textContent = text;
  trickContainer.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  });
  window.setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-6px)";
    window.setTimeout(() => {
      el.remove();
    }, 220);
  }, 1000);
}

export function setScore(score: number): void {
  if (scoreEl) scoreEl.textContent = `Score: ${score}`;
}

export function setHighScore(best: number): void {
  if (hiscoreEl) hiscoreEl.textContent = `Best: ${best}`;
}

export function setTimer(secondsRemaining: number): void {
  if (!timerEl) return;
  const s = Math.max(0, Math.floor(secondsRemaining));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const ss = sec < 10 ? `0${sec}` : `${sec}`;
  timerEl.textContent = `${m}:${ss}`;
}

export function showStartMenu(): void {
  if (startMenu) {
    startMenu.style.display = "flex";
  }
}

export function hideStartMenu(): void {
  if (startMenu) {
    startMenu.style.display = "none";
  }
}

export function showPauseMenu(): void {
  if (pauseMenu) {
    pauseMenu.style.display = "flex";
  }
}

export function hidePauseMenu(): void {
  if (pauseMenu) {
    pauseMenu.style.display = "none";
  }
}

export function setOnStart(callback: () => void): void {
  onStartCallback = callback;
}

export function setOnResume(callback: () => void): void {
  onResumeCallback = callback;
}

export function setOnPause(callback: () => void): void {
  onPauseCallback = callback;
}


