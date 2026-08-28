import type { ImgHTMLAttributes } from "react";

// Build a lookup from the emitted URL of every original asset to its
// responsive AVIF/WebP variants, so callers can keep importing the .jpg.
const originals = import.meta.glob("@/assets/*.jpg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const variants = import.meta.glob("@/assets/*-{640,1024}.{avif,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function baseName(path: string) {
  return path.split("/").pop()!.replace(/\.[a-z0-9]+$/i, "");
}

type VariantSet = { avif: string[]; webp: string[] };

const bySource: Record<string, VariantSet> = {};

for (const [path, url] of Object.entries(originals)) {
  const base = baseName(path);
  const set: VariantSet = { avif: [], webp: [] };
  for (const width of [640, 1024]) {
    for (const ext of ["avif", "webp"] as const) {
      const match = Object.entries(variants).find(
        ([p]) => baseName(p) === `${base}-${width}` && p.endsWith(`.${ext}`),
      );
      if (match) set[ext].push(`${match[1]} ${width}w`);
    }
  }
  if (set.avif.length || set.webp.length) bySource[url] = set;
}

export interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** `sizes` hint for the responsive srcset. */
  sizes?: string;
  /** Set for above-the-fold images to skip lazy loading. */
  priority?: boolean;
}

export function SmartImage({
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, 640px",
  priority = false,
  ...rest
}: SmartImageProps) {
  const set = bySource[src];
  const img = (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
      {...rest}
    />
  );

  if (!set) return img;

  return (
    <picture>
      {set.avif.length > 0 && (
        <source type="image/avif" srcSet={set.avif.join(", ")} sizes={sizes} />
      )}
      {set.webp.length > 0 && (
        <source type="image/webp" srcSet={set.webp.join(", ")} sizes={sizes} />
      )}
      {img}
    </picture>
  );
}
