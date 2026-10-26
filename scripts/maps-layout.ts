import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { boardLayout, createBoardLayout } from '../apps/ui/src/lib/game/board/layout';
import { layoutIssues } from '../apps/ui/src/lib/game/board/layout-check';
import { solveBends } from '../apps/ui/src/lib/game/board/layout-solve';
import { boardSvg } from './lib/board-svg';

// Usage: bun run maps:layout <map-id> [--keep]
// Solves route bends for a registered map, writes apps/ui/src/lib/maps/<id>.layout.json and renders a preview PNG.
// --keep starts from the existing bends (hand edits survive); otherwise it solves from straight lines.
const [id, flag] = process.argv.slice(2);
if (!id) throw new Error('Usage: bun run maps:layout <map-id> [--keep]');
const root = resolve(import.meta.dir, '..');
const layout = boardLayout(id);
const file = resolve(root, `apps/ui/src/lib/maps/${id}.layout.json`);
const existing =
	flag === '--keep' && existsSync(file) ? ((await Bun.file(file).json()).bends as Record<string, number>) : {};
const { bends, issues } = layout.art.cityPoints
	? { bends: {}, issues: layoutIssues(layout) }
	: solveBends(layout, layout.art, existing);
if (!layout.art.cityPoints) await Bun.write(file, `${JSON.stringify({ bends }, null, '\t')}\n`);
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
