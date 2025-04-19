import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Group, Mesh, MeshStandardMaterial, Box3, Vector3 } from 'three';
import './ModelUploader.css';

interface ModelUploaderProps {
  onModelLoaded: (model: Group) => void;
  onError: (error: string) => void;
  materialConfig?: {
    color?: number;
    roughness?: number;
    metalness?: number;
  };
}

const ModelUploader = ({ onModelLoaded, onError, materialConfig }: ModelUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const SUPPORTED_FORMATS = {
    'model/obj': ['.obj'],
    'application/octet-stream': ['.obj']
  };

  const defaultMaterialConfig = {
    color: 0xf5f5f5,
    roughness: 0.5,
    metalness: 0.1
  };

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension) {
      return 'Invalid file. Could not determine file extension.';
    }

    const supportedExtensions = Object.values(SUPPORTED_FORMATS).flat();
    if (!supportedExtensions.includes(`.${extension}`)) {
      return `Unsupported file format ".${extension}". Please upload a 3D model file (OBJ).`;
    }

    return null;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const validationError = validateFile(file);
      
      if (validationError) {
        onError(validationError);
        return;
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      setIsLoading(true);
      setUploadProgress(0);

      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };

      reader.onload = (event) => {
        const result = event.target?.result;
        if (!result) {
          setIsLoading(false);
          onError('Failed to read file');
          return;
        }

        try {
          const objLoader = new OBJLoader();
          const model = objLoader.parse(result as string) as Group;
          validateAndProcessModel(model);
        } catch (error) {
          onError(`Error loading model: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setIsLoading(false);
        setUploadProgress(0);
        onError('Error reading file');
      };

      reader.readAsText(file);
    },
    [onModelLoaded, onError, materialConfig]
  );

  const validateAndProcessModel = (model: Group) => {
    try {
      // Validate model structure
      if (!model.children.length) {
        throw new Error('Model contains no meshes');
      }

      // Check for valid geometry
      let hasValidGeometry = false;
      model.traverse((child) => {
        if (child instanceof Mesh && child.geometry) {
          hasValidGeometry = true;
          
          // Apply materials if not present
          if (!child.material) {
            child.material = new MeshStandardMaterial({
              color: materialConfig?.color || defaultMaterialConfig.color,
              roughness: materialConfig?.roughness || defaultMaterialConfig.roughness,
              metalness: materialConfig?.metalness || defaultMaterialConfig.metalness
            });
          }
        }
      });

      if (!hasValidGeometry) {
        throw new Error('Model contains no valid geometry');
      }

      // Process and center the model
      const box = new Box3().setFromObject(model);
      const center = box.getCenter(new Vector3());
      const size = box.getSize(new Vector3());
      
      // Center the model
      model.position.sub(center);
      
      // Scale the model to a reasonable size
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDimension;
      model.scale.multiplyScalar(scale);

      onModelLoaded(model);
    } catch (error) {
      onError(`Error processing model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FORMATS,
    maxFiles: 1,
  });

  useEffect(() => {
    return () => {
      // Cleanup any resources if needed
      setUploadProgress(0);
      setIsLoading(false);
    };
  }, []);

  return (
    <div
      {...getRootProps()}
      role="button"
      aria-label="Upload 3D model"
      tabIndex={0}
      className={`dropzone ${isDragActive ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
      style={{
        border: '2px dashed #cccccc',
        borderRadius: '4px',
        padding: '20px',
        textAlign: 'center',
        cursor: isLoading ? 'wait' : 'pointer',
        backgroundColor: isDragActive ? '#f0f9ff' : '#fafafa',
        marginBottom: '20px',
        position: 'relative',
      }}
    >
      <input {...getInputProps()} />
      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading model... {Math.round(uploadProgress)}%</p>
          <div 
            className="progress-bar"
            style={{
              width: `${uploadProgress}%`,
              height: '4px',
              backgroundColor: '#4CAF50',
              position: 'absolute',
              bottom: 0,
              left: 0,
              transition: 'width 0.3s ease-in-out'
            }}
          />
        </div>
      )}
      {isDragActive ? (
        <p>Drop the 3D model here...</p>
      ) : (
        <div>
          <p>Drag and drop a 3D model here, or click to select a file</p>
          <p style={{ fontSize: '0.8em', color: '#666' }}>
            Supported formats: OBJ
          </p>
        </div>
      )}
    </div>
  );
};

export default ModelUploader; 