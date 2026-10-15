import React from 'react';

interface IntakeManifoldMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const IntakeManifoldMesh: React.FC<IntakeManifoldMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  const cylinderZPositions = [-0.78, -0.26, 0.26, 0.78];

  const plenumMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#4b5563'} // Cast aluminum / composite
      metalness={0.82}
      roughness={0.3}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const throttleMat = (
    <meshStandardMaterial
      color="#cbd5e1"
      metalness={0.92}
      roughness={0.15}
    />
  );

  return (
    <group
      name="intakeManifold"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Central Cylindrical Intake Plenum Chamber */}
      <mesh position={[-0.32, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 1.95, 24]} />
        {plenumMat}
      </mesh>

      {/* 4 Sweeping Ram-Air Intake Runners */}
      {cylinderZPositions.map((z, idx) => (
        <group key={`runner-${idx}`} position={[0, 0, z]}>
          {/* Runner Tube connecting Plenum to Cylinder Head */}
          <mesh position={[-0.16, 0.06, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
            <cylinderGeometry args={[0.065, 0.075, 0.38, 20]} />
            {plenumMat}
          </mesh>
          {/* Mating Flange to Cylinder Head Port */}
          <mesh position={[0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.22, 0.03, 0.22]} />
            <meshStandardMaterial color="#374151" metalness={0.85} roughness={0.35} />
          </mesh>
        </group>
      ))}

      {/* Throttle Body Assembly (Front entry: +Z) */}
      <group position={[-0.32, 0.12, 1.08]}>
        {/* Throttle Body Barrel */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.22, 24]} />
          {throttleMat}
        </mesh>
        {/* Throttle Bellmouth Intake Horn */}
        <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.02, 12, 32]} />
          {throttleMat}
        </mesh>
        {/* Brass Throttle Shaft & Linkage Arm */}
        <mesh position={[0.14, 0, 0]}>
          <boxGeometry args={[0.04, 0.12, 0.06]} />
          <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};
