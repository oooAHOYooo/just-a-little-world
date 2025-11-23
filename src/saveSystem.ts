type SaveState = {
  collectedStories: string[];
};

const KEY = "skate-save-v1";

function read(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { collectedStories: [] };
    const data = JSON.parse(raw) as SaveState;
    if (!Array.isArray(data.collectedStories)) data.collectedStories = [];
    return data;
  } catch {
    return { collectedStories: [] };
  }
}

function write(state: SaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function isStoryCollected(id: string): boolean {
  const s = read();
  return s.collectedStories.includes(id);
}

export function markStoryCollected(id: string): void {
  const s = read();
  if (!s.collectedStories.includes(id)) {
    s.collectedStories.push(id);
    write(s);
  }
}


