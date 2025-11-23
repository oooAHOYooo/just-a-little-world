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
  const heightOffset = 2.4;
  const backOffset = -7.0;
  const sideOffset = 1.0;
  const followStiffness = 8.0;
  const aimStiffness = 8.0;
  const obstructionPadding = 0.3;
  const baseFov = 0.8;
  const fovSpeedGain = 0.02; // per unit speed
  const fovMax = 1.1;

  const desiredPos = new Vector3();
  const currentPos = cam.position;
  const currentTarget = new Vector3();

  function computeDesired(): void {
    const pos = skater.getPosition();
    const vel = skater.getVelocity();
    // Forward from velocity, fallback to +Z back
    let fx = vel.x, fz = vel.z;
    const len = Math.hypot(fx, fz);
    if (len < 0.001) {
      fx = 0; fz = -1;
    } else {
      fx /= len; fz /= len;
    }
    // Right vector on XZ
    const rx = fz;
    const rz = -fx;

    desiredPos.set(
      pos.x + fx * backOffset + rx * sideOffset,
      pos.y + heightOffset,
      pos.z + fz * backOffset + rz * sideOffset
    );

    currentTarget.set(pos.x + fx * 2.0, pos.y + 1.0, pos.z + fz * 2.0);
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
  function update(dt: number): void {
    computeDesired();
    resolveObstruction();

    const t = firstUpdate ? 1 : expSmoothingFactor(followStiffness, dt);
    currentPos.x += (desiredPos.x - currentPos.x) * t;
    currentPos.y += (desiredPos.y - currentPos.y) * t;
    currentPos.z += (desiredPos.z - currentPos.z) * t;
    firstUpdate = false;

    // Aim
    const aim = scene.activeCamera!.getTarget();
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


