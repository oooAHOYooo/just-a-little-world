import { createEngine, createGameScene } from "./gameScene";

function getCanvas(): HTMLCanvasElement {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error("Missing canvas with id 'game-canvas'");
  }
  return canvas;
}

async function bootstrap(): Promise<void> {
  const canvas = getCanvas();
  const engine = createEngine(canvas);
  const { scene, update, isPaused, isStarted } = createGameScene(engine);

  // Render loop
  let lastTime = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const deltaSeconds = (now - lastTime) / 1000;
    lastTime = now;

    // Only update game logic if started and not paused
    if (isStarted() && !isPaused()) {
      update(deltaSeconds);
    }
    // Always render the scene (so we can see the game world even when paused)
    scene.render();
  });

  // Resize handling
  window.addEventListener("resize", () => {
    engine.resize();
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});


