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
  const { scene, update } = createGameScene(engine);

  // Render loop
  let lastTime = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const deltaSeconds = (now - lastTime) / 1000;
    lastTime = now;

    update(deltaSeconds);
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


