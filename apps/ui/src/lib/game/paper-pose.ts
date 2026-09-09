export type PaperPose = { x: number; y: number; width: number; height: number; angle?: number; count?: number };

export function paperPose(element: HTMLElement): PaperPose {
	let angle = 0;
	for (let node: HTMLElement | null = element; node; node = node.parentElement) {
		const transform = getComputedStyle(node).transform;
		if (transform !== 'none') {
			const matrix = new DOMMatrixReadOnly(transform);
			angle += Math.atan2(matrix.b, matrix.a);
		}
	}
	const { width, height } = { width: element.offsetWidth, height: element.offsetHeight };
	const bounds = element.getBoundingClientRect();
	const corners = [
		[0, 0],
		[width, 0],
		[0, height],
		[width, height],
	].map(([x, y]) => ({
		x: x! * Math.cos(angle) - y! * Math.sin(angle),
		y: x! * Math.sin(angle) + y! * Math.cos(angle),
	}));
	return {
		x: bounds.x - Math.min(...corners.map(p => p.x)),
		y: bounds.y - Math.min(...corners.map(p => p.y)),
		width,
		height,
		angle: (angle * 180) / Math.PI,
	};
}
