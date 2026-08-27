import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const GlobeScene = lazy(() => import("./three/globe-scene"));

export function HeroGlobe() {
  return (
    <div className="absolute inset-0">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <GlobeScene />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
