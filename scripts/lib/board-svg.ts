import { routeColors, type BoardLayout } from '../../apps/ui/src/lib/game/board/layout';
import type { LayoutIssue } from '../../apps/ui/src/lib/game/board/layout-check';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// A static picture of a board for checking layouts outside the browser; issues are outlined in magenta.
export function boardSvg(layout: BoardLayout, terrainHref: string, issues: readonly LayoutIssue[] = []): string {
	const flagged = new Set(issues.flatMap(issue => issue.routes));
	const routes = layout.map.routes
		.map(route => {
			const length = layout.routeMarkerLength(route);
			const cars = Array.from({ length: route.length }, (_, index) => {
				const t = layout.routeMarkerT(route, index);
				const p = layout.routePoint(route, t),
					a = layout.routePoint(route, t - 0.002),
					b = layout.routePoint(route, t + 0.002);
				const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
				const locomotive = index < route.locomotives;
				return `<rect x="${p.x - length / 2}" y="${p.y - 4.4}" width="${length}" height="8.8" rx="1" transform="rotate(${angle} ${p.x} ${p.y})" fill="${routeColors[route.color]}" stroke="${flagged.has(route.id) ? '#ff00d4' : locomotive ? '#111' : '#fff4d9'}" stroke-width="${flagged.has(route.id) ? 2.4 : locomotive ? 1.6 : 0.7}"/>`;
			});
			return `<path d="${layout.routeOutlinePath(route)}" stroke="#101819" stroke-opacity="0.45" stroke-width="13" fill="none" stroke-linecap="round"/>${cars.join('')}`;
		})
		.join('');
	const cities = layout.map.cities
		.flatMap(city =>
			city.positions.map((_, position) => {
				const p = layout.cityPoint(city, position);
				if (city.type === 'junction')
					return `<circle cx="${p.x}" cy="${p.y}" r="6.6" fill="#2f6f8a" stroke="#e9dcb8" stroke-width="1.4"/>`;
				return `<g transform="translate(${p.x} ${p.y})"><circle r="9.2" fill="#fffae7" stroke="#967b56" stroke-width="1.4"/><circle r="5.4" fill="#7e5b39"/><text y="-15" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="13" fill="#21323a" stroke="#fff7e4" stroke-width="2.6" paint-order="stroke">${escape(city.name)}</text></g>`;
			}),
		)
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width * 2}" height="${layout.height * 2}"><image href="${terrainHref}" xlink:href="${terrainHref}" width="${layout.width}" height="${layout.height}" preserveAspectRatio="none"/>${routes}${cities}</svg>`;
}
