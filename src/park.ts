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

  // Materials
  const asphalt = new PBRMaterial("asphalt", scene);
  asphalt.roughness = 0.95;
  asphalt.metallic = 0.0;
  asphalt.albedoColor = new Color3(0.15, 0.15, 0.16);

  const bikeLane = new PBRMaterial("bikeLane", scene);
  bikeLane.roughness = 0.9;
  bikeLane.metallic = 0.0;
  bikeLane.albedoColor = new Color3(0.25, 0.65, 0.35);

  const sidewalk = new PBRMaterial("sidewalk", scene);
  sidewalk.roughness = 0.9;
  sidewalk.metallic = 0.0;
  sidewalk.albedoColor = new Color3(0.7, 0.72, 0.74);

  const curbMat = new StandardMaterial("curb", scene);
  curbMat.diffuseColor = new Color3(0.6, 0.62, 0.66);

  const railMat = new StandardMaterial("rail", scene);
  railMat.diffuseColor = new Color3(0.85, 0.85, 0.9);
  railMat.specularColor = new Color3(0.4, 0.4, 0.45);

  // Ground: road
  const road = MeshBuilder.CreateGround("road", { width: 30, height: 60, subdivisions: 2 }, scene);
  road.position.y = 0;
  road.material = asphalt;
  road.receiveShadows = true;
  road.setParent(root);
  (road as any).metadata = { isGround: true };

  // Bike lane on the right side of the road
  const bike = MeshBuilder.CreateGround("bikeLane", { width: 6, height: 60, subdivisions: 2 }, scene);
  bike.position.set(12, 0.005, 0);
  bike.material = bikeLane;
  bike.receiveShadows = true;
  bike.setParent(root);
  (bike as any).metadata = { isGround: true };

  // Sidewalks
  const sidewalkLeft = MeshBuilder.CreateBox("sidewalkLeft", { width: 6, depth: 60, height: 0.2 }, scene);
  sidewalkLeft.position.set(-12, 0.1, 0);
  sidewalkLeft.material = sidewalk;
  sidewalkLeft.receiveShadows = true;
  sidewalkLeft.setParent(root);
  (sidewalkLeft as any).metadata = { isGround: true };

  const sidewalkRight = MeshBuilder.CreateBox("sidewalkRight", { width: 6, depth: 60, height: 0.2 }, scene);
  sidewalkRight.position.set(12, 0.1, 0);
  sidewalkRight.material = sidewalk;
  sidewalkRight.receiveShadows = true;
  sidewalkRight.setParent(root);
  (sidewalkRight as any).metadata = { isGround: true };

  // Curbs between road and sidewalks (grindable edges)
  const curbLeft = MeshBuilder.CreateBox("curbLeft", { width: 0.3, depth: 60, height: 0.3 }, scene);
  curbLeft.position.set(-9, 0.15, 0);
  curbLeft.material = curbMat;
  curbLeft.receiveShadows = true;
  curbLeft.setParent(root);
  (curbLeft as any).metadata = { isGround: true };

  const curbRight = MeshBuilder.CreateBox("curbRight", { width: 0.3, depth: 60, height: 0.3 }, scene);
  curbRight.position.set(9, 0.15, 0);
  curbRight.material = curbMat;
  curbRight.receiveShadows = true;
  curbRight.setParent(root);
  (curbRight as any).metadata = { isGround: true };

  // Ledges on sidewalks
  const ledge1 = MeshBuilder.CreateBox("ledge1", { width: 1.0, depth: 6, height: 0.6 }, scene);
  ledge1.position.set(-12, 0.3, -12);
  ledge1.material = curbMat;
  ledge1.receiveShadows = true;
  ledge1.setParent(root);
  (ledge1 as any).metadata = { isGround: true };

  const ledge2 = MeshBuilder.CreateBox("ledge2", { width: 1.0, depth: 5, height: 0.5 }, scene);
  ledge2.position.set(12, 0.25, 15);
  ledge2.material = curbMat;
  ledge2.receiveShadows = true;
  ledge2.setParent(root);
  (ledge2 as any).metadata = { isGround: true };

  // Rails (grindable props)
  const rail1 = MeshBuilder.CreateCylinder("rail1", { diameter: 0.12, height: 6, tessellation: 12 }, scene);
  rail1.position.set(0, 0.45, -10);
  rail1.rotation.x = Math.PI / 2;
  rail1.material = railMat;
  rail1.receiveShadows = true;
  rail1.setParent(root);
  (rail1 as any).metadata = {
    isGround: true,
    isRail: true,
    start: new Vector3(0, 0.45, -13),
    end: new Vector3(0, 0.45, -7),
    radius: 0.06
  };

  const rail2 = MeshBuilder.CreateCylinder("rail2", { diameter: 0.12, height: 8, tessellation: 12 }, scene);
  rail2.position.set(-6, 0.5, 10);
  rail2.rotation.x = Math.PI / 2;
  rail2.material = railMat;
  rail2.receiveShadows = true;
  rail2.setParent(root);
  (rail2 as any).metadata = {
    isGround: true,
    isRail: true,
    start: new Vector3(-6, 0.5, 6),
    end: new Vector3(-6, 0.5, 14),
    radius: 0.06
  };

  // Simple buildings
  const buildingColors = [
    new Color3(0.9, 0.9, 0.95),
    new Color3(0.85, 0.8, 0.8),
    new Color3(0.8, 0.9, 0.85),
    new Color3(0.92, 0.88, 0.8)
  ];
  for (let i = 0; i < 6; i++) {
    const b = MeshBuilder.CreateBox(`bld_${i}`, { width: 6, depth: 8, height: 8 + (i % 3) * 2 }, scene);
    const side = i < 3 ? -18 : 18;
    const offset = (i % 3) * 12 - 12;
    b.position.set(side, b.scaling.y ? 0 : 0, offset);
    b.position.y = b.getBoundingInfo().boundingBox.extendSize.y;
    const m = new StandardMaterial(`bldm_${i}`, scene);
    m.diffuseColor = buildingColors[i % buildingColors.length];
    m.specularColor = new Color3(0.1, 0.1, 0.1);
    b.material = m;
    b.receiveShadows = true;
    b.setParent(root);
    shadowCasters.push(b);
  }

  // Overpass-like structure
  const overCol = new StandardMaterial("overCol", scene);
  overCol.diffuseColor = new Color3(0.7, 0.7, 0.75);
  const overDeck = MeshBuilder.CreateBox("overDeck", { width: 14, depth: 30, height: 0.6 }, scene);
  overDeck.position.set(0, 4, 20);
  overDeck.material = overCol;
  overDeck.setParent(root);
  shadowCasters.push(overDeck);

  const p1 = MeshBuilder.CreateBox("overP1", { width: 0.6, depth: 0.6, height: 4 }, scene);
  p1.position.set(-6, 2, 10);
  p1.material = overCol;
  p1.setParent(root);
  shadowCasters.push(p1);

  const p2 = MeshBuilder.CreateBox("overP2", { width: 0.6, depth: 0.6, height: 4 }, scene);
  p2.position.set(6, 2, 10);
  p2.material = overCol;
  p2.setParent(root);
  shadowCasters.push(p2);

  return { root, shadowCasters };
}


