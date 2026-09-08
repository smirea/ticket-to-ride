import { carriageGeometries } from './carriage';
import { atlasPoint } from './atlas-warp';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { GameState, RouteId } from '@repo/shared';
import {
	cities,
	cityPoint,
	isLand,
	playerColors,
	routeGeometry,
	routePoint,
	routeMarkerT,
	routeMarkerLength,
	routes,
	terrainHeight,
} from './layout';

function makeCamera() {
	const camera = new THREE.OrthographicCamera(-500, 500, 298, -298, 0.1, 3000);
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
function terrainGeometry() {
	const geometry = new THREE.PlaneGeometry(1000, 620, 160, 100);
	geometry.rotateX(Math.PI);
	geometry.translate(500, 310, 0);
	const positions = geometry.attributes.position!;
	const uvs = geometry.attributes.uv!;
	for (let i = 0; i < positions.count; i++) {
		positions.setZ(i, terrainHeight(positions.getX(i), positions.getY(i)));
		const source = atlasPoint({ x: positions.getX(i), y: positions.getY(i) });
		uvs.setXY(i, source.x / 1000, 1 - source.y / 620);
	}
	geometry.computeVertexNormals();
	return geometry;
}

export function createAtlasRenderer(canvas: HTMLCanvasElement) {
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		alpha: false,
		powerPreference: 'high-performance',
	});
	const pixelRatio = () => Math.min(window.devicePixelRatio, 2);
	renderer.setPixelRatio(pixelRatio());
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	renderer.shadowMap.autoUpdate = false;
	renderer.shadowMap.needsUpdate = true;
	renderer.setClearColor('#5c9fa9');
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	const scene = new THREE.Scene(),
		camera = makeCamera();
	scene.scale.x = -1;
	scene.add(new THREE.AmbientLight('#fffdf4', 1.4));
	const environment = new THREE.PMREMGenerator(renderer);
	const room = new RoomEnvironment();
	const environmentTarget = environment.fromScene(room, 0.04);
	scene.environment = environmentTarget.texture;
	scene.environmentIntensity = 0.25;
	room.dispose();
	environment.dispose();
	const sun = new THREE.DirectionalLight('#fff5de', 2.6);
	sun.position.set(-200, -600, 1200);
	sun.target.position.set(500, 310, 0);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.camera.left = -650;
	sun.shadow.camera.right = 650;
	sun.shadow.camera.top = 500;
	sun.shadow.camera.bottom = -500;
	sun.shadow.camera.near = 1;
	sun.shadow.camera.far = 2200;
	sun.shadow.normalBias = 0.2;
	sun.shadow.bias = -0.0004;
	scene.add(sun, sun.target);
	const time = { value: 0 },
		pointer = { value: new THREE.Vector2(-2000, -2000) },
		motion = { value: 1 },
		interactionMotion = { value: 1 };
	let resolveTexture!: () => void;
	let rejectTexture!: (error: unknown) => void;
	const ready = new Promise<void>((resolve, reject) => {
		resolveTexture = resolve;
		rejectTexture = reject;
	});
	const atlasTexture = new THREE.TextureLoader().load(
		'/game-assets/atlas/usa-relief-v2.webp',
		() => {
			if (!disposed) render();
			resolveTexture();
		},
		undefined,
		rejectTexture,
	);
	atlasTexture.colorSpace = THREE.SRGBColorSpace;
	atlasTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
	const atlasMaterial = new THREE.MeshBasicMaterial({ map: atlasTexture, side: THREE.DoubleSide });
	atlasMaterial.onBeforeCompile = shader => {
		shader.uniforms.uTime = time;
		shader.uniforms.uMotion = motion;
		shader.uniforms.uPointer = pointer;
		shader.fragmentShader =
			'uniform float uTime;uniform float uMotion;uniform vec2 uPointer;\n' + shader.fragmentShader;
		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <map_fragment>',
			`
			vec4 atlas = texture2D(map, vMapUv);
			float water = smoothstep(.035,.12,atlas.b-atlas.r) * smoothstep(.025,.12,atlas.g-atlas.r);
			vec2 world = vec2(vMapUv.x * 1000., (1.-vMapUv.y)*620.);
			float gust = exp(-length(world-uPointer)/65.);
			float forest = smoothstep(.012,.06,atlas.g-atlas.r) * (1.-water) * (1.-smoothstep(.06,.3,atlas.r));
			vec2 drift = vec2(sin(vMapUv.y*130.+uTime*.22),cos(vMapUv.x*110.+uTime*.17));
			vec2 wind = vec2(sin(uTime*1.1+world.y*.12),cos(uTime*.8+world.x*.1));
			vec2 uv = vMapUv + (drift*water*.00035 + wind*forest*(.00004+gust*.00055))*uMotion;
			diffuseColor *= texture2D(map,uv);
			diffuseColor.rgb += water * sin(world.x*.4+world.y*.8+uTime*.4) * .004 * uMotion;
		`,
		);
	};
	atlasMaterial.customProgramCacheKey = () => 'illustrated-atlas-water-wind-v2';
	const surfaceGeometry = terrainGeometry();
	const terrain = new THREE.Mesh(surfaceGeometry, atlasMaterial);
	scene.add(terrain);
	const contact = new THREE.Mesh(surfaceGeometry, new THREE.ShadowMaterial({ opacity: 0.32, side: THREE.DoubleSide }));
	contact.position.z = 0.08;
	contact.receiveShadow = true;
	scene.add(contact);

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

	const treeMaterial = new THREE.MeshStandardMaterial({ color: '#6e8860', roughness: 1, flatShading: true });
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
	treeMaterial.customProgramCacheKey = () => 'atlas-conifer-gust-v2';
	let seed = 32;
	function random() {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed / 4294967296;
	}
	const treeSpots: { x: number; y: number; scale: number }[] = [];
	for (let i = 0; i < 340; i++) {
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
		treeSpots.push({ x, y, scale: 0.4 + random() * 0.24 });
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
	const carriage = carriageGeometries();
	const segments = new THREE.InstancedMesh(
		carriage.paint,
		new THREE.MeshStandardMaterial({
			roughness: 0.38,
			metalness: 0.15,
			envMapIntensity: 0.35,
		}),
		segmentCount,
	);
	const roofs = new THREE.InstancedMesh(
		carriage.ivory,
		new THREE.MeshStandardMaterial({
			color: '#f5dfad',
			roughness: 0.55,
			metalness: 0.18,
		}),
		segmentCount,
	);
	const ironwork = new THREE.InstancedMesh(
		carriage.iron,
		new THREE.MeshStandardMaterial({
			color: '#202c30',
			roughness: 0.6,
			metalness: 0.25,
		}),
		segmentCount,
	);
	const carriageMeshes = [segments, roofs, ironwork];
	for (const mesh of carriageMeshes) {
		mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		scene.add(mesh);
	}
	const rejectionStarts = new THREE.InstancedBufferAttribute(new Float32Array(segmentCount).fill(-100), 1);
	rejectionStarts.setUsage(THREE.DynamicDrawUsage);
	for (const mesh of carriageMeshes) mesh.geometry.setAttribute('aRejectAt', rejectionStarts);
	const claimStarts = new THREE.InstancedBufferAttribute(new Float32Array(segmentCount).fill(-100), 1);
	claimStarts.setUsage(THREE.DynamicDrawUsage);
	for (const mesh of carriageMeshes) mesh.geometry.setAttribute('aClaimAt', claimStarts);
	for (const material of carriageMeshes.map(mesh => mesh.material))
		material.onBeforeCompile = shader => {
			shader.uniforms.uTime = time;
			shader.uniforms.uInteractionMotion = interactionMotion;
			shader.vertexShader =
				'attribute float aClaimAt;attribute float aRejectAt;uniform float uTime;uniform float uInteractionMotion;\n' +
				shader.vertexShader;
			shader.vertexShader = shader.vertexShader.replace(
				'#include <begin_vertex>',
				`#include <begin_vertex>
   float age=uTime-aClaimAt;float settle=clamp(age/.65,0.0,1.0);float lift=pow(1.0-settle,3.0)*1.6+sin(settle*9.0)*pow(1.0-settle,2.0)*.12;transformed.z+=lift*step(0.0,age)*step(age,.65)*uInteractionMotion;float rejectAge=uTime-aRejectAt;transformed.x+=sin(rejectAge*48.)*pow(1.-clamp(rejectAge/.5,0.,1.),2.)*.16*step(0.,rejectAge)*uInteractionMotion;`,
			);
		};

	for (const mesh of carriageMeshes) mesh.material.customProgramCacheKey = () => 'atlas-carriage-settle-v1';
	const routeIndexes = new Map<RouteId, number[]>();
	let nextIndex = 0;
	for (const route of routes) {
		const indices: number[] = [];
		for (let i = 0; i < route.length; i++) indices.push(nextIndex++);
		routeIndexes.set(route.id, indices);
	}
	let currentState: GameState | undefined, selected: RouteId | undefined, hovered: RouteId | undefined;
	let eligibleRoutes: Set<string> | undefined;
	let lastRejectionKey: number | undefined;
	function updateRoutes() {
		if (!currentState) return;
		const players = new Map(currentState.players.map(player => [player.id, player]));
		for (const route of routes) {
			const owner = players.get(currentState.claimedRoutes[route.id]!);
			const color = new THREE.Color(owner ? playerColors[owner.color] : '#888888');
			if (!owner && eligibleRoutes && !eligibleRoutes.has(route.id)) color.lerp(new THREE.Color('#a9a397'), 0.86);
			const active = route.id === selected || route.id === hovered;
			const length = routeMarkerLength(route);
			routeIndexes.get(route.id)!.forEach((index, i) => {
				const t = routeMarkerT(route, i),
					p = routePoint(route, t),
					before = routePoint(route, Math.max(0, t - 0.01)),
					after = routePoint(route, Math.min(1, t + 0.01));
				const angle = Math.atan2(after.y - before.y, after.x - before.x);
				const height = terrainHeight(p.x, p.y) + 0.8 + (active ? 0.4 : 0);
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
				dummy.scale.set(owner ? (length - 1.8) / 30 : 0, owner ? 1 : 0, owner ? 1 : 0);
				dummy.updateMatrix();
				for (const mesh of carriageMeshes) mesh.setMatrixAt(index, dummy.matrix);
				segments.setColorAt(index, color.clone().lerp(new THREE.Color('#fff6c9'), active ? 0.15 : 0));
			});
		}
		for (const mesh of carriageMeshes) mesh.instanceMatrix.needsUpdate = true;
		segments.instanceColor!.needsUpdate = true;
		renderer.shadowMap.needsUpdate = true;
		render();
	}
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
	let frame = 0,
		lastFrame = 0,
		visible = true,
		disposed = false,
		ambientEnabled = true,
		interactionUntil = 0;
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
			const textures = String(renderer.info.memory.textures);
			if (canvas.dataset.textures !== textures) {
				canvas.dataset.textures = textures;
				canvas.dataset.geometries = String(renderer.info.memory.geometries);
			}
		}
	}
	function animate(now: number) {
		frame = 0;
		if (disposed || document.hidden || !visible || reduced.matches || (!ambientEnabled && now > interactionUntil))
			return;
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
			render();
			lastFrame = now;
		}
		frame = requestAnimationFrame(animate);
	}
	function syncAnimation() {
		motion.value = reduced.matches || !ambientEnabled ? 0 : 1;
		interactionMotion.value = reduced.matches ? 0 : 1;
		if (frame) cancelAnimationFrame(frame);
		frame = 0;
		lastFrame = 0;
		render();
		if (!document.hidden && visible && !reduced.matches && (ambientEnabled || performance.now() < interactionUntil))
			frame = requestAnimationFrame(animate);
	}
	const resize = new ResizeObserver(() => {
		const rect = canvas.getBoundingClientRect();
		if (renderer.getPixelRatio() !== pixelRatio()) renderer.setPixelRatio(pixelRatio());
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
		ready,
		update(
			state: GameState,
			selectedId?: RouteId,
			hoveredId?: RouteId,
			eligibleRouteIds?: string[],
			rejectedRouteId?: string,
			rejectionKey?: number,
		) {
			eligibleRoutes = eligibleRouteIds ? new Set(eligibleRouteIds) : undefined;
			if (rejectedRouteId && rejectionKey !== lastRejectionKey) {
				lastRejectionKey = rejectionKey;
				routeIndexes.get(rejectedRouteId)?.forEach(index => rejectionStarts.setX(index, performance.now() * 0.001));
				rejectionStarts.needsUpdate = true;
				interactionUntil = performance.now() + 550;
			}
			if (currentState) {
				for (const route of routes) {
					if (state.claimedRoutes[route.id] && !currentState.claimedRoutes[route.id]) {
						routeIndexes
							.get(route.id)!
							.forEach((index, i) => claimStarts.setX(index, performance.now() * 0.001 + i * 0.055));
						claimStarts.needsUpdate = true;
						interactionUntil = performance.now() + 1100;
					}
				}
			}
			currentState = state;
			selected = selectedId;
			hovered = hoveredId;
			updateRoutes();
			if (!frame && performance.now() < interactionUntil) syncAnimation();
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
			atlasTexture.dispose();
			environmentTarget.dispose();
			renderer.dispose();
		},
	};
}
