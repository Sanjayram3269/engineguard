import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ENGINE_COMPONENTS } from '../../types/engine';
import { BlockMesh } from './BlockMesh';
import { CrankshaftMesh } from './CrankshaftMesh';
import { PistonsMesh } from './PistonsMesh';
import { ConnectingRodsMesh } from './ConnectingRodsMesh';
import { CylinderHeadMesh } from './CylinderHeadMesh';
import { HeadGasketMesh } from './HeadGasketMesh';
import { CamshaftsMesh } from './CamshaftsMesh';
import { ValvesMesh } from './ValvesMesh';
import { ValveCoverMesh } from './ValveCoverMesh';
import { OilPanMesh } from './OilPanMesh';
import { IntakeManifoldMesh } from './IntakeManifoldMesh';
import { ExhaustManifoldMesh } from './ExhaustManifoldMesh';

interface EngineAssemblyProps {
  explosionProgress: number; // 0 (assembled) to 1 (fully exploded)
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  hoveredComponentId: string | null;
  onHoverComponent: (id: string | null) => void;
  independentExplosion?: {
    cylinderHead?: number;
    pistons?: number;
    crankshaft?: number;
    exhaustManifold?: number;
    intakeManifold?: number;
    valveCover?: number;
  };
}

export const EngineAssembly: React.FC<EngineAssemblyProps> = ({
  explosionProgress,
  selectedComponentId,
  onSelectComponent,
  hoveredComponentId,
  onHoverComponent,
  independentExplosion = {}
}) => {
  // References to component group nodes for smooth GSAP/Three frame interpolation
  const rootRef = useRef<THREE.Group>(null);
  const valveCoverRef = useRef<THREE.Group>(null);
  const camshaftsRef = useRef<THREE.Group>(null);
  const valvesRef = useRef<THREE.Group>(null);
  const cylinderHeadRef = useRef<THREE.Group>(null);
  const headGasketRef = useRef<THREE.Group>(null);
  const blockRef = useRef<THREE.Group>(null);
  const pistonsRef = useRef<THREE.Group>(null);
  const rodsRef = useRef<THREE.Group>(null);
  const crankshaftRef = useRef<THREE.Group>(null);
  const oilPanRef = useRef<THREE.Group>(null);
  const intakeRef = useRef<THREE.Group>(null);
  const exhaustRef = useRef<THREE.Group>(null);

  // Helper to compute lerped position for a component
  const getInterpolatedPosition = (
    basePos: [number, number, number],
    offset: [number, number, number],
    progress: number,
    independentFactor: number = 0
  ): [number, number, number] => {
    const effectiveProgress = Math.max(progress, independentFactor);
    return [
      basePos[0] + offset[0] * effectiveProgress,
      basePos[1] + offset[1] * effectiveProgress,
      basePos[2] + offset[2] * effectiveProgress
    ];
  };

  // Gentle idle rotation when engine is in hero view
  useFrame((_, delta) => {
    if (rootRef.current && explosionProgress === 0) {
      rootRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, 0]}>
      {/* 1. Valve Cover */}
      <group
        ref={valveCoverRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.valveCover.assemblyPosition,
          ENGINE_COMPONENTS.valveCover.explodedOffset,
          explosionProgress,
          independentExplosion.valveCover || 0
        )}
      >
        <ValveCoverMesh
          isHighlighted={selectedComponentId === 'valveCover' || hoveredComponentId === 'valveCover'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('valveCover');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'valveCover' ? null : 'valveCover');
          }}
        />
      </group>

      {/* 2. Camshafts (DOHC) */}
      <group
        ref={camshaftsRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.camshafts.assemblyPosition,
          ENGINE_COMPONENTS.camshafts.explodedOffset,
          explosionProgress,
          independentExplosion.cylinderHead || 0 // lifts with head or independently
        )}
      >
        <CamshaftsMesh
          isHighlighted={selectedComponentId === 'camshafts' || hoveredComponentId === 'camshafts'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('camshafts');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'camshafts' ? null : 'camshafts');
          }}
        />
      </group>

      {/* 3. 16-Valve Valvetrain */}
      <group
        ref={valvesRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.valves.assemblyPosition,
          ENGINE_COMPONENTS.valves.explodedOffset,
          explosionProgress,
          independentExplosion.cylinderHead || 0
        )}
      >
        <ValvesMesh
          isHighlighted={selectedComponentId === 'valves' || hoveredComponentId === 'valves'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('valves');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'valves' ? null : 'valves');
          }}
        />
      </group>

      {/* 4. Crossflow Cylinder Head */}
      <group
        ref={cylinderHeadRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.cylinderHead.assemblyPosition,
          ENGINE_COMPONENTS.cylinderHead.explodedOffset,
          explosionProgress,
          independentExplosion.cylinderHead || 0
        )}
      >
        <CylinderHeadMesh
          isHighlighted={selectedComponentId === 'cylinderHead' || hoveredComponentId === 'cylinderHead'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('cylinderHead');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'cylinderHead' ? null : 'cylinderHead');
          }}
        />
      </group>

      {/* 5. MLS Head Gasket */}
      <group
        ref={headGasketRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.headGasket.assemblyPosition,
          ENGINE_COMPONENTS.headGasket.explodedOffset,
          explosionProgress,
          (independentExplosion.cylinderHead || 0) * 0.6
        )}
      >
        <HeadGasketMesh
          isHighlighted={selectedComponentId === 'headGasket' || hoveredComponentId === 'headGasket'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('headGasket');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'headGasket' ? null : 'headGasket');
          }}
        />
      </group>

      {/* 6. Cast Iron Engine Block (Anchor Component) */}
      <group
        ref={blockRef}
        position={ENGINE_COMPONENTS.engineBlock.assemblyPosition}
      >
        <BlockMesh
          isHighlighted={selectedComponentId === 'engineBlock' || hoveredComponentId === 'engineBlock'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('engineBlock');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'engineBlock' ? null : 'engineBlock');
          }}
        />
      </group>

      {/* 7. Pistons */}
      <group
        ref={pistonsRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.pistons.assemblyPosition,
          ENGINE_COMPONENTS.pistons.explodedOffset,
          explosionProgress,
          independentExplosion.pistons || 0
        )}
      >
        <PistonsMesh
          isHighlighted={selectedComponentId === 'pistons' || hoveredComponentId === 'pistons'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('pistons');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'pistons' ? null : 'pistons');
          }}
        />
      </group>

      {/* 8. Connecting Rods */}
      <group
        ref={rodsRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.connectingRods.assemblyPosition,
          ENGINE_COMPONENTS.connectingRods.explodedOffset,
          explosionProgress,
          (independentExplosion.pistons || 0) * 0.5
        )}
      >
        <ConnectingRodsMesh
          isHighlighted={selectedComponentId === 'connectingRods' || hoveredComponentId === 'connectingRods'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('connectingRods');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'connectingRods' ? null : 'connectingRods');
          }}
        />
      </group>

      {/* 9. Crankshaft */}
      <group
        ref={crankshaftRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.crankshaft.assemblyPosition,
          ENGINE_COMPONENTS.crankshaft.explodedOffset,
          explosionProgress,
          independentExplosion.crankshaft || 0
        )}
      >
        <CrankshaftMesh
          isHighlighted={selectedComponentId === 'crankshaft' || hoveredComponentId === 'crankshaft'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('crankshaft');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'crankshaft' ? null : 'crankshaft');
          }}
        />
      </group>

      {/* 10. Oil Pan */}
      <group
        ref={oilPanRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.oilPan.assemblyPosition,
          ENGINE_COMPONENTS.oilPan.explodedOffset,
          explosionProgress,
          (independentExplosion.crankshaft || 0) * 1.2
        )}
      >
        <OilPanMesh
          isHighlighted={selectedComponentId === 'oilPan' || hoveredComponentId === 'oilPan'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('oilPan');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'oilPan' ? null : 'oilPan');
          }}
        />
      </group>

      {/* 11. Intake Manifold */}
      <group
        ref={intakeRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.intakeManifold.assemblyPosition,
          ENGINE_COMPONENTS.intakeManifold.explodedOffset,
          explosionProgress,
          independentExplosion.intakeManifold || 0
        )}
      >
        <IntakeManifoldMesh
          isHighlighted={selectedComponentId === 'intakeManifold' || hoveredComponentId === 'intakeManifold'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('intakeManifold');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'intakeManifold' ? null : 'intakeManifold');
          }}
        />
      </group>

      {/* 12. Exhaust Manifold */}
      <group
        ref={exhaustRef}
        position={getInterpolatedPosition(
          ENGINE_COMPONENTS.exhaustManifold.assemblyPosition,
          ENGINE_COMPONENTS.exhaustManifold.explodedOffset,
          explosionProgress,
          independentExplosion.exhaustManifold || 0
        )}
      >
        <ExhaustManifoldMesh
          isHighlighted={selectedComponentId === 'exhaustManifold' || hoveredComponentId === 'exhaustManifold'}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverComponent('exhaustManifold');
          }}
          onPointerOut={() => onHoverComponent(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSelectComponent(selectedComponentId === 'exhaustManifold' ? null : 'exhaustManifold');
          }}
        />
      </group>
    </group>
  );
};
