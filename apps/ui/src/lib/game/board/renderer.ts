import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { GameState, RouteId } from '@repo/shared';
import {
	cities,
	cityPoint,
	isLand,
	lakes,
	mainland,
	playerColors,
	routeColors,
	routeGeometry,
	routePoint,
	routes,
	terrainHeight,
} from './layout';

function makeCamera() {
	const camera = new THREE.OrthographicCamera(-500, 500, 310, -310, 0.1, 3000);
	camera.position.set(-500, -130, 1500);
	camera.up.set(0, -1, 0);
	camera.lookAt(-500, 310, 0);
	camera.updateMatrixWorld();
	return camera;
}
const layoutCamera = makeCamera();
export function projectPoint(point: { x: number; y: number }, lift = 6) {
	const p = new THREE.Vector3(-point.x, point.y, terrainHeight(point.x, point.y) + lift).project(layoutCamera);
	return { x: (p.x + 1) * 500, y: (1 - p.y) * 310 };
}
function polygonShape(points: number[][]) {
	const shape = new THREE.Shape();
	points.forEach((p, i) => (i ? shape.lineTo(p[0]!, p[1]!) : shape.moveTo(p[0]!, p[1]!)));
	shape.closePath();
	return shape;
}
function terrainGeometry() {
	const positions: number[] = [],
		normals: number[] = [],
		colors: number[] = [];
	const sand = new THREE.Color('#e8d9b7'),
		forest = new THREE.Color('#789967'),
		stone = new THREE.Color('#a39b8b'),
		snow = new THREE.Color('#f4efdf');
	function vertex(x: number, y: number) {
		const z = terrainHeight(x, y);
		positions.push(x, y, z);
		const normal = new THREE.Vector3(
			-(terrainHeight(x + 0.5, y) - terrainHeight(x - 0.5, y)),
			-(terrainHeight(x, y + 0.5) - terrainHeight(x, y - 0.5)),
			1,
		).normalize();
		normals.push(normal.x, normal.y, normal.z);
		const color = sand.clone();
		const east = Math.max(0, Math.min(1, (x - 540) / 300)) * 0.78;
		const northwest = Math.exp(-Math.pow((x - 140) / 155, 2)) * Math.max(0, 1 - y / 370) * 0.9;
		color.lerp(forest, (east + northwest) * (0.82 + Math.sin(x * 0.024 + y * 0.028) * 0.18));
		if (x < 430 && y > 330) color.lerp(new THREE.Color('#dcb090'), Math.min(0.48, 0.12 + (y - 330) / 460));
		if (z > 10) color.lerp(stone, Math.min(0.86, (z - 10) / 28));
		if (z > 27) color.lerp(snow, Math.min(0.92, (z - 27) / 12));
		color.multiplyScalar(0.99 + Math.sin(x * 1.27 + y * 0.71) * Math.sin(y * 0.64 - x * 0.43) * 0.012);
		colors.push(color.r, color.g, color.b);
	}
	function edge(a: number[], b: number[], aLand: boolean) {
		let low = 0,
			high = 1;
		for (let i = 0; i < 9; i++) {
			const t = (low + high) / 2;
			if (isLand(a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t) === aLand) low = t;
			else high = t;
		}
		const t = (low + high) / 2;
		return [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t];
	}
	function triangle(points: number[][]) {
		const clipped: number[][] = [];
		for (let i = 0; i < 3; i++) {
			const a = points[i]!,
				b = points[(i + 1) % 3]!;
			const aLand = isLand(a[0]!, a[1]!),
				bLand = isLand(b[0]!, b[1]!);
			if (aLand) clipped.push(a);
			if (aLand !== bLand) clipped.push(edge(a, b, aLand));
		}
		for (let i = 1; i < clipped.length - 1; i++)
			for (const p of [clipped[0]!, clipped[i]!, clipped[i + 1]!]) vertex(p[0]!, p[1]!);
	}
	for (let y = -175; y < 770; y += 7)
		for (let x = -85; x < 1050; x += 7) {
			triangle([
				[x, y],
				[x + 7, y],
				[x, y + 7],
			]);
			triangle([
				[x + 7, y],
				[x + 7, y + 7],
				[x, y + 7],
			]);
		}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
	geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
	return geometry;
}

