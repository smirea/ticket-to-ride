import {
	carriageMatrix,
	carriageModelForColor,
	loadCarriageModels,
	makeCarriageGeometry,
	makeCarriageMaterial,
} from './carriage';
import { atlasPoint } from './atlas-warp';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { GameState, RouteId } from '@repo/shared';
import { cities, cityPoint, isLand, playerColors, routeGeometry, routePoint, routes, terrainHeight } from './layout';

export function makeCamera() {
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
	const textureReady = new Promise<void>((resolve, reject) => {
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
	type CarriageBatch = {
		mesh: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
		rejections: THREE.InstancedBufferAttribute;
		count: number;
	};
	const batches = new Map<string, CarriageBatch>();
	let currentState: GameState | undefined;
	let lastRejectionKey: number | undefined;
	let rejectedRoute: string | undefined,
		rejectedAt = -100;
	const modelsReady = loadCarriageModels().then(models => {
		if (disposed) return;
		for (const [color, modelId] of Object.entries(carriageModelForColor)) {
			const model = models.find(candidate => candidate.id === modelId);
			if (!model) throw new Error(`Missing train model: ${modelId}`);
			const geometry = makeCarriageGeometry(model, playerColors[color as keyof typeof playerColors]);
			const rejections = new THREE.InstancedBufferAttribute(new Float32Array(45).fill(-100), 1);
			rejections.setUsage(THREE.DynamicDrawUsage);
			geometry.setAttribute('aRejectAt', rejections);
			const material = makeCarriageMaterial();
			material.onBeforeCompile = shader => {
				shader.uniforms.uTime = time;
				shader.uniforms.uInteractionMotion = interactionMotion;
				shader.vertexShader =
					'attribute float aRejectAt;uniform float uTime;uniform float uInteractionMotion;\n' + shader.vertexShader;
				shader.vertexShader = shader.vertexShader.replace(
					'#include <begin_vertex>',
					`#include <begin_vertex>
				float age=uTime-aRejectAt;transformed.x+=sin(age*48.)*pow(1.-clamp(age/.5,0.,1.),2.)*.006*step(0.,age)*uInteractionMotion;`,
				);
			};
			material.customProgramCacheKey = () => 'printables-carriage-reject-v1';
			const mesh = new THREE.InstancedMesh(geometry, material, 45);
			mesh.count = 0;
			mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.frustumCulled = false;
			scene.add(mesh);
			batches.set(color, { mesh, rejections, count: 0 });
		}
		updateRoutes();
	});
	const ready = Promise.all([textureReady, modelsReady]).then(() => undefined);
	function updateRoutes() {
		if (!currentState || !batches.size) return;
		const players = new Map(currentState.players.map(player => [player.id, player]));
		for (const batch of batches.values()) batch.count = 0;
		for (const route of routes) {
			const owner = players.get(currentState.claimedRoutes[route.id]!);
			if (!owner) continue;
			const batch = batches.get(owner.color)!;
			for (let i = 0; i < route.length; i++) {
				const index = batch.count++;
				batch.mesh.setMatrixAt(index, carriageMatrix(route, i));

				batch.rejections.setX(index, route.id === rejectedRoute ? rejectedAt : -100);
			}
		}
		for (const { mesh, count, rejections } of batches.values()) {
			mesh.count = count;
			mesh.instanceMatrix.needsUpdate = true;
			rejections.needsUpdate = true;
		}
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
			_selectedId?: RouteId,
			_hoveredId?: RouteId,
			_eligibleRouteIds?: string[],
			rejectedRouteId?: string,
			rejectionKey?: number,
		) {
			if (rejectedRouteId && rejectionKey !== lastRejectionKey) {
				lastRejectionKey = rejectionKey;
				rejectedRoute = rejectedRouteId;
				rejectedAt = performance.now() * 0.001;
				interactionUntil = performance.now() + 550;
			}
			currentState = state;
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
				if (object instanceof THREE.InstancedMesh) object.dispose();
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
