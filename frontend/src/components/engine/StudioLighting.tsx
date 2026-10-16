import React from 'react';

export const StudioLighting: React.FC = () => {
  return (
    <>
      {/* Ambient Fill */}
      <ambientLight intensity={0.8} color="#f8fafc" />

      {/* Main Overhead Studio Key Light */}
      <directionalLight
        position={[6, 10, 8]}
        intensity={2.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />

      {/* Cool Secondary Fill Light */}
      <directionalLight
        position={[-8, 4, -4]}
        intensity={1.4}
        color="#93c5fd"
      />

      {/* Dramatic Orange Automotive Rim Light (EnginePulse Signature Accent) */}
      <directionalLight
        position={[-5, 2, 8]}
        intensity={2.5}
        color="#ff5e1e"
      />

      {/* Under-Sump Floor Bounce / Ground Reflection Light */}
      <directionalLight
        position={[0, -8, 2]}
        intensity={0.6}
        color="#38bdf8"
      />

      {/* Point light accent for cylinder bores */}
      <pointLight position={[0, 1.5, 0]} intensity={1.2} color="#ffffff" distance={5} />
    </>
  );
};
