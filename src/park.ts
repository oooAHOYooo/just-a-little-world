import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

export function buildPark(scene: Scene): { root: TransformNode; shadowCasters: Mesh[] } {
  const root = new TransformNode("parkRoot", scene);
  const shadowCasters: Mesh[] = [];

  // Optional grid import from admin
  try {
    const raw = localStorage.getItem("skate-level-grid");
    if (raw) {
      const obj = JSON.parse(raw) as { w: number; h: number; grid: string[][] };
      if (obj?.grid) {
        // Simple interpreter: draw sidewalk where 'sidewalk', road where 'road'
        const cell = 2.0;
        const startX = -obj.w * cell * 0.5;
        const startZ = -obj.h * cell * 0.5;
        const mats: Record<string, any> = {};
        function mat(name: string, color: Color3) {
          if (!mats[name]) {
            const m = new StandardMaterial(name, scene);
            m.diffuseColor = color;
            m.specularColor = new Color3(0.05, 0.05, 0.05);
            mats[name] = m;
          }
          return mats[name];
        }
        for (let y = 0; y < obj.h; y++) {
          for (let x = 0; x < obj.w; x++) {
            const t = obj.grid[y][x];
            const px = startX + x * cell + cell * 0.5;
            const pz = startZ + y * cell + cell * 0.5;
            if (t === "road") {
              const b = MeshBuilder.CreateGround(`g_r_${x}_${y}`, { width: cell, height: cell }, scene);
              b.position.set(px, 0, pz);
              b.material = mat("mRoad", new Color3(0.15, 0.15, 0.16));
              (b as any).metadata = { isGround: true };
              b.setParent(root);
            } else if (t === "sidewalk") {
              const b = MeshBuilder.CreateBox(`g_s_${x}_${y}`, { width: cell, depth: cell, height: 0.2 }, scene);
              b.position.set(px, 0.1, pz);
              b.material = mat("mSidewalk", new Color3(0.7, 0.72, 0.74));
              (b as any).metadata = { isGround: true };
              b.setParent(root);
            } else if (t === "ledge") {
              const b = MeshBuilder.CreateBox(`g_l_${x}_${y}`, { width: cell * 0.9, depth: cell * 0.5, height: 0.5 }, scene);
              b.position.set(px, 0.25, pz);
              b.material = mat("mLedge", new Color3(0.6, 0.62, 0.66));
              (b as any).metadata = { isGround: true };
              b.setParent(root);
              shadowCasters.push(b);
            } else if (t === "rail") {
              const r = MeshBuilder.CreateCylinder(`g_rr_${x}_${y}`, { diameter: 0.12, height: cell, tessellation: 12 }, scene);
              r.position.set(px, 0.5, pz);
              r.rotation.x = Math.PI / 2;
              const railMat = new StandardMaterial("mRail", scene);
              railMat.diffuseColor = new Color3(0.85, 0.85, 0.9);
              railMat.specularColor = new Color3(0.4, 0.4, 0.45);
              r.material = railMat;
              r.setParent(root);
              (r as any).metadata = {
                isGround: true,
                isRail: true,
                start: new Vector3(px, 0.5, pz - cell * 0.5),
                end: new Vector3(px, 0.5, pz + cell * 0.5),
                radius: 0.06
              };
              shadowCasters.push(r as Mesh);
            }
          }
        }
      }
    }
  } catch {
    // ignore invalid admin grids
  }

  // Materials
  const asphalt = new PBRMaterial("asphalt", scene);
  asphalt.roughness = 0.95;
  asphalt.metallic = 0.0;
  asphalt.albedoColor = new Color3(0.16, 0.16, 0.18);

  const bikeLane = new PBRMaterial("bikeLane", scene);
  bikeLane.roughness = 0.9;
  bikeLane.metallic = 0.0;
  bikeLane.albedoColor = new Color3(0.35, 0.75, 0.35);

  const sidewalk = new PBRMaterial("sidewalk", scene);
  sidewalk.roughness = 0.9;
  sidewalk.metallic = 0.0;
  sidewalk.albedoColor = new Color3(0.7, 0.72, 0.74);

  const curbMat = new StandardMaterial("curb", scene);
  curbMat.diffuseColor = new Color3(0.6, 0.62, 0.66);

  const railMat = new StandardMaterial("rail", scene);
  railMat.diffuseColor = new Color3(0.85, 0.85, 0.9);
  railMat.specularColor = new Color3(0.4, 0.4, 0.45);

  // Ground: skatepark pad (green) with asphalt border — much larger footprint
  const PAD_W = 80;
  const PAD_H = 140;
  const pad = MeshBuilder.CreateGround("pad", { width: PAD_W, height: PAD_H, subdivisions: 2 }, scene);
  pad.position.y = 0;
  pad.material = bikeLane;
  pad.receiveShadows = true;
  pad.setParent(root);
  (pad as any).metadata = { isGround: true };

  const border = MeshBuilder.CreateGround("border", { width: PAD_W + 12, height: PAD_H + 12, subdivisions: 2 }, scene);
  border.position.y = -0.01;
  border.material = asphalt;
  border.receiveShadows = false;
  border.setParent(root);
  (border as any).metadata = { isGround: true };

  // Curbs between road and sidewalks (grindable edges)
  const curbLeft = MeshBuilder.CreateBox("curbLeft", { width: 0.3, depth: PAD_H - 12, height: 0.3 }, scene);
  curbLeft.position.set(-(PAD_W * 0.5) + 6, 0.15, 0);
  curbLeft.material = curbMat;
  curbLeft.receiveShadows = true;
  curbLeft.setParent(root);
  (curbLeft as any).metadata = { isGround: true };

  const curbRight = MeshBuilder.CreateBox("curbRight", { width: 0.3, depth: PAD_H - 12, height: 0.3 }, scene);
  curbRight.position.set((PAD_W * 0.5) - 6, 0.15, 0);
  curbRight.material = curbMat;
  curbRight.receiveShadows = true;
  curbRight.setParent(root);
  (curbRight as any).metadata = { isGround: true };

  // Ledges on sides
  const ledge1 = MeshBuilder.CreateBox("ledge1", { width: 1.0, depth: 10, height: 0.6 }, scene);
  ledge1.position.set(-(PAD_W * 0.5) + 8, 0.3, -PAD_H * 0.2);
  ledge1.material = curbMat;
  ledge1.receiveShadows = true;
  ledge1.setParent(root);
  (ledge1 as any).metadata = { isGround: true };

  const ledge2 = MeshBuilder.CreateBox("ledge2", { width: 1.0, depth: 10, height: 0.5 }, scene);
  ledge2.position.set((PAD_W * 0.5) - 8, 0.25, PAD_H * 0.2);
  ledge2.material = curbMat;
  ledge2.receiveShadows = true;
  ledge2.setParent(root);
  (ledge2 as any).metadata = { isGround: true };

  // Rails (grindable props)
  const rail1 = MeshBuilder.CreateCylinder("rail1", { diameter: 0.12, height: 10, tessellation: 12 }, scene);
  rail1.position.set(0, 0.45, -PAD_H * 0.25);
  rail1.rotation.x = Math.PI / 2;
  rail1.material = railMat;
  rail1.receiveShadows = true;
  rail1.setParent(root);
  (rail1 as any).metadata = {
    isGround: true,
    isRail: true,
    start: new Vector3(0, 0.45, -PAD_H * 0.25 - 5),
    end: new Vector3(0, 0.45, -PAD_H * 0.25 + 5),
    radius: 0.06
  };

  const rail2 = MeshBuilder.CreateCylinder("rail2", { diameter: 0.12, height: 14, tessellation: 12 }, scene);
  rail2.position.set(-12, 0.5, PAD_H * 0.1);
  rail2.rotation.x = Math.PI / 2;
  rail2.material = railMat;
  rail2.receiveShadows = true;
  rail2.setParent(root);
  (rail2 as any).metadata = {
    isGround: true,
    isRail: true,
    start: new Vector3(-12, 0.5, PAD_H * 0.1 - 7),
    end: new Vector3(-12, 0.5, PAD_H * 0.1 + 7),
    radius: 0.06
  };

  // Third rail on right sidewalk closer to middle
  const rail3 = MeshBuilder.CreateCylinder("rail3", { diameter: 0.12, height: 12, tessellation: 12 }, scene);
  rail3.position.set(12, 0.5, 2);
  rail3.rotation.x = Math.PI / 2;
  rail3.material = railMat;
  rail3.receiveShadows = true;
  rail3.setParent(root);
  (rail3 as any).metadata = {
    isGround: true,
    isRail: true,
    start: new Vector3(12, 0.5, -6),
    end: new Vector3(12, 0.5, 6),
    radius: 0.06
  };

  // Long side banks and mini ramp
  const SIDE_LEN = PAD_H - 18;
  function longBank(name: string, x: number, z: number, rotY: number): Mesh {
    const b = MeshBuilder.CreateBox(name, { width: 2.4, depth: SIDE_LEN, height: 1.2 }, scene);
    b.position.set(x, 0.6, z);
    b.rotation.y = rotY;
    b.rotation.x = -Math.PI / 10;
    b.material = sidewalk;
    b.receiveShadows = true;
    b.setParent(root);
    (b as any).metadata = { isGround: true };
    shadowCasters.push(b);
    return b;
  }
  longBank("bankLeft", -(PAD_W * 0.5) + 8, 0, 0);
  longBank("bankRight", (PAD_W * 0.5) - 8, 0, 0);

  function quarter(name: string, cx: number, cz: number, rotY: number): Mesh {
    const q = MeshBuilder.CreateBox(name, { width: 6, depth: 4, height: 2.2 }, scene);
    q.position.set(cx, 1.1, cz);
    q.rotation.y = rotY;
    q.rotation.x = -Math.PI / 6;
    q.material = sidewalk;
    q.receiveShadows = true;
    q.setParent(root);
    (q as any).metadata = { isGround: true };
    shadowCasters.push(q);
    return q;
  }
  // Tall vert walls at far ends
  function vertWall(name: string, cz: number): void {
    const w = MeshBuilder.CreateBox(name, { width: 20, depth: 6, height: 6.0 }, scene);
    w.position.set(0, 3.0, cz);
    w.rotation.x = -Math.PI / 4.5;
    w.material = sidewalk;
    w.receiveShadows = true;
    w.setParent(root);
    (w as any).metadata = { isGround: true };
    shadowCasters.push(w);
  }
  vertWall("vertNorth", -(PAD_H * 0.5) + 10);
  vertWall("vertSouth", (PAD_H * 0.5) - 10);

  // Mini on one side
  quarter("miniQ1", -10, -PAD_H * 0.15, 0);
  quarter("miniQ2", -10, -PAD_H * 0.20, Math.PI);

  // Center pyramid and funbox
  const pyramidBase = MeshBuilder.CreateBox("pyramidBase", { width: 6, depth: 6, height: 0.5 }, scene);
  pyramidBase.position.set(0, 0.25, -10);
  pyramidBase.material = curbMat;
  pyramidBase.receiveShadows = true;
  pyramidBase.setParent(root);
  (pyramidBase as any).metadata = { isGround: true };
  shadowCasters.push(pyramidBase);
  const pyrRamp = MeshBuilder.CreateBox("pyramidRamp", { width: 5.6, depth: 5.6, height: 1.2 }, scene);
  pyrRamp.position.set(0, 0.85, -10);
  pyrRamp.rotation.x = -Math.PI / 8;
  pyrRamp.material = sidewalk;
  pyrRamp.receiveShadows = true;
  pyrRamp.setParent(root);
  (pyrRamp as any).metadata = { isGround: true };
  shadowCasters.push(pyrRamp as Mesh);

  const funBase = MeshBuilder.CreateBox("funBase", { width: 10, depth: 5.2, height: 0.5 }, scene);
  funBase.position.set(0, 0.25, 14);
  funBase.material = curbMat;
  funBase.setParent(root);
  (funBase as any).metadata = { isGround: true };
  shadowCasters.push(funBase);
  const funTop = MeshBuilder.CreateBox("funTop", { width: 9.2, depth: 4.2, height: 0.5 }, scene);
  funTop.position.set(0, 0.75, 14);
  funTop.material = sidewalk;
  funTop.setParent(root);
  (funTop as any).metadata = { isGround: true };
  shadowCasters.push(funTop);

  return { root, shadowCasters };
}


