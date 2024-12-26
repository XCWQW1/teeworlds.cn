// This lib handles the player list cache, which is generated by the Rust code
// See `rust` directory for the script.

import { readFile, open } from 'node:fs/promises';
import { resolve } from 'node:path';

const FILE_PATH = resolve('./cache', 'points_ranks_by_name.bin');
const EXPECTED_VERSION = 1;

let lastUpdate = 0;
let buf: Buffer | null = null;
let prefixCache: { [key: string]: { name: string; points: number }[] } = {};
let numItems = -1;
let loadCallback: (() => void)[] | null = null;
let lastCheck = 0;

export const readUInt32VarInt = (buf: Buffer, offset: number) => {
	let value = 0;
	let shift = 0;
	let b;
	do {
		b = buf.readUInt8(offset++);
		value |= (b & 0x7f) << shift;
		shift += 7;
	} while (b & 0x80);
	return { value, offset };
};

export const updateData = async () => {
	try {
		// do now reload if it's less than 60s since last check
		if (buf && Date.now() - lastCheck < 60000) {
			return;
		}

		// if it is currently loading, wait for it to finish
		if (loadCallback) {
			const lcbs = loadCallback;
			return new Promise<void>((resolve) => {
				lcbs.push(resolve);
			});
		}

		// start loading
		loadCallback = [];
		lastCheck = Date.now();
		const file = await open(FILE_PATH, 'r');
		const fileModifiedTime = (await file.stat()).mtimeMs;
		if (buf && fileModifiedTime == lastUpdate) {
			// no need to update
			return;
		}

		let newBuf: Buffer = await readFile(file);
		await file.close();
		if (newBuf.length < 16) {
			return;
		}

		const version = newBuf.readUInt32LE(0);
		if (version != EXPECTED_VERSION) {
			return;
		}

		buf = newBuf;
		const _unused_totalPoints = buf.readInt32LE(4);
		numItems = buf.readUInt32LE(8);
		const cachePointer = buf.readUInt32LE(12);

		prefixCache = {};
		const numCacheItems = buf.readUInt32LE(cachePointer);
		let position = cachePointer + 4;
		for (let i = 0; i < numCacheItems; i++) {
			const prefixLen = buf.readUInt8(position++);
			const prefix = buf.toString('utf8', position, position + prefixLen);
			position += prefixLen;
			const count = buf.readUInt8(position++);
			const top10: { name: string; points: number }[] = [];
			for (let j = 0; j < count; j++) {
				const nameLen = buf.readUInt8(position++);
				const name = buf.toString('utf8', position, position + nameLen);
				position += nameLen;
				const { value, offset } = readUInt32VarInt(buf, position);
				position = offset;
				top10.push({ name, points: value });
			}
			prefixCache[prefix] = top10;
		}
		loadCallback = null;
	} catch (_) {
		buf = null;
		return;
	}
};

const getNameBuffer = (index: number) => {
	if (!buf) throw new Error('Can not get name buffer, data is not loaded');

	const pointer = buf.readUInt32LE(16 + index * 4);
	const nameLen = buf.readUInt8(pointer);
	const nameStart = pointer + 1;
	const name = buf.toString('utf8', nameStart, nameStart + nameLen);
	const lowerCaseName = name.toLowerCase();
	const buffer = Buffer.from(lowerCaseName, 'utf-8');
	return buffer;
};

const readItem = (index: number) => {
	if (!buf) throw new Error('Can not get name buffer, data is not loaded');

	const pointer = buf.readUInt32LE(16 + index * 4);
	const nameLen = buf.readUInt8(pointer);
	const nameStart = pointer + 1;
	const pointsStart = nameStart + nameLen;
	const name = buf.toString('utf8', nameStart, pointsStart);
	const result = {
		name,
		points: {
			rank: 0,
			points: 0
		},
		rank: {
			rank: 0,
			points: 0
		},
		team: {
			rank: 0,
			points: 0
		},
		weekly: {
			rank: 0,
			points: 0
		},
		monthly: {
			rank: 0,
			points: 0
		},
		yearly: {
			rank: 0,
			points: 0
		}
	};

	let position = pointsStart;
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.points.points = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.points.rank = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.rank.points = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.rank.rank = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.team.points = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.team.rank = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.weekly.points = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.weekly.rank = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.monthly.points = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.monthly.rank = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.yearly.points = value;
		position = offset;
	}
	{
		const { value, offset } = readUInt32VarInt(buf, position);
		result.yearly.rank = value;
		position = offset;
	}
	return result;
};