export function createAtlasRenderer(canvas: HTMLCanvasElement) {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	renderer.shadowMap.autoUpdate = false;
	renderer.shadowMap.needsUpdate = true;
	renderer.setClearColor('#5c9fa9');
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	const scene = new THREE.Scene(),
		camera = makeCamera();
	scene.scale.x = -1;
	scene.add(new THREE.AmbientLight('#fffdf4', 2.2));
	const sun = new THREE.DirectionalLight('#fffdf5', 2.1);
	sun.position.set(-200, -450, 900);
	sun.target.position.set(500, 310, 0);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	sun.shadow.camera.left = -650;
	sun.shadow.camera.right = 650;
	sun.shadow.camera.top = 500;
	sun.shadow.camera.bottom = -500;
	sun.shadow.camera.near = 1;
	sun.shadow.camera.far = 2200;
	sun.shadow.normalBias = 1;
	sun.shadow.bias = -0.0004;
	scene.add(sun, sun.target);
	const time = { value: 0 },
		pointer = { value: new THREE.Vector2(-2000, -2000) },
		motion = { value: 1 };
	const waterMaterial = new THREE.ShaderMaterial({
		uniforms: { uTime: time, uMotion: motion },
		vertexShader: `varying vec2 vMap;void main(){vMap=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
		fragmentShader: `varying vec2 vMap;uniform float uTime;uniform float uMotion;void main(){float wave=sin(vMap.x*.075+vMap.y*.13+uTime*.35*uMotion)*sin(vMap.y*.19-uTime*.21*uMotion);float fine=sin(vMap.x*.31+vMap.y*.47+sin(vMap.y*.06))*0.5;vec3 color=mix(vec3(.255,.526,.56),vec3(.43,.68,.69),.53+wave*.09+fine*.055);gl_FragColor=vec4(color,1.0);}`,
	});
	const water = new THREE.Mesh(new THREE.PlaneGeometry(1300, 900), waterMaterial);
	water.position.set(500, 310, -1);
	scene.add(water);
	const shape = polygonShape(mainland);
	for (const lake of lakes) shape.holes.push(polygonShape(lake));
	const shore = new THREE.Mesh(
		new THREE.ExtrudeGeometry(shape, {
			depth: 1,
			bevelEnabled: true,
			bevelThickness: 0.7,
			bevelSize: 2,
			bevelSegments: 1,
			steps: 1,
		}),
		new THREE.MeshStandardMaterial({ color: '#c5b98d', roughness: 1 }),
	);
	scene.add(shore);
	const terrain = new THREE.Mesh(
		terrainGeometry(),
		new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false, side: THREE.DoubleSide }),
	);
	terrain.material.onBeforeCompile = shader => {
		shader.vertexShader = 'varying vec2 vTerrainPoint;\n' + shader.vertexShader;
		shader.vertexShader = shader.vertexShader.replace(
			'#include <begin_vertex>',
			'#include <begin_vertex>\nvTerrainPoint=position.xy;',
		);
		shader.fragmentShader = 'varying vec2 vTerrainPoint;\n' + shader.fragmentShader;
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <color_fragment>',
			`#include <color_fragment>
   float grain=fract(sin(dot(vTerrainPoint,vec2(127.1,311.7)))*43758.5453);diffuseColor.rgb*=.975+grain*.05;`,
		);
	};
	terrain.receiveShadow = true;
	scene.add(terrain);
	for (const points of [
		[
			[508, 182],
			[536, 250],
			[537, 318],
			[565, 393],
			[596, 456],
			[620, 528],
		],
		[
			[360, 315],
			[434, 319],
			[479, 332],
			[550, 361],
		],
		[
			[713, 353],
			[677, 373],
			[625, 389],
			[565, 393],
		],
	]) {
		const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x!, y!, 0)));
		const riverPoints = curve.getPoints(72).map(p => new THREE.Vector3(p.x, p.y, terrainHeight(p.x, p.y) + 0.25));
		const river = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints(riverPoints),
			new THREE.LineBasicMaterial({ color: '#82a99d', transparent: true, opacity: 0.48 }),
		);
		scene.add(river);
	}

	const treeGeometry = new THREE.LatheGeometry(
		[
			[0, 0],
			[0.7, 0],
			[0.7, 3],
			[3.8, 3],
			[1.5, 8],
			[3.1, 8],
			[0.7, 13],
			[2.2, 13],
			[0, 20],
		].map(([radius, height]) => new THREE.Vector2(radius!, height!)),
		7,
	);
	treeGeometry.rotateX(Math.PI / 2);

	const treeMaterial = new THREE.MeshStandardMaterial({ color: '#b3cbb1', roughness: 1, flatShading: true });
	treeMaterial.onBeforeCompile = shader => {
		shader.uniforms.uTime = time;
		shader.uniforms.uPointer = pointer;
		shader.uniforms.uMotion = motion;
		shader.vertexShader = 'uniform float uTime;uniform vec2 uPointer;uniform float uMotion;\n' + shader.vertexShader;
		shader.vertexShader = shader.vertexShader.replace(
			'#include <begin_vertex>',
			`#include <begin_vertex>
  vec2 root=instanceMatrix[3].xy;float tip=max(0.0,position.z)/19.0;float gust=exp(-length(root-uPointer)/100.0);transformed.x+=tip*tip*(sin(uTime*.8+root.x*.1)*.22+gust*1.1)*uMotion;transformed.y+=tip*tip*cos(uTime*.65+root.y*.1)*.16*uMotion;`,
		);
	};
	let seed = 32;
	function random() {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed / 4294967296;
	}
	const treeSpots: { x: number; y: number; scale: number }[] = [];
	for (let i = 0; i < 640; i++) {
		const x = 25 + random() * 950,
			y = 15 + random() * 580;
		if (
			!isLand(x, y) ||
			(x > 290 && x < 650) ||
			(x < 420 && y > 360) ||
			cities.some(city => Math.hypot(cityPoint(city).x - x, cityPoint(city).y - y) < 19)
		)
			continue;
		if (
			routes.some(route => {
				const g = routeGeometry(route);
				const t = Math.max(
					0,
					Math.min(1, ((x - g.start.x) * g.dx + (y - g.start.y) * g.dy) / (g.distance * g.distance)),
				);
				const p = routePoint(route, t);
				return Math.hypot(p.x - x, p.y - y) < 10;
			})
		)
			continue;
		treeSpots.push({ x, y, scale: 0.72 + random() * 0.48 });
	}
	const trees = new THREE.InstancedMesh(treeGeometry, treeMaterial, treeSpots.length),
		dummy = new THREE.Object3D();
	treeSpots.forEach((p, i) => {
		dummy.position.set(p.x, p.y, terrainHeight(p.x, p.y));
		dummy.rotation.set(0, 0, random() * 6.28);
		dummy.scale.setScalar(p.scale);
		dummy.updateMatrix();
		trees.setMatrixAt(i, dummy.matrix);
		trees.setColorAt(
			i,
			new THREE.Color().setHSL(0.29 + random() * 0.065, 0.28 + random() * 0.15, 0.3 + random() * 0.12),
		);
	});
	trees.castShadow = true;
	scene.add(trees);
	const segmentCount = routes.reduce((count, route) => count + route.length, 0);
	const segmentGeometry = new RoundedBoxGeometry(1, 1, 1, 1, 0.14);
	const segmentMaterial = new THREE.MeshPhysicalMaterial({
		roughness: 0.32,
		metalness: 0,
		clearcoat: 1,
		clearcoatRoughness: 0.28,
	});
	const segments = new THREE.InstancedMesh(segmentGeometry, segmentMaterial, segmentCount);
	segments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
	segments.castShadow = true;
	scene.add(segments);
	const roofs = new THREE.InstancedMesh(
		new THREE.BoxGeometry(1, 1, 1),
		new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.07 }),
		segmentCount,
	);
	scene.add(roofs);
	const claimStarts = new THREE.InstancedBufferAttribute(new Float32Array(segmentCount).fill(-100), 1);
	claimStarts.setUsage(THREE.DynamicDrawUsage);
	segments.geometry.setAttribute('aClaimAt', claimStarts);
	roofs.geometry.setAttribute('aClaimAt', claimStarts);
	for (const material of [segments.material, roofs.material])
		material.onBeforeCompile = shader => {
			shader.uniforms.uTime = time;
			shader.uniforms.uMotion = motion;
			shader.vertexShader =
				'attribute float aClaimAt;uniform float uTime;uniform float uMotion;\n' + shader.vertexShader;
			shader.vertexShader = shader.vertexShader.replace(
				'#include <begin_vertex>',
				`#include <begin_vertex>
   float age=uTime-aClaimAt;float settle=clamp(age/.65,0.0,1.0);float lift=pow(1.0-settle,3.0)*1.6+sin(settle*9.0)*pow(1.0-settle,2.0)*.12;transformed.z+=lift*step(0.0,age)*step(age,.65)*uMotion;`,
			);
		};

	const routeIndexes = new Map<RouteId, number[]>();
	let nextIndex = 0;
	for (const route of routes) {
		const indices: number[] = [];
		for (let i = 0; i < route.length; i++) indices.push(nextIndex++);
		routeIndexes.set(route.id, indices);
	}
	let currentState: GameState | undefined, selected: RouteId | undefined, hovered: RouteId | undefined;
	function updateRoutes() {
		if (!currentState) return;
		const players = new Map(currentState.players.map(player => [player.id, player]));
		for (const route of routes) {
			const owner = players.get(currentState.claimedRoutes[route.id]!);
			const color = new THREE.Color(owner ? playerColors[owner.color] : routeColors[route.color]);
			const active = route.id === selected || route.id === hovered;
			const g = routeGeometry(route);
			const length = Math.min(34, (g.distance - 16) / route.length - 4);
			routeIndexes.get(route.id)!.forEach((index, i) => {
				const t = (i + 0.5) / route.length,
					p = routePoint(route, t),
					before = routePoint(route, Math.max(0, t - 0.01)),
					after = routePoint(route, Math.min(1, t + 0.01));
				const angle = Math.atan2(after.y - before.y, after.x - before.x);
				const height = terrainHeight(p.x, p.y) + 5 + (active ? 2 : 0);
				dummy.position.set(p.x, p.y, height);
				dummy.rotation.set(
					0,
					-Math.atan2(
						terrainHeight(after.x, after.y) - terrainHeight(before.x, before.y),
						Math.hypot(after.x - before.x, after.y - before.y),
					),
					angle,
					'ZYX',
				);
				dummy.scale.set(Math.max(8, length), 7.3, owner ? 4.8 : 3.5);
				dummy.updateMatrix();
				segments.setMatrixAt(index, dummy.matrix);
				segments.setColorAt(index, color.clone().lerp(new THREE.Color('#fff6c9'), active ? 0.25 : 0));
				dummy.position.z += owner ? 3.1 : 2.05;
				dummy.scale.set(Math.max(6, length - 3), 5.1, owner ? 2 : 0.55);
				dummy.updateMatrix();
				roofs.setMatrixAt(index, dummy.matrix);
				roofs.setColorAt(index, color.clone().lerp(new THREE.Color('#ffffff'), owner ? 0.02 : 0.03));
			});
		}
		segments.instanceMatrix.needsUpdate = true;
		segments.instanceColor!.needsUpdate = true;
		roofs.instanceMatrix.needsUpdate = true;
		roofs.instanceColor!.needsUpdate = true;
		renderer.shadowMap.needsUpdate = true;
		render();
	}
	const boats: THREE.Group[] = [];
	for (const [x, y, scale] of [
		[15, 435, 1.15],
		[940, 437, 1.4],
		[932, 547, 0.85],
		[13, 180, 1],
	]) {
		const boat = new THREE.Group();
		const hull = new THREE.Mesh(
			new THREE.SphereGeometry(5, 6, 3),
			new THREE.MeshStandardMaterial({ color: '#765b43', roughness: 0.9 }),
		);
		hull.scale.set(0.7, 1.8, 0.4);
		boat.add(hull);
		const sailGeometry = new THREE.BufferGeometry();
		sailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-5, 7, 3, 6, 7, 3, -4, -8, 22], 3));
		sailGeometry.computeVertexNormals();
		const sail = new THREE.Mesh(
			sailGeometry,
			new THREE.MeshBasicMaterial({ color: '#fff6db', side: THREE.DoubleSide }),
		);
		sail.rotation.z = -0.25;
		boat.add(sail);
		boat.position.set(x!, y!, 1);
		boat.scale.setScalar(scale!);
		scene.add(boat);
		boats.push(boat);
	}
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
	let frame = 0,
		lastFrame = 0,
		visible = true,
		disposed = false,
		ambientEnabled = true;
	const frameTimes: number[] = [];
	function render() {
		if (!disposed) {
			renderer.render(scene, camera);
			if (import.meta.env.DEV) canvas.dataset.renderCount = String(renderer.info.render.frame);
			const calls = String(renderer.info.render.calls);
			if (canvas.dataset.drawCalls !== calls) {
				canvas.dataset.drawCalls = calls;
				canvas.dataset.triangles = String(renderer.info.render.triangles);
			}
		}
	}
	function animate(now: number) {
		frame = 0;
		if (disposed || document.hidden || !visible || reduced.matches || !ambientEnabled) return;
		if (now - lastFrame >= 1000 / 65) {
			if (import.meta.env.DEV && lastFrame && frameTimes.length < 180) {
				frameTimes.push(now - lastFrame);
				if (frameTimes.length === 180) {
					const sorted = [...frameTimes].sort((a, b) => a - b);
					canvas.dataset.frameMedianMs = sorted[90]!.toFixed(2);
					canvas.dataset.frameP95Ms = sorted[171]!.toFixed(2);
				}
			}
			time.value = now * 0.001;
			boats.forEach((boat, i) => {
				boat.position.z = 1 + Math.sin(now * 0.0008 + i) * 0.35;
				boat.rotation.y = Math.sin(now * 0.0007 + i) * 0.025;
			});
			render();
			lastFrame = now;
		}
		frame = requestAnimationFrame(animate);
	}
	function syncAnimation() {
		motion.value = reduced.matches || !ambientEnabled ? 0 : 1;
		if (frame) cancelAnimationFrame(frame);
		frame = 0;
		lastFrame = 0;
		render();
		if (!document.hidden && visible && !reduced.matches && ambientEnabled) frame = requestAnimationFrame(animate);
	}
	const resize = new ResizeObserver(() => {
		const rect = canvas.getBoundingClientRect();
		renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
		render();
	});
	resize.observe(canvas);
	const intersection = new IntersectionObserver(entries => {
		visible = entries[0]?.isIntersecting ?? true;
		syncAnimation();
	});
	intersection.observe(canvas);
	document.addEventListener('visibilitychange', syncAnimation);
	reduced.addEventListener('change', syncAnimation);
	syncAnimation();
	return {
		update(state: GameState, selectedId?: RouteId, hoveredId?: RouteId) {
			if (currentState) {
				for (const route of routes) {
					if (state.claimedRoutes[route.id] && !currentState.claimedRoutes[route.id]) {
						routeIndexes
							.get(route.id)!
							.forEach((index, i) => claimStarts.setX(index, performance.now() * 0.001 + i * 0.055));
						claimStarts.needsUpdate = true;
					}
				}
			}
			currentState = state;
			selected = selectedId;
			hovered = hoveredId;
			updateRoutes();
		},
		pointer(x: number, y: number) {
			pointer.value.set(x, y);
		},
		setAmbientMotion(enabled: boolean) {
			ambientEnabled = enabled;
			syncAnimation();
		},
		destroy() {
			disposed = true;
			cancelAnimationFrame(frame);
			resize.disconnect();
			intersection.disconnect();
			document.removeEventListener('visibilitychange', syncAnimation);
			reduced.removeEventListener('change', syncAnimation);
			const geometries = new Set<THREE.BufferGeometry>(),
				materials = new Set<THREE.Material>();
			scene.traverse(object => {
				if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
					geometries.add(object.geometry);
					for (const material of Array.isArray(object.material) ? object.material : [object.material])
						materials.add(material);
				}
			});
			geometries.forEach(geometry => geometry.dispose());
			materials.forEach(material => material.dispose());
			sun.shadow.dispose();
			renderer.dispose();
		},
	};
}
