import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";

type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
};

export type PlayerController = {
  mesh: Mesh;
  update: (dt: number) => void;
};

export function createPlayer(scene: Scene): PlayerController {
  // Simple capsule-ish shape using a cylinder + sphere-ish ends via scaling
  // For simplicity here, just use a box with rounded-ish feel via scaling
  const player = MeshBuilder.CreateCapsule("player", { height: 1.6, radius: 0.35, tessellation: 12 }, scene);
  player.position = new Vector3(0, 1.0, 0);
  player.rotationQuaternion = null; // we control rotation via Euler yaw (rotation.y)
  player.receiveShadows = true;
  const mat = new StandardMaterial("playerMat", scene);
  mat.diffuseColor = new Color3(0.95, 0.3, 0.3);
  mat.specularColor = new Color3(0.2, 0.2, 0.2);
  player.material = mat;

  const input: InputState = { forward: false, backward: false, left: false, right: false, jump: false };
  const keyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyW": input.forward = true; break;
      case "KeyS": input.backward = true; break;
      case "KeyA": input.left = true; break;
      case "KeyD": input.right = true; break;
      case "Space": input.jump = true; break;
    }
  };
  const keyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyW": input.forward = false; break;
      case "KeyS": input.backward = false; break;
      case "KeyA": input.left = false; break;
      case "KeyD": input.right = false; break;
      case "Space": input.jump = false; break;
    }
  };
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  // Movement parameters
  const moveSpeed = 6;            // units/sec on XZ plane
  const jumpSpeed = 7;            // initial upward velocity
  const gravity = 18;             // gravity accel
  const playerHeight = 1.6;       // capsule height
  const footOffset = 0.05;        // tolerance for ground sticking

  let verticalVelocity = 0;
  let isGrounded = false;

  function computeMoveDirection(): Vector3 {
    const dir = new Vector3(0, 0, 0);
    if (input.forward) dir.z -= 1;
    if (input.backward) dir.z += 1;
    if (input.left) dir.x -= 1;
    if (input.right) dir.x += 1;
    if (dir.lengthSquared() > 0) {
      dir.normalize();
    }
    return dir;
  }

  function groundCheckAndResolve(dt: number): void {
    // Cast a ray straight down to find the ground
    const rayOrigin = player.position.add(new Vector3(0, playerHeight * 0.5, 0));
    const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), playerHeight + 0.5);
    const hit = scene.pickWithRay(ray, (m) => !!(m.metadata && m.metadata.isGround));

    isGrounded = false;
    if (hit?.hit && hit.pickedPoint) {
      const expectedFootY = hit.pickedPoint.y + (playerHeight * 0.5);
      const delta = expectedFootY - player.position.y;
      // If close to the ground and moving downwards, snap to ground
      if (delta >= -footOffset) {
        isGrounded = true;
        if (verticalVelocity <= 0) {
          player.position.y = expectedFootY;
          verticalVelocity = 0;
        }
      }
    }

    // Apply gravity if not grounded
    if (!isGrounded) {
      verticalVelocity -= gravity * dt;
      player.position.y += verticalVelocity * dt;
    }
  }

  function update(dt: number): void {
    // Horizontal move in world XZ
    const dir = computeMoveDirection();
    if (dir.lengthSquared() > 0) {
      // Rotate the player to face move direction (yaw)
      const yaw = Math.atan2(dir.x, -dir.z); // -Z forward convention
      player.rotation.y = yaw;

      player.position.x += dir.x * moveSpeed * dt;
      player.position.z += dir.z * moveSpeed * dt;
    }

    // Jump
    if (input.jump && isGrounded) {
      verticalVelocity = jumpSpeed;
      isGrounded = false;
      // give a small lift so ground snap doesn't immediately cancel the jump
      player.position.y += 0.01;
    }

    groundCheckAndResolve(dt);
  }

  return {
    mesh: player,
    update
  };
}


