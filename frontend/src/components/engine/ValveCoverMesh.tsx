import React from 'react';

interface ValveCoverMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const ValveCoverMesh: React.FC<ValveCoverMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  const coverMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#b91c1c'} // Performance Crinkle Crimson Red / Anodized
      metalness={0.75}
      roughness={0.38}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const polishedBilletMat = (
    <meshStandardMaterial
      color="#e2e8f0"
      metalness={0.96}
      roughness={0.12}
    />
  );

  return (
    <group
      name="valveCover"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Main Sculpted Valve Cover Shell */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.98, 0.22, 2.05]} />
        {coverMat}
      </mesh>

      {/* Top Chamfered Crown Deck */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.88, 0.03, 1.95]} />
        {coverMat}
      </mesh>

      {/* Center Recessed Spark Plug Well Channel */}
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[0.22, 0.04, 1.82]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.5} />
      </mesh>

      {/* 4 Spark Plug Boot Covers */}
      {[-0.78, -0.26, 0.26, 0.78].map((z, idx) => (
        <group key={`plug-boot-${idx}`} position={[0, 0.16, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.065, 0.07, 0.06, 20]} />
            <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.04, 12]} />
            <meshStandardMaterial color="#ff5e1e" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Polished Aluminum Longitudinal Twin Cooling Fins */}
      {[-0.28, 0.28].map((x, idx) => (
        <mesh key={`fin-${idx}`} position={[x, 0.135, 0]}>
          <boxGeometry args={[0.035, 0.02, 1.88]} />
          {polishedBilletMat}
        </mesh>
      ))}

      {/* Billet CNC Knurled Oil Filler Cap */}
      <group position={[0.3, 0.17, -0.65]}>
        {/* Cap Base Boss */}
        <mesh castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.05, 24]} />
          {polishedBilletMat}
        </mesh>
        {/* Knurled Grip Top */}
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.03, 8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>

      {/* Perimeter Mounting Flange & Bolts (10 ARP flange bolts) */}
      {[-0.92, -0.46, 0.0, 0.46, 0.92].map((z, idx) => (
        <React.Fragment key={`vc-bolt-${idx}`}>
          <mesh position={[-0.47, -0.09, z]}>
            <cylinderGeometry args={[0.016, 0.016, 0.03, 6]} />
            {polishedBilletMat}
          </mesh>
          <mesh position={[0.47, -0.09, z]}>
            <cylinderGeometry args={[0.016, 0.016, 0.03, 6]} />
            {polishedBilletMat}
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};
