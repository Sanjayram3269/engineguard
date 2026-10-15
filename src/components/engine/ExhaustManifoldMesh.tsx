import React from 'react';

interface ExhaustManifoldMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const ExhaustManifoldMesh: React.FC<ExhaustManifoldMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  const cylinderZPositions = [-0.78, -0.26, 0.26, 0.78];

  const stainlessMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#b0b8c2'} // T304 Stainless steel
      metalness={0.92}
      roughness={0.22}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const heatTintMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff8844' : '#6b7280'} // Thermal oxide patina near exhaust ports
      metalness={0.9}
      roughness={0.28}
    />
  );

  return (
    <group
      name="exhaustManifold"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* 4 Sweeping Mandrel-Bent Primary Header Tubes */}
      {cylinderZPositions.map((z, idx) => {
        // Bend angles towards center collector at Z = 0
        const zAngle = -z * 0.45;

        return (
          <group key={`header-${idx}`} position={[0, 0, z]}>
            {/* Header Port Flange Mount to Head */}
            <mesh position={[-0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.2, 0.035, 0.2]} />
              <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.35} />
            </mesh>

            {/* Primary Tube Section 1 (Outward sweep) */}
            <mesh position={[0.16, -0.06, 0]} rotation={[0, zAngle, Math.PI / 3.5]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.38, 20]} />
              {heatTintMat}
            </mesh>

            {/* Primary Tube Section 2 (Downward sweep converging to collector) */}
            <mesh position={[0.34, -0.26, -z * 0.55]} rotation={[0, zAngle * 0.6, Math.PI / 6]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 0.36, 20]} />
              {stainlessMat}
            </mesh>
          </group>
        );
      })}

      {/* 4-into-1 Merge Collector Pipe */}
      <group position={[0.42, -0.44, 0]}>
        {/* Collector Cone Transition */}
        <mesh rotation={[0, 0, -Math.PI / 8]} castShadow>
          <cylinderGeometry args={[0.12, 0.16, 0.28, 24]} />
          {stainlessMat}
        </mesh>
        {/* Downstream Exhaust Flange Pipe */}
        <mesh position={[0.06, -0.18, 0]} rotation={[0, 0, -Math.PI / 8]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.16, 24]} />
          {stainlessMat}
        </mesh>
        {/* 3-Bolt Exhaust Connecting Flange */}
        <mesh position={[0.1, -0.28, 0]} rotation={[0, 0, -Math.PI / 8]}>
          <cylinderGeometry args={[0.18, 0.18, 0.03, 3]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};
