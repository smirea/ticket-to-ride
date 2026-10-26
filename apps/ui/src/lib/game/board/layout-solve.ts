import type { Route } from '@repo/shared';
import type { BoardArt } from '../../maps';
import { createBoardLayout, type BoardLayout } from './layout';
import { layoutIssues, type LayoutIssue } from './layout-check';

const CANDIDATES = [0, 8, -8, 16, -16, 24, -24, 34, -34, 46, -46, 60, -60, 76, -76];

function bundle(layout: BoardLayout, route: Route): Route[] {
	const ends = (item: Route) => [`${item.cityA}:${item.positionA}`, `${item.cityB}:${item.positionB}`].sort().join('/');
	return layout.map.routes.filter(item => ends(item) === ends(route));
}

// Greedily bends routes that have layout issues until none are left or no bend helps. Parallel tracks bend together.
export function solveBends(
	layout: BoardLayout,
	art: BoardArt,
	initial: Record<string, number> = {},
): { bends: Record<string, number>; issues: LayoutIssue[] } {
	let bends = { ...initial };
	let current = createBoardLayout(layout.map, art, bends);
	for (let round = 0; round < 6; round++) {
		const issues = layoutIssues(current);
		if (issues.length === 0) break;
		const flagged = [...new Set(issues.flatMap(issue => issue.routes))];
		let improved = false;
		for (const id of flagged) {
			const route = layout.map.route(id)!;
			const members = bundle(layout, route);
			const score = (candidate: Record<string, number>) => {
				const trial = createBoardLayout(layout.map, art, candidate);
				return layoutIssues(trial, members).length * 1000 + Math.abs(candidate[id] ?? 0);
			};
			let best = { bends, score: score(bends) };
			for (const bend of CANDIDATES) {
				const candidate = { ...bends };
				for (const member of members) {
					if (bend) candidate[member.id] = bend;
					else delete candidate[member.id];
				}
				const value = score(candidate);
				if (value < best.score) best = { bends: candidate, score: value };
			}
			if (best.bends !== bends) {
				bends = best.bends;
				improved = true;
			}
		}
		current = createBoardLayout(layout.map, art, bends);
		if (!improved) break;
	}
	return { bends, issues: layoutIssues(current) };
}
