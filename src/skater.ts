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
  trickSpin: boolean; // W or E
  trickGrab: boolean; // A or Q
  trickFlip: boolean; // D or F
  trickShove: boolean; // S
};

type SkaterOptions = {
  onTrickLanded?: (name: string, points: number) => void;
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
  // Vertical distance from mesh origin to foot/board contact. Tuned for fallback rig.
  private readonly BASE_FOOT_HEIGHT = 0.9;

  private input: InputState = {
    forward: false, backward: false, left: false, right: false, jump: false, push: false, trickSpin: false, trickGrab: false, trickFlip: false, trickShove: false
  };

  private trickSpinTime = 0;
  private trickGrabTime = 0;
  private trickFlipTime = 0;
  private isFlipping = false;
  private kickflipMarked = false;

  // Grind state
  private isGrinding = false;
  private grindStart = new Vector3();
  private grindEnd = new Vector3();
  private grindDir = new Vector3(0, 0, 1);
  private grindLen = 1;
  private grindT = 0.5;
  private railHeight = 0.5;

  // Fallback rig parts (only used if GLB not loaded)
  private partTorso: Mesh | null = null;
  private partHead: Mesh | null = null;
  private partArmL: Mesh | null = null;
  private partArmR: Mesh | null = null;
  private partLegL: Mesh | null = null;
  private partLegR: Mesh | null = null;
  private crouch: number = 0; // 0..1
  private prevGrounded = true;
  private airSpinAccum = 0; // radians
  private airGrab = false;

  private boardBasePosY = -0.45;
  private boardBaseRotZ = 0;

  private onTrick?: (name: string, points: number) => void;

  private pushPhase = 0; // 0..inf

  constructor(scene: Scene, opts?: SkaterOptions) {
    this.scene = scene;
    this.onTrick = opts?.onTrickLanded;
    // Fallback capsule + board immediately
    this.skaterMesh = this.createFallbackSkater(scene);
    this.tryLoadGLB();
    this.bindInput();
    // Spawn snapped to ground at start
    this.snapToGroundAtStart();
  }

  private bindInput(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        // Movement: Arrows & IJKL
        case "ArrowUp":
        case "KeyI": this.input.forward = true; break;
        case "ArrowDown":
        case "KeyK": this.input.backward = true; break;
        case "ArrowLeft":
        case "KeyJ": this.input.left = true; break;
        case "ArrowRight":
        case "KeyL": this.input.right = true; break;
        case "Space": this.input.jump = true; break;
        case "ShiftLeft":
        case "ShiftRight": this.input.push = true; break;
        // Tricks: WASD + legacy QE/F
        case "KeyW":
        case "KeyE": this.input.trickSpin = true; break;
        case "KeyA":
        case "KeyQ": this.input.trickGrab = true; break;
        case "KeyD":
        case "KeyF": this.input.trickFlip = true; break;
        case "KeyS": this.input.trickShove = true; break;
        case "KeyR":
          // Quick recover upright
          this.skaterMesh.rotation.x = 0;
          this.skaterMesh.rotation.z = 0;
          if (this.boardMesh) {
            this.boardMesh.rotation.x = 0;
            this.boardMesh.rotation.z = this.boardBaseRotZ;
            this.boardMesh.position.y = this.boardBasePosY;
          }
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp":
        case "KeyI": this.input.forward = false; break;
        case "ArrowDown":
        case "KeyK": this.input.backward = false; break;
        case "ArrowLeft":
        case "KeyJ": this.input.left = false; break;
        case "ArrowRight":
        case "KeyL": this.input.right = false; break;
        case "Space": this.input.jump = false; break;
        case "ShiftLeft":
        case "ShiftRight": this.input.push = false; break;
        case "KeyW":
        case "KeyE": this.input.trickSpin = false; break;
        case "KeyA":
        case "KeyQ": this.input.trickGrab = false; break;
        case "KeyD":
        case "KeyF": this.input.trickFlip = false; break;
        case "KeyS": this.input.trickShove = false; break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  }

  private snapToGroundAtStart(): void {
    // Cast from above to ensure we land on whatever is below spawn XZ
    const startPos = this.skaterMesh.position.clone();
    const rayOrigin = new Vector3(startPos.x, 5, startPos.z);
    const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), 10);
    const hit = this.scene.pickWithRay(ray, (m) => !!(m.metadata && m.metadata.isGround));
    if (hit?.hit && hit.pickedPoint) {
      this.skaterMesh.position.y = hit.pickedPoint.y + this.BASE_FOOT_HEIGHT;
      this.velocity.set(0, 0, 0);
      this.grounded = true;
    }
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

  // (fallback skater implemented at bottom of the file)

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

    // Gravity / Jump or Grind pop
    if (this.isGrinding) {
      if (this.input.jump) {
        // Pop out of grind
        this.isGrinding = false;
        this.velocity.y = this.JUMP_FORCE;
        // Give a small forward boost along grind direction
        this.velocity.x += this.grindDir.x * 2.0;
        this.velocity.z += this.grindDir.z * 2.0;
      } else {
        // While grinding, stay locked to rail
        this.updateGrinding(dt);
      }
    } else {
      if (this.input.jump && this.grounded) {
        // small crouch windup
        this.crouch = Math.min(1, this.crouch + 0.6);
      this.velocity.y = this.JUMP_FORCE;
        this.grounded = false;
        this.skaterMesh.position.y += 0.01;
      }
      if (!this.grounded) {
        this.velocity.y -= this.GRAVITY * dt;
      }
    }

    // Integrate
    this.skaterMesh.position.x += this.velocity.x * dt;
    this.skaterMesh.position.z += this.velocity.z * dt;
    this.skaterMesh.position.y += this.velocity.y * dt;
    // Keep root upright to avoid upside-down posture from any accidental torques
    this.ensureUpright();

    // Grounding and slope interaction or capture grind if eligible
    if (!this.isGrinding) {
      this.groundCheckAndSlope(dt);
      this.tryCaptureGrind();
    }

    // Tricks (cosmetic) and air tracking
    this.updateTricks(dt);

    // World boundaries clamp (keep skater within play area)
    this.clampToWorldBounds();

    // Animate simple stance/crouch
    const moving = Math.hypot(this.velocity.x, this.velocity.z) > 0.1;
    const targetCrouch = this.grounded ? (moving ? 0.25 : 0.1) : 0; // slight bend while rolling
    // decay crouch quickly after jump
    const rate = this.grounded ? 4.0 : 8.0;
    this.crouch += (targetCrouch - this.crouch) * Math.min(1, rate * dt);
    // Push animation when pushing at low speed
    if (this.grounded && this.input.push && moving) {
      this.pushPhase += dt * 6.0;
    } else {
      this.pushPhase += dt * 2.0;
    }
    this.applyFallbackPose(dt);
    // Landing detection → score tricks
    if (this.prevGrounded === false && this.grounded === true) {
      let points = 0;
      const names: string[] = [];
      if (this.kickflipMarked) {
        points += 100;
        names.push("Kickflip");
      }
      const turns = Math.round(this.airSpinAccum / (Math.PI * 2));
      if (turns >= 1) {
        points += 150 * turns;
        names.push(`${turns}x Spin`);
      }
      if (this.airGrab) {
        points += 50;
        names.push("Grab");
      }
      if (points > 0 && this.onTrick) {
        const label = names.join(" + ");
        this.onTrick(label || "Trick", points);
      }
      // reset air state
      this.airSpinAccum = 0;
      this.airGrab = false;
      this.kickflipMarked = false;
    }
    this.prevGrounded = this.grounded;
  }

  private ensureUpright(): void {
    if (this.skaterMesh.rotationQuaternion) this.skaterMesh.rotationQuaternion = null;
    this.skaterMesh.rotation.x = 0;
    this.skaterMesh.rotation.z = 0;
    if (this.skaterMesh.scaling.y < 0) this.skaterMesh.scaling.y = Math.abs(this.skaterMesh.scaling.y);
    if (this.boardMesh) {
      this.boardMesh.rotation.x = Math.max(-0.35, Math.min(0.35, this.boardMesh.rotation.x || 0));
      this.boardMesh.rotation.z = Math.max(-0.35, Math.min(0.35, this.boardMesh.rotation.z || 0));
    }
  }

  private clampToWorldBounds(): void {
    // Expanded park bounds to match larger skatepark pad
    const minX = -38.0, maxX = 38.0;
    const minZ = -70.0, maxZ = 70.0;
    const p = this.skaterMesh.position;
    if (p.x < minX) { p.x = minX; if (this.velocity.x < 0) this.velocity.x = 0; }
    if (p.x > maxX) { p.x = maxX; if (this.velocity.x > 0) this.velocity.x = 0; }
    if (p.z < minZ) { p.z = minZ; if (this.velocity.z < 0) this.velocity.z = 0; }
    if (p.z > maxZ) { p.z = maxZ; if (this.velocity.z > 0) this.velocity.z = 0; }
  }

  private tryCaptureGrind(): void {
    if (!this.grounded) return;
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed < 2.0) return;
    // Find nearest rail within a small horizontal radius
    let bestDist = 0.3;
    let best: { start: Vector3; end: Vector3; y: number } | null = null;
    for (const m of this.scene.meshes) {
      const md: any = (m as any).metadata;
      if (!md || !md.isRail) continue;
      const start: Vector3 = md.start;
      const end: Vector3 = md.end;
      const p = this.skaterMesh.position;
      const cp = this.closestPointOnSegment(p, start, end);
      const d = Math.hypot(p.x - cp.x, p.z - cp.z);
      const yOk = Math.abs(p.y - (start.y + md.radius + 0.12)) < 0.25;
      if (d < bestDist && yOk) {
        bestDist = d;
        best = { start, end, y: start.y + md.radius + 0.12 };
      }
    }
    if (best) {
      // Enter grind
      this.isGrinding = true;
      this.grindStart.copyFrom(best.start);
      this.grindEnd.copyFrom(best.end);
      this.grindDir = best.end.subtract(best.start);
      this.grindLen = Math.max(0.001, this.grindDir.length());
      this.grindDir.scaleInPlace(1 / this.grindLen);
      const cp = this.closestPointOnSegment(this.skaterMesh.position, this.grindStart, this.grindEnd);
      const t = this.paramAlong(cp, this.grindStart, this.grindEnd);
      this.grindT = t;
      // Project velocity along rail
      const v = new Vector3(this.velocity.x, 0, this.velocity.z);
      const along = v.x * this.grindDir.x + v.z * this.grindDir.z;
      this.velocity.x = this.grindDir.x * along;
      this.velocity.z = this.grindDir.z * along;
      // Lock position to rail
      this.skaterMesh.position.x = cp.x;
      this.skaterMesh.position.y = best.y;
      this.skaterMesh.position.z = cp.z;
      this.velocity.y = 0;
      this.grounded = true;
      // Face along rail
      this.skaterMesh.rotation.y = Math.atan2(this.grindDir.x, -this.grindDir.z);
    }
  }

  private updateGrinding(dt: number): void {
    // Move along rail parameter by velocity along direction
    const along = this.velocity.x * this.grindDir.x + this.velocity.z * this.grindDir.z;
    const ds = along * dt;
    const dT = ds / this.grindLen;
    this.grindT += dT;
    // Small friction while grinding
    this.velocity.x *= 1 - Math.min(1, this.FRICTION * 0.25 * dt);
    this.velocity.z *= 1 - Math.min(1, this.FRICTION * 0.25 * dt);
    // Allow gentle acceleration with W/S along the rail
    if (this.input.forward) {
      this.velocity.x += this.grindDir.x * this.ACCELERATION * 0.5 * dt;
      this.velocity.z += this.grindDir.z * this.ACCELERATION * 0.5 * dt;
    } else if (this.input.backward) {
      this.velocity.x -= this.grindDir.x * this.ACCELERATION * 0.5 * dt;
      this.velocity.z -= this.grindDir.z * this.ACCELERATION * 0.5 * dt;
    }
    // Clamp overall speed similar to flat max
    const h = Math.hypot(this.velocity.x, this.velocity.z);
    if (h > this.MAX_SPEED_FLAT) {
      const s = this.MAX_SPEED_FLAT / h;
      this.velocity.x *= s;
      this.velocity.z *= s;
    }
    // Leave rail if we run out of segment
    if (this.grindT <= 0 || this.grindT >= 1) {
      this.isGrinding = false;
      this.grounded = false; // fall off the end
      return;
    }
    // Update locked position to the segment
    const pos = Vector3.Lerp(this.grindStart, this.grindEnd, this.grindT);
    this.skaterMesh.position.x = pos.x;
    this.skaterMesh.position.z = pos.z;
    // Maintain slight clearance above rail
    this.skaterMesh.position.y = this.grindStart.y + 0.12;
  }

  private closestPointOnSegment(p: Vector3, a: Vector3, b: Vector3): Vector3 {
    const ab = b.subtract(a);
    const t = this.paramAlong(p, a, b);
    return a.add(ab.scale(t));
  }

  private paramAlong(p: Vector3, a: Vector3, b: Vector3): number {
    const ab = b.subtract(a);
    const ap = p.subtract(a);
    const denom = ab.lengthSquared();
    if (denom <= 1e-6) return 0;
    const t = (ap.x * ab.x + ap.y * ab.y + ap.z * ab.z) / denom;
    return Math.max(0, Math.min(1, t));
  }

  private groundCheckAndSlope(_dt: number): void {
    const rayOrigin = this.skaterMesh.position.add(new Vector3(0, this.HEIGHT * 0.5, 0));
    const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), this.HEIGHT + 1.0);
    const hit = this.scene.pickWithRay(ray, (m) => !!(m.metadata && m.metadata.isGround));

    this.grounded = false;
    if (hit?.hit && hit.pickedPoint) {
      const expectedFootY = hit.pickedPoint.y + this.BASE_FOOT_HEIGHT;
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
        this.airSpinAccum += Math.PI * 2 * dt;
      } else {
        this.trickSpinTime = 0;
      }
      if (this.input.trickGrab) {
        this.trickGrabTime += dt;
        if (this.boardMesh) {
          this.boardMesh.rotation.x = Math.sin(this.trickGrabTime * 6.0) * 0.2;
        }
        if (this.trickGrabTime > 0.2) this.airGrab = true;
      } else {
        if (this.boardMesh) this.boardMesh.rotation.x *= 0.9;
        this.trickGrabTime = 0;
      }
      // Kickflip (board rotates around local Z)
      if (this.input.trickFlip && !this.isFlipping) {
        this.isFlipping = true;
        this.trickFlipTime = 0;
        this.kickflipMarked = true;
      }
      // Shove-it (board spins around Y axis 180-360 while airborne)
      if (this.input.trickShove && this.boardMesh) {
        const shoveSpeed = Math.PI * 4; // 720 deg/sec possible
        this.boardMesh.rotation.y += shoveSpeed * dt;
      } else if (this.boardMesh) {
        // ease back toward base Y rotation when not shoving
        this.boardMesh.rotation.y *= 0.9;
      }
      if (this.isFlipping && this.boardMesh) {
        this.trickFlipTime += dt;
        const dur = 0.55;
        const t = Math.min(1, this.trickFlipTime / dur);
        const angle = Math.PI * 2 * t; // 360
        this.boardMesh.rotation.z = this.boardBaseRotZ + angle;
        // subtle board lift during flip
        this.boardMesh.position.y = this.boardBasePosY + Math.sin(Math.PI * t) * 0.06;
        if (t >= 1) {
          this.isFlipping = false;
          this.boardMesh.rotation.z = this.boardBaseRotZ;
          this.boardMesh.position.y = this.boardBasePosY;
        }
      }
    } else {
      // Reset board tilt on land
      if (this.boardMesh) this.boardMesh.rotation.x *= 0.8;
      this.trickSpinTime = 0;
      this.trickGrabTime = 0;
      this.isFlipping = false;
      if (this.boardMesh) {
        this.boardMesh.rotation.z = this.boardBaseRotZ;
        this.boardMesh.position.y = this.boardBasePosY;
      }
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

  // ------- Fallback 2020-style low-poly skater -------
  private makeCapsulePart(color: Color3, height: number, radius: number, offset: Vector3, parent: Mesh): Mesh {
    const m = MeshBuilder.CreateCapsule("part", { height, radius, tessellation: 12 }, this.scene);
    const mat = new StandardMaterial("partMat", this.scene);
    mat.diffuseColor = color;
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    m.material = mat;
    m.position.copyFrom(offset);
    m.setParent(parent);
    return m;
  }

  private createFallbackSkater(scene: Scene): Mesh {
    // Invisible root the controller moves
    const root = MeshBuilder.CreateBox("skaterRoot", { size: 0.1 }, scene);
    root.isVisible = false;
    root.position = new Vector3(0, 1.0, 0);
    root.rotationQuaternion = null;
    root.receiveShadows = true;

    const grey = new Color3(0.9, 0.9, 0.95);
    // Torso and hips
    this.partTorso = this.makeCapsulePart(grey, 0.6, 0.18, new Vector3(0, 0.35, 0), root);
    const hips = this.makeCapsulePart(grey, 0.28, 0.2, new Vector3(0, 0.05, 0), root);
    // Head
    this.partHead = this.makeCapsulePart(grey, 0.22, 0.12, new Vector3(0, 0.72, 0), root);
    // Arms
    this.partArmL = this.makeCapsulePart(grey, 0.48, 0.09, new Vector3(-0.32, 0.30, -0.05), root);
    this.partArmR = this.makeCapsulePart(grey, 0.48, 0.09, new Vector3(0.32, 0.30, 0.05), root);
    // Legs (staggered for a skate stance)
    this.partLegL = this.makeCapsulePart(grey, 0.58, 0.11, new Vector3(-0.16, -0.25, -0.10), root);
    this.partLegR = this.makeCapsulePart(grey, 0.58, 0.11, new Vector3(0.16, -0.25, 0.12), root);

    // Board
    const board = MeshBuilder.CreateBox("board", { width: 0.28, depth: 1.0, height: 0.06 }, scene);
    const bmat = new StandardMaterial("boardMat", scene);
    bmat.diffuseColor = new Color3(0.18, 0.2, 0.22);
    bmat.specularColor = new Color3(0.2, 0.2, 0.2);
    board.material = bmat;
    board.position = new Vector3(0, this.boardBasePosY, 0.0);
    board.setParent(root);
    this.boardMesh = board;

    return root;
  }

  private applyFallbackPose(_dt: number): void {
    if (!this.partTorso || !this.partLegL || !this.partLegR || !this.partArmL || !this.partArmR) return;
    // Torso slight forward lean while moving/crouched
    const lean = -0.15 * this.crouch;
    this.partTorso.rotation = this.partTorso.rotation || new Vector3();
    this.partTorso.rotation.x = lean;
    // Torso yaw toward front foot for skate stance
    this.partTorso.rotation.y = -0.25;
    // Legs bend via vertical offsets
    const legOffset = -0.08 * this.crouch;
    this.partLegL.position.y = -0.25 + legOffset;
    this.partLegR.position.y = -0.25 + legOffset;
    // Arms relaxed, lead forward, trail back
    const armAngle = 0.22 + 0.18 * this.crouch;
    this.partArmL.rotation = this.partArmL.rotation || new Vector3();
    this.partArmR.rotation = this.partArmR.rotation || new Vector3();
    this.partArmL.rotation.z = armAngle * 0.6;
    this.partArmR.rotation.z = -armAngle;
    this.partArmL.rotation.x = -0.1;
    this.partArmR.rotation.x = 0.05;
    // Push cycle (rear leg swings) – assume right-foot forward stance
    const swing = Math.sin(this.pushPhase) * (this.input.push ? 0.5 : 0.2);
    this.partLegR.rotation = this.partLegR.rotation || new Vector3();
    this.partLegR.rotation.x = swing;
    this.partLegL.rotation = this.partLegL.rotation || new Vector3();
    this.partLegL.rotation.x = -swing * 0.15;
  }
}


