import React from 'react';
import { Group } from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import './SplineViewer.css';

interface SplineViewerProps {
  customModel?: Group | null;
}

const SplineViewer = ({ customModel }: SplineViewerProps) => {
  return (
    <div className="spline-viewer-container">
      <h2 className="spline-viewer-title">Rhinovate Interactive 3D Nose Editor</h2>
      <p className="spline-viewer-description">
        Explore and interact with our detailed 3D nose model. Rotate, zoom, and examine the nasal anatomy in detail.
      </p>
      <div className="spline-viewer-frame">
        {customModel ? (
          <Canvas camera={{ position: [0, 0, 0.75], fov: 50 }}>
            <ambientLight intensity={1} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
            <primitive object={customModel} />
            <OrbitControls />
          </Canvas>
        ) : (
          <iframe
            src="https://app.spline.design/file/d88be4c0-66dd-4dd4-b8ef-d7e2e75bd0b5"
            frameBorder="0"
            width="100%"
            height="600"
            title="Interactive 3D Nose Model"
            allowFullScreen
            className="spline-viewer-iframe"
          />
        )}
      </div>
    </div>
  );
};

export default SplineViewer; 