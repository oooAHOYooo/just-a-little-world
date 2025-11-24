import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

export type SkateCameraController = {
  camera: FreeCamera;
  update: (dt: number) => void;
};

function expSmoothingFactor(stiffness: number, dt: number): number {
  return 1 - Math.exp(-stiffness * dt);
}

export function createSkateCamera(
  scene: Scene,
  skater: { getPosition: () => Vector3; getVelocity: () => Vector3 },
  camera?: FreeCamera
): SkateCameraController {
  const cam = camera ?? new FreeCamera("skateCam", new Vector3(0, 3, -8), scene);
  cam.inputs.clear();
  scene.activeCamera = cam;

  // Tunables
  const heightOffset = 2.0;
  const backOffset = -6.5;
  const sideOffset = 1.2;
  const followStiffness = 8.0;
  const aimStiffness = 8.0;
  const obstructionPadding = 0.3;
  const baseFov = 0.78;
  const fovSpeedGain = 0.02; // per unit speed
  const fovMax = 1.05;

  const desiredPos = new Vector3();
  const currentPos = cam.position;
  const currentTarget = new Vector3();

  // Right-mouse "right stick" look
  let dragging = false;
  let userYaw = 0;    // radians
  let userPitch = 0;  // radians
  const yawSensitivity = 0.0035;
  const pitchSensitivity = 0.0030;
  const pitchClamp = 0.5;
  // Track a smoothed heading from skater motion for smart rotation
  let headingYaw = 0; // radians
  const headingSnapSpeed = 6.0; // how fast the camera aligns to heading
  const canvas = scene.getEngine().getRenderingCanvas() || undefined;
  if (canvas) {
    canvas.oncontextmenu = (e) => { e.preventDefault(); };
    window.addEventListener("mousedown", (e) => {
      if (e.button === 2) {
        dragging = true;
        canvas.requestPointerLock?.();
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 2) {
        dragging = false;
        if (document.pointerLockElement === canvas) {
          document.exitPointerLock?.();
        }
      }
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging && document.pointerLockElement !== canvas) return;
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      userYaw += dx * yawSensitivity;
      userPitch = Math.max(-pitchClamp, Math.min(pitchClamp, userPitch - dy * pitchSensitivity));
    });
  }

  function computeDesired(): void {
    const pos = skater.getPosition();
    const vel = skater.getVelocity();
    // Derive a heading yaw from velocity if moving; otherwise keep last
    const speed = Math.hypot(vel.x, vel.z);
    if (speed > 0.25) {
      const targetYaw = Math.atan2(vel.x, -vel.z); // -Z forward convention
      const delta = ((targetYaw - headingYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      headingYaw += delta * 0.2; // ease toward target
    }
    // Final yaw = smoothed heading + right-stick offset
    const yaw = headingYaw + userYaw;
    const fx = Math.sin(yaw);
    const fz = -Math.cos(yaw);
    // Right vector on XZ
    const rx = fz;
    const rz = -fx;

    desiredPos.set(
      pos.x + fx * backOffset + rx * sideOffset,
      pos.y + heightOffset + userPitch * 2.0,
      pos.z + fz * backOffset + rz * sideOffset
    );

    currentTarget.set(pos.x + fx * 2.5, pos.y + 1.0 + userPitch * 2.0, pos.z + fz * 2.5);
  }

  // Simple camera collision: bring camera closer if obstructed
  function resolveObstruction(): void {
    const pos = skater.getPosition();
    const dir = desiredPos.subtract(pos);
    const dist = dir.length();
    if (dist <= 0.0001) return;
    dir.scaleInPlace(1 / dist);
    const ray = new Ray(pos, dir, dist);
    const hit = scene.pickWithRay(ray, (m) => {
      const mesh = m as Mesh;
      // Ignore the skater if it were a mesh; there is no skater mesh in our simple controller
      return mesh.isPickable !== false;
    });
    if (hit?.hit && hit.pickedPoint) {
      const newDist = Vector3.Distance(pos, hit.pickedPoint) - obstructionPadding;
      if (newDist > 0.1) {
        desiredPos.copyFrom(pos.add(dir.scale(newDist)));
      }
    }
  }

  let firstUpdate = true;
  const aimVec = new Vector3();
  function update(dt: number): void {
    computeDesired();
    resolveObstruction();

    const t = firstUpdate ? 1 : expSmoothingFactor(followStiffness, dt);
    currentPos.x += (desiredPos.x - currentPos.x) * t;
    currentPos.y += (desiredPos.y - currentPos.y) * t;
    currentPos.z += (desiredPos.z - currentPos.z) * t;
    firstUpdate = false;

    // Aim
    const aim = aimVec;
    const ta = expSmoothingFactor(aimStiffness, dt);
    aim.x += (currentTarget.x - aim.x) * ta;
    aim.y += (currentTarget.y - aim.y) * ta;
    aim.z += (currentTarget.z - aim.z) * ta;
    cam.setTarget(aim);

    // Speed-based FOV
    const v = skater.getVelocity();
    const speed = Math.hypot(v.x, v.z);
    cam.fov = Math.min(fovMax, baseFov + speed * fovSpeedGain);
  }

  return { camera: cam, update };
}


