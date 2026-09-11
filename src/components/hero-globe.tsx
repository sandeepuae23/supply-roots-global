import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import { Move, Pause, Plane, Play, Ship, Truck } from "lucide-react";

const GlobeScene = lazy(() => import("./three/globe-scene"));

function GlobePlaceholder() {
  return (
    <div className="trade-globe-placeholder" role="status">
      Loading global network...
    </div>
  );
}

export function HeroGlobe() {
  const [paused, setPaused] = useState(false);
  return (
    <figure
      className="trade-globe"
      aria-label="Interactive globe illustrating our sea, air, and land trade routes"
    >
      <div className="trade-globe-heading">
        <span className="trade-globe-dot" /> OUR GLOBAL NETWORK <span>01 / WORLD</span>
      </div>
      <div className="trade-globe-canvas">
        <ClientOnly fallback={<GlobePlaceholder />}>
          <Suspense fallback={<GlobePlaceholder />}>
            <GlobeScene paused={paused} />
          </Suspense>
        </ClientOnly>
      </div>
      <figcaption className="trade-globe-caption">
        <div className="trade-globe-legend">
          <span>
            <Ship size={15} aria-hidden="true" /> Sea
          </span>
          <span>
            <Plane size={15} aria-hidden="true" /> Air
          </span>
          <span>
            <Truck size={15} aria-hidden="true" /> Land
          </span>
        </div>
        <div className="trade-globe-controls">
          <span>
            <Move size={13} aria-hidden="true" /> Drag to explore
          </span>
          <button
            type="button"
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "Play globe animation" : "Pause globe animation"}
            aria-pressed={paused}
          >
            {paused ? (
              <Play size={14} aria-hidden="true" />
            ) : (
              <Pause size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
