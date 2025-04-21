import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// Sculpting tools and modes
enum Tool {
  MOVE = 'MOVE',
  SCULPT = 'SCULPT',
  SMOOTH = 'SMOOTH',
  PINCH = 'PINCH'
}

// Brush cursor that shows the influence area
function BrushCursor({ 
  position, 
  brushSize, 
  activeTool 
}: { 
  position: THREE.Vector3; 
  brushSize: number;
  activeTool: Tool;
}) {
  // Color based on the active tool
  const getToolColor = () => {
    switch(activeTool) {
      case Tool.MOVE: return '#4CAF50';
      case Tool.SCULPT: return '#FF5722';
      case Tool.SMOOTH: return '#2196F3';
      case Tool.PINCH: return '#9C27B0';
      default: return '#FFC107';
    }
  };
  
  return (
    <group position={position}>
      {/* Inner sphere showing the center of the brush */}
      <mesh>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color={getToolColor()} transparent opacity={0.9} />
      </mesh>
      
      {/* Outer sphere showing the area of effect */}
      <mesh>
        <sphereGeometry args={[brushSize, 32, 32]} />
        <meshStandardMaterial 
          color={getToolColor()} 
          transparent 
          opacity={0.15} 
          depthTest={false}
          wireframe={true}
        />
      </mesh>
    </group>
  );
}

interface EditableSceneProps {
  brushSize: number; 
  brushStrength: number;
  activeTool: Tool;
  modelUrl: string | null;
}

