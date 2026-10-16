import React from 'react';

interface ValvesMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const ValvesMesh: React.FC<ValvesMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  const cylinderZPositions = [-0.78, -0.26, 0.26, 0.78];

  const chromeStemMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#e2e8f0'}
      metalness={0.96}
      roughness={0.08}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const springMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff8844' : '#334155'}
      metalness={0.88}
      roughness={0.25}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.3 : 0}
    />
  );

  const retainerMat = (
    <meshStandardMaterial
      color="#cbd5e1"
      metalness={0.92}
      roughness={0.15}
    />
  );

  return (
    <group
      name="valves"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {cylinderZPositions.map((z, cIdx) => (
        <group key={`valves-cyl-${cIdx}`} position={[0, 0, z]}>
          {/* Dual Intake Valves (Left side: X = -0.16) */}
          {[-0.065, 0.065].map((zOff, vIdx) => (
            <group key={`intake-valv-${vIdx}`} position={[-0.16, 0, zOff]}>
              {/* Chrome Valve Stem */}
              <mesh position={[0, 0, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, 0.36, 16]} />
                {chromeStemMat}
              </mesh>
              {/* Flared Poppet Valve Head (Bottom) */}
              <mesh position={[0, -0.18, 0]}>
                <cylinderGeometry args={[0.012, 0.052, 0.025, 24]} />
                {chromeStemMat}
              </mesh>
              {/* Coiled Dual Valve Spring */}
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.035, 0.035, 0.18, 16, 1, true]} />
                {springMat}
              </mesh>
              {/* Top Spring Retainer & Keepers */}
              <mesh position={[0, 0.13, 0]}>
                <cylinderGeometry args={[0.038, 0.032, 0.02, 16]} />
                {retainerMat}
              </mesh>
            </group>
          ))}

          {/* Dual Exhaust Valves (Right side: X = +0.16) */}
          {[-0.065, 0.065].map((zOff, vIdx) => (
            <group key={`exhaust-valv-${vIdx}`} position={[0.16, 0, zOff]}>
              <mesh position={[0, 0, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, 0.36, 16]} />
                {chromeStemMat}
              </mesh>
              <mesh position={[0, -0.18, 0]}>
                <cylinderGeometry args={[0.012, 0.048, 0.025, 24]} />
                {chromeStemMat}
              </mesh>
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.033, 0.033, 0.18, 16, 1, true]} />
                {springMat}
              </mesh>
              <mesh position={[0, 0.13, 0]}>
                <cylinderGeometry args={[0.036, 0.03, 0.02, 16]} />
                {retainerMat}
              </mesh>
            </group>
          ))}

          {/* Center Spark Plug Assembly */}
          <group position={[0, 0.05, 0]}>
            {/* Threaded Hex Metal Body */}
            <mesh position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.028, 0.028, 0.08, 6]} />
              <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.25} />
            </mesh>
            {/* High-Grade White Ceramic Insulator Ribs */}
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.12, 16]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.05} roughness={0.2} />
            </mesh>
            {/* Brass / Copper Terminal Stud */}
            <mesh position={[0, 0.11, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.025, 12]} />
              <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.2} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};
