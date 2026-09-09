import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Player, Route } from '@repo/shared';
import { routeMarkerLength, routeMarkerT, routePoint, terrainHeight } from './layout';

export type CarriageModel = {
	id: string;
	name: string;
	parts: { material: 'body' | 'trim' | 'dark'; positions: number[]; indices: number[] }[];
};
export const carriageModelForColor: Record<Player['color'], string> = {
	red: 'carriage',
	blue: 'passenger',
	green: 'flatbed',
	yellow: 'boxcar',
	black: 'coal',
};
let modelsPromise: Promise<CarriageModel[]> | undefined;
export function loadCarriageModels() {
	return (modelsPromise ??= fetch('/game-assets/trains/printables-trains.json')
		.then(response => {
			if (!response.ok) throw new Error(`Train models could not load (${response.status})`);
			return response.json() as Promise<{ models: CarriageModel[] }>;
		})
		.then(asset => asset.models)
		.catch(error => {
			modelsPromise = undefined;
			throw error;
		}));
}

export function makeCarriageGeometry(model: CarriageModel, color: string) {
	const body = new THREE.Color(color);
	const palette = { body, trim: body.clone().lerp(new THREE.Color('#e5d2a4'), 0.32), dark: new THREE.Color('#303a3c') };
	const parts = model.parts.map(part => {
		const source = new THREE.BufferGeometry();
		source.setAttribute('position', new THREE.Float32BufferAttribute(part.positions, 3));
		source.setIndex(part.indices);
		// Creased-normal welding quantizes positions; use print-size units so small windows and roof ribs stay separate.
		source.scale(26, 26, 26);
		const geometry = toCreasedNormals(source, Math.PI / 4);
		source.dispose();
		geometry.scale(1 / 26, 1 / 26, 1 / 26);
		const colors = new Float32Array(geometry.attributes.position!.count * 3);
		const paint = palette[part.material];
		for (let i = 0; i < colors.length; i += 3) {
			colors[i] = paint.r;
			colors[i + 1] = paint.g;
			colors[i + 2] = paint.b;
		}
		geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		return geometry;
	});
	const geometry = mergeGeometries(parts)!;
	parts.forEach(part => part.dispose());
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();
	return geometry;
}

export function makeCarriageMaterial() {
	return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.12, envMapIntensity: 0.35 });
}

const tilt = (-20 * Math.PI) / 180;
export function carriageMatrix(route: Route, index: number, lift = 0) {
	const t = routeMarkerT(route, index);
	const p = routePoint(route, t),
		before = routePoint(route, t - 0.01),
		after = routePoint(route, t + 0.01);
	const yaw = Math.atan2(after.y - before.y, after.x - before.x);
	const slope = -Math.atan2(
		terrainHeight(after.x, after.y) - terrainHeight(before.x, before.y),
		Math.hypot(after.x - before.x, after.y - before.y),
	);
	const scale = routeMarkerLength(route) - 1.2;
	const rotation = new THREE.Matrix4()
		.makeRotationX(tilt)
		.multiply(new THREE.Matrix4().makeRotationZ(yaw))
		.multiply(new THREE.Matrix4().makeRotationY(slope));
	const clearance = scale * (Math.abs(rotation.elements[2]!) * 0.5 + Math.abs(rotation.elements[6]!) * 0.16);
	return new THREE.Matrix4()
		.makeTranslation(p.x, p.y, terrainHeight(p.x, p.y) + 0.5 + clearance + lift)
		.multiply(rotation)
		.scale(new THREE.Vector3(scale, scale, scale));
}
