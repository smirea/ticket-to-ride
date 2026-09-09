import type { Player, Route } from '@repo/shared';
import { routeMarkerLength, routeMarkerT, routePoint } from './layout';

export type CarriageManifest = {
	frameSize: number;
	columns: number;
	rows: number;
	anchor: { x: number; y: number };
	pixelsPerModelUnit: number;
	headings: number;
	headingStep: number;
	sheets: Record<Player['color'], string>;
};
export type CarriageFrame = {
	src: string;
	sourceX: number;
	sourceY: number;
	frameSize: number;
	sheetWidth: number;
	sheetHeight: number;
	width: number;
	height: number;
	anchorX: number;
	anchorY: number;
	x: number;
	y: number;
	angle: number;
};
export type CarriageSprite = CarriageFrame & { matrix: number[] };

let manifestPromise: Promise<CarriageManifest> | undefined;
export function loadCarriageSprites() {
	return (manifestPromise ??= fetch('/game-assets/trains/carriage-sprites.json')
		.then(async response => {
			if (!response.ok) throw new Error('Carriage artwork could not load.');
			const manifest: CarriageManifest = await response.json();
			await Promise.all(
				Object.values(manifest.sheets).map(src => {
					const image = new Image();
					image.src = src;
					return image.decode();
				}),
			);
			return manifest;
		})
		.catch(error => {
			manifestPromise = undefined;
			throw error;
		}));
}

export function carriageFrame(
	manifest: CarriageManifest,
	route: Route,
	index: number,
	color: Player['color'],
): CarriageFrame {
	const t = routeMarkerT(route, index);
	const center = routePoint(route, t);
	const before = routePoint(route, Math.max(0, t - 0.002));
	const after = routePoint(route, Math.min(1, t + 0.002));
	const heading = ((Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI + 360) % 360;
	const frame = Math.round(heading / manifest.headingStep) % manifest.headings;
	const scale = (routeMarkerLength(route) - 1.2) / manifest.pixelsPerModelUnit;
	return {
		src: manifest.sheets[color],
		sourceX: (frame % manifest.columns) * manifest.frameSize,
		sourceY: Math.floor(frame / manifest.columns) * manifest.frameSize,
		frameSize: manifest.frameSize,
		sheetWidth: manifest.columns * manifest.frameSize,
		sheetHeight: manifest.rows * manifest.frameSize,
		width: manifest.frameSize * scale,
		height: manifest.frameSize * scale,
		anchorX: manifest.anchor.x * scale,
		anchorY: manifest.anchor.y * scale,
		x: center.x,
		y: center.y,
		angle: ((heading - frame * manifest.headingStep + 540) % 360) - 180,
	};
}
