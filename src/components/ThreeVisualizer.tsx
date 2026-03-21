import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';

const NeuralNode = ({ position, color }: { position: [number, number, number], color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <Sphere ref={meshRef} args={[0.1, 16, 16]} position={position}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} wireframe />
    </Sphere>
  );
};

const Connections = ({ nodes }: { nodes: [number, number, number][] }) => {
  const lineRef = useRef<THREE.LineSegments>(null);

  React.useEffect(() => {
    if (lineRef.current) {
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      
      // Connect every node to 2-3 other random nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < 2; j++) {
          const target = Math.floor(Math.random() * nodes.length);
          positions.push(...nodes[i]);
          positions.push(...nodes[target]);
        }
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      lineRef.current.geometry = geometry;
    }
  }, [nodes]);

  return (
    <lineSegments ref={lineRef}>
      <lineBasicMaterial color="#10b981" transparent opacity={0.15} />
    </lineSegments>
  );
};

const CoreGlobe = () => {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <Sphere ref={sphereRef} args={[2, 64, 64]}>
      <MeshDistortMaterial 
        color="#064e3b" 
        emissive="#022c22"
        wireframe 
        distort={0.2} 
        speed={2} 
        transparent 
        opacity={0.3} 
      />
    </Sphere>
  );
};

export const ThreeVisualizer = () => {
  // Generate random nodes on a sphere
  const [nodes] = useState(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 100; i++) {
      const phi = Math.acos(-1 + (2 * i) / 100);
      const theta = Math.sqrt(100 * Math.PI) * phi;
      const r = 2.2; // Slightly larger than core
      pts.push([
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi)
      ]);
    }
    return pts;
  });

  return (
    <div className="w-full h-full bg-black/80 border border-emerald-900 rounded-xl overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h2 className="text-emerald-500 font-bold tracking-widest text-xl">GLOBAL NEURAL NET</h2>
        <p className="text-emerald-700 text-xs font-mono">REAL-TIME DATA VISUALIZATION</p>
      </div>
      
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none text-right font-mono text-xs text-emerald-600">
        <div>NODES ACTIVE: {nodes.length}</div>
        <div>UPLINK: SECURE</div>
        <div className="animate-pulse text-emerald-400">SYNCING...</div>
      </div>

      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#10b981" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#d946ef" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <group>
          <CoreGlobe />
          {nodes.map((pos, i) => (
            <NeuralNode key={i} position={pos} color={Math.random() > 0.8 ? '#d946ef' : '#10b981'} />
          ))}
          <Connections nodes={nodes} />
        </group>
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={3} 
          maxDistance={10}
          autoRotate 
          autoRotateSpeed={0.5} 
        />
      </Canvas>
    </div>
  );
};
