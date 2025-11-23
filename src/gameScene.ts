import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color3, Color4, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { buildLevel } from "./level";

export function createEngine(canvas: HTMLCanvasElement): Engine {
  // Antialiasing helps the bright, cartoony look
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: false, antialias: true });
  return engine;
}

export function createGameScene(engine: Engine): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.8, 0.93, 1.0, 1.0);
  scene.ambientColor = new Color3(0.25, 0.25, 0.25);

  // Lights: soft ambient + one sunny directional
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.7;
  hemi.groundColor = new Color3(0.95, 0.95, 1.0);

  const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.35).normalize(), scene);
  sun.intensity = 1.1;

  // Optional shadows for extra depth; only applied to meshes we add to render list
  const shadowGenerator = new ShadowGenerator(1024, sun);
  shadowGenerator.usePoissonSampling = true;

  const { levelRoot, shadowCasters } = buildLevel(scene);
  shadowCasters.forEach((m: Mesh) => shadowGenerator.addShadowCaster(m));

  // A dummy camera is required by Babylon to render the scene.
  // We'll replace its transform each frame via our custom diorama camera controller.
  const camera = new FreeCamera("tmpCamera", new Vector3(0, 5, -10), scene);
  camera.setTarget(Vector3.Zero());
  camera.inputs.clear(); // no user input; guided camera style
  // Ensure this camera is active for rendering
  scene.activeCamera = camera;

  return scene;
}

// -------- Camera helpers --------
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function expSmoothingFactor(stiffness: number, dt: number): number {
  // Returns t in [0..1] for exponential smoothing toward a target
  return 1 - Math.exp(-stiffness * dt);
}

export type MarioCameraController = {
  camera: FreeCamera;
  updateCamera: (dt: number) => void;
};

/**
 * A "Mario 3D World"-style camera:
 * - Fixed diagonal angle relative to world (not tied to mouse or player rotation)
 * - Stays at a fixed distance and height from the player
 * - Smoothly lags behind player movement
 * - Optional small horizontal rotate when holding Q/E, easing back when released
 */
export function createMarioCamera(scene: Scene, player: { mesh: TransformNode } | TransformNode): MarioCameraController {
  const target: TransformNode = (player as any)?.mesh ? (player as any).mesh : (player as TransformNode);

  const camera = scene.activeCamera as FreeCamera;
  if (!camera) {
    throw new Error("Scene is missing an active camera");
  }
  camera.inputs.clear(); // lock out mouse look; guided camera only

  // Tunable parameters for the look/feel
  const distance = 8.0;          // horizontal distance on XZ plane
  const height = 5.0;            // constant vertical offset
  const baseYawDeg = 135;        // world-diagonal angle (isometric-ish)
  const lookAtOffsetY = 1.0;     // look slightly above player origin
  const followStiffness = 8.0;   // how quickly the camera catches up
  const yawStiffness = 6.0;      // ease speed for Q/E yaw offset
  const yawMaxDeg = 20;          // max additional yaw while holding Q/E

  const baseYawRad = (baseYawDeg * Math.PI) / 180;
  const yawMaxRad = (yawMaxDeg * Math.PI) / 180;

  // Input state for temporary yaw nudges
  let rotateLeft = false;
  let rotateRight = false;
  let yawOffsetCurrent = 0; // radians

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyQ") rotateLeft = true;
    if (e.code === "KeyE") rotateRight = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "KeyQ") rotateLeft = false;
    if (e.code === "KeyE") rotateRight = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // Working vectors reused per-frame to avoid allocations
  const desiredPosition = new Vector3();
  const currentPosition = camera.position;

  function computeDesiredPosition(currentYaw: number): Vector3 {
    // Offset on the XZ plane at [distance], then apply constant height
    const offsetX = Math.cos(currentYaw) * distance;
    const offsetZ = Math.sin(currentYaw) * distance;
    desiredPosition.set(
      target.position.x + offsetX,
      target.position.y + height,
      target.position.z + offsetZ
    );
    return desiredPosition;
  }

  let firstUpdate = true;
  function updateCamera(dt: number): void {
    // Determine target yaw offset from input, then ease toward it
    const yawOffsetTarget = clamp((rotateRight ? 1 : 0) - (rotateLeft ? 1 : 0), -1, 1) * yawMaxRad;
    const tYaw = expSmoothingFactor(yawStiffness, dt);
    yawOffsetCurrent += (yawOffsetTarget - yawOffsetCurrent) * tYaw;

    // Compute desired position based on base world yaw plus the eased offset
    const yaw = baseYawRad + yawOffsetCurrent;
    computeDesiredPosition(yaw);

    // Smoothly move camera toward desired position; snap on first frame
    const tPos = firstUpdate ? 1 : expSmoothingFactor(followStiffness, dt);
    currentPosition.x += (desiredPosition.x - currentPosition.x) * tPos;
    currentPosition.y += (desiredPosition.y - currentPosition.y) * tPos;
    currentPosition.z += (desiredPosition.z - currentPosition.z) * tPos;
    firstUpdate = false;

    // Look at a point just above the player to keep horizon visible
    const lookAt = new Vector3(target.position.x, target.position.y + lookAtOffsetY, target.position.z);
    camera.setTarget(lookAt);
  }

  return {
    camera,
    updateCamera
  };
}


