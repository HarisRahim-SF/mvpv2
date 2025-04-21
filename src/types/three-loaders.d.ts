declare module 'three/examples/jsm/loaders/OBJLoader' {
  import { Group, Loader } from 'three';
  export class OBJLoader extends Loader {
    constructor();
    parse(data: string): Group;
  }
}

declare module 'three/examples/jsm/loaders/PLYLoader' {
  import { BufferGeometry, Loader } from 'three';
  export class PLYLoader extends Loader {
    constructor();
    parse(data: ArrayBuffer): BufferGeometry;
  }
}

declare module 'three/examples/jsm/loaders/STLLoader' {
  import { BufferGeometry, Loader } from 'three';
  export class STLLoader extends Loader {
    constructor();
    parse(data: ArrayBuffer): BufferGeometry;
  }
} 