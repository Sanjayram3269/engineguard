import React from 'react';

interface HeadGasketMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const HeadGasketMesh: React.FC<HeadGasketMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  const cylinderZPositions = [-0.78, -0.26, 0.26, 0.78];

  const gasketMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#b87333'} // Copper / Viton steel finish
      metalness={0.88}
      roughness={0.25}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const fireRingMat = (
    <meshStandardMaterial
      color="#e2e8f0"
      metalness={0.96}
      roughness={0.12}
    />
  );

  return (
    <group
      name="headGasket"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* MLS Gasket Thin Base Sheet */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[1.12, 0.012, 2.08]} />
        {gasketMat}
      </mesh>

      {/* 4 Embossed Stainless Steel Fire Rings around cylinder bores */}
      {cylinderZPositions.map((z, idx) => (
        <group key={`firering-${idx}`} position={[0, 0.007, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.225, 0.01, 8, 36]} />
            {fireRingMat}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.014, 0]}>
            <torusGeometry args={[0.225, 0.01, 8, 36]} />
            {fireRingMat}
          </mesh>
        </group>
      ))}

      {/* Oil & Coolant Gallery Transfer Eyelets (Embossed perimeter seals) */}
      {[-0.88, -0.4, 0.0, 0.4, 0.88].map((z, idx) => (
        <React.Fragment key={`passage-${idx}`}>
          <mesh position={[-0.42, 0.008, z]}>
            <cylinderGeometry args={[0.025, 0.025, 0.016, 12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.7} />
          </mesh>
          <mesh position={[0.42, 0.008, z]}>
            <cylinderGeometry args={[0.025, 0.025, 0.016, 12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.7} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};
