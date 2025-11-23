let hideTimer: number | null = null;

function getPanel(): HTMLDivElement | null {
  return document.getElementById("story-panel") as HTMLDivElement | null;
}

export function showStoryPanel(title: string, text: string, durationMs: number = 4000): void {
  const panel = getPanel();
  if (!panel) return;

  const titleEl = panel.querySelector(".story-title") as HTMLDivElement | null;
  const textEl = panel.querySelector(".story-text") as HTMLDivElement | null;
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;

  panel.style.opacity = "1";
  panel.style.transform = "translateY(0px)";
  panel.style.pointerEvents = "auto";

  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
  }
  hideTimer = window.setTimeout(() => {
    hideStoryPanel();
  }, durationMs);
}

export function hideStoryPanel(): void {
  const panel = getPanel();
  if (!panel) return;
  panel.style.opacity = "0";
  panel.style.transform = "translateY(12px)";
  panel.style.pointerEvents = "none";
}


