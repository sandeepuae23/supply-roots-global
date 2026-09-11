import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import earthMap from "@/assets/earth-map.jpg";
import { HUBS, LANES, TIMELINE_LANES, type LaneMode } from "@/data/trade-lanes";

/** Convert lat/lon (degrees) to a point on a sphere of the given radius. */
function latLonToVec3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

type Mode = LaneMode;

const MODE_STYLE: Record<
  Mode,
  { color: string; emissive: string; lift: number; speed: number; tube: number }
> = {
  sea: { color: "#7dcbbb", emissive: "#397d70", lift: 0.1, speed: 0.09, tube: 0.005 },
  air: { color: "#e6c581", emissive: "#a7803e", lift: 0.34, speed: 0.2, tube: 0.005 },
  land: { color: "#dca48b", emissive: "#9a6550", lift: 0.18, speed: 0.13, tube: 0.005 },
};

const R = 2;

/**
 * Moving cargo icons built from primitives.
 * The parent group uses lookAt(), so +Z is the forward direction of travel.
 */

function ShipIcon() {
  const hull = "#0f766e";
  const glow = "#2dd4bf";
  return (
    <group scale={1.05}>
      {/* hull — wider at back, tapering to the bow (+Z) */}
      <mesh position={[0, 0.012, -0.01]}>
        <boxGeometry args={[0.05, 0.024, 0.11]} />
        <meshStandardMaterial color={hull} emissive={glow} emissiveIntensity={0.25} />
      </mesh>
      {/* bow wedge */}
      <mesh position={[0, 0.012, 0.055]} rotation-y={Math.PI / 4}>
        <boxGeometry args={[0.036, 0.024, 0.036]} />
        <meshStandardMaterial color={hull} emissive={glow} emissiveIntensity={0.25} />
      </mesh>
      {/* container stacks */}
      {(
        [
          [-0.028, "#f59e0b", "#f59e0b"],
          [-0.004, "#e2e8f0", "#94a3b8"],
          [0.02, "#dc2626", "#dc2626"],
        ] as [number, string, string][]
      ).map(([z, color, emissive], i) => (
        <mesh key={i} position={[0, 0.036, z]}>
          <boxGeometry args={[0.038, 0.016, 0.02]} />
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.25} />
        </mesh>
      ))}
      {/* bridge tower at the stern */}
      <mesh position={[0, 0.042, -0.042]}>
        <boxGeometry args={[0.04, 0.028, 0.014]} />
        <meshStandardMaterial color="#f8fafc" emissive="#cbd5e1" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function PlaneIcon() {
  const body = "#fde68a";
  const glow = "#f59e0b";
  return (
    <group scale={1.05}>
      {/* fuselage pointing along +Z */}
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.011, 0.011, 0.095, 10]} />
        <meshStandardMaterial color={body} emissive={glow} emissiveIntensity={0.25} />
      </mesh>
      {/* nose cone */}
      <mesh position={[0, 0, 0.058]} rotation-x={Math.PI / 2}>
        <coneGeometry args={[0.011, 0.026, 10]} />
        <meshStandardMaterial color={body} emissive={glow} emissiveIntensity={0.25} />
      </mesh>
      {/* main wings — swept back slightly */}
      <mesh position={[0, 0, 0.004]} rotation-y={0}>
        <boxGeometry args={[0.115, 0.004, 0.026]} />
        <meshStandardMaterial color={body} emissive={glow} emissiveIntensity={0.25} />
      </mesh>
      {/* tail wings */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[0.05, 0.003, 0.014]} />
        <meshStandardMaterial color={body} emissive={glow} emissiveIntensity={0.25} />
      </mesh>
      {/* vertical tail fin */}
      <mesh position={[0, 0.014, -0.042]}>
        <boxGeometry args={[0.003, 0.024, 0.016]} />
        <meshStandardMaterial color={body} emissive={glow} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function TruckIcon() {
  const cab = "#ea580c";
  const glow = "#fb923c";
  const wheel = "#1c1917";
  return (
    <group scale={1.05}>
      {/* trailer / container box at the rear */}
      <mesh position={[0, 0.026, -0.022]}>
        <boxGeometry args={[0.034, 0.032, 0.062]} />
        <meshStandardMaterial color="#fff7ed" emissive={glow} emissiveIntensity={0.25} />
      </mesh>
      {/* cab at the front */}
      <mesh position={[0, 0.02, 0.03]}>
        <boxGeometry args={[0.032, 0.024, 0.022]} />
        <meshStandardMaterial color={cab} emissive={cab} emissiveIntensity={0.25} />
      </mesh>
      {/* windshield */}
      <mesh position={[0, 0.028, 0.0415]}>
        <boxGeometry args={[0.026, 0.01, 0.002]} />
        <meshStandardMaterial color="#bae6fd" emissive="#7dd3fc" emissiveIntensity={0.25} />
      </mesh>
      {/* wheels */}
      {[-0.038, -0.006, 0.03].map((z, i) =>
        [-0.018, 0.018].map((x, j) => (
          <mesh key={`${i}-${j}`} position={[x, 0.008, z]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.008, 0.008, 0.006, 10]} />
            <meshStandardMaterial color={wheel} />
          </mesh>
        )),
      )}
    </group>
  );
}

