import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { STORIES, Story } from "./stories";

export type StoryOrb = {
  mesh: Mesh;
  data: Story;
  collected: boolean;
};

let storyOrbs: StoryOrb[] = [];

export function buildLevel(scene: Scene): { levelRoot: TransformNode; shadowCasters: Mesh[] } {
  const root = new TransformNode("levelRoot", scene);
  const shadowCasters: Mesh[] = [];

  // Island base (a cylinder) + grass top (flat disc)
  const islandBase = MeshBuilder.CreateCylinder("islandBase", { diameter: 20, height: 1, tessellation: 32 }, scene);
  islandBase.position.y = -0.5;
  islandBase.receiveShadows = true;
  islandBase.setParent(root);
  const islandMat = new StandardMaterial("islandMat", scene);
  islandMat.diffuseColor = new Color3(0.95, 0.85, 0.7); // sandy beige
  islandMat.specularColor = new Color3(0, 0, 0);
  islandBase.material = islandMat;
  islandBase.metadata = { isGround: true };

  const grass = MeshBuilder.CreateCylinder("grassTop", { diameter: 19.5, height: 0.05, tessellation: 48 }, scene);
  grass.position.y = 0.025;
  grass.receiveShadows = true;
  grass.setParent(root);
  const grassMat = new StandardMaterial("grassMat", scene);
  grassMat.diffuseColor = new Color3(0.2, 0.8, 0.4); // bright green
  grassMat.specularColor = new Color3(0, 0, 0);
  grass.material = grassMat;
  grass.metadata = { isGround: true };

  // A few colorful platforms
  const platformMatA = new StandardMaterial("platA", scene);
  platformMatA.diffuseColor = new Color3(0.95, 0.45, 0.5);
  platformMatA.specularColor = new Color3(0, 0, 0);

  const platformMatB = new StandardMaterial("platB", scene);
  platformMatB.diffuseColor = new Color3(0.5, 0.6, 0.95);
  platformMatB.specularColor = new Color3(0, 0, 0);

  const plat1 = MeshBuilder.CreateBox("platform1", { width: 3, depth: 3, height: 0.4 }, scene);
  plat1.position.set(5, 0.2, 0);
  plat1.material = platformMatA;
  plat1.receiveShadows = true;
  plat1.setParent(root);
  plat1.metadata = { isGround: true };

  const plat2 = MeshBuilder.CreateBox("platform2", { width: 2.5, depth: 2.5, height: 0.4 }, scene);
  plat2.position.set(-4.5, 0.6, -2.0);
  plat2.material = platformMatB;
  plat2.receiveShadows = true;
  plat2.setParent(root);
  plat2.metadata = { isGround: true };

  // A simple ramp (box tilted)
  const ramp = MeshBuilder.CreateBox("ramp", { width: 2.2, depth: 4, height: 0.3 }, scene);
  ramp.position.set(-1.5, 0.15, 4);
  ramp.rotation.z = -Math.PI / 10;
  ramp.material = platformMatA;
  ramp.receiveShadows = true;
  ramp.setParent(root);
  ramp.metadata = { isGround: true };

  // Add some simple pillars for visual interest (cast shadows)
  const pillarMat = new StandardMaterial("pillar", scene);
  pillarMat.diffuseColor = new Color3(1.0, 0.85, 0.4);
  pillarMat.specularColor = new Color3(0, 0, 0);

  for (let i = 0; i < 5; i++) {
    const pillar = MeshBuilder.CreateCylinder(`pillar_${i}`, { diameter: 0.35, height: 2.0 }, scene);
    const angle = (i / 5) * Math.PI * 2;
    pillar.position.set(Math.cos(angle) * 7.5, 1.0, Math.sin(angle) * 7.5);
    pillar.material = pillarMat;
    pillar.receiveShadows = true;
    pillar.setParent(root);
    // Pillars are obstacles decoration; not walkable ground
    shadowCasters.push(pillar);
  }

  // Shadow casters: platforms and ramp can cast shadows
  shadowCasters.push(plat1, plat2, ramp);

  // ------- Story pickups (glowing spheres) -------
  storyOrbs = [];
  const storyMat = new StandardMaterial("storyOrbMat", scene);
  storyMat.emissiveColor = new Color3(1.0, 0.85, 0.2); // warm glow
  storyMat.diffuseColor = new Color3(0.2, 0.2, 0.2);
  storyMat.specularColor = new Color3(0, 0, 0);

  for (const s of STORIES) {
    const sphere = MeshBuilder.CreateSphere(`story_${s.id}`, { diameter: 0.6, segments: 16 }, scene);
    const [px, py, pz] = s.position;
    sphere.position = new Vector3(px, py, pz);
    sphere.material = storyMat;
    sphere.receiveShadows = false;
    sphere.setParent(root);
    storyOrbs.push({ mesh: sphere, data: s, collected: false });
  }

  return { levelRoot: root, shadowCasters };
}

export function getStoryOrbs(): StoryOrb[] {
  return storyOrbs;
}


