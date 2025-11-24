const W = 24;
const H = 16;
type Tile = "empty" | "road" | "sidewalk" | "rail" | "ledge";

const gridEl = document.getElementById("grid") as HTMLDivElement;
const outEl = document.getElementById("out") as HTMLDivElement;
const palette = document.getElementById("palette") as HTMLDivElement;
const btnExport = document.getElementById("btnExport") as HTMLButtonElement;
const btnClear = document.getElementById("btnClear") as HTMLButtonElement;

let current: Tile = "empty";
let grid: Tile[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => "empty"));

function renderGrid(): void {
  gridEl.innerHTML = "";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = document.createElement("div");
      cell.className = "cell t-" + grid[y][x];
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.addEventListener("mousedown", onPaint);
      gridEl.appendChild(cell);
    }
  }
}

function onPaint(e: MouseEvent): void {
  const el = e.currentTarget as HTMLDivElement;
  const x = Number(el.dataset.x);
  const y = Number(el.dataset.y);
  grid[y][x] = current;
  el.className = "cell t-" + current;
}

palette.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest("button");
  if (!b) return;
  palette.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
  b.classList.add("active");
  current = (b.getAttribute("data-t") as Tile) || "empty";
});

btnClear.addEventListener("click", () => {
  grid = Array.from({ length: H }, () => Array.from({ length: W }, () => "empty"));
  renderGrid();
  outEl.textContent = "";
});

btnExport.addEventListener("click", () => {
  const payload = { w: W, h: H, grid };
  const json = JSON.stringify(payload);
  localStorage.setItem("skate-level-grid", json);
  outEl.textContent = json;
});

// Load existing if present
try {
  const raw = localStorage.getItem("skate-level-grid");
  if (raw) {
    const obj = JSON.parse(raw) as { w: number; h: number; grid: Tile[][] };
    if (Array.isArray(obj.grid) && obj.w === W && obj.h === H) {
      grid = obj.grid;
    }
  }
} catch {}

renderGrid();


