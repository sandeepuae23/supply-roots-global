export type LaneMode = "sea" | "air" | "land";

export const HUBS: { name: string; lat: number; lon: number }[] = [
  { name: "Dubai", lat: 25.2, lon: 55.3 }, // 0
  { name: "Mumbai", lat: 19.1, lon: 72.9 }, // 1
  { name: "Riyadh", lat: 24.7, lon: 46.7 }, // 2
  { name: "Doha", lat: 25.3, lon: 51.5 }, // 3
  { name: "Rotterdam", lat: 51.9, lon: 4.5 }, // 4
  { name: "Mombasa", lat: -4.0, lon: 39.7 }, // 5
  { name: "Singapore", lat: 1.35, lon: 103.8 }, // 6
  { name: "Cairo", lat: 30.0, lon: 31.2 }, // 7
  { name: "Jebel Ali Port", lat: 24.98, lon: 55.06 }, // 8 (sea)
  { name: "Dubai Intl. Airport", lat: 25.25, lon: 55.36 }, // 9 (air)
  { name: "Gulf Corridor", lat: 26.4, lon: 50.1 }, // 10 (land)
];

/** [fromIndex, toIndex, mode] — ambient lanes shown on the home page globe. */
export const LANES: [number, number, LaneMode][] = [
  [1, 8, "sea"],
  [8, 4, "sea"],
  [6, 8, "sea"],
  [5, 8, "sea"],
  [9, 2, "air"],
  [9, 6, "air"],
  [7, 4, "air"],
  [9, 4, "air"],
  [0, 2, "land"],
  [0, 10, "land"],
  [10, 7, "land"],
  [1, 0, "land"],
];

/** Ordered story of a shipment, played back by the Business page "Show Route" timeline. */
export const TIMELINE_LANES: {
  from: number;
  to: number;
  mode: LaneMode;
  label: string;
  detail: string;
}[] = [
  {
    from: 1,
    to: 8,
    mode: "sea",
    label: "Mumbai → Jebel Ali Port",
    detail: "Origin cargo loaded and shipped to our Dubai consolidation hub.",
  },
  {
    from: 6,
    to: 8,
    mode: "sea",
    label: "Singapore → Jebel Ali Port",
    detail: "Asian sourcing lane feeding the same consolidation window.",
  },
  {
    from: 0,
    to: 10,
    mode: "land",
    label: "Dubai → Gulf Corridor",
    detail: "Inland trucking, cold-chain handling and re-packing.",
  },
  {
    from: 10,
    to: 7,
    mode: "land",
    label: "Gulf Corridor → Cairo",
    detail: "Regional overland distribution to North African buyers.",
  },
  {
    from: 9,
    to: 2,
    mode: "air",
    label: "Dubai → Riyadh (Air)",
    detail: "Time-critical and perishable consignments moved by air freight.",
  },
  {
    from: 8,
    to: 4,
    mode: "sea",
    label: "Jebel Ali Port → Rotterdam",
    detail: "Full-container export to Europe with complete documentation.",
  },
  {
    from: 5,
    to: 8,
    mode: "sea",
    label: "Mombasa → Jebel Ali Port",
    detail: "Return leg sourcing from East Africa closes the supply loop.",
  },
];

export const MODE_LABEL: Record<LaneMode, string> = {
  sea: "Sea Freight",
  air: "Air Freight",
  land: "Land Transport",
};
