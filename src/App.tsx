import React, { useState } from 'react';
import SimpleViewer from './components/SimpleViewer';
import { Group } from 'three';
import './App.css';

function App() {
  const [error, setError] = useState<string | null>(null);

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    console.error('Error:', errorMessage);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo">RHINOVATE</div>
        <h1 className="page-title">Dashboard</h1>
        <div className="brand">RV</div>
      </header>

      <main className="main-content">
        {/* Left Section - Simple 3D Viewer */}
        <section className="model-section">
          <div className="nose-editor-container">
            <SimpleViewer />
          </div>
          {error && (
            <div className="error-message">{error}</div>
          )}
        </section>

        {/* Right Section - Healing Previews & AI Recommendations */}
        <aside className="sidebar">
          <section className="healing-previews">
            <h2>Healing Previews</h2>
            <div className="preview-images">
              <div className="preview-card">
                <div className="coming-soon-placeholder">
                  COMING SOON
                </div>
                <span>2 weeks post-op</span>
              </div>
              <div className="preview-card">
                <div className="coming-soon-placeholder">
                  COMING SOON
                </div>
                <span>1 month post-op</span>
              </div>
            </div>
          </section>

          <section className="ai-recommendations">
            <h2>AI Recommendations</h2>
            <ul>
              <li>Dorsal hump reduction</li>
              <li>Alar base widening</li>
              <li>Nasal tip refinement</li>
            </ul>
          </section>
        </aside>
      </main>

      {/* Patient Information */}
      <section className="patient-info">
        <h2>Patient Information</h2>
        <div className="info-field">
          <label>Name</label>
          <span>Emily Johnson</span>
        </div>
      </section>
    </div>
  );
}

export default App; 