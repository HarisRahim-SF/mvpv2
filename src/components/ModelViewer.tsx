import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Environment } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial, BufferGeometry, Box3, Vector3 } from 'three';
// import NoseEditor from './NoseEditor';
import NoseEditorControls from './NoseEditorControls';

interface ModelViewerProps {
  model: Group | null;
}

// This component will be rendered inside the Canvas
const NoseEditorWrapper = ({ model, isEditMode, setNoseEditorFunctions }: { 
  model: Group | null, 
  isEditMode: boolean,
  setNoseEditorFunctions: (functions: any) => void
}) => {
  const { camera, scene } = useThree();
  // Import and use NoseEditor
  const noseEditorInstance = {
    handleMouseDown: () => {},
    resetNose: () => {},
    adjustNoseBridge: () => {},
    adjustNoseTip: () => {},
    adjustNostrilWidth: () => {},
    selectedVertex: null
  };
  
  // Pass the functions up to the parent component
  useEffect(() => {
    setNoseEditorFunctions(noseEditorInstance);
  }, [noseEditorInstance, setNoseEditorFunctions]);
  
  const { handleMouseDown } = noseEditorInstance;
  
  return (
    <>
      {/* This is just a transparent overlay to capture mouse events when in edit mode */}
      {isEditMode && (
        <mesh
          visible={false}
          position={[0, 0, 10]}
          onClick={handleMouseDown}
        >
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </>
  );
};

const ModelViewer = ({ model }: ModelViewerProps) => {
  const modelRef = useRef<Group>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clonedModel, setClonedModel] = useState<Group | null>(null);
  const [noseEditorFunctions, setNoseEditorFunctions] = useState<any>({
    resetNose: () => {},
    adjustNoseBridge: () => {},
    adjustNoseTip: () => {},
    adjustNostrilWidth: () => {},
    selectedVertex: null
  });

  useEffect(() => {
    if (model && modelRef.current) {
      console.log('Model received:', model);
      
      // Clear any existing children
      while (modelRef.current.children.length > 0) {
        modelRef.current.remove(modelRef.current.children[0]);
      }

      // Add the new model
      const modelClone = model.clone();
      modelRef.current.add(modelClone);
      console.log('Model added to scene');
      
      // Calculate bounding box to center and scale the model properly
      const box = new Box3().setFromObject(modelClone);
      const center = box.getCenter(new Vector3());
      const size = box.getSize(new Vector3());
      
      // Get the maximum dimension to normalize scale
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDimension; // Scale to fit in a 2 unit sphere
      
      // Center the model
      modelClone.position.set(-center.x, -center.y, -center.z);
      modelRef.current.scale.setScalar(scale);

      console.log('Model dimensions:', {
        size: size.toArray(),
        center: center.toArray(),
        scale
      });

      // Store the cloned model to pass to NoseEditor
      setClonedModel(modelClone);
    }
  }, [model]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '500px' }}>
      <Canvas shadows ref={canvasRef}>
        {/* Camera */}
        <PerspectiveCamera makeDefault position={[0, 0, 0.75]} fov={50} />
        
        {/* Controls */}
        <OrbitControls 
          enablePan 
          enableZoom 
          enableRotate 
          minDistance={0.1}
          maxDistance={20}
        />
        
        {/* Lighting and Environment */}
        <ambientLight intensity={1} />
        <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <Environment preset="studio" />
        <Grid />

        {/* Model */}
        <group ref={modelRef}>
          {model && (
            <primitive 
              object={model} 
              scale={1}
              castShadow
              receiveShadow
            />
          )}
        </group>

        {/* Nose Editor */}
        <NoseEditorWrapper
          model={clonedModel}
          isEditMode={isEditMode}
          setNoseEditorFunctions={setNoseEditorFunctions}
        />
      </Canvas>

      {/* Edit Mode Toggle */}
      <button
        onClick={() => setIsEditMode(!isEditMode)}
        style={{
          position: 'absolute',
          left: '20px',
          top: '20px',
          padding: '8px 16px',
          background: isEditMode ? '#6b46c1' : 'white',
          color: isEditMode ? 'white' : '#6b46c1',
          border: '2px solid #6b46c1',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        {isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
      </button>

    </div>
  );
};

export default ModelViewer; 