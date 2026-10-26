export type Point = { x: number; y: number };
export type TracePoint = readonly [number, number];
export type RouteTrace = readonly [TracePoint, TracePoint] | readonly [TracePoint, TracePoint, TracePoint, TracePoint];

// A sea, lake or country name painted on the board. `x` and `y` are its centre, normalized to the board (0 to 1);
// `\n` breaks a line. Labels keep their screen size like city names.
export interface GeographyLabel {
	text: string;
	x: number;
	y: number;
	rotate?: number;
	kind: 'land' | 'sea';
}

// Everything the UI needs to draw one map. Board coordinates are viewBox units; see `boardLayout` for the board size.
export interface BoardArt {
	title: string;
	terrain: string;
	aspect: number;
	flag: string;
	// Normalized replacements for map.json positions where a city sits off its spot on the generated terrain.
	positions?: Readonly<Record<string, readonly { x: number; y: number }[]>>;
	// Hand-placed geometry in board units; only the USA board uses them.
	cityPoints?: Readonly<Record<string, Point>>;
	traces?: Readonly<Record<string, readonly Point[]>>;
	// Signed sideways offset of a route's midpoint in viewBox units, written by `bun run maps:layout`.
	bends?: Readonly<Record<string, number>>;
	labelBelow?: readonly string[];
	// Painted ticket art; tickets without it are drawn from the board terrain.
	ticketArtwork?: (ticketId: string) => string;
	geography?: readonly GeographyLabel[];
}
