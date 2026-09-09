import * as THREE from 'three';
import type { Route } from '@repo/shared';
import { carriageMatrix } from './carriage';

export type CarriageSprite = { src: string; width: number; height: number; matrix: number[] };
export type BoardCarriageSprite = { src: string; width: number; height: number; x: number; y: number };

export async function captureCarriageSprites(
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	mesh: THREE.InstancedMesh,
	camera: THREE.OrthographicCamera,
	route: Route,
): Promise<BoardCarriageSprite[]> {
	const geometry = mesh.geometry;
	const visibility = new Map<THREE.Object3D, boolean>();
	scene.traverse(object => {
		if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
			visibility.set(object, object.visible);
			object.visible = object === mesh;
		}
	});
	const previousCount = mesh.count;
	const previousMatrix = new THREE.Matrix4();
	mesh.getMatrixAt(0, previousMatrix);
	mesh.count = 1;
	const captureCamera = camera.clone();
	const target = new THREE.WebGLRenderTarget(1, 1);
	target.texture.colorSpace = THREE.SRGBColorSpace;
	const previousTarget = renderer.getRenderTarget();
	const previousColor = renderer.getClearColor(new THREE.Color());
	const previousAlpha = renderer.getClearAlpha();
	const previousShadowUpdate = renderer.shadowMap.needsUpdate;
	const sprites: Promise<BoardCarriageSprite>[] = [];
	try {
		renderer.shadowMap.needsUpdate = false;
		renderer.setClearColor(0, 0);
		for (let i = 0; i < route.length; i++) {
			const placement = carriageMatrix(route, i);
			mesh.setMatrixAt(0, placement);
			mesh.instanceMatrix.needsUpdate = true;
			scene.updateMatrixWorld(true);
			const bounds = new THREE.Box2();
			const box = geometry.boundingBox!;
			for (const x of [box.min.x, box.max.x])
				for (const y of [box.min.y, box.max.y])
					for (const z of [box.min.z, box.max.z]) {
						const point = new THREE.Vector3(x, y, z)
							.applyMatrix4(placement)
							.applyMatrix4(mesh.matrixWorld)
							.project(camera);
						bounds.expandByPoint(new THREE.Vector2((point.x + 1) * 500, (1 - point.y) * 310));
					}
			bounds.expandByScalar(2);
			const x = Math.floor(bounds.min.x),
				y = Math.floor(bounds.min.y);
			const width = Math.ceil(bounds.max.x) - x,
				height = Math.ceil(bounds.max.y) - y;
			const pixelWidth = width * 2,
				pixelHeight = height * 2;
			target.setSize(pixelWidth, pixelHeight);
			captureCamera.setViewOffset(1000, 620, x, y, width, height);
			renderer.setRenderTarget(target);
			renderer.render(scene, captureCamera);
			const pixels = new Uint8Array(pixelWidth * pixelHeight * 4);
			const read = renderer.readRenderTargetPixelsAsync(target, 0, 0, pixelWidth, pixelHeight, pixels);
			sprites.push(
				read.then(() => {
					const crop = document.createElement('canvas');
					crop.width = pixelWidth;
					crop.height = pixelHeight;
					const context = crop.getContext('2d')!;
					const image = context.createImageData(pixelWidth, pixelHeight);
					const stride = pixelWidth * 4;
					for (let row = 0; row < pixelHeight; row++)
						image.data.set(
							pixels.subarray((pixelHeight - row - 1) * stride, (pixelHeight - row) * stride),
							row * stride,
						);
					context.putImageData(image, 0, 0);
					return { src: crop.toDataURL(), width, height, x, y };
				}),
			);
		}
	} finally {
		renderer.setRenderTarget(previousTarget);
		renderer.setClearColor(previousColor, previousAlpha);
		renderer.shadowMap.needsUpdate = previousShadowUpdate;
		mesh.count = previousCount;
		mesh.setMatrixAt(0, previousMatrix);
		mesh.instanceMatrix.needsUpdate = true;
		for (const [object, visible] of visibility) object.visible = visible;
	}
	try {
		return await Promise.all(sprites);
	} finally {
		target.dispose();
	}
}
