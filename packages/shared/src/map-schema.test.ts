import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { MapSchema, type MapDefinition } from './map-schema';

const readMap = (id: string): MapDefinition =>
	MapSchema.parse(JSON.parse(readFileSync(new URL(`../../../rules/map-${id}/map.json`, import.meta.url), 'utf8')));

const errors = (map: MapDefinition) => {
	const result = MapSchema.safeParse(map);
	if (result.success) throw new Error('Expected invalid map');
	return result.error.issues.map(issue => issue.message).join('\n');
};

describe('map graph integrity', () => {
	test('distinct country endpoints can be connected without enabling travel through a country', () => {
		const map = readMap('the-heart-of-africa');
		const crossing = map.connections.find(connection => connection.start === connection.end)!;
		expect(crossing.startPosition).not.toBe(crossing.endPosition);
		map.nodes.find(node => node.id === crossing.start)!.connectivity = 'shared';
		expect(errors(map)).toContain('A self connection must join distinct, separate positions');
	});

	test('inset endpoints refer to an existing position on their shared city', () => {
		const map = readMap('japan');
		const city = map.nodes.find(node => node.positions.length > 1 && node.connectivity === 'shared')!;
		const connection = map.connections.find(connection => connection.start === city.id)!;
		connection.startPosition = city.positions.length;
		expect(errors(map)).toContain('Unknown node position');
	});

	test('a reversed duplicate cannot masquerade as an independent route', () => {
		const map = readMap('usa');
		const route = map.connections.find(connection => !connection.parallelGroup)!;
		map.connections.push({
			...route,
			id: 'accidental-duplicate',
			start: route.end,
			end: route.start,
			startPosition: route.endPosition,
			endPosition: route.startPosition,
		});
		expect(errors(map)).toContain('Duplicate track outside a parallel group');
	});

	test('France crossings are symmetric references to existing routes', () => {
		const map = readMap('france');
		const route = map.connections.find(connection => connection.blocks?.length)!;
		route.blocks!.pop();
		expect(errors(map)).toContain('Crossing conflicts must reference another connection symmetrically');
	});

	test('parallel availability covers every player count and cannot exceed printed tracks', () => {
		const map = readMap('northern-lights');
		map.parallelGroups[0]!.limits.pop();
		expect(errors(map)).toContain('Specify a limit for every supported player count');
		const usa = readMap('usa');
		usa.parallelGroups[0]!.limits[0]!.tracks = 3;
		expect(errors(usa)).toContain('Track limit exceeds group size');
	});

	test('transport and claim modes cannot silently lose their special behavior', () => {
		const japan = readMap('japan');
		japan.connections.find(connection => connection.claim === 'shared-bullet-train')!.claim = 'route';
		expect(errors(japan)).toContain('Bullet tracks must be shared');
		const world = readMap('rails-and-sails-world');
		const ship = world.connections.find(
			connection => connection.links.length > 1 && connection.links[0]!.type === 'ship',
		)!;
		ship.links[0] = { type: 'car', color: 'gray' };
		expect(errors(world)).toContain('Cannot mix transport modes');
		const europe = readMap('europe');
		europe.mechanics = europe.mechanics.filter(mechanic => mechanic !== 'tunnels');
		expect(errors(europe)).toContain('Requires the tunnels mechanic');
	});
});
