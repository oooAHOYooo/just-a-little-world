import { createEngine, createGameScene, createMarioCamera } from "./gameScene";
import { SkaterController } from "./skater";
import { getStoryOrbs } from "./level";
import { showStoryPanel } from "./storyPanel";

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
  const scene = createGameScene(engine);

  // Create the skater and camera
  const skater = new SkaterController(scene);
  const cameraController = createMarioCamera(scene, skater);

  const storyOrbs = getStoryOrbs();
  const collectRadius = 2.0;
  const collectRadiusSq = collectRadius * collectRadius;

  // Render loop
  let lastTime = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const deltaSeconds = (now - lastTime) / 1000;
    lastTime = now;

    skater.update(deltaSeconds);

    // Story pickup checks
    for (const orb of storyOrbs) {
      if (orb.collected) continue;
      const dx = skater.mesh.position.x - orb.mesh.position.x;
      const dy = skater.mesh.position.y - orb.mesh.position.y;
      const dz = skater.mesh.position.z - orb.mesh.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq <= collectRadiusSq) {
        orb.collected = true;
        orb.mesh.setEnabled(false);
        showStoryPanel(orb.data.title, orb.data.text, 4500);
      }
    }

    cameraController.updateCamera(deltaSeconds);
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


