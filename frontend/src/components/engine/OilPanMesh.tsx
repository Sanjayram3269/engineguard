import React from 'react';

interface OilPanMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const OilPanMesh: React.FC<OilPanMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  const panMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#1e242c'} // Stamped black steel / satin anthracite
      metalness={0.82}
      roughness={0.4}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const boltMat = (
    <meshStandardMaterial
      color="#cbd5e1"
      metalness={0.92}
      roughness={0.2}
    />
  );

  return (
    <group
      name="oilPan"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Upper Mounting Flange (Mates to bottom deck of engine block) */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[1.18, 0.03, 2.14]} />
        {panMat}
      </mesh>

      {/* Main Oil Sump Reservoir Body (Deeper towards the rear pickup) */}
      <mesh position={[0, -0.22, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.96, 0.42, 1.65]} />
        {panMat}
      </mesh>

      {/* Front Shallow Windage Clearance Trough */}
      <mesh position={[0, -0.11, 0.78]} castShadow>
        <boxGeometry args={[0.96, 0.2, 0.45]} />
        {panMat}
      </mesh>

      {/* Longitudinal Cooling & Stiffening Ribs on Sump Bottom */}
      {[-0.32, -0.16, 0.0, 0.16, 0.32].map((x, idx) => (
        <mesh key={`sump-rib-${idx}`} position={[x, -0.44, -0.15]} castShadow>
          <boxGeometry args={[0.03, 0.04, 1.55]} />
          <meshStandardMaterial color="#333b47" metalness={0.85} roughness={0.35} />
        </mesh>
      ))}

      {/* Magnetic Brass Drain Plug & Washer */}
      <group position={[0.49, -0.32, -0.75]} rotation={[0, 0, Math.PI / 2]}>
        {/* Drain Plug Hex Head */}
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.035, 6]} />
          <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Copper Crush Washer */}
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.01, 16]} />
          <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>

      {/* Perimeter Mounting Sump Bolts (12 perimeter hex bolts) */}
      {[-0.95, -0.55, -0.15, 0.25, 0.65, 0.95].map((z, idx) => (
        <React.Fragment key={`pan-bolt-${idx}`}>
          <mesh position={[-0.54, 0.015, z]}>
            <cylinderGeometry args={[0.015, 0.015, 0.025, 6]} />
            {boltMat}
          </mesh>
          <mesh position={[0.54, 0.015, z]}>
            <cylinderGeometry args={[0.015, 0.015, 0.025, 6]} />
            {boltMat}
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};
