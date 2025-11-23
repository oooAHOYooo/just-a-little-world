export type Story = {
  id: string;
  title: string;
  text: string;
  position: [number, number, number];
};

export const STORIES: Story[] = [
  {
    id: "arrival",
    title: "Arrival",
    text: "You wake to the gentle sway of grass and a distant gull.",
    position: [2.5, 0.8, -1.5]
  },
  {
    id: "footprints",
    title: "Footprints",
    text: "Faint footprints circle the island—someone else has been here.",
    position: [-4.0, 0.9, 2.0]
  },
  {
    id: "old-song",
    title: "An Old Song",
    text: "The wind hums a tune you almost remember. Almost.",
    position: [6.0, 1.0, 3.5]
  },
  {
    id: "lantern",
    title: "Lantern Light",
    text: "A lantern’s glass, still warm. Its owner can’t be far.",
    position: [-2.5, 0.85, -5.0]
  }
];


