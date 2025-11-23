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

/**
 * Momentum-based "skater" controller with simple ground stick, gravity and jump.
 * - Horizontal motion integrates acceleration and friction into velocity
 * - Orientation follows horizontal velocity on XZ
 * - Ground snap via downward ray against meshes tagged with metadata.isGround
 */
export class SkaterController {
  // -------- Tunable parameters (feel free to tweak) --------
  public FLAT_ACCELERATION = 14.0; // units/sec^2 when pushing on flat ground
  public FRICTION = 6.0;           // units/sec deceleration when no input
  public MAX_SPEED = 9.0;          // max horizontal speed on flat ground
  public JUMP_FORCE = 7.5;         // initial vertical velocity on jump
  public GRAVITY = 18.0;           // downward acceleration (units/sec^2)

  // -------- Internals --------
  public readonly scene: Scene;
  public readonly mesh: Mesh;

  private input: InputState = { forward: false, backward: false, left: false, right: false, jump: false };
  private velocity: Vector3 = new Vector3(0, 0, 0); // world-space velocity
  private isGrounded = false;

  private readonly PLAYER_HEIGHT = 1.6;
  private readonly FOOT_STICK_EPS = 0.06; // tolerance for sticking to ground

  constructor(scene: Scene, mesh?: Mesh) {
    this.scene = scene;
    this.mesh = mesh ?? this.createDefaultCapsule(scene);
    this.mesh.rotationQuaternion = null; // use Euler yaw (rotation.y)

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW": this.input.forward = true; break;
        case "KeyS": this.input.backward = true; break;
        case "KeyA": this.input.left = true; break;
        case "KeyD": this.input.right = true; break;
        case "Space": this.input.jump = true; break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW": this.input.forward = false; break;
        case "KeyS": this.input.backward = false; break;
        case "KeyA": this.input.left = false; break;
        case "KeyD": this.input.right = false; break;
        case "Space": this.input.jump = false; break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  }

  update(dt: number): void {
    // 1) Horizontal acceleration from input in skater's local frame (XZ)
    const yaw = this.mesh.rotation.y || 0;
    const forward = new Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new Vector3(Math.cos(yaw), 0, Math.sin(yaw));

    let inputX = 0;
    let inputZ = 0;
    if (this.input.forward) inputZ += 1;
    if (this.input.backward) inputZ -= 1;
    if (this.input.right) inputX += 1;
    if (this.input.left) inputX -= 1;

    // Build desired acceleration vector in world XZ
    const hasInput = (inputX !== 0 || inputZ !== 0);
    let accelX = 0;
    let accelZ = 0;
    if (hasInput) {
      // Combine forward/back and strafe relative to facing
      const ax = right.x * inputX + forward.x * inputZ;
      const az = right.z * inputX + forward.z * inputZ;
      const len = Math.hypot(ax, az);
      if (len > 0.0001) {
        const nx = ax / len;
        const nz = az / len;
        accelX = nx * this.FLAT_ACCELERATION;
        accelZ = nz * this.FLAT_ACCELERATION;
      }
    }

    // Integrate horizontal acceleration into velocity
    this.velocity.x += accelX * dt;
    this.velocity.z += accelZ * dt;

    // 2) Friction when no input (only horizontal component)
    if (!hasInput) {
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      if (speed > 0) {
        const decel = this.FRICTION * dt;
        const newSpeed = Math.max(0, speed - decel);
        const scale = newSpeed / speed;
        this.velocity.x *= scale;
        this.velocity.z *= scale;
      }
    }

    // Clamp horizontal speed
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (hSpeed > this.MAX_SPEED) {
      const scale = this.MAX_SPEED / hSpeed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    // 3) Jump / gravity
    if (this.input.jump && this.isGrounded) {
      this.velocity.y = this.JUMP_FORCE;
      this.isGrounded = false;
      this.mesh.position.y += 0.01; // small lift to break ground contact
    }
    if (!this.isGrounded) {
      this.velocity.y -= this.GRAVITY * dt;
    }

    // 4) Integrate position
    this.mesh.position.x += this.velocity.x * dt;
    this.mesh.position.z += this.velocity.z * dt;
    this.mesh.position.y += this.velocity.y * dt;

    // 5) Ground snap and grounded state
    this.groundCheckAndResolve(dt);

    // 6) Face movement direction on XZ if moving
    const newHSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (newHSpeed > 0.05) {
      this.mesh.rotation.y = Math.atan2(this.velocity.x, -this.velocity.z); // -Z forward convention
    }
  }

  private createDefaultCapsule(scene: Scene): Mesh {
    const m = MeshBuilder.CreateCapsule("skater", { height: this.PLAYER_HEIGHT, radius: 0.35, tessellation: 12 }, scene);
    m.position = new Vector3(0, 1.0, 0);
    m.receiveShadows = true;
    const mat = new StandardMaterial("skaterMat", scene);
    mat.diffuseColor = new Color3(0.2, 0.6, 0.95);
    mat.specularColor = new Color3(0.15, 0.15, 0.15);
    m.material = mat;
    return m;
  }

  private groundCheckAndResolve(_dt: number): void {
    const rayOrigin = this.mesh.position.add(new Vector3(0, this.PLAYER_HEIGHT * 0.5, 0));
    const rayLen = this.PLAYER_HEIGHT + 0.75;
    const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), rayLen);
    const hit = this.scene.pickWithRay(ray, (m) => !!(m.metadata && m.metadata.isGround));

    this.isGrounded = false;
    if (hit?.hit && hit.pickedPoint) {
      const expectedFootY = hit.pickedPoint.y + (this.PLAYER_HEIGHT * 0.5);
      const delta = expectedFootY - this.mesh.position.y;
      // If close to ground and moving downwards (or slightly above), snap and zero vertical velocity
      if (delta >= -this.FOOT_STICK_EPS) {
        if (this.velocity.y <= 0) {
          this.mesh.position.y = expectedFootY;
          this.velocity.y = 0;
          this.isGrounded = true;
        }
      }
    }
  }
}

export type SkaterLike = {
  mesh: Mesh;
  update: (dt: number) => void;
};


