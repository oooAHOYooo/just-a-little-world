import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
// Side-effect import required in Babylon v7 to register the ShadowGenerator scene component
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { buildPark } from "./park";
import { SkaterController } from "./skater";
import { createSkateCamera } from "./camera";
import { initUI, showTrickPopup, setLocationLabel, setScore, setHighScore, setTimer } from "./ui";
import { StorySpot, STORY_SPOTS } from "./stories";

export function createEngine(canvas: HTMLCanvasElement): Engine {
  // Antialiasing helps the bright, cartoony look
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: false, antialias: true });
  return engine;
}

export function createGameScene(engine: Engine): {
  scene: Scene;
  skater: SkaterController;
  update: (dt: number) => void;
} {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.8, 0.93, 1.0, 1.0);
  scene.ambientColor = new Color3(0.25, 0.25, 0.25);

  // Lights: soft ambient + one sunny directional
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55;
  hemi.groundColor = new Color3(0.9, 0.8, 0.85);

  const sun = new DirectionalLight("sun", new Vector3(-0.3, -1, -0.2).normalize(), scene);
  sun.intensity = 1.0;
  sun.diffuse = new Color3(1.0, 0.86, 0.6);
  sun.specular = new Color3(1.0, 0.8, 0.5);

  // Optional shadows for extra depth; only applied to meshes we add to render list
  const shadowGenerator = new ShadowGenerator(2048, sun);
  shadowGenerator.usePoissonSampling = true;

  const { root, shadowCasters } = buildPark(scene);
  shadowCasters.forEach((m: Mesh) => shadowGenerator.addShadowCaster(m));
  root.receiveShadows = true;

  // Camera
  const camera = new FreeCamera("skateCam", new Vector3(0, 3, -8), scene);
  camera.inputs.clear();
  scene.activeCamera = camera;

  // UI
  initUI();
  setLocationLabel("Gullcrest Block");
  let score = 0;
  let best = Number(localStorage.getItem("skate-best") || "0") || 0;
  setScore(score);
  setHighScore(best);
  let timeLeft = 120; // 2 minutes
  setTimer(timeLeft);

  // Skater
  const skater = new SkaterController(scene, {
    onTrickLanded: (name: string, points: number) => {
      if (points > 0) {
        score += points;
        setScore(score);
        if (score > best) {
          best = score;
          localStorage.setItem("skate-best", String(best));
          setHighScore(best);
        }
        showTrickPopup(`${name} +${points}`);
      }
    }
  } as any);
  const camController = createSkateCamera(scene, skater, camera);

  // Story spots proximity check
  const spots: StorySpot[] = STORY_SPOTS;
  const collectRadius = 2.0;
  const collectRadiusSq = collectRadius * collectRadius;
  const collected = new Set<string>();

  function update(dt: number): void {
    skater.update(dt);
    camController.update(dt);
    // Timer
    timeLeft -= dt;
    setTimer(timeLeft);

    // Story pickups
    const pos = skater.getPosition();
    for (const s of spots) {
      if (collected.has(s.id)) continue;
      const dx = pos.x - s.position.x;
      const dy = pos.y - s.position.y;
      const dz = pos.z - s.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq <= collectRadiusSq) {
        collected.add(s.id);
        // Minimal story popup via UI overlay
        showTrickPopup(`${s.title}`);
      }
    }
  }

  return { scene, skater, update };
}


