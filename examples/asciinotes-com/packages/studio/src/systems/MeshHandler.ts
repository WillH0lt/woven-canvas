// import type { Entity } from '@lastolivegames/becsy';
// import { co } from '@lastolivegames/becsy';
// import { Tag } from '@scrolly-page/shared';
// import {
//   AmbientLight,
//   DirectionalLight,
//   OrthographicCamera,
//   Scene,
//   SRGBColorSpace,
//   WebGLRenderer,
// } from 'three';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// import * as comps from '../components/index.js';
// import BaseSystem from './Base.js';
// import { waitForPromise } from './common.js';

// import PartHandler from './PartHandler.js';

// class MeshHandler extends BaseSystem {
//   private readonly input = this.singleton.read(comps.Input);

//   private readonly parts = this.query(
//     (q) => q.added.and.changed.and.removed.with(comps.Part).trackWrites,
//   );

//   private readonly threeScene = new Scene();

//   private readonly threeCamera = new OrthographicCamera(0, 0, 0, 0, 0.1, 1000);

//   private readonly threeRenderer = new WebGLRenderer({
//     antialias: true,
//     alpha: true,
//   });

//   private readonly glbLoader = new GLTFLoader();

//   public constructor() {
//     super();
//     this.schedule((s) => s.inAnyOrderWith(PartHandler));
//   }

//   @co private *loadModel(partEntity: Entity): Generator {
//     const heldPartEntity = partEntity.hold();

//     yield* waitForPromise(
//       new Promise((resolve) => {
//         this.glbLoader.load(partEntity.read(comps.Part).src, (gltf) => {
//           const model = gltf.scene.children[0];
//           model.name = heldPartEntity.read(comps.Part).id;

//           this.threeScene.add(model);
//           this.syncMesh(heldPartEntity);

//           resolve(model);
//         });
//       }),
//     );
//   }

//   public initialize(): void {
//     const { container } = this.resources;

//     const ambientLight = new AmbientLight(0xffffff, 3);
//     this.threeScene.add(ambientLight);

//     const directionalLight = new DirectionalLight(0xffffff, 2);
//     directionalLight.position.set(5, 10, 7.5);
//     this.threeScene.add(directionalLight);

//     this.threeCamera.position.z = 100;

//     this.threeRenderer.outputColorSpace = SRGBColorSpace;

//     this.threeRenderer.setSize(container.clientWidth, container.clientHeight);
//     this.threeRenderer.setPixelRatio(window.devicePixelRatio);
//     this.threeRenderer.setClearColor(0x000000, 0);
//     this.threeRenderer.domElement.style.position = 'absolute';
//     this.threeRenderer.domElement.style.top = '0';
//     this.threeRenderer.domElement.style.left = '0';
//     this.threeRenderer.domElement.style.width = '100%';
//     this.threeRenderer.domElement.style.height = '100%';
//     this.threeRenderer.domElement.style.pointerEvents = 'none';
//     this.threeRenderer.domElement.id = 'three-canvas';

//     if (!container.parentElement) {
//       console.error('Container must be mounted');
//       return;
//     }

//     container.parentElement.append(this.threeRenderer.domElement);
//   }

//   public execute(): void {
//     const { viewport } = this.resources;
//     if (!viewport) {
//       console.warn('missing resources');
//       return;
//     }

//     if (this.input.resizedTrigger) {
//       this.threeCamera.right = viewport.worldScreenWidth;
//       this.threeCamera.bottom = -viewport.worldScreenHeight;
//       this.threeCamera.updateProjectionMatrix();
//     }

//     for (const partEntity of this.parts.added) {
//       const part = partEntity.read(comps.Part);
//       if (part.tag !== Tag.Mesh) continue;

//       this.loadModel(partEntity);
//     }

//     for (const partEntity of this.parts.changed) {
//       this.syncMesh(partEntity);
//     }

//     if (this.parts.removed.length) {
//       this.accessRecentlyDeletedData(true);
//     }
//     for (const partEntity of this.parts.removed) {
//       const part = partEntity.read(comps.Part);
//       if (part.tag !== Tag.Mesh) continue;

//       const mesh = this.threeScene.getObjectByName(part.id);
//       if (!mesh) continue;

//       this.threeScene.remove(mesh);
//     }

//     // =================================
//     // render

//     this.threeCamera.position.x = -viewport.position.x;
//     this.threeCamera.position.y = viewport.position.y;
//     this.threeRenderer.render(this.threeScene, this.threeCamera);
//   }

//   private syncMesh(partEntity: Entity): void {
//     const part = partEntity.read(comps.Part);
//     if (part.tag !== Tag.Mesh) return;

//     const mesh = this.threeScene.getObjectByName(part.id);
//     if (!mesh) return;

//     mesh.position.x = part.left + part.width / 2;
//     mesh.position.y = -part.top - part.height / 2;

//     mesh.scale.x = part.width;
//     mesh.scale.y = part.width;
//     mesh.scale.z = part.width;
//     // mesh.scale.y = part.height;
//     // mesh.scale.z = part.scaleZ;

//     mesh.rotation.z = -part.rotateZ;
//   }
// }

// export default MeshHandler;
