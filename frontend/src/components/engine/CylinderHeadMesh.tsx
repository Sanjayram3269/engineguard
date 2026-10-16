import React from 'react';

interface CylinderHeadMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const CylinderHeadMesh: React.FC<CylinderHeadMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  const cylinderZPositions = [-0.78, -0.26, 0.26, 0.78];

  const headAluminumMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#7b8794'}
      metalness={0.86}
      roughness={0.32}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const machinedDeckMat = (
    <meshStandardMaterial
      color="#cbd5e1"
      metalness={0.92}
      roughness={0.18}
    />
  );

  return (
    <group
      name="cylinderHead"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Main Cast Aluminum Cylinder Head Body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.08, 0.42, 2.05]} />
        {headAluminumMat}
      </mesh>

      {/* Machined Bottom Mating Deck (Sits on top of Head Gasket) */}
      <mesh position={[0, -0.215, 0]} receiveShadow>
        <boxGeometry args={[1.1, 0.015, 2.08]} />
        {machinedDeckMat}
      </mesh>

      {/* Machined Pent-Roof Combustion Chambers (Bottom surface) */}
      {cylinderZPositions.map((z, idx) => (
        <group key={`chamber-${idx}`} position={[0, -0.21, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.21, 0.21, 0.02, 24]} />
            <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Central Spark Plug Thread Hole */}
          <mesh>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Spark Plug Access Wells & Tubes (Top surface) */}
      {cylinderZPositions.map((z, idx) => (
        <group key={`plug-well-${idx}`} position={[0, 0.15, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.2, 20]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Intake Runner Port Inlets (Left side: -X) */}
      {cylinderZPositions.map((z, idx) => (
        <group key={`intake-port-${idx}`} position={[-0.545, 0.02, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.04, 20]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.4} />
          </mesh>
          {/* Intake Flange Mount Studs */}
          <mesh position={[0, 0.1, 0.06]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.05, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.1, -0.06]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.05, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Exhaust Runner Port Outlets (Right side: +X) */}
      {cylinderZPositions.map((z, idx) => (
        <group key={`exhaust-port-${idx}`} position={[0.545, -0.02, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.075, 0.075, 0.04, 20]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.5} />
          </mesh>
          {/* Exhaust Flange Mount Studs */}
          <mesh position={[0, 0.09, 0.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.05, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.09, -0.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.05, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Camshaft Bearing Bridge Pillars (Supporting DOHC camshafts) */}
      {[-0.92, -0.52, 0.0, 0.52, 0.92].map((z, idx) => (
        <group key={`cam-tower-${idx}`} position={[0, 0.23, z]}>
          {/* Intake Cam Saddle (Left) */}
          <mesh position={[-0.24, 0, 0]} castShadow>
            <boxGeometry args={[0.12, 0.08, 0.07]} />
            {headAluminumMat}
          </mesh>
          {/* Exhaust Cam Saddle (Right) */}
          <mesh position={[0.24, 0, 0]} castShadow>
            <boxGeometry args={[0.12, 0.08, 0.07]} />
            {headAluminumMat}
          </mesh>
        </group>
      ))}
    </group>
  );
};
