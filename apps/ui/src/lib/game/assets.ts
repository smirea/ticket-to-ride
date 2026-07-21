import type { PlayerColor, TrainCard } from '@repo/shared';

const root = '/game-assets/whimsical-1800s';

export const trainCardAssets: Record<TrainCard, string> = {
	red: `${root}/train-red.webp`,
	orange: `${root}/train-orange.webp`,
	yellow: `${root}/train-yellow.webp`,
	green: `${root}/train-green.webp`,
	blue: `${root}/train-blue.webp`,
	purple: `${root}/train-purple.webp`,
	black: `${root}/train-black.webp`,
	white: `${root}/train-white.webp`,
	locomotive: `${root}/train-locomotive.webp`,
};

export const playerPortraitAssets: Record<PlayerColor, string> = {
	red: `${root}/portrait-red.webp`,
	blue: `${root}/portrait-blue.webp`,
	green: `${root}/portrait-green.webp`,
	yellow: `${root}/portrait-yellow.webp`,
	black: `${root}/portrait-black.webp`,
};

export const boardAsset = `${root}/board-map.webp`;
export const tableAsset = `${root}/table-background.webp`;
export const ticketFaceAsset = `${root}/ticket-face.webp`;
export const ticketBackAsset = `${root}/ticket-back.webp`;
export const trainBackAsset = `${root}/train-back.webp`;
