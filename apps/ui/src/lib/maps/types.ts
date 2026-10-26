export type Point = { x: number; y: number };
export type TracePoint = readonly [number, number];
export type RouteTrace = readonly [TracePoint, TracePoint] | readonly [TracePoint, TracePoint, TracePoint, TracePoint];

export interface GeographyLabel {
	text: string;
	x: number;
	y: number;
	rotate?: number;
	// Country names are spaced capitals; seas are italic.
	kind: 'land' | 'sea';
}

// Everything the UI needs to draw one map. Board coordinates are viewBox units; see `boardLayout` for the board size.
export interface BoardArt {
	title: string;
	terrain: string;
	aspect: number;
	flag: string;
	// Hand-placed geometry overrides map.json positions; only the USA board uses them.
	cityPoints?: Readonly<Record<string, Point>>;
	traces?: Readonly<Record<string, readonly Point[]>>;
	// Signed sideways offset of a route's midpoint in viewBox units, written by `bun run maps:layout`.
	bends?: Readonly<Record<string, number>>;
	labelBelow?: readonly string[];
	// Painted ticket art; tickets without it are drawn from the board terrain.
	ticketArtwork?: (ticketId: string) => string;
	geography?: readonly GeographyLabel[];
}
