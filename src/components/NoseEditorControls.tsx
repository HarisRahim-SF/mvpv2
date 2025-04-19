import React from 'react';
import './NoseEditorControls.css';

interface NoseEditorControlsProps {
  isEditMode: boolean;
  onReset: () => void;
}

const NoseEditorControls: React.FC<NoseEditorControlsProps> = ({
  isEditMode,
  onReset
}) => {
  if (!isEditMode) return null;

  return (
    <div className="nose-editor-controls">
      <h3>Direct Vertex Editor</h3>
      <p className="editor-instructions">
        Click directly on the model to select a vertex.
        Drag to move the selected vertex.
        A red sphere will show the selected vertex.
      </p>
      <button className="reset-button" onClick={onReset}>
        Reset Changes
      </button>
    </div>
  );
};

export default NoseEditorControls; 