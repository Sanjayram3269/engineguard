import React from 'react';

interface ConnectingRodsMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const ConnectingRodsMesh: React.FC<ConnectingRodsMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  // Rod positions align between piston wrist pins and crankshaft pins
  // Crankpins are at y = -0.45, wrist pins at y = ~0.24 (TDC) or -0.12 (BDC)
  const rodData = [
    { z: -0.78, pinY: -0.45, wristY: 0.24 }, // Cyl 1 (TDC)
    { z: -0.26, pinY: -0.85, wristY: -0.12 }, // Cyl 2 (BDC)
    { z: 0.26, pinY: -0.85, wristY: -0.12 }, // Cyl 3 (BDC)
    { z: 0.78, pinY: -0.45, wristY: 0.24 }  // Cyl 4 (TDC)
  ];

  const rodSteelMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#47515c'}
      metalness={0.88}
      roughness={0.32}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const bronzeBushingMat = (
    <meshStandardMaterial
      color="#d4af37"
      metalness={0.8}
      roughness={0.25}
    />
  );

  const boltMat = (
    <meshStandardMaterial
      color="#cbd5e1"
      metalness={0.95}
      roughness={0.15}
    />
  );

  return (
    <group
      name="connectingRods"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {rodData.map((rod, idx) => {
        const midY = (rod.wristY + rod.pinY) / 2;
        const rodLength = Math.abs(rod.wristY - rod.pinY);

        return (
          <group key={`conrod-${idx}`} position={[0, 0, rod.z]}>
            {/* Small End Eye (Encloses wrist pin) */}
            <group position={[0, rod.wristY, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.075, 0.075, 0.1, 24]} />
                {rodSteelMat}
              </mesh>
              {/* Bronze Wrist Pin Bushing */}
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.105, 24, 1, true]} />
                {bronzeBushingMat}
              </mesh>
            </group>

            {/* H-Beam Rod Shank with Machined Flanges & Lightening Ribs */}
            <mesh position={[0, midY, 0]} castShadow>
              <boxGeometry args={[0.06, rodLength - 0.15, 0.07]} />
              {rodSteelMat}
            </mesh>
            {/* H-Beam Center Web Recesses (Left & Right) */}
            <mesh position={[-0.035, midY, 0]}>
              <boxGeometry args={[0.015, rodLength - 0.18, 0.045]} />
              <meshStandardMaterial color="#2d333b" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[0.035, midY, 0]}>
              <boxGeometry args={[0.015, rodLength - 0.18, 0.045]} />
              <meshStandardMaterial color="#2d333b" metalness={0.8} roughness={0.4} />
            </mesh>

            {/* Big End Journal Housing & Split Rod Cap */}
            <group position={[0, rod.pinY, 0]}>
              {/* Upper Rod Journal Saddle */}
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.13, 0.13, 0.12, 32, 1, false, 0, Math.PI]} />
                {rodSteelMat}
              </mesh>
              {/* Lower Split Rod Bearing Cap */}
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} castShadow>
                <cylinderGeometry args={[0.13, 0.13, 0.12, 32, 1, false, Math.PI, Math.PI]} />
                {rodSteelMat}
              </mesh>
              {/* Dual High-Tensile Rod Bolts (ARP style hex studs) */}
              <mesh position={[-0.14, 0, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.018, 0.018, 0.16, 6]} />
                {boltMat}
              </mesh>
              <mesh position={[0.14, 0, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.018, 0.018, 0.16, 6]} />
                {boltMat}
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};