function CargoMarker({ mode }: { mode: Mode }) {
  if (mode === "air") return <PlaneIcon />;
  if (mode === "sea") return <ShipIcon />;
  return <TruckIcon />;
}

function Lane({
  from,
  to,
  mode,
  delay,
  paused,
  label,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  mode: Mode;
  delay: number;
  paused: boolean;
  label: string;
}) {
  const style = MODE_STYLE[mode];

  const curve = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const lift = 1 + from.distanceTo(to) * style.lift;
    mid.normalize().multiplyScalar(R * lift);
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to, style.lift]);

  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, 64, style.tube, 8, false),
    [curve, style.tube],
  );
  const hitGeometry = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.035, 5, false), [curve]);
  const cargoRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const progress = useRef(delay);
  useFrame((_, delta) => {
    if (!cargoRef.current) return;
    if (!paused) progress.current += delta * style.speed * 0.55;
    const t = progress.current % 1;
    const p = curve.getPoint(t);
    cargoRef.current.position.copy(p);
    // orient cargo along the lane direction
    const tangent = curve.getTangent(t).normalize();
    const target = p.clone().add(tangent);
    cargoRef.current.lookAt(target);
    particlesRef.current?.children.forEach((particle, index) => {
      particle.position.copy(curve.getPoint((t - index * 0.035 + 1) % 1));
    });
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={style.color}
          emissive={style.emissive}
          emissiveIntensity={0.7}
          roughness={0.4}
          transparent
          opacity={mode === "sea" ? 0.85 : 1}
        />
      </mesh>
      <mesh
        geometry={hitGeometry}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={cargoRef}>
        <CargoMarker mode={mode} />
      </group>
      <group ref={particlesRef}>
        {[0, 1, 2].map((index) => (
          <mesh key={index}>
            <sphereGeometry args={[0.011 - index * 0.002, 8, 8]} />
            <meshBasicMaterial color={style.color} transparent opacity={0.8 - index * 0.18} />
          </mesh>
        ))}
      </group>
      {hovered && (
        <Html position={curve.getPoint(0.52)} center distanceFactor={7} zIndexRange={[20, 0]}>
          <div className="trade-route-tooltip">{label}</div>
        </Html>
      )}
    </group>
  );
}

