export interface EngineComponentMeta {
  id: string;
  name: string;
  subsystem: 'Structure' | 'Valvetrain' | 'Reciprocating' | 'Air & Fuel' | 'Exhaust';
  materialDescription: string;
  mechanicalFunction: string;
  assemblyPosition: [number, number, number];
  explodedOffset: [number, number, number];
  explosionOrder: number; // 0 to 1 normalized sequence
}

export const ENGINE_COMPONENTS: Record<string, EngineComponentMeta> = {
  valveCover: {
    id: 'valveCover',
    name: 'Cast Aluminum Valve Cover',
    subsystem: 'Valvetrain',
    materialDescription: 'Powder-coated die-cast aluminum with integrated baffle plates and perimeter rubber gasket channel.',
    mechanicalFunction: 'Seals the top of the cylinder head to retain lubricating motor oil under pressure and prevent environmental contaminants from entering the camshaft assembly.',
    assemblyPosition: [0, 1.45, 0],
    explodedOffset: [0, 2.2, 0],
    explosionOrder: 0.15
  },
  camshafts: {
    id: 'camshafts',
    name: 'Dual Overhead Camshafts (DOHC)',
    subsystem: 'Valvetrain',
    materialDescription: 'Chilled forged alloy steel with induction-hardened precision cam lobes and micro-polished bearing journals.',
    mechanicalFunction: 'Rotates synchronously at half crankshaft speed to actuate the intake and exhaust poppet valves with precise lift and duration profiles.',
    assemblyPosition: [0, 1.15, 0],
    explodedOffset: [0, 1.6, 0],
    explosionOrder: 0.3
  },
  valves: {
    id: 'valves',
    name: '16-Valve Valvetrain Assembly',
    subsystem: 'Valvetrain',
    materialDescription: 'Heat-resistant Nimonic alloy exhaust valves and martensitic steel intake valves with dual shot-peened steel springs.',
    mechanicalFunction: 'Controls the timed induction of the air-fuel mixture into combustion chambers and the scavenging of high-temperature exhaust gases.',
    assemblyPosition: [0, 0.95, 0],
    explodedOffset: [0, 1.25, 0],
    explosionOrder: 0.4
  },
  cylinderHead: {
    id: 'cylinderHead',
    name: 'Crossflow Cylinder Head',
    subsystem: 'Structure',
    materialDescription: 'A356-T6 heat-treated cast aluminum alloy with CNC-machined pent-roof combustion chambers and bronze valve guides.',
    mechanicalFunction: 'Houses the combustion chambers, spark plug ports, and intake/exhaust runners while facilitating coolant circulation directly above the cylinders.',
    assemblyPosition: [0, 0.7, 0],
    explodedOffset: [0, 1.0, 0],
    explosionOrder: 0.5
  },
  headGasket: {
    id: 'headGasket',
    name: 'Multi-Layer Steel (MLS) Head Gasket',
    subsystem: 'Structure',
    materialDescription: 'Embossed spring steel core sheets coated with fluoroelastomer Viton for extreme thermal compliance.',
    mechanicalFunction: 'Maintains high-pressure combustion chamber seal between cylinder head and engine block while isolating oil and coolant galleries.',
    assemblyPosition: [0, 0.38, 0],
    explodedOffset: [0, 0.6, 0],
    explosionOrder: 0.55
  },
  engineBlock: {
    id: 'engineBlock',
    name: 'Cast Iron Inline-4 Engine Block',
    subsystem: 'Structure',
    materialDescription: 'Compacted graphite iron (CGI) with induction-hardened parent metal cylinder bores and high-stiffness deep-skirt crankcase.',
    mechanicalFunction: 'Forms the foundational structural spine of the engine, containing the 4 cylinder bores, oil galleries, and main crankshaft bearing saddles.',
    assemblyPosition: [0, 0, 0],
    explodedOffset: [0, 0, 0], // Anchor component
    explosionOrder: 0.0
  },
  pistons: {
    id: 'pistons',
    name: 'Forged Aluminum Pistons (x4)',
    subsystem: 'Reciprocating',
    materialDescription: 'Forged 2618 aerospace aluminum alloy with molybdenum disulphide anti-friction skirt coating and nitrided steel piston rings.',
    mechanicalFunction: 'Transfers the rapid expansion force of combusting fuel gases downwards through the wrist pins into the connecting rods.',
    assemblyPosition: [0, 0.1, 0],
    explodedOffset: [0, 0.85, 0],
    explosionOrder: 0.7
  },
  connectingRods: {
    id: 'connectingRods',
    name: 'Forged H-Beam Connecting Rods (x4)',
    subsystem: 'Reciprocating',
    materialDescription: '4340 chrome-moly forged steel with fractured-split rod caps and silicon-bronze wrist pin bushings.',
    mechanicalFunction: 'Converts reciprocating linear piston motion into rotational torque delivered directly to the crankshaft throws.',
    assemblyPosition: [0, -0.3, 0],
    explodedOffset: [0, -0.2, 0],
    explosionOrder: 0.75
  },
  crankshaft: {
    id: 'crankshaft',
    name: 'Counterweighted Forged Crankshaft',
    subsystem: 'Reciprocating',
    materialDescription: 'Forged 4140 chrome-molybdenum steel with induction-hardened journals and chamfered cross-drilled oil passages.',
    mechanicalFunction: 'Primary rotating assembly that transforms reciprocating power into output rotational torque delivered to the flywheel.',
    assemblyPosition: [0, -0.65, 0],
    explodedOffset: [0, -0.85, 0],
    explosionOrder: 0.8
  },
  oilPan: {
    id: 'oilPan',
    name: 'Baffled Lower Oil Sump',
    subsystem: 'Structure',
    materialDescription: 'Stamped structural steel lower pan with integrated anti-slosh windage trays and magnetic drain plug.',
    mechanicalFunction: 'Collects and stores the engine lubrication reservoir while providing surface area cooling for circulating motor oil.',
    assemblyPosition: [0, -1.0, 0],
    explodedOffset: [0, -1.5, 0],
    explosionOrder: 0.9
  },
  intakeManifold: {
    id: 'intakeManifold',
    name: 'Tuned Equal-Length Intake Plenum',
    subsystem: 'Air & Fuel',
    materialDescription: 'Glass-fiber reinforced polyamide / cast aluminum with velocity-stack runner horns and billet throttle body mount.',
    mechanicalFunction: 'Evenly distributes metered atmospheric charge air across all 4 cylinder intake ports for volumetric efficiency.',
    assemblyPosition: [-0.95, 0.65, 0],
    explodedOffset: [-1.8, 0.65, 0],
    explosionOrder: 0.6
  },
  exhaustManifold: {
    id: 'exhaustManifold',
    name: '4-into-1 Tuned Stainless Exhaust Header',
    subsystem: 'Exhaust',
    materialDescription: 'Mandrel-bent T304 stainless steel tubing with investment-cast collector flange exhibiting thermal heat-tint oxide finish.',
    mechanicalFunction: 'Scavenges high-velocity exhaust pulses from combustion chambers and channels them into the downstream catalytic system.',
    assemblyPosition: [0.95, 0.6, 0],
    explodedOffset: [1.85, 0.6, 0],
    explosionOrder: 0.65
  }
};

export const COMPONENT_METADATA = ENGINE_COMPONENTS;
