import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// Sculpting tools and modes
enum Tool {
  MOVE = 'MOVE',
  SCULPT = 'SCULPT',
  SMOOTH = 'SMOOTH',
  PINCH = 'PINCH'
}

const DEFAULT_MODEL_URL = 'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/nose/model.gltf';

// Tool pointer that shows the brush size and active area
function BrushCursor({ 
  position, 
  brushSize, 
  brushStrength,
  activeTool 
}: { 
  position: THREE.Vector3; 
  brushSize: number;
  brushStrength: number;
  activeTool: Tool;
}) {
  // Color based on active tool
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
      {/* Inner sphere showing center of brush */}
      <mesh>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color={getToolColor()} transparent opacity={0.9} />
      </mesh>
      
      {/* Outer sphere showing brush area of effect */}
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

// Add debugging component to visualize model bounding box
function ModelDebugger({ object }: { object: THREE.Object3D }) {
  const [bounds, setBounds] = useState<THREE.Box3 | null>(null);
  
  useEffect(() => {
    if (object) {
      const box = new THREE.Box3().setFromObject(object);
      setBounds(box);
    }
  }, [object]);
  
  if (!bounds) return null;
  
  // Bounding box visualization
  const size = new THREE.Vector3();
  bounds.getSize(size);
  
  return (
    <group>
      <mesh position={bounds.getCenter(new THREE.Vector3())} visible={true}>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshBasicMaterial color="red" wireframe={true} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

function SculptableModel({ 
  fileUrl, 
  tool, 
  brushSize, 
  brushStrength,
  onLoaded
}: { 
  fileUrl: string, 
  tool: Tool,
  brushSize: number,
  brushStrength: number,
  onLoaded?: () => void
}) {
  const group = useRef<THREE.Group>(null);
  const { raycaster, camera, mouse, gl } = useThree();
  const [brushPosition, setBrushPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [isModifying, setIsModifying] = useState(false);
  const [loadedScene, setLoadedScene] = useState<THREE.Group | null>(null);
  const [originalVertices, setOriginalVertices] = useState<Map<THREE.Mesh, Float32Array>>(new Map());
  const [lastMousePosition, setLastMousePosition] = useState<THREE.Vector2>(new THREE.Vector2());
  
  // For raycasting onto the model
  const pointerMesh = useRef<THREE.Mesh | null>(null);
  
  useEffect(() => {
    console.log("Loading model from URL:", fileUrl);
    // Determine which loader to use based on file extension
    const fileExtension = fileUrl.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'obj') {
      console.log("Using OBJ loader");
      const loader = new OBJLoader();
      loader.load(
      fileUrl, 
      (object) => {
        console.log("OBJ loaded successfully", object);
        processLoadedModel(object);
        },
      (xhr) => {
        console.log(`OBJ ${(xhr.loaded / xhr.total * 100).toFixed(0)}% loaded`);
      },
        (error) => {
        console.error("Error loading OBJ:", error);
        }
      );
    } else {
      console.log("Using GLTF/GLB loader");
      const loader = new GLTFLoader();
      loader.load(
      fileUrl, 
        (gltf) => {
        console.log("GLTF/GLB loaded successfully", gltf);
        processLoadedModel(gltf.scene);
        },
      (xhr) => {
        console.log(`GLTF/GLB ${(xhr.loaded / xhr.total * 100).toFixed(0)}% loaded`);
      },
        (error) => {
        console.error("Error loading GLTF/GLB:", error);
        }
      );
    }
    
    function processLoadedModel(scene: THREE.Group) {
      console.log("Processing loaded model", scene);
      
      // Ensure the model has materials
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          console.log("Found mesh in model:", mesh);
          
          // Add a default material if none exists
          if (!mesh.material) {
            console.log("Applying default material to mesh");
          mesh.material = new THREE.MeshStandardMaterial({
              color: 0xf5f5f5,
              roughness: 0.5,
              metalness: 0.1
          });
          }
        }
      });
      
      // Center the model
      const box = new THREE.Box3().setFromObject(scene);
      console.log("Model bounding box:", box.min, box.max);
      
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      console.log("Model center:", center, "size:", size);
      
      // Scale to a reasonable size
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scale = 1.5 / maxDimension; 
      scene.scale.set(scale, scale, scale);
      
      // Center the model
      scene.position.copy(new THREE.Vector3(0, 0, 0));
      scene.position.y -= center.y * scale;
      
      console.log("Model scaled to:", scale, "and positioned at:", scene.position);
      
      // Find and store all meshes for interaction
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.computeBoundingBox();
          mesh.geometry.computeVertexNormals();
          
          // Add a default material if none exists
          if (!mesh.material) {
            mesh.material = new THREE.MeshStandardMaterial({
              color: 0xf5f5f5,
              roughness: 0.5,
              metalness: 0.1
            });
          }
          
          // Store original vertex positions for reset functionality
          const positions = mesh.geometry.attributes.position.array;
          setOriginalVertices(prev => {
            const newMap = new Map(prev);
            newMap.set(mesh, new Float32Array(positions));
            return newMap;
          });
          
          // Track this as a pointer target
          pointerMesh.current = mesh;
        }
      });
      
      setLoadedScene(scene);
      console.log("Model processing complete, scene set");
      onLoaded?.();
    }
  }, [fileUrl, onLoaded]);
  
  // Handle mouse movement for brush position
  useEffect(() => {
    if (!loadedScene || !pointerMesh.current) return;
    
    const handlePointerMove = (event: MouseEvent) => {
      // Update mouse coordinates for raycaster
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update raycaster with current mouse position
      raycaster.setFromCamera(mouse, camera);
      
      // Check for intersection with the model
      const intersects = raycaster.intersectObject(pointerMesh.current!, true);
      
      if (intersects.length > 0) {
        // Update brush position
        setBrushPosition(intersects[0].point);
        
        // Modify the mesh if actively sculpting
        if (isModifying) {
          const intersection = intersects[0];
          const mesh = intersection.object as THREE.Mesh;
          sculptMesh(mesh, intersection.point, intersection.face?.normal);
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
    
    gl.domElement.addEventListener('pointermove', handlePointerMove);
    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    gl.domElement.addEventListener('pointerup', handlePointerUp);
    gl.domElement.addEventListener('pointerleave', handlePointerUp);
    
    return () => {
      gl.domElement.removeEventListener('pointermove', handlePointerMove);
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      gl.domElement.removeEventListener('pointerup', handlePointerUp);
      gl.domElement.removeEventListener('pointerleave', handlePointerUp);
    };
  }, [loadedScene, pointerMesh, isModifying, gl, raycaster, camera, mouse, tool]);
  
  // Apply the selected tool to the mesh at the given point
  const sculptMesh = (mesh: THREE.Mesh, point: THREE.Vector3, normal?: THREE.Vector3) => {
    if (!mesh.geometry.attributes.position) return;
    
    const posAttr = mesh.geometry.attributes.position;
    const worldMatrix = mesh.matrixWorld;
    const inverseMatrix = new THREE.Matrix4().copy(worldMatrix).invert();
    
    // Get local point position
    const localPoint = point.clone().applyMatrix4(inverseMatrix);
    
    // Temp vector for calculations
    const tempVector = new THREE.Vector3();
    const tempNormal = new THREE.Vector3();
    
    // Apply the tool effect
    for (let i = 0; i < posAttr.count; i++) {
      tempVector.fromBufferAttribute(posAttr, i);
      
      // Calculate distance to brush center
      const dist = tempVector.distanceTo(localPoint);
      
      // Only affect vertices within brush size
      if (dist < brushSize) {
        // Calculate falloff (stronger effect near center)
        const falloff = 1 - dist / brushSize;
        
        switch(tool) {
          case Tool.SCULPT:
            // Pull vertices out (if we have a normal)
            if (normal) {
              tempNormal.copy(normal);
              tempNormal.transformDirection(inverseMatrix);
              tempVector.addScaledVector(tempNormal, brushStrength * falloff * 0.01);
      }
            break;
            
          case Tool.SMOOTH:
            // Smooth by moving toward average position
            const smoothFactor = brushStrength * falloff * 0.01;
            tempVector.lerp(localPoint, smoothFactor);
            break;
            
          case Tool.PINCH:
            // Pinch by moving toward center of brush
            const dir = new THREE.Vector3().copy(localPoint).sub(tempVector);
            tempVector.addScaledVector(dir, brushStrength * falloff * 0.01);
            break;
            
          case Tool.MOVE:
            // Move follows the mouse movement
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

  const resetModel = () => {
    if (!loadedScene) return;
    
    loadedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const original = originalVertices.get(mesh);
        
        if (original) {
          const posAttr = mesh.geometry.attributes.position;
          posAttr.array.set(original);
          posAttr.needsUpdate = true;
          mesh.geometry.computeVertexNormals();
    }
      }
    });
  };

  return (
    <>
      {loadedScene && (
        <>
          <primitive object={loadedScene} ref={group} />
          <ModelDebugger object={loadedScene} />
        </>
      )}
      <BrushCursor 
        position={brushPosition}
        brushSize={brushSize}
        brushStrength={brushStrength}
        activeTool={tool}
      />
    </>
  );
}

const ToolButton = ({ 
  tool, 
  activeTool, 
  onClick, 
  icon, 
  label 
}: { 
  tool: Tool, 
  activeTool: Tool, 
  onClick: () => void,
  icon: string,
  label: string
}) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px',
      margin: '0 5px',
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

export default function NoseEditor() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>(Tool.SCULPT);
  const [brushSize, setBrushSize] = useState<number>(0.2);
  const [brushStrength, setBrushStrength] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    const url = URL.createObjectURL(file);
    setFileUrl(url);
  };
  
  const handleLoadDefault = () => {
    setIsLoading(true);
    setFileUrl(DEFAULT_MODEL_URL);
  };
  
  const handleModelLoaded = () => {
    setIsLoading(false);
  };

  const downloadModel = () => {
    alert('Export functionality coming soon! This will allow you to download the modified model.');
  };

  return (
    <div style={{ textAlign: 'center', padding: '10px' }}>
      <h1>Professional 3D Nose Sculptor</h1>
      
      {fileUrl ? (
        <>
          {/* Tool controls */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            margin: '10px 0',
            flexWrap: 'wrap'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '10px', 
              background: '#f5f5f5', 
              borderRadius: '8px',
              margin: '10px 0'
            }}>
              <ToolButton 
                tool={Tool.MOVE} 
                activeTool={tool} 
                onClick={() => setTool(Tool.MOVE)}
                icon="✋"
                label="Move"
              />
              <ToolButton 
                tool={Tool.SCULPT} 
                activeTool={tool} 
                onClick={() => setTool(Tool.SCULPT)}
                icon="🔨"
                label="Sculpt"
              />
              <ToolButton 
                tool={Tool.SMOOTH} 
                activeTool={tool} 
                onClick={() => setTool(Tool.SMOOTH)}
                icon="🧼"
                label="Smooth"
              />
              <ToolButton 
                tool={Tool.PINCH} 
                activeTool={tool} 
                onClick={() => setTool(Tool.PINCH)}
                icon="👌"
                label="Pinch"
              />
            </div>
          </div>
          
          {/* Brush controls */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            margin: '0 0 20px',
            flexWrap: 'wrap',
            gap: '20px'
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
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setFileUrl(null)}
                style={{
                  padding: '8px 16px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                New Model
              </button>
              
              <button
                onClick={downloadModel}
                style={{
                  padding: '8px 16px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Export
              </button>
            </div>
          </div>

          {/* 3D Canvas */}
          <Canvas
            style={{ width: '100%', height: '600px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            camera={{ position: [0, 0, 2], fov: 45 }}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <directionalLight position={[-5, -5, -5]} intensity={0.3} />
            <hemisphereLight intensity={0.5} />
            {isLoading ? (
              <mesh>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial color="#cccccc" wireframe />
              </mesh>
            ) : (
              <SculptableModel 
                fileUrl={fileUrl} 
                tool={tool}
                brushSize={brushSize}
                brushStrength={brushStrength}
                onLoaded={handleModelLoaded}
              />
            )}
            <OrbitControls 
              makeDefault 
              enableDamping={false}
              minDistance={0.5}
              maxDistance={10}
            />
            <gridHelper args={[10, 10, 0x444444, 0x222222]} position={[0, -1, 0]} />
            <axesHelper args={[1]} />
          </Canvas>
          
          {/* Usage instructions */}
          <div style={{ margin: '20px 0', textAlign: 'left', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
            <h3>Usage Tips:</h3>
            <ul>
              <li><strong>Move Tool (✋):</strong> Click and drag to push vertices in any direction</li>
              <li><strong>Sculpt Tool (🔨):</strong> Pull vertices outward along the surface normal</li>
              <li><strong>Smooth Tool (🧼):</strong> Blend and smooth rough areas</li>
              <li><strong>Pinch Tool (👌):</strong> Pull vertices toward the brush center to create sharper features</li>
              <li>Adjust brush size and strength for precise control</li>
              <li>Hold the right mouse button to rotate the view</li>
              <li>Use the scroll wheel to zoom in/out</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <p>Upload a 3D model or use our default nose model to begin sculpting.</p>
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            maxWidth: '800px', 
            margin: '30px auto',
            flexWrap: 'wrap'
          }}>
            {/* Upload option */}
            <div style={{ 
              width: '350px',
              padding: '40px', 
              border: '2px dashed #ccc',
              borderRadius: '16px',
              backgroundColor: '#f9f9f9'
            }}>
              <img 
                src="https://cdn-icons-png.flaticon.com/512/2878/2878175.png" 
                alt="Upload icon" 
                style={{ width: '80px', marginBottom: '20px' }}
              />
              <h3>Upload your own 3D model</h3>
              <p>Import your patient's scan</p>
              <input
                type="file"
                accept=".glb,.gltf,.obj"
                onChange={handleUpload}
                style={{ margin: '20px auto', display: 'block' }}
              />
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Supported formats: GLB, GLTF, OBJ
              </p>
            </div>
            
            {/* Default model option */}
            <div style={{ 
              width: '350px',
              padding: '40px', 
              border: '2px solid #4CAF50',
              borderRadius: '16px',
              backgroundColor: '#f1f8e9'
            }}>
              <img 
                src="https://cdn-icons-png.flaticon.com/512/6543/6543526.png" 
                alt="Default model" 
                style={{ width: '80px', marginBottom: '20px' }}
              />
              <h3>Use default nose model</h3>
              <p>Start with our anatomically accurate model</p>
              <button
                onClick={handleLoadDefault}
                style={{
                  margin: '20px auto',
                  padding: '12px 24px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Load Default Model
              </button>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Ideal for demonstration and practice
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 