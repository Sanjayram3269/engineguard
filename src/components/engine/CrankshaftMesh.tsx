import React from 'react';

interface CrankshaftMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const CrankshaftMesh: React.FC<CrankshaftMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  // Inline-4 Crank throws along Z axis:
  // Cyl 1: z = -0.78, offset Y = +0.20
  // Cyl 2: z = -0.26, offset Y = -0.20
  // Cyl 3: z =  0.26, offset Y = -0.20
  // Cyl 4: z =  0.78, offset Y = +0.20

  const crankThrows = [
    { z: -0.78, yOffset: 0.20 },
    { z: -0.26, yOffset: -0.20 },
    { z: 0.26, yOffset: -0.20 },
    { z: 0.78, yOffset: 0.20 }
  ];

  const mainJournalZ = [-1.02, -0.52, 0.0, 0.52, 1.02];

  const steelMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff7733' : '#a8b2bc'}
      metalness={0.92}
      roughness={0.2}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.4 : 0}
    />
  );

  const polishedJournalMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff8844' : '#e2e8f0'}
      metalness={0.96}
      roughness={0.1}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.35 : 0}
    />
  );

  const counterweightMat = (
    <meshStandardMaterial
      color={isHighlighted ? '#ff6622' : '#3d444d'}
      metalness={0.82}
      roughness={0.45}
      emissive={isHighlighted ? '#ff5e1e' : '#000000'}
      emissiveIntensity={isHighlighted ? 0.3 : 0}
    />
  );

  return (
    <group
      name="crankshaft"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* 5 Main Bearing Journals along centerline */}
      {mainJournalZ.map((z, idx) => (
        <mesh key={`main-journal-${idx}`} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 0.12, 32]} />
          {polishedJournalMat}
        </mesh>
      ))}

      {/* 4 Crankpins (Rod Journals) + Counterweight Webs */}
      {crankThrows.map((th, idx) => (
        <group key={`throw-${idx}`}>
          {/* Polished Rod Journal (where connecting rod big end mounts) */}
          <mesh position={[0, th.yOffset, th.z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.16, 32]} />
            {polishedJournalMat}
          </mesh>

          {/* Front & Rear Counterweight Cheeks for this throw */}
          {[-0.11, 0.11].map((zOffset, cheekIdx) => (
            <group key={`cheek-${cheekIdx}`} position={[0, 0, th.z + zOffset]}>
              {/* Web connecting center to pin */}
              <mesh position={[0, th.yOffset * 0.5, 0]} castShadow>
                <boxGeometry args={[0.09, Math.abs(th.yOffset) + 0.1, 0.06]} />
                {steelMat}
              </mesh>

              {/* Opposing Curved Counterweight (Balances reciprocating mass) */}
              <mesh position={[0, -th.yOffset * 1.1, 0]} rotation={[0, 0, th.yOffset > 0 ? Math.PI : 0]} castShadow>
                <cylinderGeometry args={[0.32, 0.32, 0.06, 24, 1, false, 0, Math.PI]} />
                {counterweightMat}
              </mesh>
              {/* Drilled Balance Chamfer Pocket on Counterweight */}
              <mesh position={[0.15, -th.yOffset * 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.07, 16]} />
                <meshStandardMaterial color="#22262d" metalness={0.9} roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Front Snout & Dual-Groove Harmonic Balancer / Pulley */}
      <group position={[0, 0, 1.18]}>
        {/* Crank Snout Shaft */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.22, 24]} />
          {steelMat}
        </mesh>
        {/* Harmonic Balancer Hub & Inertia Ring */}
        <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.08, 36]} />
          <meshStandardMaterial color="#1a1c21" metalness={0.85} roughness={0.3} />
        </mesh>
        {/* Dual V-Belt Grooves */}
        <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.25, 0.015, 8, 36]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.10]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.25, 0.015, 8, 36]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Central Crank Snout Retaining Bolt */}
        <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 6]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
        </mesh>
      </group>

      {/* Rear Flywheel & Starter Ring Gear */}
      <group position={[0, 0, -1.16]}>
        {/* Main Flywheel Friction Disc */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.48, 0.48, 0.07, 48]} />
          <meshStandardMaterial color="#4b5563" metalness={0.9} roughness={0.25} />
        </mesh>
        {/* Precision Starter Ring Gear (Perimeter ring) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.47, 0.02, 16, 64]} />
          <meshStandardMaterial color="#334155" metalness={0.95} roughness={0.3} />
        </mesh>
        {/* Flywheel Mounting Bolt Circle (6 ARP bolts) */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i * Math.PI * 2) / 6;
          return (
            <mesh
              key={`fw-bolt-${i}`}
              position={[Math.cos(angle) * 0.16, Math.sin(angle) * 0.16, -0.04]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.022, 0.022, 0.02, 6]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};
