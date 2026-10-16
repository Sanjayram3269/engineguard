import React from 'react';

interface PistonsMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const PistonsMesh: React.FC<PistonsMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  // Cylinders along Z:
  // Cyl 1 & 4 at Top Dead Center (TDC) -> higher Y
  // Cyl 2 & 3 at Bottom Dead Center (BDC) -> lower Y
  const pistonData = [
    { z: -0.78, y: 0.28 }, // TDC
    { z: -0.26, y: -0.08 }, // BDC
    { z: 0.26, y: -0.08 }, // BDC
    { z: 0.78, y: 0.28 }  // TDC
  ];

  const pistonAluminumMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#d1d8e0'}
      metalness={0.92}
      roughness={0.18}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const ringChromeMat = (
    <meshStandardMaterial
      color="#222831"
      metalness={0.95}
      roughness={0.1}
    />
  );

  const wristPinMat = (
    <meshStandardMaterial
      color="#e2e8f0"
      metalness={0.98}
      roughness={0.08}
    />
  );

  return (
    <group
      name="pistons"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {pistonData.map((p, idx) => (
        <group key={`piston-${idx}`} position={[0, p.y, p.z]}>
          {/* Main Cylindrical Piston Crown & Body */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.205, 0.205, 0.28, 32]} />
            {pistonAluminumMat}
          </mesh>

          {/* Crown Top Domed Bevel */}
          <mesh position={[0, 0.145, 0]}>
            <cylinderGeometry args={[0.19, 0.205, 0.02, 32]} />
            {pistonAluminumMat}
          </mesh>

          {/* Valve Relief Pockets (Indents on piston crown for valve clearance) */}
          <mesh position={[-0.07, 0.15, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.015, 16]} />
            <meshStandardMaterial color="#88929e" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0.07, 0.15, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.015, 16]} />
            <meshStandardMaterial color="#88929e" metalness={0.85} roughness={0.3} />
          </mesh>

          {/* 3 Piston Compression & Oil Control Rings */}
          {[0.08, 0.04, 0.0].map((ringY, rIdx) => (
            <mesh key={`ring-${rIdx}`} position={[0, ringY, 0]}>
              <torusGeometry args={[0.206, 0.007, 8, 32]} />
              {ringChromeMat}
            </mesh>
          ))}

          {/* Piston Skirt Friction-Reduction Recesses (Front/Back) */}
          <mesh position={[0, -0.08, 0.19]}>
            <boxGeometry args={[0.16, 0.1, 0.02]} />
            <meshStandardMaterial color="#333942" metalness={0.6} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.08, -0.19]}>
            <boxGeometry args={[0.16, 0.1, 0.02]} />
            <meshStandardMaterial color="#333942" metalness={0.6} roughness={0.7} />
          </mesh>

          {/* Hardened Steel Floating Wrist Pin (Gudgeon Pin) */}
          <mesh position={[0, -0.04, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.38, 24]} />
            {wristPinMat}
          </mesh>
        </group>
      ))}
    </group>
  );
};
