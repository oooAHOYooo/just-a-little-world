let root: HTMLDivElement | null = null;
let reticle: HTMLDivElement | null = null;
let locationBar: HTMLDivElement | null = null;
let trickContainer: HTMLDivElement | null = null;
let controlsCard: HTMLDivElement | null = null;
let controlsVisible = false;

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
  reticle.style.left = "50%";
  reticle.style.bottom = "48px";
  reticle.style.transform = "translateX(-50%)";
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
  controlsCard.style.display = "none";
  controlsCard.innerHTML =
    "W/S: Accelerate/Brake<br/>A/D: Turn<br/>Space: Jump<br/>Shift: Push<br/>Q/E: Tricks";
  root.appendChild(controlsCard);

  window.addEventListener("keydown", (e) => {
    if (e.code === "Tab") {
      e.preventDefault();
      controlsVisible = !controlsVisible;
      controlsCard!.style.display = controlsVisible ? "block" : "none";
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


