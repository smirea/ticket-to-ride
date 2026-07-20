import { Database } from 'bun:sqlite';
import type { AcceptedGameAction, RoomState, SubmitGameActionRequest } from '@repo/shared';

interface RoomRow {
	state_json: string;
}

interface ActionRow {
	id: number;
	room_code: string;
	action_id: string;
	player_id: string;
	action_json: string;
	resulting_revision: number;
	accepted_at: string;
}

export interface PersistedGameAction {
	playerId: string;
	request: SubmitGameActionRequest;
	acceptedAt: string;
}

export class RoomStore {
	readonly database: Database;

	constructor(filename: string) {
		this.database = new Database(filename, { create: true });
		this.database.exec('PRAGMA foreign_keys = ON');
		this.database.exec(`
			CREATE TABLE IF NOT EXISTS rooms (
				code TEXT PRIMARY KEY,
				phase TEXT NOT NULL,
				revision INTEGER NOT NULL,
				state_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS room_members (
				room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
				client_id TEXT NOT NULL,
				current INTEGER NOT NULL,
				PRIMARY KEY (room_code, client_id)
			);

			CREATE INDEX IF NOT EXISTS room_members_current
				ON room_members(client_id, current);

			CREATE TABLE IF NOT EXISTS accepted_game_actions (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
				action_id TEXT NOT NULL,
				player_id TEXT NOT NULL,
				action_json TEXT NOT NULL,
				resulting_revision INTEGER NOT NULL,
				accepted_at TEXT NOT NULL,
				UNIQUE (room_code, action_id)
			);
		`);
	}

	close(): void {
		this.database.close();
	}

	getRoom(code: string): RoomState | null {
		const row = this.database.query<RoomRow, [string]>('SELECT state_json FROM rooms WHERE code = ?').get(code);
		return row ? (JSON.parse(row.state_json) as RoomState) : null;
	}

	getCurrentRoom(clientId: string): RoomState | null {
		const row = this.database
			.query<RoomRow, [string]>(
				`SELECT rooms.state_json
				 FROM room_members
				 JOIN rooms ON rooms.code = room_members.room_code
				 WHERE room_members.client_id = ? AND room_members.current = 1
				 ORDER BY rooms.updated_at DESC
				 LIMIT 1`,
			)
			.get(clientId);
		return row ? (JSON.parse(row.state_json) as RoomState) : null;
	}

	createRoom(room: RoomState): void {
		const transaction = this.database.transaction(() => {
			this.database
				.query(
					`INSERT INTO rooms (code, phase, revision, state_json, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?)`,
				)
				.run(room.code, room.phase, room.revision, JSON.stringify(room), room.createdAt, room.updatedAt);
			this.replaceMembers(room);
		});
		transaction();
	}

	saveRoom(room: RoomState, acceptedAction?: PersistedGameAction): void {
		const transaction = this.database.transaction(() => {
			this.database
				.query(
					`UPDATE rooms
					 SET phase = ?, revision = ?, state_json = ?, updated_at = ?
					 WHERE code = ?`,
				)
				.run(room.phase, room.revision, JSON.stringify(room), room.updatedAt, room.code);
			this.replaceMembers(room);
			if (acceptedAction) {
				this.database
					.query(
						`INSERT INTO accepted_game_actions
						 (room_code, action_id, player_id, action_json, resulting_revision, accepted_at)
						 VALUES (?, ?, ?, ?, ?, ?)`,
					)
					.run(
						room.code,
						acceptedAction.request.actionId,
						acceptedAction.playerId,
						JSON.stringify(acceptedAction.request.action),
						room.revision,
						acceptedAction.acceptedAt,
					);
			}
		});
		transaction();
	}

	deleteRoom(code: string): void {
		this.database.query('DELETE FROM rooms WHERE code = ?').run(code);
	}

	getAcceptedAction(roomCode: string, actionId: string): AcceptedGameAction | null {
		const row = this.database
			.query<ActionRow, [string, string]>(
				`SELECT id, room_code, action_id, player_id, action_json, resulting_revision, accepted_at
				 FROM accepted_game_actions
				 WHERE room_code = ? AND action_id = ?`,
			)
			.get(roomCode, actionId);
		return row ? rowToAcceptedAction(row) : null;
	}

	listAcceptedActions(roomCode: string): AcceptedGameAction[] {
		return this.database
			.query<ActionRow, [string]>(
				`SELECT id, room_code, action_id, player_id, action_json, resulting_revision, accepted_at
				 FROM accepted_game_actions
				 WHERE room_code = ?
				 ORDER BY id`,
			)
			.all(roomCode)
			.map(rowToAcceptedAction);
	}

	private replaceMembers(room: RoomState): void {
		this.database.query('DELETE FROM room_members WHERE room_code = ?').run(room.code);
		const insert = this.database.query('INSERT INTO room_members (room_code, client_id, current) VALUES (?, ?, ?)');
		for (const player of room.players) {
			insert.run(room.code, player.id, player.status === 'active' ? 1 : 0);
		}
	}
}

function rowToAcceptedAction(row: ActionRow): AcceptedGameAction {
	return {
		id: row.id,
		roomCode: row.room_code,
		actionId: row.action_id,
		playerId: row.player_id,
		action: JSON.parse(row.action_json),
		resultingRevision: row.resulting_revision,
		acceptedAt: row.accepted_at,
	};
}
