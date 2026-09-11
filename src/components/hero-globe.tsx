import { ClientOnly } from "@tanstack/react-router";
import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Move, Pause, Plane, Play, Ship, Truck, X } from "lucide-react";
import earthMap from "@/assets/earth-map.jpg";
import type { LaneMode } from "@/data/trade-lanes";

const GlobeScene = lazy(() => import("./three/globe-scene"));

type RouteFilter = LaneMode | "all";

const HUB_DETAILS: Record<string, { region: string; role: string; description: string }> = {
  Dubai: {
    region: "UAE / Gulf",
    role: "Trade coordination hub",
    description: "Commercial coordination for sourcing, documentation and regional distribution.",
  },
  Mumbai: {
    region: "India",
    role: "Origin sourcing",
    description:
      "Access to major agricultural belts, processors and west-coast export infrastructure.",
  },
  Riyadh: {
    region: "Saudi Arabia",
    role: "Regional market",
    description: "Air and land connections for time-sensitive and scheduled food supply.",
  },
  Doha: {
    region: "Qatar",
    role: "Regional market",
    description: "Gulf distribution for hospitality, wholesale and retail supply programs.",
  },
  Rotterdam: {
    region: "Europe",
    role: "European gateway",
    description: "Container route into major European distribution and processing markets.",
  },
  Mombasa: {
    region: "East Africa",
    role: "African gateway",
    description: "Two-way sourcing and distribution corridor through the East African coast.",
  },
  Singapore: {
    region: "Southeast Asia",
    role: "Asian trade hub",
    description: "Consolidated sea and air links across high-volume Asian trading routes.",
  },
  Cairo: {
    region: "North Africa",
    role: "Regional market",
    description: "Land and air connectivity serving North African buyers and distributors.",
  },
  "Jebel Ali Port": {
    region: "Dubai, UAE",
    role: "Sea freight gateway",
    description: "Primary consolidation and container-shipping point for our global sea routes.",
  },
  "Dubai Intl. Airport": {
    region: "Dubai, UAE",
    role: "Air freight gateway",
    description: "Fast movement for perishable, urgent and high-value consignments.",
  },
  "Gulf Corridor": {
    region: "GCC",
    role: "Land transport network",
    description: "Road distribution connecting Dubai with key Gulf and regional destinations.",
  },
};

function StaticGlobe() {
  return (
    <div className="trade-globe-static" role="img" aria-label="Global trade network preview">
      <img src={earthMap} alt="" />
      <span />
    </div>
  );
}

class GlobeErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? <StaticGlobe /> : this.props.children;
  }
}

const filters: { mode: LaneMode; label: string; icon: typeof Ship }[] = [
  { mode: "sea", label: "Sea", icon: Ship },
  { mode: "air", label: "Air", icon: Plane },
  { mode: "land", label: "Land", icon: Truck },
];

export function HeroGlobe() {
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<RouteFilter>("all");
  const [selectedHub, setSelectedHub] = useState<string | null>(null);
  const [useStaticGlobe, setUseStaticGlobe] = useState(false);
  const hub = selectedHub ? HUB_DETAILS[selectedHub] : null;

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const hasWebGl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const limitedDevice =
      typeof memory === "number" && memory <= 2 && navigator.hardwareConcurrency <= 4;
    setUseStaticGlobe(!hasWebGl || limitedDevice);
  }, []);

  return (
    <figure
      className="trade-globe"
      aria-label="Interactive globe illustrating our sea, air, and land trade routes"
    >
      <div className="trade-globe-heading">
        <span className="trade-globe-dot" /> OUR GLOBAL NETWORK <span>01 / WORLD</span>
      </div>
      <div className="trade-globe-canvas">
        {useStaticGlobe ? (
          <StaticGlobe />
        ) : (
          <GlobeErrorBoundary>
            <ClientOnly fallback={<StaticGlobe />}>
              <Suspense fallback={<StaticGlobe />}>
                <GlobeScene paused={paused} activeMode={filter} onHubSelect={setSelectedHub} />
              </Suspense>
            </ClientOnly>
          </GlobeErrorBoundary>
        )}
        {hub && selectedHub && (
          <aside className="trade-hub-card" aria-live="polite">
            <button
              type="button"
              onClick={() => setSelectedHub(null)}
              aria-label="Close hub details"
            >
              <X aria-hidden="true" />
            </button>
            <span>{hub.region}</span>
            <h3>{selectedHub}</h3>
            <strong>{hub.role}</strong>
            <p>{hub.description}</p>
          </aside>
        )}
      </div>
      <figcaption className="trade-globe-caption">
        <div className="trade-globe-legend" aria-label="Filter trade routes">
          {filters.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              className={filter === mode || filter === "all" ? "is-active" : ""}
              aria-pressed={filter === mode || filter === "all"}
              onClick={() => setFilter(filter === mode ? "all" : mode)}
            >
              <Icon aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <div className="trade-globe-controls">
          <span>
            <Move aria-hidden="true" /> Drag to explore
          </span>
          <button
            type="button"
            className="trade-pause-control"
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "Play globe animation" : "Pause globe animation"}
            aria-pressed={paused}
          >
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            <span role="tooltip">{paused ? "Play animation" : "Pause animation"}</span>
          </button>
        </div>
      </figcaption>
      <p className="trade-globe-hint">Select a route type, then choose a city to learn more.</p>
    </figure>
  );
}
