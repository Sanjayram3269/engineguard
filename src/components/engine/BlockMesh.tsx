import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createCastIronRoughnessMap } from './EngineMaterials';

interface BlockMeshProps {
  isHighlighted?: boolean;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
  onClick?: (e: any) => void;
}

export const BlockMesh: React.FC<BlockMeshProps> = ({
  isHighlighted,
  onPointerOver,
  onPointerOut,
  onClick
}) => {
  const castRoughness = useMemo(() => createCastIronRoughnessMap(), []);

  // Cylinder centers along Z-axis: 4 cylinders
  const cylinderZPositions = [-0.78, -0.26, 0.26, 0.78];

  return (
    <group
      name="engineBlock"
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      {/* Main Crankcase & Cylinder Bank Housing */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.75, 2.05]} />
        <meshStandardMaterial
          color={isHighlighted ? '#ff7733' : '#1c2026'}
          metalness={0.75}
          roughness={0.6}
          roughnessMap={castRoughness}
          emissive={isHighlighted ? '#ff5e1e' : '#000000'}
          emissiveIntensity={isHighlighted ? 0.35 : 0}
        />
      </mesh>

      {/* Machined Top Deck Surface (Mating deck for head gasket) */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.14, 0.02, 2.1]} />
        <meshStandardMaterial
          color="#3a404a"
          metalness={0.88}
          roughness={0.25}
        />
      </mesh>

      {/* Machined Bottom Gasket Flange (Mating flange for oil pan) */}
      <mesh position={[0, -0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.18, 0.025, 2.15]} />
        <meshStandardMaterial
          color="#333842"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* 4 Precision Cylinder Bores & Polished Steel Liners */}
      {cylinderZPositions.map((z, idx) => (
        <group key={`cylinder-${idx}`} position={[0, 0.05, z]}>
          {/* Inner Machined Steel Sleeve */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.7, 32, 1, true]} />
            <meshStandardMaterial
              color="#d0d7de"
              metalness={0.92}
              roughness={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Chamfered Top Cylinder Entry Rim */}
          <mesh position={[0, 0.355, 0]}>
            <torusGeometry args={[0.22, 0.015, 12, 32]} />
            <meshStandardMaterial
              color="#e0e5eb"
              metalness={0.95}
              roughness={0.12}
            />
          </mesh>
        </group>
      ))}

      {/* Structural Lateral Reinforcement Ribs (6 exterior ribs) */}
      {[-0.85, -0.52, -0.18, 0.18, 0.52, 0.85].map((z, idx) => (
        <React.Fragment key={`rib-${idx}`}>
          {/* Left Rib */}
          <mesh position={[-0.56, 0, z]} castShadow>
            <boxGeometry args={[0.04, 0.65, 0.05]} />
            <meshStandardMaterial color="#21252d" metalness={0.7} roughness={0.65} />
          </mesh>
          {/* Right Rib */}
          <mesh position={[0.56, 0, z]} castShadow>
            <boxGeometry args={[0.04, 0.65, 0.05]} />
            <meshStandardMaterial color="#21252d" metalness={0.7} roughness={0.65} />
          </mesh>
        </React.Fragment>
      ))}

      {/* Engine Mount Flanges (Cast side mounting brackets) */}
      <mesh position={[-0.62, -0.1, 0.1]} castShadow>
        <boxGeometry args={[0.16, 0.18, 0.35]} />
        <meshStandardMaterial color="#2a303a" metalness={0.8} roughness={0.5} />
      </mesh>
      <mesh position={[0.62, -0.1, -0.1]} castShadow>
        <boxGeometry args={[0.16, 0.18, 0.35]} />
        <meshStandardMaterial color="#2a303a" metalness={0.8} roughness={0.5} />
      </mesh>

      {/* Spin-on Oil Filter Canister (Matte black / industrial accent) */}
      <group position={[-0.65, -0.15, -0.55]} rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.32, 24]} />
          <meshStandardMaterial color="#111317" metalness={0.65} roughness={0.35} />
        </mesh>
        {/* Filter Hex Base Nut */}
        <mesh position={[0, -0.17, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.04, 6]} />
          <meshStandardMaterial color="#ff5e1e" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Front Timing Chain Cover Flange */}
      <mesh position={[0, 0, 1.04]} castShadow>
        <boxGeometry args={[0.95, 0.72, 0.05]} />
        <meshStandardMaterial color="#2c323d" metalness={0.8} roughness={0.4} />
      </mesh>

      {/* Rear Flywheel Housing Bell Flange */}
      <mesh position={[0, -0.15, -1.04]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.05, 36]} />
        <meshStandardMaterial color="#282d36" metalness={0.78} roughness={0.45} />
      </mesh>
    </group>
  );
};