function HubMarker({
  position,
  name,
  paused,
  interactive = false,
  featured = false,
  selected = false,
  onSelect,
}: {
  position: THREE.Vector3;
  name: string;
  paused: boolean;
  interactive?: boolean;
  featured?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useFrame(({ clock }) => {
    if (!pulseRef.current || paused) return;
    const s = 1 + 0.35 * Math.sin(clock.elapsedTime * 2 + position.x * 5);
    pulseRef.current.scale.setScalar(s);
  });
  return (
    <group position={position} key={name}>
      <mesh
        scale={selected ? 1.35 : 1}
        {...(interactive
          ? {
              onClick: (event: { stopPropagation: () => void }) => {
                event.stopPropagation();
                onSelect?.();
              },
              onPointerOver: (event: { stopPropagation: () => void }) => {
                event.stopPropagation();
                setHovered(true);
              },
              onPointerOut: (event: { stopPropagation: () => void }) => {
                event.stopPropagation();
                setHovered(false);
              },
            }
          : {})}
      >
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.25} />
      </mesh>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} />
      </mesh>
      {interactive && (featured || hovered) && (
        <Html position={[0, 0.09, 0]} center distanceFactor={7.5} occlude zIndexRange={[15, 0]}>
          <button
            type="button"
            className="trade-hub-label"
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.();
            }}
          >
            <span />
            {name}
          </button>
        </Html>
      )}
    </group>
  );
}

/** A single leg of the "Show Route" timeline: the tube draws in as the cargo travels. */
function TimelineLane({
  index,
  from,
  to,
  mode,
  state,
}: {
  index: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  mode: Mode;
  state: React.RefObject<{ index: number; t: number; done: boolean }>;
}) {
  const style = MODE_STYLE[mode];

  const curve = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const lift = 1 + from.distanceTo(to) * style.lift;
    mid.normalize().multiplyScalar(R * lift);
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to, style.lift]);

  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, 64, style.tube, 8, false),
    [curve, style.tube],
  );
  const totalIndices = geometry.index ? geometry.index.count : 0;

  const tubeRef = useRef<THREE.Mesh>(null);
  const cargoRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const s = state.current;
    if (!s) return;
    const active = s.index === index && !s.done;
    const passed = s.done || s.index > index;
    const reveal = passed ? 1 : active ? s.t : 0;

    geometry.setDrawRange(0, Math.max(2, Math.floor(totalIndices * reveal)));
    if (tubeRef.current) tubeRef.current.visible = reveal > 0.001;
    if (matRef.current) matRef.current.opacity = active ? 1 : passed ? 0.4 : 0;

    if (cargoRef.current) {
      cargoRef.current.visible = active;
      if (active) {
        const p = curve.getPoint(s.t);
        cargoRef.current.position.copy(p);
        cargoRef.current.lookAt(p.clone().add(curve.getTangent(s.t).normalize()));
      }
    }
  });

  return (
    <group>
      <mesh ref={tubeRef} geometry={geometry}>
        <meshStandardMaterial
          ref={matRef}
          color={style.color}
          emissive={style.emissive}
          emissiveIntensity={1}
          roughness={0.4}
          transparent
          opacity={0}
        />
      </mesh>
      <group ref={cargoRef} visible={false}>
        <CargoMarker mode={mode} />
      </group>
    </group>
  );
}

function TimelineRunner({
  playToken,
  onStage,
  onComplete,
  stateRef,
}: {
  playToken: number;
  onStage: (i: number) => void;
  onComplete: () => void;
  stateRef: React.RefObject<{ index: number; t: number; done: boolean }>;
}) {
  useEffect(() => {
    if (!stateRef.current) return;
    if (playToken === 0) {
      stateRef.current.index = 0;
      stateRef.current.t = 0;
      stateRef.current.done = true;
      return;
    }
    stateRef.current.index = 0;
    stateRef.current.t = 0;
    stateRef.current.done = false;
    onStage(0);
  }, [playToken, onStage, stateRef]);

  useFrame((_, delta) => {
    const s = stateRef.current;
    if (!s || s.done) return;
    const leg = TIMELINE_LANES[s.index];
    if (!leg) return;
    s.t += delta * (MODE_STYLE[leg.mode].speed * 1.6);
    if (s.t >= 1) {
      s.t = 0;
      s.index += 1;
      if (s.index >= TIMELINE_LANES.length) {
        s.index = TIMELINE_LANES.length - 1;
        s.t = 1;
        s.done = true;
        onComplete();
      } else {
        onStage(s.index);
      }
    }
  });

  return null;
}

