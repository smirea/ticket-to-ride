import { z } from 'zod';

export const MapIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const MapPositionSchema = z.strictObject({
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1),
});
export const MapColorSchema = z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white', 'gray']);
export const MapNodeSchema = z.strictObject({
	id: MapIdSchema,
	name: z.string().min(1),
	type: z.enum(['city', 'country', 'location', 'junction']),
	positions: z.array(MapPositionSchema).min(1),
	connectivity: z.enum(['shared', 'separate']),
	region: MapIdSchema.optional(),
	port: z.boolean().optional(),
	capital: z.boolean().optional(),
	festivalGroup: MapIdSchema.optional(),
	passengers: z.int().positive().optional(),
	merchandise: z.array(z.int().positive()).min(1).optional(),
});
const coloredSpace = { color: MapColorSchema };
export const MapLinkSchema = z.discriminatedUnion('type', [
	z.strictObject({ type: z.literal('car'), ...coloredSpace, mountain: z.boolean().optional() }),
	z.strictObject({ type: z.literal('locomotive'), ...coloredSpace }),
	z.strictObject({ type: z.literal('ship'), ...coloredSpace }),
	z.strictObject({ type: z.literal('pair'), ...coloredSpace }),
	z.strictObject({ type: z.literal('wave'), color: z.literal('gray') }),
	z.strictObject({ type: z.literal('track-bed') }),
	z.strictObject({ type: z.literal('bullet-train') }),
]);
export const MapConnectionSchema = z.strictObject({
	id: MapIdSchema,
	start: MapIdSchema,
	end: MapIdSchema,
	startPosition: z.int().nonnegative(),
	endPosition: z.int().nonnegative(),
	links: z.array(MapLinkSchema).min(1),
	parallelGroup: MapIdSchema.optional(),
	tunnel: z.strictObject({ reveal: z.int().min(3).max(6) }).optional(),
	bridgeToll: z.int().min(1).max(4).optional(),
	cardBonus: z.int().positive().optional(),
	stockCompanies: z.array(MapIdSchema).min(1).optional(),
	blocks: z.array(MapIdSchema).min(1).optional(),
	claim: z.enum(['route', 'family-spaces', 'shared-bullet-train']),
	wrap: z.enum(['horizontal']).optional(),
	points: z.int().nonnegative().optional(),
	technologyExempt: z.boolean().optional(),
	cardSubstitution: z.strictObject({ cards: z.int().positive(), replaces: z.literal(1) }).optional(),
});
export const MapParallelGroupSchema = z.strictObject({
	id: MapIdSchema,
	limits: z.array(z.strictObject({ players: z.int().min(2).max(6), tracks: z.int().min(1).max(4) })).min(1),
});
export const MapMechanicSchema = z.enum([
	'stations',
	'tunnels',
	'ferries',
	'mountains',
	'terrain-cards',
	'passengers',
	'merchandise',
	'bridge-tolls',
	'technology',
	'stocks',
	'track-beds',
	'city-control',
	'alvin',
	'bullet-trains',
	'region-bonus',
	'country-cards',
	'ships',
	'harbors',
	'pair-routes',
	'world-wrap',
	'family-routes',
	'festival-cards',
	'express-trains',
	'province-mat',
	'card-bonuses',
	'bonus-cards',
	'mandalas',
	'team-play',
	'depots',
]);
export const MapSchema = z
	.strictObject({
		schemaVersion: z.literal(1),
		id: MapIdSchema,
		name: z.string().min(1),
		image: z.strictObject({ file: z.literal('map.png'), width: z.int().positive(), height: z.int().positive() }),
		players: z.array(z.int().min(2).max(6)).min(1),
		mechanics: z.array(MapMechanicSchema),
		regions: z.array(
			z.strictObject({
				id: MapIdSchema,
				name: z.string().min(1),
				extraRegionCountWhenComplete: z.int().positive().optional(),
			}),
		),
		companies: z.array(z.strictObject({ id: MapIdSchema, name: z.string().min(1) })),
		nodes: z.array(MapNodeSchema).min(2),
		connections: z.array(MapConnectionSchema).min(1),
		parallelGroups: z.array(MapParallelGroupSchema),
	})
	.superRefine((map, ctx) => {
		const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
		const unique = (values: string[], path: (string | number)[]) => {
			if (new Set(values).size !== values.length) issue(path, 'Values must be unique');
		};
		for (const key of ['nodes', 'connections', 'parallelGroups', 'regions', 'companies'] as const) {
			unique(
				map[key].map(item => item.id),
				[key],
			);
		}
		unique(map.players.map(String), ['players']);
		unique(map.mechanics, ['mechanics']);
		const nodes = new Map(map.nodes.map(node => [node.id, node]));
		const connections = new Map(map.connections.map(connection => [connection.id, connection]));
		const groups = new Map(map.parallelGroups.map(group => [group.id, group]));
		const regionIds = new Set(map.regions.map(region => region.id));
		const companyIds = new Set(map.companies.map(company => company.id));
		const requireMechanic = (
			condition: boolean,
			mechanic: z.infer<typeof MapMechanicSchema>,
			path: (string | number)[],
		) => {
			if (condition && !map.mechanics.includes(mechanic)) issue(path, `Requires the ${mechanic} mechanic`);
		};
		map.nodes.forEach((node, i) => {
			unique(
				node.positions.map(position => `${position.x}:${position.y}`),
				['nodes', i, 'positions'],
			);
			requireMechanic(node.passengers !== undefined, 'passengers', ['nodes', i, 'passengers']);
			requireMechanic(node.merchandise !== undefined, 'merchandise', ['nodes', i, 'merchandise']);
			requireMechanic(node.festivalGroup !== undefined, 'festival-cards', ['nodes', i, 'festivalGroup']);
			requireMechanic(node.port === true, 'harbors', ['nodes', i, 'port']);
			if (node.region && !regionIds.has(node.region)) issue(['nodes', i, 'region'], 'Unknown region');
			for (let p = 0; p < node.positions.length; p++) {
				if (
					!map.connections.some(
						c => (c.start === node.id && c.startPosition === p) || (c.end === node.id && c.endPosition === p),
					)
				) {
					issue(['nodes', i, 'positions', p], 'Position has no connection');
				}
			}
		});
		const physicalTracks = new Map<string, z.infer<typeof MapConnectionSchema>>();
		map.connections.forEach((connection, i) => {
			const path = ['connections', i];
			unique(connection.stockCompanies ?? [], [...path, 'stockCompanies']);
			unique(connection.blocks ?? [], [...path, 'blocks']);
			const types = new Set(connection.links.map(link => link.type));
			const mode = (type: z.infer<typeof MapLinkSchema>['type']) =>
				type === 'car' || type === 'locomotive' || type === 'wave' ? 'train' : type;
			if (new Set(connection.links.map(link => mode(link.type))).size > 1)
				issue([...path, 'links'], 'Cannot mix transport modes on one track');
			if (connection.claim === 'family-spaces' && (types.size !== 1 || !types.has('car')))
				issue([...path, 'links'], 'Family routes require car spaces');
			if (
				connection.claim !== 'family-spaces' &&
				new Set(connection.links.flatMap(link => ('color' in link ? [link.color] : []))).size > 1
			)
				issue([...path, 'links'], 'Only family routes can mix colors');
			if (types.has('bullet-train') && connection.claim !== 'shared-bullet-train')
				issue([...path, 'claim'], 'Bullet tracks must be shared');
			if (connection.tunnel && [...types].some(type => type !== 'car' && type !== 'locomotive'))
				issue([...path, 'tunnel'], 'Tunnels require train spaces');
			requireMechanic(connection.tunnel !== undefined, 'tunnels', [...path, 'tunnel']);
			requireMechanic(connection.bridgeToll !== undefined, 'bridge-tolls', [...path, 'bridgeToll']);
			requireMechanic(connection.cardBonus !== undefined, 'card-bonuses', [...path, 'cardBonus']);
			requireMechanic(connection.stockCompanies !== undefined, 'stocks', [...path, 'stockCompanies']);
			requireMechanic(connection.blocks !== undefined || types.has('track-bed'), 'track-beds', path);
			requireMechanic(connection.wrap !== undefined, 'world-wrap', [...path, 'wrap']);
			requireMechanic(types.has('ship'), 'ships', [...path, 'links']);
			requireMechanic(types.has('pair'), 'pair-routes', [...path, 'links']);
			requireMechanic(types.has('wave') || types.has('locomotive'), 'ferries', [...path, 'links']);
			requireMechanic(types.has('bullet-train'), 'bullet-trains', [...path, 'links']);
			requireMechanic(connection.claim === 'family-spaces', 'family-routes', [...path, 'claim']);
			requireMechanic(
				connection.links.some(link => link.type === 'car' && link.mountain === true),
				'mountains',
				[...path, 'links'],
			);
			requireMechanic(connection.technologyExempt !== undefined, 'technology', [...path, 'technologyExempt']);
			const signature = JSON.stringify([
				[`${connection.start}:${connection.startPosition}`, `${connection.end}:${connection.endPosition}`].sort(),
				connection.links.map(link => JSON.stringify(link)).sort(),
				connection.wrap ?? null,
			]);
			const duplicate = physicalTracks.get(signature);
			if (duplicate && (!connection.parallelGroup || duplicate.parallelGroup !== connection.parallelGroup))
				issue(path, `Duplicate track outside a parallel group: ${duplicate.id}`);
			physicalTracks.set(signature, connection);
			for (const end of ['start', 'end'] as const) {
				const node = nodes.get(connection[end]);
				if (!node) issue(['connections', i, end], 'Unknown node');
				else if (connection[`${end}Position`] >= node.positions.length)
					issue(['connections', i, `${end}Position`], 'Unknown node position');
			}
			if (
				connection.start === connection.end &&
				(connection.startPosition === connection.endPosition ||
					nodes.get(connection.start)?.connectivity !== 'separate')
			)
				issue(['connections', i], 'A self connection must join distinct, separate positions');
			if (connection.parallelGroup && !groups.has(connection.parallelGroup))
				issue(['connections', i, 'parallelGroup'], 'Unknown parallel group');
			for (const company of connection.stockCompanies ?? []) {
				if (!companyIds.has(company)) issue(['connections', i, 'stockCompanies'], 'Unknown company');
			}
			for (const blocked of connection.blocks ?? []) {
				if (blocked === connection.id || !connections.get(blocked)?.blocks?.includes(connection.id)) {
					issue(['connections', i, 'blocks'], 'Crossing conflicts must reference another connection symmetrically');
				}
			}
			if (connection.claim === 'shared-bullet-train' && connection.links.some(link => link.type !== 'bullet-train')) {
				issue(['connections', i, 'links'], 'Shared bullet routes require bullet-train spaces');
			}
		});
		map.parallelGroups.forEach((group, i) => {
			const members = map.connections.filter(connection => connection.parallelGroup === group.id);
			if (members.length < 2) issue(['parallelGroups', i], 'A parallel group needs at least two tracks');
			if (new Set(members.map(member => member.links.length)).size > 1)
				issue(['parallelGroups', i], 'Parallel tracks must have equal lengths');
			const pairs = members.map(c => [c.start + ':' + c.startPosition, c.end + ':' + c.endPosition].sort().join('/'));
			if (new Set(pairs).size > 1) issue(['parallelGroups', i], 'Parallel tracks must share physical endpoints');
			unique(
				group.limits.map(limit => String(limit.players)),
				['parallelGroups', i, 'limits'],
			);
			if (
				group.limits.length !== map.players.length ||
				group.limits.some(limit => !map.players.includes(limit.players))
			) {
				issue(['parallelGroups', i, 'limits'], 'Specify a limit for every supported player count');
			}
			if (group.limits.some(limit => limit.tracks > members.length))
				issue(['parallelGroups', i, 'limits'], 'Track limit exceeds group size');
		});
	});

export type MapId = z.infer<typeof MapIdSchema>;
export type MapPosition = z.infer<typeof MapPositionSchema>;
export type MapColor = z.infer<typeof MapColorSchema>;
export type MapNode = z.infer<typeof MapNodeSchema>;
export type MapLink = z.infer<typeof MapLinkSchema>;
export type MapConnection = z.infer<typeof MapConnectionSchema>;
export type MapDefinition = z.infer<typeof MapSchema>;
export type MapMechanic = z.infer<typeof MapMechanicSchema>;
export type MapParallelGroup = z.infer<typeof MapParallelGroupSchema>;
