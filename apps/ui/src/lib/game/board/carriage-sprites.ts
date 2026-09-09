import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Player, Route } from '@repo/shared';
import {
	loadCarriageModels,
	carriageModelForColor,
	makeCarriageGeometry,
	makeCarriageMaterial,
	carriageMatrix,
} from './carriage';
import { makeCamera } from './renderer';
import { playerColors } from './layout';

export type CarriageSprite = { src: string; width: number; height: number; matrix: number[] };

export async function carriageSprites(
	route: Route,
	color: Player['color'],
	svg: SVGSVGElement,
): Promise<CarriageSprite[]> {
	const screen = svg.getScreenCTM();
	if (!screen) return [];
	const models = await loadCarriageModels();
	const model = models.find(model => model.id === carriageModelForColor[color])!;
	const geometry = makeCarriageGeometry(model, playerColors[color]);
	const material = makeCarriageMaterial();
	const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
	renderer.setPixelRatio(2);
	renderer.setSize(1000, 620, false);
	renderer.setClearColor(0, 0);
	const scene = new THREE.Scene();
	scene.scale.x = -1;
	const camera = makeCamera();
	scene.add(new THREE.AmbientLight('#fffdf4', 1.4));
	const sun = new THREE.DirectionalLight('#fff5de', 2.6);
	sun.position.set(-200, -600, 1200);
	sun.target.position.set(500, 310, 0);
	scene.add(sun, sun.target);
	const pmrem = new THREE.PMREMGenerator(renderer);
	const room = new RoomEnvironment();
	const environment = pmrem.fromScene(room, 0.04);
	scene.environment = environment.texture;
	scene.environmentIntensity = 0.25;
	room.dispose();
	pmrem.dispose();
	const mesh = new THREE.Mesh(geometry, material);
	mesh.matrixAutoUpdate = false;
	scene.add(mesh);
	const sprites: CarriageSprite[] = [];
	try {
		for (let i = 0; i < route.length; i++) {
			mesh.matrix.copy(carriageMatrix(route, i));
			scene.updateMatrixWorld(true);
			const positions = geometry.getAttribute('position');
			const bounds = new THREE.Box2();
			for (let j = 0; j < positions.count; j++) {
				const point = new THREE.Vector3()
					.fromBufferAttribute(positions, j)
					.applyMatrix4(mesh.matrixWorld)
					.project(camera);
				bounds.expandByPoint(new THREE.Vector2((point.x + 1) * 500, (1 - point.y) * 310));
			}
			bounds.expandByScalar(2);
			const x = Math.floor(bounds.min.x),
				y = Math.floor(bounds.min.y);
			const width = Math.ceil(bounds.max.x) - x,
				height = Math.ceil(bounds.max.y) - y;
			renderer.render(scene, camera);
			const crop = document.createElement('canvas');
			crop.width = width * 2;
			crop.height = height * 2;
			crop
				.getContext('2d')!
				.drawImage(renderer.domElement, x * 2, y * 2, width * 2, height * 2, 0, 0, width * 2, height * 2);
			const origin = new DOMPoint(x, y).matrixTransform(screen);
			sprites.push({
				src: crop.toDataURL(),
				width,
				height,
				matrix: [screen.a, screen.b, screen.c, screen.d, origin.x, origin.y],
			});
		}
		return sprites;
	} finally {
		geometry.dispose();
		material.dispose();
		environment.dispose();
		renderer.dispose();
		renderer.forceContextLoss();
	}
}
