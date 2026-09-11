# Ticket to Ride map assets

Each `map-<id>/` folder represents one board. Start with `map.json` for the graph, `map.png` for visual verification, and `rules.md` for the map's gameplay. Expansion rulebooks may require the base game rules as well.

| File                | Purpose                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `map.json`          | Typed board topology, normalized node positions, physical route spaces, and board-specific attributes. |
| `map-generated.png` | Generated terrain-only artwork matching the default USA relief style; no labels, cities, or tracks.    |
| `map.png`           | Full board reference; JSON coordinates refer to this exact image.                                      |
| `rules.pdf`         | Original rulebook.                                                                                     |
| `rules.md`          | Parsed rulebook, source links, and linked page images.                                                 |
| `images/`           | Rulebook page images and diagrams referenced by the Markdown.                                          |

## Generated terrain artwork

Each `map-generated.png` is a background illustration generated with the built-in image generation tool. All maps use the existing [`usa-relief-v4.webp`](../apps/ui/static/game-assets/atlas/usa-relief-v4.webp) as their visual style reference and their own `map.png` as the geographic composition reference. They are standalone assets; selecting them in the game and rendering city/route overlays is separate implementation work.

The shared generation brief is below. Each map's prompt adds its geographic extent, characteristic terrain, and any inset layout from its reference board. Stay at Home uses the same painted miniature treatment for rooms and garden.

> Create a terrain-only background for a tabletop railway game, part of one consistent atlas series. Match the USA reference's warm painterly miniature relief, fine brushwork, softly sculpted landforms, clustered trees, golden grassy plains, warm ochre rocky slopes, ivory snowy peaks, turquoise-blue seas, pale sandy shorelines, and slender blue rivers. Use a high overhead near-orthographic view, subtle raised terrain, and soft upper-left daylight. Keep the detail calm enough for city and route overlays.
>
> Shared palette: grass `#b8ad55` / `#d2bc64`, forests `#355c39` / `#527544`, earth `#bb854b`, desert `#dfb374`, rock `#8b8171`, snow `#f1e7cc`, water `#087ea5` / `#28abc1`.
>
> Use the map's original board only as a geographic composition template: preserve orientation, crop, relative coastlines, islands, lakes, rivers, inset placement, and canvas aspect ratio. Render that region rather than copying USA geography. Extend terrain into score-border and title-panel areas. Produce one full-bleed high-resolution PNG. No words, city markers, rail tracks, route spaces, connecting lines, cards, pieces, flags, logos, score tracks, legends, compass roses, frames, or watermarks. Avoid photorealism, flat vector art, parchment, and dramatic lighting.

Generated geography is illustrative. The original `map.png` remains the coordinate reference for `map.json`; verify alignment when integrating the artwork rather than assuming exact pixel registration.

## Loading and validation

The source of truth for the schema is [`packages/shared/src/map-schema.ts`](../packages/shared/src/map-schema.ts). Its exported TypeScript types are inferred from Zod; all objects reject unknown properties.

```ts
import { MapSchema, type MapDefinition } from '@repo/shared/map-schema';

const map: MapDefinition = MapSchema.parse(untrustedJson);
```

Run `bun run rules:validate` from the repository root after editing any map. It discovers every map folder, validates its JSON, checks graph references and feature consistency, and verifies the image dimensions and required rulebook files. Semantic regression tests live in [`map-schema.test.ts`](../packages/shared/src/map-schema.test.ts).

The data was transcribed from the reference boards and checked against the rulebooks. Schema validation checks structure and internal consistency; it cannot prove a transcription matches the printed board. Compare affected routes with `map.png` when making changes. These files describe static boards, not complete executable game modes: destination decks, setup, payments, scoring tables, turn actions, and dynamic state still need implementation from the rulebooks.

## Graph conventions

