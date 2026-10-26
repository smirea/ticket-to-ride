import { expect, test } from 'bun:test';
import { GAME_MAPS } from '@repo/shared';
import { boardLayout } from './layout';
import { layoutIssues } from './layout-check';

for (const map of GAME_MAPS) {
	test(`${map.id} board has no overlapping cars, covered cities, crossing tracks or slivers`, () => {
		expect(layoutIssues(boardLayout(map.id)).map(issue => `${issue.kind}: ${issue.routes.join(' × ')}`)).toEqual([]);
	});
}
