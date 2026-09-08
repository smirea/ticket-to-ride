import { expect, test } from 'bun:test';
import { USA_CITIES } from '@repo/shared';
import { atlasPoint } from './atlas-warp';
import { cityTrace, normalizeTracePoint } from './route-trace';

test('every traced city samples its original atlas location', () => {
	for (const city of USA_CITIES) {
		const actual = atlasPoint(normalizeTracePoint(cityTrace[city.id]!));
		expect(actual.x).toBeCloseTo(city.x * 10 + (city.id === 'omaha' ? 20 : city.id === 'kansas-city' ? 10 : 0), 8);
		expect(actual.y).toBeCloseTo(city.y * 6.2 - (city.id === 'omaha' ? 18 : 0), 8);
	}
});

test('the atlas warp stays inside the texture without reversing terrain triangles', () => {
	let smallestArea = Infinity;
	let insideTexture = true;
	for (let y = 0; y < 620; y += 4) {
		for (let x = 0; x < 1000; x += 4) {
			const a = atlasPoint({ x, y });
			const b = atlasPoint({ x: x + 0.01, y });
			const c = atlasPoint({ x, y: y + 0.01 });
			insideTexture &&=
				Number.isFinite(a.x) &&
				Number.isFinite(a.y) &&
				a.x >= -1e-8 &&
				a.x <= 1000 + 1e-8 &&
				a.y >= -1e-8 &&
				a.y <= 620 + 1e-8;
			const area = ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 0.0001;
			smallestArea = Math.min(smallestArea, area);
		}
	}
	expect(insideTexture).toBe(true);
	expect(smallestArea).toBeGreaterThan(0.1);
});
