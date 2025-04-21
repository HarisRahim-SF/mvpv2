# The MVP - 3D Model Sculpting Tool

A professional 3D model visualization and sculpting tool built with React, Three.js, and React Three Fiber.

## Features

- **Upload Your Own 3D Models**: Support for GLTF/GLB and OBJ formats
- **Professional Sculpting Tools**:
  - Move Tool: Push vertices in any direction
  - Sculpt Tool: Pull surfaces outward along normals
  - Smooth Tool: Blend rough areas
  - Pinch Tool: Create sharper features
- **Adjustable Brush Controls**:
  - Size slider (0.05 to 0.5)
  - Strength slider (1 to 20)
- **Visual Brush Indicator**: Shows the influence area with a transparent sphere
- **Material & Texture Support**: Preserves original materials and textures from your models

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/the-mvp.git
   cd the-mvp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to the URL shown in the terminal (typically http://localhost:3000)

## Usage

1. **Upload a 3D Model**: Click the file input field and select a GLTF, GLB, or OBJ file
2. **Select a Tool**: Choose from Move, Sculpt, Smooth, or Pinch tools
3. **Adjust Settings**: Use the sliders to control brush size and strength
4. **Sculpt**: Click and drag on the model to modify it
5. **Navigation**:
   - Right mouse button: Rotate view
   - Mouse wheel: Zoom in/out

## Technologies Used

- React
- Three.js
- React Three Fiber
- TypeScript

## License

MIT License 