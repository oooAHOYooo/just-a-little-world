import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type StorySpot = {
  id: string;
  title: string;
  text: string;
  position: Vector3;
};

export const STORY_SPOTS: StorySpot[] = [
  {
    id: "gullcrest-sign",
    title: "Gullcrest Block",
    text: "Block party starts at dusk. Bring your board and a story.",
    position: new Vector3(0, 0.9, -8)
  },
  {
    id: "bike-lane-mural",
    title: "Lane Mural",
    text: "Fresh paint, still tacky. A cat in motion, forever.",
    position: new Vector3(10, 0.9, -2)
  },
  {
    id: "corner-deli",
    title: "Corner Deli",
    text: "Mint tea and cracked tiles. The owner nods as you roll by.",
    position: new Vector3(-14, 0.9, 14)
  }
];


