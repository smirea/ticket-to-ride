import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function carriageGeometries() {
	const paint: THREE.BufferGeometry[] = [];
	const ivory: THREE.BufferGeometry[] = [];
	const iron: THREE.BufferGeometry[] = [];
	function box(parts: THREE.BufferGeometry[], size: number[], at: number[], radius = 0.15) {
		const geometry =
			radius >= 0.3
				? new RoundedBoxGeometry(size[0]!, size[1]!, size[2]!, 1, radius)
				: new THREE.BoxGeometry(size[0]!, size[1]!, size[2]!).toNonIndexed();
		geometry.translate(at[0]!, at[1]!, at[2]!);
		parts.push(geometry);
	}
	box(paint, [25, 8.4, 5.5], [0, 0, 5], 0.5);
	box(iron, [28, 9, 1.2], [0, 0, 2.1]);
	box(iron, [30, 2, 1], [0, 0, 1.8]);
	const roof = new THREE.CylinderGeometry(1, 1, 26.8, 12, 1).toNonIndexed();
	roof.rotateZ(Math.PI / 2);
	roof.scale(1, 4.8, 2.5);
	roof.translate(0, 0, 7.7);
	paint.push(roof);
	box(ivory, [18.5, 3.5, 1.7], [0, 0, 10.1], 0.45);
	box(ivory, [19.5, 4, 0.65], [0, 0, 11.1], 0.3);
	for (const x of [-6.3, -2.1, 2.1, 6.3]) box(iron, [2.4, 2.4, 0.18], [x, 0, 11.5], 0.05);
	for (const side of [-1, 1]) {
		box(ivory, [24.2, 0.18, 0.28], [0, side * 4.25, 3.6], 0.05);
		for (const x of [-8.4, -4.2, 0, 4.2, 8.4]) {
			box(ivory, [3, 0.25, 2.6], [x, side * 4.3, 6.1], 0.12);
			box(iron, [2.3, 0.3, 1.9], [x, side * 4.44, 6.2], 0.08);
			box(iron, [2.2, 0.2, 0.85], [x, side * 1.8, 10.2], 0.05);
		}
		for (const x of [-8.5, 8.5]) {
			const wheel = new THREE.CylinderGeometry(1.85, 1.85, 1.15, 10, 1).toNonIndexed();
			wheel.translate(x, side * 4.45, 1.75);
			iron.push(wheel);
		}
		box(ivory, [0.3, 6.6, 0.3], [side * 12.5, 0, 7.6], 0.05);
		box(iron, [0.5, 7.2, 1.9], [side * 13.3, 0, 3.2], 0.1);
	}
	function merge(parts: THREE.BufferGeometry[]) {
		const geometry = mergeGeometries(parts);
		parts.forEach(part => part.dispose());
		return geometry;
	}
	return { paint: merge(paint), ivory: merge(ivory), iron: merge(iron) };
}