- IDs are stable kebab-case strings. Connections are undirected. Each connection is **one physical track**, including each member of a double or triple route.
- Coordinates use the entire image: origin at the top left, `x` increases rightward and `y` downward. Pixel coordinates are `x * image.width` and `y * image.height`. They mark node centers or country route endpoints; no route curves or individual space coordinates are encoded.
- `positions` supports multiple appearances of a logical node. `startPosition` and `endPosition` are zero-based indexes. With `connectivity: "shared"`, all appearances connect for travel, as with Tokyo and Kokura's Japan insets. With `"separate"`, each position is a distinct travel endpoint: separate country flags cannot provide a shortcut through the country. Node-level resources can still belong to the shared logical country.
- `city` is a named city, `country` is an external country or similarly treated destination, `location` is a named room or household location, and `junction` is a printed unlabeled route junction. Junctions have descriptive names for reference; they are not invented destination cities.
- Africa's Madagascar has two separate positions joined by an actual track. This is a permitted connection from a logical node to itself across distinct positions.
- `parallelGroup` explicitly identifies tracks governed together by player-count availability. Do not infer groups merely from equal endpoints: some boards have independent train/ship or coastal/inland alternatives. `limits[].tracks` is the number of available tracks for that player count, not permission for one player to own them all. Team Asia's counts are players, not teams.
- Optional fields are omitted when inapplicable. Empty `regions`, `companies`, `mechanics`, and `parallelGroups` arrays are intentional. `schemaVersion` is currently `1`; change it when introducing incompatible semantics.

## Spaces and special attributes

`links` contains one entry per **printed physical space**, so `links.length` is route length. It describes requirements, not a geometric path: array order does not locate symbols on the image. `gray` means neutral; locomotive is a space type rather than an additional color.

| Link type      | Meaning                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `car`          | Ordinary train space. `mountain: true` marks a Legendary Asia mountain space.                               |
| `locomotive`   | Train space bearing a required locomotive symbol; payment exceptions remain map-specific.                   |
| `ship`         | One ship space, even when paid with a double-ship card.                                                     |
| `pair`         | World tour land space requiring a pair of matching train cards. Different spaces can use different pairs.   |
| `wave`         | Italy ferry space bearing a wave symbol. Ferry-card coverage and locomotive substitutions follow its rules. |
| `track-bed`    | France unbuilt track bed. Its eventual color is selected during play.                                       |
| `bullet-train` | Japan shared bullet-train space. The claim uses the printed length but places a single bullet-train piece.  |

| Attribute            | Interpretation                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `claim`              | Whole route, individual family spaces, or shared bullet train. Family routes can contain multiple colors.                                                                            |
| `tunnel.reveal`      | Number of train cards revealed for a tunnel attempt.                                                                                                                                 |
| `bridgeToll`         | Nederland's printed coin toll.                                                                                                                                                       |
| `cardBonus`          | Northern Lights' printed card-draw reward.                                                                                                                                           |
| `stockCompanies`     | Pennsylvania companies available to choose from when claiming the track; not a grant of every listed stock.                                                                          |
| `blocks`             | Symmetric France crossing conflicts. Building or claiming one can obstruct another; these are not initially disabled routes.                                                         |
| `wrap`               | A World route crosses the horizontal image boundary; its endpoints remain ordinary cities.                                                                                           |
| `points`             | Explicit route-scoring override, such as Southampton–New York's 40 points. Otherwise consult the map's scoring rules.                                                                |
| `technologyExempt`   | The UK Southampton–New York route bypasses technology requirements.                                                                                                                  |
| `cardSubstitution`   | Route-specific exchange of a number of cards for one required card, as on Nordic Countries' nine-space route. General substitutions remain in the rules.                             |
| `region` / `regions` | Printed regional membership, used for such features as UK concessions and Italy region bonuses. Italy's `extraRegionCountWhenComplete` adds to region count, not directly to points. |
| `port`               | Rails & Sails harbor eligibility; `false` explicitly identifies an inland city.                                                                                                      |
| `capital`            | A printed capital marker on Northern Lights.                                                                                                                                         |
| `passengers`         | Germany's initial passenger-token count at a logical destination.                                                                                                                    |
| `merchandise`        | Märklin merchandise-token values in collection order, highest first.                                                                                                                 |
| `festivalGroup`      | Iberia festival identity; Porto and Coimbra share a group.                                                                                                                           |
| `mechanics`          | Declared capabilities an implementation needs. It is not a substitute for the rulebook's behavior or setup parameters.                                                               |