// The editable 3D scene
function EditableScene({ 
  brushSize, 
  brushStrength,
  activeTool,
  modelUrl
}: EditableSceneProps) {
  const { camera, mouse, raycaster, gl, scene } = useThree();
  const [meshRef, setMeshRef] = useState<THREE.Mesh | null>(null);
  const [brushPosition, setBrushPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [isModifying, setIsModifying] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState<THREE.Vector2>(new THREE.Vector2());
  const [originalVertices, setOriginalVertices] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Load a model if URL is provided
  useEffect(() => {
    if (!modelUrl) return;
    
    setIsLoading(true);
    
    // Remove any existing mesh
    if (meshRef) {
      scene.remove(meshRef);
      setMeshRef(null);
      setOriginalVertices(null);
    }
    
    // Determine which loader to use
    const fileExtension = modelUrl.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'obj') {
      const loader = new OBJLoader();
      loader.load(
        modelUrl,
        (obj) => {
          processLoadedModel(obj);
        },
        (xhr) => {
          console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
        },
        (error) => {
          console.error("Error loading OBJ:", error);
          setIsLoading(false);
        }
      );
    } else {
      // GLTF/GLB
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          processLoadedModel(gltf.scene);
        },
        (xhr) => {
          console.log(`Loading: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
        },
        (error) => {
          console.error("Error loading GLTF/GLB:", error);
          setIsLoading(false);
        }
      );
    }
    
    function processLoadedModel(loadedObject: THREE.Object3D) {
      // Prepare model for sculpting
      let mainMesh: THREE.Mesh | null = null;
      
      loadedObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          
          // Check if the mesh has a material
          if (!mesh.material) {
            // Only apply a default material if none exists
            mesh.material = new THREE.MeshStandardMaterial({
              color: 0xf5f5f5,
              roughness: 0.7,
              metalness: 0.2
            });
          } else if (Array.isArray(mesh.material)) {
            // For multi-material meshes, ensure all materials exist
            mesh.material = mesh.material.map(mat => 
              mat || new THREE.MeshStandardMaterial({
                color: 0xf5f5f5,
                roughness: 0.7,
                metalness: 0.2
              })
            );
          }
          
          // For now, just use the first mesh found for sculpting
          if (!mainMesh) {
            mainMesh = mesh;
          }
        }
      });
      
      if (mainMesh) {
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(loadedObject);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        
        box.getCenter(center);
        box.getSize(size);
        
        loadedObject.position.sub(center); // Center the model
        
        // Scale to a reasonable size
        const maxDimension = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDimension;
        loadedObject.scale.set(scale, scale, scale);
        
        // Ensure the geometry has attributes needed for sculpting
        if (mainMesh.geometry) {
          mainMesh.geometry.computeVertexNormals();
          
          // Store original vertex data for potential reset
          const positions = mainMesh.geometry.attributes.position.array;
          setOriginalVertices(new Float32Array(positions));
        }
        
        // Add to scene
        scene.add(loadedObject);
        setMeshRef(mainMesh);
      }
      
      setIsLoading(false);
    }
  }, [modelUrl, scene]);
  
  // Handle pointer events
  useEffect(() => {
    if (!meshRef) return;
    
    const handlePointerMove = (event: MouseEvent) => {
      // Update mouse coordinates for raycaster
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Cast ray from camera through mouse position
      raycaster.setFromCamera(mouse, camera);
      
      // Check for intersection with the mesh
      const intersects = raycaster.intersectObject(meshRef);
      
      if (intersects.length > 0) {
        // Update the brush position to the intersection point
        setBrushPosition(intersects[0].point);
        
        // Apply sculpting if actively modifying
        if (isModifying) {
          const intersection = intersects[0];
          sculptMesh(intersection.point, intersection.face?.normal);
        }
      }
    };
    
    const handlePointerDown = (event: MouseEvent) => {
      if (event.button === 0) { // Left mouse button
        setIsModifying(true);
        setLastMousePosition(new THREE.Vector2(mouse.x, mouse.y));
      }
    };
    
    const handlePointerUp = () => {
      setIsModifying(false);
    };
    
    // Add event listeners
    gl.domElement.addEventListener('pointermove', handlePointerMove);
    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    gl.domElement.addEventListener('pointerup', handlePointerUp);
    gl.domElement.addEventListener('pointerleave', handlePointerUp);
    
    return () => {
      // Cleanup event listeners
      gl.domElement.removeEventListener('pointermove', handlePointerMove);
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      gl.domElement.removeEventListener('pointerup', handlePointerUp);
      gl.domElement.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [camera, raycaster, mouse, gl, isModifying, activeTool, brushSize, brushStrength, meshRef]);
  
  // Sculpting logic
  const sculptMesh = (point: THREE.Vector3, normal?: THREE.Vector3) => {
    if (!meshRef || !meshRef.geometry) return;
    
    const mesh = meshRef;
    const posAttr = mesh.geometry.attributes.position;
    const worldMatrix = mesh.matrixWorld;
    const inverseMatrix = new THREE.Matrix4().copy(worldMatrix).invert();
    
    // Convert the point to local space
    const localPoint = point.clone().applyMatrix4(inverseMatrix);
    
    // Temp vectors for calculations
    const tempVector = new THREE.Vector3();
    const tempNormal = new THREE.Vector3();
    
    // Apply the tool effect to each vertex
    for (let i = 0; i < posAttr.count; i++) {
      tempVector.fromBufferAttribute(posAttr, i);
      
      // Calculate distance to brush center
      const dist = tempVector.distanceTo(localPoint);
      
      // Only modify vertices within the brush radius
      if (dist < brushSize) {
        // Calculate falloff (stronger effect near brush center)
        const falloff = 1 - dist / brushSize;
        
        switch(activeTool) {
          case Tool.SCULPT:
            // Pull vertices outward along normal
            if (normal) {
              // Calculate local normal
              tempNormal.copy(normal);
              tempNormal.transformDirection(inverseMatrix);
              tempVector.addScaledVector(tempNormal, brushStrength * falloff * 0.01);
            }
            break;
            
          case Tool.SMOOTH:
            // Smooth by blending toward average position
            const smoothFactor = brushStrength * falloff * 0.01;
            tempVector.lerp(localPoint, smoothFactor);
            break;
            
          case Tool.PINCH:
            // Pinch by moving vertices toward brush center
            const dir = new THREE.Vector3().copy(localPoint).sub(tempVector);
            tempVector.addScaledVector(dir, brushStrength * falloff * 0.01);
            break;
            
          case Tool.MOVE:
            // Move follows mouse movement
            const mouseDelta = new THREE.Vector2(
              mouse.x - lastMousePosition.x,
              mouse.y - lastMousePosition.y
            );
            
            // Convert mouse delta to world space movement
            const moveFactor = brushStrength * falloff * 0.02;
            tempVector.x += mouseDelta.x * moveFactor;
            tempVector.y -= mouseDelta.y * moveFactor; // Invert Y for correct direction
            break;
        }
        
        // Update the vertex position
        posAttr.setXYZ(i, tempVector.x, tempVector.y, tempVector.z);
      }
    }
    
    // Update the geometry
    posAttr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    
    // Store current mouse position for next frame
    setLastMousePosition(new THREE.Vector2(mouse.x, mouse.y));
  };
  
  // Allow resetting the mesh to original state
  const resetMesh = () => {
    if (!meshRef || !meshRef.geometry || !originalVertices) return;
    
    const posAttr = meshRef.geometry.attributes.position;
    posAttr.array.set(originalVertices);
    posAttr.needsUpdate = true;
    meshRef.geometry.computeVertexNormals();
  };
  
  return (
    <>
      {/* Display an upload prompt message if no model is loaded */}
      {!modelUrl && !isLoading && (
        <group position={[0, 0, 0]}>
          {/* Simple placeholder with a small info sphere */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color="#cccccc" transparent opacity={0.5} />
          </mesh>
        </group>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#cccccc" wireframe />
        </mesh>
      )}
            
      {/* Visualize the brush cursor when we have a model */}
      {meshRef && (
        <BrushCursor 
          position={brushPosition} 
          brushSize={brushSize}
          activeTool={activeTool}
        />
      )}
      
      {/* Helpers for orientation */}
      <gridHelper args={[10, 10]} position={[0, -1.5, 0]} />
    </>
  );
}

// Main component with toolbar
function SimpleViewer() {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.SCULPT);
  const [brushSize, setBrushSize] = useState<number>(0.2);
  const [brushStrength, setBrushStrength] = useState<number>(5);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  
  // File upload handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const url = URL.createObjectURL(file);
    setModelUrl(url);
  };
  
  // Styled button for tool selection
  const ToolButton = ({ 
    tool, 
    icon, 
    label 
  }: { 
    tool: Tool, 
    icon: string, 
    label: string 
  }) => (
    <button
      onClick={() => setActiveTool(tool)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px',
        margin: '0 4px',
        background: activeTool === tool ? '#4CAF50' : '#e0e0e0',
        color: activeTool === tool ? 'white' : 'black',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        width: '60px',
        height: '60px'
      }}
    >
      <span style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</span>
      <span style={{ fontSize: '12px' }}>{label}</span>
    </button>
  );
  
  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>Professional 3D Sculptor</h2>
      
      {/* File upload */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: modelUrl ? '#f0f8ff' : '#fff8e1',
        borderRadius: '8px',
        border: modelUrl ? '1px solid #90caf9' : '2px dashed #ffa726'
      }}>
        <h3 style={{ margin: '0 0 10px' }}>
          {modelUrl ? 'Current Model' : 'Upload a 3D Model to Begin'}
        </h3>
        
        <input
          type="file"
          accept=".glb,.gltf,.obj"
          onChange={handleFileUpload}
          style={{ display: 'block', margin: '10px 0' }}
        />
        
        {modelUrl && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={() => setModelUrl(null)}
              style={{
                padding: '8px 16px',
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear Model
            </button>
          </div>
        )}
      </div>
      
      {/* Tool selection - only show when a model is loaded */}
      {modelUrl && (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            margin: '20px 0',
            background: '#f5f5f5',
            padding: '10px',
            borderRadius: '8px'
          }}>
            <ToolButton tool={Tool.MOVE} icon="✋" label="Move" />
            <ToolButton tool={Tool.SCULPT} icon="🔨" label="Sculpt" />
            <ToolButton tool={Tool.SMOOTH} icon="🧼" label="Smooth" />
            <ToolButton tool={Tool.PINCH} icon="👌" label="Pinch" />
          </div>
          
          {/* Brush settings */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            margin: '0 0 20px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
              <label>Brush Size: {brushSize.toFixed(2)}</label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.01"
                value={brushSize}
                onChange={(e) => setBrushSize(parseFloat(e.target.value))}
                style={{ width: '200px' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
              <label>Brush Strength: {brushStrength.toFixed(1)}</label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={brushStrength}
                onChange={(e) => setBrushStrength(parseFloat(e.target.value))}
                style={{ width: '200px' }}
              />
            </div>
          </div>
        </>
      )}
      
      {/* 3D Canvas */}
      <div style={{ 
        width: '100%',
        height: '500px',
        border: '2px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0'
      }}>
        <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <directionalLight position={[-5, -5, -5]} intensity={0.3} />
          
          <EditableScene 
            brushSize={brushSize}
            brushStrength={brushStrength}
            activeTool={activeTool}
            modelUrl={modelUrl}
          />
          
          <OrbitControls
            enableDamping={false}
            minDistance={1.5}
            maxDistance={10}
          />
        </Canvas>
      </div>
      
      {/* Instructions */}
      <div style={{ 
        margin: '20px 0', 
        padding: '15px', 
        background: '#f5f5f5', 
        borderRadius: '8px' 
      }}>
        <h3>Instructions:</h3>
        <ul style={{ textAlign: 'left' }}>
          <li><strong>Upload a Model:</strong> Upload a 3D model (.glb, .gltf, or .obj format)</li>
          <li><strong>Move Tool (✋):</strong> Click and drag to push vertices in any direction</li>
          <li><strong>Sculpt Tool (🔨):</strong> Pull vertices outward along the surface normal</li>
          <li><strong>Smooth Tool (🧼):</strong> Blend and smooth rough areas</li>
          <li><strong>Pinch Tool (👌):</strong> Pull vertices toward the brush center</li>
          <li>Use right mouse button to rotate the view</li>
          <li>Use scroll wheel to zoom in/out</li>
        </ul>
      </div>
    </div>
  );
}

export default SimpleViewer; 