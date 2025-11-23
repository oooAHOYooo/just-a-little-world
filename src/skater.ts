import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Ray } from "@babylonjs/core/Culling/ray";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";

type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  push: boolean;   // Shift
  trickSpin: boolean; // E
  trickGrab: boolean; // Q
};

export class SkaterController {
  // Parameters
  public MAX_SPEED_FLAT = 10.0;
  public ACCELERATION = 12.0;
  public TURN_SPEED = 2.4; // radians/sec at low speed
  public FRICTION = 5.5;
  public GRAVITY = 22.0;
  public JUMP_FORCE = 7.8;

  public readonly scene: Scene;
  private skaterMesh: Mesh;
  private boardMesh: Mesh | null = null;
  private velocity: Vector3 = new Vector3(0, 0, 0);
  private grounded = false;
  private groundNormal = new Vector3(0, 1, 0);

  private readonly HEIGHT = 1.7;
  private readonly FOOT_EPS = 0.07;

  private input: InputState = {
    forward: false, backward: false, left: false, right: false, jump: false, push: false, trickSpin: false, trickGrab: false
  };

  private trickSpinTime = 0;
  private trickGrabTime = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    // Fallback capsule + board immediately
    this.skaterMesh = this.createFallbackSkater(scene);
    this.tryLoadGLB();
    this.bindInput();
  }

  private bindInput(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW": this.input.forward = true; break;
        case "KeyS": this.input.backward = true; break;
        case "KeyA": this.input.left = true; break;
        case "KeyD": this.input.right = true; break;
        case "Space": this.input.jump = true; break;
        case "ShiftLeft":
        case "ShiftRight": this.input.push = true; break;
        case "KeyE": this.input.trickSpin = true; break;
        case "KeyQ": this.input.trickGrab = true; break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW": this.input.forward = false; break;
        case "KeyS": this.input.backward = false; break;
        case "KeyA": this.input.left = false; break;
        case "KeyD": this.input.right = false; break;
        case "Space": this.input.jump = false; break;
        case "ShiftLeft":
        case "ShiftRight": this.input.push = false; break;
        case "KeyE": this.input.trickSpin = false; break;
        case "KeyQ": this.input.trickGrab = false; break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  }

  private async tryLoadGLB(): Promise<void> {
    try {
      const result = await SceneLoader.ImportMeshAsync("", "/assets/", "skater.glb", this.scene);
      if (result.meshes.length > 0) {
        const root = result.meshes[0] as Mesh;
        root.position.copyFrom(this.skaterMesh.position);
        root.rotationQuaternion = null;
        root.rotation.y = 0;
        // Hide fallback
        this.skaterMesh.setEnabled(false);
        this.skaterMesh = root;
        // Find board mesh if present
        for (const m of result.meshes) {
          if (m.name.toLowerCase().includes("board") || m.name.toLowerCase().includes("skateboard")) {
            this.boardMesh = m as Mesh;
            break;
          }
        }
        // Animation groups mapping (optional)
        // result.animationGroups.forEach(...)
      }
    } catch {
      // keep fallback
    }
  }

  private createFallbackSkater(scene: Scene): Mesh {
    const body = MeshBuilder.CreateCapsule("skaterBody", { height: this.HEIGHT, radius: 0.35, tessellation: 12 }, scene);
    body.position = new Vector3(0, 1.0, 0);
    body.rotationQuaternion = null;
    body.receiveShadows = true;
    const mat = new StandardMaterial("skaterMat", scene);
    mat.diffuseColor = new Color3(0.2, 0.6, 0.95);
    mat.specularColor = new Color3(0.15, 0.15, 0.15);
    body.material = mat;
    // Simple board
    const board = MeshBuilder.CreateBox("board", { width: 0.28, depth: 1.0, height: 0.06 }, scene);
    const bmat = new StandardMaterial("boardMat", scene);
    bmat.diffuseColor = new Color3(0.1, 0.1, 0.12);
    bmat.specularColor = new Color3(0.2, 0.2, 0.2);
    board.material = bmat;
    board.position = new Vector3(0, -this.HEIGHT * 0.5 + 0.12, 0.0);
    board.setParent(body);
    this.boardMesh = board;
    return body;
  }

  update(dt: number): void {
    // Turn rate affected by speed (faster speed => smaller yaw change)
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const turnScale = Math.max(0.3, 1.0 - speed / (this.MAX_SPEED_FLAT + 1e-3));
    if (this.input.left) this.skaterMesh.rotation.y -= this.TURN_SPEED * turnScale * dt;
    if (this.input.right) this.skaterMesh.rotation.y += this.TURN_SPEED * turnScale * dt;

    // Forward dir from yaw
    const yaw = this.skaterMesh.rotation.y || 0;
    const forward = new Vector3(Math.sin(yaw), 0, -Math.cos(yaw));

    // Acceleration/brake/push
    let accel = 0;
    if (this.input.forward) accel += this.ACCELERATION;
    if (this.input.backward) accel -= this.ACCELERATION * 0.8;
    if (this.input.push && speed < this.MAX_SPEED_FLAT * 0.6 && this.grounded) {
      accel += this.ACCELERATION * 1.5;
    }
    this.velocity.x += forward.x * accel * dt;
    this.velocity.z += forward.z * accel * dt;

    // Friction when no input on flat ground
    if (!this.input.forward && !this.input.backward && !this.input.push) {
      const h = Math.hypot(this.velocity.x, this.velocity.z);
      if (h > 0) {
        const decel = this.FRICTION * dt;
        const nh = Math.max(0, h - decel);
        const s = nh / h;
        this.velocity.x *= s;
        this.velocity.z *= s;
      }
    }

    // Clamp horizontal speed
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (hSpeed > this.MAX_SPEED_FLAT) {
      const s = this.MAX_SPEED_FLAT / hSpeed;
      this.velocity.x *= s;
      this.velocity.z *= s;
    }

    // Gravity / Jump
    if (this.input.jump && this.grounded) {
      this.velocity.y = this.JUMP_FORCE;
      this.grounded = false;
      this.skaterMesh.position.y += 0.01;
    }
    if (!this.grounded) {
      this.velocity.y -= this.GRAVITY * dt;
    }

    // Integrate
    this.skaterMesh.position.x += this.velocity.x * dt;
    this.skaterMesh.position.z += this.velocity.z * dt;
    this.skaterMesh.position.y += this.velocity.y * dt;

    // Grounding and slope interaction
    this.groundCheckAndSlope(dt);

    // Tricks (cosmetic)
    this.updateTricks(dt);
  }

  private groundCheckAndSlope(_dt: number): void {
    const rayOrigin = this.skaterMesh.position.add(new Vector3(0, this.HEIGHT * 0.5, 0));
    const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), this.HEIGHT + 1.0);
    const hit = this.scene.pickWithRay(ray, (m) => !!(m.metadata && m.metadata.isGround));

    this.grounded = false;
    if (hit?.hit && hit.pickedPoint) {
      const expectedFootY = hit.pickedPoint.y + (this.HEIGHT * 0.5);
      const delta = expectedFootY - this.skaterMesh.position.y;
      if (delta >= -this.FOOT_EPS) {
        if (this.velocity.y <= 0) {
          this.skaterMesh.position.y = expectedFootY;
          this.velocity.y = 0;
          this.grounded = true;
          if (hit.getNormal()) {
            this.groundNormal.copyFrom(hit.getNormal()!);
          } else {
            this.groundNormal.set(0, 1, 0);
          }
          // Project horizontal velocity onto slope plane
          const v = new Vector3(this.velocity.x, 0, this.velocity.z);
          const n = this.groundNormal.clone().normalize();
          const dot = v.x * n.x + v.y * n.y + v.z * n.z;
          v.x -= n.x * dot;
          v.y -= n.y * dot;
          v.z -= n.z * dot;
          this.velocity.x = v.x;
          this.velocity.z = v.z;
          // Small gravity along slope (accelerate downhill)
          const downSlope = new Vector3(-n.x, 0, -n.z);
          const dsLen = downSlope.length();
          if (dsLen > 0.0001) {
            downSlope.scaleInPlace(1 / dsLen);
            const slopeAccel = (1 - n.y) * this.GRAVITY * 0.35;
            this.velocity.x += downSlope.x * slopeAccel * _dt;
            this.velocity.z += downSlope.z * slopeAccel * _dt;
          }
        }
      }
    }
  }

  private updateTricks(dt: number): void {
    if (!this.grounded) {
      if (this.input.trickSpin) {
        this.trickSpinTime += dt;
        // Spin around Y while in air
        this.skaterMesh.rotation.y += Math.PI * 2 * dt; // ~360 deg per second
      } else {
        this.trickSpinTime = 0;
      }
      if (this.input.trickGrab) {
        this.trickGrabTime += dt;
        if (this.boardMesh) {
          this.boardMesh.rotation.x = Math.sin(this.trickGrabTime * 6.0) * 0.2;
        }
      } else {
        if (this.boardMesh) this.boardMesh.rotation.x *= 0.9;
        this.trickGrabTime = 0;
      }
    } else {
      // Reset board tilt on land
      if (this.boardMesh) this.boardMesh.rotation.x *= 0.8;
      this.trickSpinTime = 0;
      this.trickGrabTime = 0;
    }
  }

  getPosition(): Vector3 {
    return this.skaterMesh.position;
    // Returning reference is fine as caller should not mutate directly
  }

  getVelocity(): Vector3 {
    return this.velocity;
  }

  isGrounded(): boolean {
    return this.grounded;
  }
}


