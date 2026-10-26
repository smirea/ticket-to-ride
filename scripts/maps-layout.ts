import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { boardSvg } from './lib/board-svg';

// Usage: bun run maps:layout <map-id> [--keep]
// Solves route bends for a map, writes apps/ui/src/lib/maps/<id>.layout.json and renders a preview PNG.
// Routes listed in the file's `pinned` keep their hand-set bends. --keep also starts every other route from its
// current bend; otherwise they are solved from straight lines.
const [id, flag] = process.argv.slice(2);
if (!id) throw new Error('Usage: bun run maps:layout <map-id> [--keep]');
const root = resolve(import.meta.dir, '..');
const file = resolve(root, `apps/ui/src/lib/maps/${id}.layout.json`);
// The art module imports this file, so it must exist before the map registry loads.
if (!existsSync(file)) await Bun.write(file, `${JSON.stringify({ bends: {}, pinned: [] }, null, '\t')}\n`);
if (!existsSync(resolve(root, `apps/ui/src/lib/maps/${id}.ts`))) {
	console.log(`Create apps/ui/src/lib/maps/${id}.ts and register it in apps/ui/src/lib/maps/index.ts, for example:

import layout from './${id}.layout.json';
import type { BoardArt } from './types';

export const ${id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}Art: BoardArt = {
	title: '<region shown in the board aria label>',
	terrain: '/game-assets/maps/${id}/terrain.webp',
	aspect: <terrain width> / <terrain height>,
	flag: '/game-assets/maps/${id}/flag.svg',
	bends: layout.bends,
};`);
	process.exit(1);
}

const { boardLayout, createBoardLayout } = await import('../apps/ui/src/lib/game/board/layout');
const { layoutIssues } = await import('../apps/ui/src/lib/game/board/layout-check');
const { solveBends } = await import('../apps/ui/src/lib/game/board/layout-solve');
const layout = boardLayout(id);
const saved = (await Bun.file(file).json()) as { bends: Record<string, number>; pinned?: string[] };
const pinned = saved.pinned ?? [];
const initial =
	flag === '--keep'
		? saved.bends
		: Object.fromEntries(Object.entries(saved.bends).filter(([route]) => pinned.includes(route)));
const { bends, issues } = layout.art.cityPoints
	? { bends: {}, issues: layoutIssues(layout) }
	: solveBends(layout, layout.art, initial, pinned);
if (!layout.art.cityPoints) await Bun.write(file, `${JSON.stringify({ bends, pinned }, null, '\t')}\n`);
const solved = layout.art.cityPoints ? layout : createBoardLayout(layout.map, layout.art, bends);
const terrain = resolve(root, 'apps/ui/static', layout.art.terrain.slice(1));
const image = Buffer.from(await Bun.$`magick ${terrain} -resize 1600x1600 jpeg:-`.arrayBuffer()).toString('base64');
const svg = `/tmp/ttr-board-${id}.svg`;
const png = `/tmp/ttr-board-${id}.png`;
await Bun.write(svg, boardSvg(solved, `data:image/jpeg;base64,${image}`, issues));
await Bun.$`rsvg-convert ${svg} -o ${png}`;
console.log(
	`${id}: board ${Math.round(solved.width)}×${Math.round(solved.height)}, ${Object.keys(bends).length} bent routes`,
);
console.log(
	issues.length
		? issues.map(issue => `  ${issue.kind}: ${issue.routes.join(' × ')} (${issue.detail})`).join('\n')
		: '  no layout issues',
);
console.log(`Preview: ${png}`);
if (issues.length) process.exitCode = 1;