The existing USA runtime types in [`game.ts`](../packages/shared/src/game.ts) inspired this format. Runtime `City`/`Route` values are not directly interchangeable: their layout coordinates, route representation, and supported features differ. The USA JSON follows the reference board, including the yellow Salt Lake City–Denver track; the current runtime uses orange for that track.

## Inventory

Counts below describe this transcription. Tracks include parallel members; nodes include logical countries and unnamed printed junctions.

| Map                                                                    | Nodes | Tracks | Artwork                                                      |
| ---------------------------------------------------------------------- | ----: | -----: | ------------------------------------------------------------ |
| [Europe](map-europe/map.json)                                          |    47 |    101 | [Terrain](map-europe/map-generated.png)                      |
| [France](map-france/map.json)                                          |    48 |    156 | [Terrain](map-france/map-generated.png)                      |
| [Germany](map-germany/map.json)                                        |    40 |    110 | [Terrain](map-germany/map-generated.png)                     |
| [Iberia](map-iberia/map.json)                                          |    33 |    103 | [Terrain](map-iberia/map-generated.png)                      |
| [India](map-india/map.json)                                            |    39 |    108 | [Terrain](map-india/map-generated.png)                       |
| [Italy](map-italy/map.json)                                            |    39 |    126 | [Terrain](map-italy/map-generated.png)                       |
| [Japan](map-japan/map.json)                                            |    48 |    113 | [Terrain](map-japan/map-generated.png)                       |
| [Legendary Asia](map-legendary-asia/map.json)                          |    39 |    100 | [Terrain](map-legendary-asia/map-generated.png)              |
| [Märklin](map-marklin/map.json)                                        |    40 |    110 | [Terrain](map-marklin/map-generated.png)                     |
| [Nederland](map-nederland/map.json)                                    |    30 |     97 | [Terrain](map-nederland/map-generated.png)                   |
| [Nordic Countries](map-nordic-countries/map.json)                      |    39 |     81 | [Terrain](map-nordic-countries/map-generated.png)            |
| [Northern Lights](map-northern-lights/map.json)                        |    50 |    160 | [Terrain](map-northern-lights/map-generated.png)             |
| [Old West](map-old-west/map.json)                                      |    41 |    139 | [Terrain](map-old-west/map-generated.png)                    |
| [Pennsylvania](map-pennsylvania/map.json)                              |    35 |     95 | [Terrain](map-pennsylvania/map-generated.png)                |
| [Poland](map-poland/map.json)                                          |    35 |    102 | [Terrain](map-poland/map-generated.png)                      |
| [Rails & Sails: Great Lakes](map-rails-and-sails-great-lakes/map.json) |    37 |    110 | [Terrain](map-rails-and-sails-great-lakes/map-generated.png) |
| [Rails & Sails: World](map-rails-and-sails-world/map.json)             |    48 |    130 | [Terrain](map-rails-and-sails-world/map-generated.png)       |
| [South Korea](map-south-korea/map.json)                                |    33 |     98 | [Terrain](map-south-korea/map-generated.png)                 |
| [Stay at Home](map-stay-at-home/map.json)                              |    25 |     73 | [Terrain](map-stay-at-home/map-generated.png)                |
| [Switzerland](map-switzerland/map.json)                                |    38 |     88 | [Terrain](map-switzerland/map-generated.png)                 |
| [Team Asia](map-team-asia/map.json)                                    |    46 |    126 | [Terrain](map-team-asia/map-generated.png)                   |
| [The Heart of Africa](map-the-heart-of-africa/map.json)                |    47 |    117 | [Terrain](map-the-heart-of-africa/map-generated.png)         |
| [United Kingdom](map-united-kingdom/map.json)                          |    48 |    125 | [Terrain](map-united-kingdom/map-generated.png)              |
| [USA](map-usa/map.json)                                                |    36 |    100 | [Terrain](map-usa/map-generated.png)                         |

## Full schema

This is a copy of the executable schema, including its cross-reference validation. Keep it synchronized with the source file when changing the format.

```ts
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
```
