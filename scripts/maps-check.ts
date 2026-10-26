import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	GAME_MAPS,
	applyGameAction,
	chooseBotAction,
	createGame,
	getGameMap,
	parseGameAction,
	replayGame,
	type GameState,
	type RoomState,
} from '../packages/shared/src';
import { projectRoomForViewer } from '../apps/server/src/room-projection';
import { boardArt } from '../apps/ui/src/lib/maps';
import { atlasPlace } from '../apps/ui/src/lib/maps/atlas';
import { boardLayout } from '../apps/ui/src/lib/game/board/layout';
import { layoutIssues } from '../apps/ui/src/lib/game/board/layout-check';

// Usage: bun run maps:check [map-id ...] [--games=<per player count>]
// Plays seeded all-bot games at every supported player count and checks what a finished map needs.
const args = process.argv.slice(2);
const games = Number(args.find(arg => arg.startsWith('--games='))?.slice(8) ?? 25);
const ids = args.filter(arg => !arg.startsWith('--'));
const root = resolve(import.meta.dir, '..');
let failed = false;

function check(ok: boolean, message: string) {
	if (!ok) failed = true;
	console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${message}`);
}

function play(mapId: string, players: number, seed: string) {
	let state = createGame({ mapId, seed, botCount: players - 1 });
	state.players.forEach(player => (player.isBot = true));
	for (let step = 0; step < 4000; step++) {
		if (state.phase.type === 'game-over') return { state, error: undefined };
		const action = chooseBotAction(state);
		if (!action) return { state, error: `bots had no move in phase ${state.phase.type} at step ${step}` };
		const parsed = parseGameAction(mapId, JSON.parse(JSON.stringify(action)));
		if (JSON.stringify(parsed) !== JSON.stringify(action)) {
			return { state, error: `server parsing changed ${JSON.stringify(action)} into ${JSON.stringify(parsed)}` };
		}
		const result = applyGameAction(state, action);
		if (!result.ok) return { state, error: `bot action ${JSON.stringify(action)} failed: ${result.error}` };
		state = result.state;
	}
	return { state, error: 'game did not finish in 4000 actions' };
}

function room(game: GameState): RoomState {
	return {
		version: 1,
		code: 'CHECKS',
		revision: 1,
		phase: 'playing',
		hostId: game.players[0]!.id,
		players: [],
		settings: { mapId: game.mapId, maxPlayers: 5, seed: game.seed },
		game,
		createdAt: '',
		updatedAt: '',
		finishedAt: null,
		finishedReason: null,
	};
}

for (const mapId of ids.length ? ids : GAME_MAPS.map(map => map.id)) {
	console.log(`\n${mapId}`);
	const map = getGameMap(mapId);
	const art = boardArt(mapId);
	check(existsSync(resolve(root, 'apps/ui/static', art.terrain.slice(1))), `terrain ${art.terrain}`);
	check(existsSync(resolve(root, 'apps/ui/static', art.flag.slice(1))), `flag ${art.flag}`);
	check(Boolean(atlasPlace(mapId)), 'atlas place');
	check(map.info.gimmicks.length > 0 || map.mechanics.length === 0, 'gimmicks describe every special rule');
	const issues = layoutIssues(boardLayout(mapId));
	check(issues.length === 0, `layout (${issues.length} issues; run bun run maps:layout ${mapId})`);
	const unreachable = map.tickets.filter(
		ticket => !map.vertices(ticket.cityA).some(a => map.vertices(ticket.cityB).some(b => reachable(a, b))),
	);
	check(
		unreachable.length === 0,
		`every ticket is connectable${unreachable.length ? `: ${unreachable.map(t => t.id)}` : ''}`,
	);
	console.log(
		`  ${map.tickets.length} tickets (${map.tickets.filter(t => t.long).length} long), ${map.routes.length} routes, ${map.cities.length} cities`,
	);

	for (const players of map.players) {
		const scores: number[] = [];
		const turns: number[] = [];
		const completion: number[] = [];
		const bonuses = new Map<string, number>();
		let passes = 0;
		let errors: string[] = [];
		for (let game = 0; game < games; game++) {
			const seed = `${mapId}-${players}-${game}`;
			const { state, error } = play(mapId, players, seed);
			if (error) {
				errors.push(`${seed}: ${error}`);
				continue;
			}
			const replay = replayGame(
				{ mapId, seed, players: state.players.map(({ id, name, color, isBot }) => ({ id, name, color, isBot })) },
				state.history,
			);
			if (!replay.ok || JSON.stringify(replay.state.finalResults) !== JSON.stringify(state.finalResults)) {
				errors.push(`${seed}: replay diverged${replay.ok ? '' : `: ${replay.error}`}`);
			}
			try {
				for (const player of state.players) JSON.stringify(projectRoomForViewer(room(state), player.id));
			} catch (cause) {
				errors.push(`${seed}: redaction threw ${String(cause)}`);
			}
			for (const result of state.finalResults ?? []) {
				scores.push(result.finalScore);
				for (const line of result.bonuses) bonuses.set(line.id, (bonuses.get(line.id) ?? 0) + line.points);
			}
			turns.push(state.turnNumber);
			passes += state.events.filter(event => event.type === 'pass').length;
			const held = state.players.reduce((sum, player) => sum + player.tickets.length, 0);
			const done = (state.finalResults ?? []).reduce((sum, result) => sum + result.completedTickets, 0);
			completion.push(held ? done / held : 0);
		}
		const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
		check(errors.length === 0, `${players} players: ${games - errors.length}/${games} games finished`);
		for (const error of errors.slice(0, 5)) console.log(`         ${error}`);
		errors = [];
		console.log(
			`         mean score ${mean(scores).toFixed(1)}, ${mean(turns).toFixed(0)} turns, ${(mean(completion) * 100).toFixed(0)}% tickets completed, ${passes} passes` +
				(bonuses.size
					? `; bonus points per game: ${[...bonuses].map(([id, points]) => `${id} ${(points / games).toFixed(1)}`).join(', ')}`
					: ''),
		);
	}

	function reachable(from: string, to: string) {
		const seen = new Set([from]);
		const queue = [from];
		while (queue.length) {
			const vertex = queue.pop()!;
			if (vertex === to) return true;
			for (const step of map.graph.get(vertex) ?? []) {
				if (!seen.has(step.city)) {
					seen.add(step.city);
					queue.push(step.city);
				}
			}
		}
		return false;
	}
}

if (failed) process.exitCode = 1;
