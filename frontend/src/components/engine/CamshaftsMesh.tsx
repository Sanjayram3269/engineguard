import React from 'react';

interface CamshaftsMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const CamshaftsMesh: React.FC<CamshaftsMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  const cylinderZPositions = [-0.78, -0.26, 0.26, 0.78];

  const camSteelMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#a0abb7'}
      metalness={0.92}
      roughness={0.16}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const lobeMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff8844' : '#e2e8f0'}
      metalness={0.97}
      roughness={0.08}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const sprocketMat = (
    <meshStandardMaterial
      color="#475569"
      metalness={0.88}
      roughness={0.25}
    />
  );

  return (
    <group
      name="camshafts"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Intake Camshaft (Left: X = -0.24) */}
      <group position={[-0.24, 0, 0]}>
        {/* Main Solid Ground Shaft */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.05, 24]} />
          {camSteelMat}
        </mesh>

        {/* 8 Egg-Shaped Induction-Hardened Intake Cam Lobes (2 per cylinder) */}
        {cylinderZPositions.map((z, cIdx) => (
          <React.Fragment key={`intake-lobes-${cIdx}`}>
            {[-0.06, 0.06].map((zOff, lIdx) => {
              const lobeAngle = (cIdx * 90 + lIdx * 15) * (Math.PI / 180);
              return (
                <group key={`l-${lIdx}`} position={[0, 0, z + zOff]}>
                  {/* Base Circle */}
                  <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.058, 0.058, 0.04, 24]} />
                    {lobeMat}
                  </mesh>
                  {/* Lobe Peak Nose (Egg eccentric lift profile) */}
                  <mesh
                    position={[Math.sin(lobeAngle) * 0.045, Math.cos(lobeAngle) * 0.045, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                    castShadow
                  >
                    <cylinderGeometry args={[0.038, 0.038, 0.04, 16]} />
                    {lobeMat}
                  </mesh>
                </group>
              );
            })}
          </React.Fragment>
        ))}

        {/* Front Intake Vernier Timing Sprocket / Pulley */}
        <group position={[0, 0, 1.08]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 36]} />
            {sprocketMat}
          </mesh>
          {/* Vernier Gear Teeth Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.195, 0.015, 10, 48]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
          </mesh>
          {/* Central Cam Retaining Bolt */}
          <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.03, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
          </mesh>
        </group>
      </group>

      {/* Exhaust Camshaft (Right: X = +0.24) */}
      <group position={[0.24, 0, 0]}>
        {/* Main Solid Ground Shaft */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.05, 24]} />
          {camSteelMat}
        </mesh>

        {/* 8 Exhaust Cam Lobes (Phased for scavenging) */}
        {cylinderZPositions.map((z, cIdx) => (
          <React.Fragment key={`exhaust-lobes-${cIdx}`}>
            {[-0.06, 0.06].map((zOff, lIdx) => {
              const lobeAngle = (cIdx * 90 + 120 + lIdx * 15) * (Math.PI / 180);
              return (
                <group key={`el-${lIdx}`} position={[0, 0, z + zOff]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.058, 0.058, 0.04, 24]} />
                    {lobeMat}
                  </mesh>
                  <mesh
                    position={[Math.sin(lobeAngle) * 0.045, Math.cos(lobeAngle) * 0.045, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                    castShadow
                  >
                    <cylinderGeometry args={[0.038, 0.038, 0.04, 16]} />
                    {lobeMat}
                  </mesh>
                </group>
              );
            })}
          </React.Fragment>
        ))}

        {/* Front Exhaust Timing Sprocket */}
        <group position={[0, 0, 1.08]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 36]} />
            {sprocketMat}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.195, 0.015, 10, 48]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.03, 6]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
