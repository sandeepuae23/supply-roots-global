import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, useTexture } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import earthMap from "@/assets/earth-map.jpg";

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

const HUBS: { name: string; lat: number; lon: number }[] = [
  { name: "Dubai", lat: 25.2, lon: 55.3 },
  { name: "Mumbai", lat: 19.1, lon: 72.9 },
  { name: "Riyadh", lat: 24.7, lon: 46.7 },
  { name: "Doha", lat: 25.3, lon: 51.5 },
  { name: "Rotterdam", lat: 51.9, lon: 4.5 },
  { name: "Mombasa", lat: -4.0, lon: 39.7 },
  { name: "Singapore", lat: 1.35, lon: 103.8 },
  { name: "Cairo", lat: 30.0, lon: 31.2 },
];

const LANES: [number, number][] = [
  [1, 0],
  [0, 4],
  [1, 2],
  [0, 3],
  [1, 6],
  [5, 0],
  [7, 4],
  [6, 0],
];

const R = 2;

function Arc({ from, to, delay }: { from: THREE.Vector3; to: THREE.Vector3; delay: number }) {
  const curve = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const lift = 1 + from.distanceTo(to) * 0.28;
    mid.normalize().multiplyScalar(R * lift);
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to]);

  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.012, 8, false), [curve]);
  const dotRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!dotRef.current) return;
    const t = (clock.elapsedTime * 0.16 + delay) % 1;
    const p = curve.getPoint(t);
    dotRef.current.position.copy(p);
  });

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#d97706" emissive="#d97706" emissiveIntensity={0.7} roughness={0.4} />
      </mesh>
      <mesh ref={dotRef}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Globe() {
  const map = useTexture(earthMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const group = useRef<THREE.Group>(null);
  const points = useMemo(() => HUBS.map((h) => latLonToVec3(h.lat, h.lon, R * 1.005)), []);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.06;
  });

  return (
    <group ref={group} rotation={[0.12, -1.1, 0.16]}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[R, 96, 96]} />
        <meshStandardMaterial map={map} roughness={0.75} metalness={0.05} />
      </mesh>

      {/* Atmosphere shell */}
      <mesh scale={1.045}>
        <sphereGeometry args={[R, 64, 64]} />
        <meshBasicMaterial color="#7dd3c0" transparent opacity={0.09} side={THREE.BackSide} />
      </mesh>

      {points.map((p, i) => (
        <mesh key={HUBS[i]!.name} position={p}>
          <sphereGeometry args={[0.038, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.8} toneMapped={false} />
        </mesh>
      ))}

      {LANES.map(([a, b], i) => (
        <Arc key={`${a}-${b}-${i}`} from={points[a]!} to={points[b]!} delay={i / LANES.length} />
      ))}
    </group>
  );
}

export default function GlobeScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 1.1, 6.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 4, 5]} intensity={2.2} castShadow />
      <directionalLight position={[-6, -2, -4]} intensity={0.5} color="#8fb3a5" />
      <Suspense fallback={null}>
        <Globe />
        <Environment>
          <Lightformer intensity={1.6} position={[0, 5, 2]} scale={[10, 10, 1]} />
          <Lightformer intensity={0.8} color="#f5b971" position={[-5, 1, -2]} rotation-y={Math.PI / 2} scale={[16, 4, 1]} />
        </Environment>
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={false} minPolarAngle={0.8} maxPolarAngle={2.2} />
    </Canvas>
  );
}
