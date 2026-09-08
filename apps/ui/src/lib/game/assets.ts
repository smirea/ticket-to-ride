import type { PlayerColor } from '@repo/shared';

const root = '/game-assets/whimsical-1800s';

export const playerPortraitAssets: Record<PlayerColor, string> = {
	red: `${root}/portrait-red.webp`,
	blue: `${root}/portrait-blue.webp`,
	green: `${root}/portrait-green.webp`,
	yellow: `${root}/portrait-yellow.webp`,
	black: `${root}/portrait-black.webp`,
};
