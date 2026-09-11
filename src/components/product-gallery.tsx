import { useState } from "react";
import { SmartImage } from "@/components/smart-image";

export interface ProductGalleryProps {
  images: string[];
  alt: string;
}

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [];
  const current = list[active] ?? list[0];

  if (!current) return null;

  return (
    <div role="group" aria-label={`${alt} image gallery`}>
      <div className="surface-3d overflow-hidden rounded-sm">
        <SmartImage
          key={current}
          src={current}
          alt={`${alt} — image ${active + 1} of ${list.length}`}
          width={800}
          height={800}
          priority={active === 0}
          fetchPriority={active === 0 ? "high" : undefined}
          sizes="(max-width: 1024px) 100vw, 600px"
          className="aspect-square w-full object-cover"
        />
      </div>

      {list.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {list.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View ${alt} image ${i + 1} of ${list.length}`}
              aria-current={i === active}
              className={`overflow-hidden rounded-sm border transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                i === active ? "border-accent" : "border-border hover:border-accent/50"
              }`}
            >
              <SmartImage
                src={src}
                alt={`${alt} thumbnail ${i + 1}`}
                width={200}
                height={200}
                sizes="120px"
                className="aspect-square w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
      {list.length > 1 && (
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
          Image {active + 1} of {list.length} · Select a thumbnail to view
        </p>
      )}
    </div>
  );
}