type GlobeProps = {
  paused?: boolean | undefined;
  activeMode?: Mode | "all" | undefined;
  onHubSelect?: ((name: string) => void) | undefined;
  timeline?: boolean | undefined;
  playToken?: number | undefined;
  onStage?: ((i: number) => void) | undefined;
  onComplete?: (() => void) | undefined;
};

function Globe({
  timeline = false,
  playToken = 0,
  onStage,
  onComplete,
  paused = false,
  activeMode = "all",
  onHubSelect,
}: GlobeProps) {
  const map = useTexture(earthMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const group = useRef<THREE.Group>(null);
  const points = useMemo(() => HUBS.map((h) => latLonToVec3(h.lat, h.lon, R * 1.005)), []);
  const stateRef = useRef({ index: 0, t: 0, done: true });

  useFrame((_, delta) => {
    if (group.current && !paused) group.current.rotation.y += delta * (timeline ? 0.025 : 0.018);
  });

  return (
    // initial yaw ~ -2.05 so the Gulf / Indian Ocean hubs face the camera
    <group ref={group} rotation={[0.14, -2.05, 0.14]}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[R, 96, 96]} />
        <meshStandardMaterial map={map} roughness={0.75} metalness={0.05} />
      </mesh>

      {/* Atmosphere shell */}
      <mesh scale={1.035}>
        <sphereGeometry args={[R, 64, 64]} />
        <meshBasicMaterial
          color="#7dd3c0"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {points.map((p, i) => (
        <HubMarker
          key={HUBS[i]!.name}
          position={p}
          name={HUBS[i]!.name}
          paused={paused}
          interactive={!timeline}
          featured={["Dubai", "Mumbai", "Singapore", "Rotterdam", "Mombasa"].includes(
            HUBS[i]!.name,
          )}
          onSelect={() => onHubSelect?.(HUBS[i]!.name)}
        />
      ))}

      {timeline ? (
        <>
          <TimelineRunner
            playToken={playToken}
            stateRef={stateRef}
            onStage={onStage ?? (() => {})}
            onComplete={onComplete ?? (() => {})}
          />
          {TIMELINE_LANES.map((leg, i) => (
            <TimelineLane
              key={`${leg.from}-${leg.to}-${i}`}
              index={i}
              from={points[leg.from]!}
              to={points[leg.to]!}
              mode={leg.mode}
              state={stateRef}
            />
          ))}
        </>
      ) : (
        LANES.filter(([, , mode]) => activeMode === "all" || mode === activeMode).map(
          ([a, b, mode], i) => (
            <Lane
              key={`${a}-${b}-${mode}-${i}`}
              from={points[a]!}
              to={points[b]!}
              mode={mode}
              delay={i / LANES.length}
              paused={paused}
              label={`${HUBS[a]!.name} → ${HUBS[b]!.name}`}
            />
          ),
        )
      )}
    </group>
  );
}

export default function GlobeScene({
  timeline,
  playToken,
  onStage,
  onComplete,
  paused = false,
  activeMode = "all",
  onHubSelect,
}: GlobeProps = {}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{
        position: [0, timeline ? 1.1 : 0.6, timeline ? 7.4 : 6.7],
        fov: timeline ? 42 : 40,
      }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      fallback={
        <div className="trade-globe-static">
          <img src={earthMap} alt="Global trade network preview" />
        </div>
      }
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 4, 5]} intensity={1.4} />
      <directionalLight position={[-6, -2, -4]} intensity={0.5} color="#8fb3a5" />
      <Suspense fallback={null}>
        <Globe
          paused={paused || reducedMotion}
          activeMode={activeMode}
          onHubSelect={onHubSelect}
          timeline={timeline}
          playToken={playToken}
          onStage={onStage}
          onComplete={onComplete}
        />
        <Environment>
          <Lightformer intensity={1.6} position={[0, 5, 2]} scale={[10, 10, 1]} />
          <Lightformer
            intensity={0.8}
            color="#f5b971"
            position={[-5, 1, -2]}
            rotation-y={Math.PI / 2}
            scale={[16, 4, 1]}
          />
        </Environment>
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={false}
        minPolarAngle={0.8}
        maxPolarAngle={2.2}
      />
    </Canvas>
  );
}
