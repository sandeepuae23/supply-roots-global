import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useState } from "react";
import { MODE_LABEL, TIMELINE_LANES } from "@/data/trade-lanes";

const GlobeScene = lazy(() => import("./three/globe-scene"));

export function RouteTimeline() {
  const [playToken, setPlayToken] = useState(0);
  const [stage, setStage] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const handleStage = useCallback((i: number) => setStage(i), []);
  const handleComplete = useCallback(() => {
    setStage(TIMELINE_LANES.length - 1);
    setPlaying(false);
  }, []);

  const play = () => {
    setStage(0);
    setPlaying(true);
    setPlayToken((t) => t + 1);
  };

  const current = stage >= 0 ? TIMELINE_LANES[stage] : undefined;
  const progress = stage < 0 ? 0 : ((stage + (playing ? 1 : 1)) / TIMELINE_LANES.length) * 100;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div className="glass-panel relative aspect-square overflow-hidden rounded-sm">
        <ClientOnly fallback={null}>
          <Suspense fallback={null}>
            <GlobeScene timeline playToken={playToken} onStage={handleStage} onComplete={handleComplete} />
          </Suspense>
        </ClientOnly>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
          <div className="pointer-events-auto flex flex-wrap items-center gap-4">
            <button type="button" onClick={play} className="btn-accent" aria-live="polite">
              {playing ? "Playing Route…" : stage >= 0 ? "Replay Route" : "Show Route"}
            </button>
            {current && (
              <span className="rounded-sm bg-background/80 px-3 py-1.5 text-xs font-medium tracking-wide text-primary">
                {MODE_LABEL[current.mode]} · Leg {stage + 1} of {TIMELINE_LANES.length}
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <span className="eyebrow">Route Playback</span>
        <h2 className="mb-4 font-serif text-3xl text-primary">Follow a Shipment End to End</h2>
        <p className="mb-6 max-w-prose text-sm text-muted-foreground">
          Press Show Route to watch a consignment travel our sea, air and land corridors — from origin sourcing through
          our Dubai consolidation hub and out to buyers in Europe, Africa and the Gulf.
        </p>

        <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${stage < 0 ? 0 : progress}%` }}
          />
        </div>

        <ol className="space-y-3">
          {TIMELINE_LANES.map((leg, i) => {
            const isActive = i === stage;
            const isDone = stage > i || (!playing && stage === TIMELINE_LANES.length - 1 && i <= stage);
            return (
              <li
                key={leg.label}
                className={`flex gap-4 rounded-sm border p-4 transition-colors ${
                  isActive
                    ? "border-accent bg-accent/10"
                    : isDone
                      ? "border-primary/25 bg-card"
                      : "border-border bg-card/50 opacity-60"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive || isDone ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-primary">{leg.label}</p>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{MODE_LABEL[leg.mode]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{leg.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