const readItemPointsOnly = (index: number) => {
	if (!buf) throw new Error('Can not get name buffer, data is not loaded');

	const pointer = buf.readUInt32LE(16 + index * 4);
	const nameLen = buf.readUInt8(pointer);
	const nameStart = pointer + 1;
	const nameEnd = nameStart + nameLen;
	const name = buf.toString('utf8', nameStart, nameEnd);
	const { value } = readUInt32VarInt(buf, nameEnd);
	return { name, points: value };
};

const binarySearchRange = (target: Uint8Array) => {
	let start = 0;
	let end = numItems;
	while (start < end) {
		const mid = Math.floor((start + end) / 2);
		const name = getNameBuffer(mid);
		if (name.compare(target) < 0) {
			start = mid + 1;
		} else {
			end = mid;
		}
	}

	const rangeStart = start;

	start = 0;
	end = numItems;

	const endTarget = Uint8Array.prototype.slice.call(target);
	for (let i = endTarget.length - 1; i >= 0; i--) {
		// increment the end target by one
		if (endTarget[i] == 0xff) {
			endTarget[i] = 0x00;
		} else {
			endTarget[i]++;
			break;
		}
	}

	while (start < end) {
		const mid = Math.floor((start + end) / 2);
		const name = getNameBuffer(mid);
		if (name.compare(endTarget) >= 0) {
			end = mid;
		} else {
			start = mid + 1;
		}
	}

	const rangeEnd = start;

	return {
		start: rangeStart,
		end: rangeEnd
	};
};

const binarySearchExact = (target: Uint8Array) => {
	let start = 0;
	let end = numItems;
	while (start < end) {
		const mid = Math.floor((start + end) / 2);
		const name = getNameBuffer(mid);
		const compare = name.compare(target);
		if (compare == 0) {
			return mid;
		}
		if (compare < 0) {
			start = mid + 1;
		} else {
			end = mid;
		}
	}
	return -1;
};

/**
 * Search for a player by name
 * @param name player name
 * @returns null if data is not loaded, {name: null} if not found
 */
export const getPlayer = async (name: string) => {
	await updateData();
	if (!buf) return null;
	const index = binarySearchExact(
		Uint8Array.prototype.slice.call(Buffer.from(name.toLowerCase(), 'utf-8'))
	);
	if (index < 0) return { name: null };
	return readItem(index);
};

/**
 * Query player names starts with the given prefix
 * @param prefix player name prefix
 * @returns null if data is not loaded, otherwise an array of {name: string; points: number}[]
 */
export const queryPlayerPrefix = async (prefix: string) => {
	await updateData();
	if (!buf) return null;

	const top10: { name: string; points: number }[] = [];
	let exactMatch = -1;
	const searchBuf = Uint8Array.prototype.slice.call(Buffer.from(prefix.toLowerCase(), 'utf-8'));

	const cache = prefixCache[prefix];
	if (cache) {
		// use cache directly if it exists
		top10.push(...cache);
		exactMatch = binarySearchExact(searchBuf);
	} else {
		const range = binarySearchRange(searchBuf);
		for (let i = range.start; i < range.end; i++) {
			const item = readItemPointsOnly(i);
			if (item.name == prefix) {
				exactMatch = i;
			}
			// insert into the top10 array sorted by points
			let j = 0;
			while (j < top10.length && item.points < top10[j].points) {
				j++;
			}
			top10.splice(j, 0, item);
			if (top10.length > 10) {
				top10.pop();
			}
		}
	}

	let player = null;

	// if there is exact match, insert it at the top
	if (exactMatch >= 0) {
		player = readItem(exactMatch);
		top10.unshift({ name: player.name, points: player.points.points });

		for (let i = 1; i < top10.length; i++) {
			// remove existing exact match
			if (top10[i].name == player.name) {
				top10.splice(i, 1);
				break;
			}
		}

		if (top10.length > 10) {
			top10.pop();
		}
	}

	return { player, top10 };
};