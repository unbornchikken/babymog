import assert from 'assert';
import { InternalError } from 'common/system/errors/InternalError';
import { BlockCoord, blockCoordFunctions } from './BlockCoord';
import type { Pile } from './Pile';
import * as BABYLON from 'babylonjs';

export const CHUNK_SIZE = 16;

export type Chunk = {
    coord: BlockCoord,
    piles: Pile[],
};

export const chunkFunctions = {
    create,
    getPile,
    tryGetPile,
    pileCoordToChunkCoord,
    getBlockMaterialPackIds,
    pileCoordToPileIndex,
    chunkCoordsAround,
    distanceInChunks,
};

function create(coord: BlockCoord, piles: Pile[]): Chunk {
    assert(piles.length === CHUNK_SIZE * CHUNK_SIZE);
    return {
        coord,
        piles,
    };
}

function getPile(chunk: Chunk, coord: BlockCoord): Pile {
    const pile = tryGetPile(chunk, coord);
    if (!pile) {
        throw new InternalError(`Pile not found at "${blockCoordFunctions.toString(coord)}" in chunk "${blockCoordFunctions.toString(chunk.coord)}".`);
    }
    return pile;
}

function tryGetPile(chunk: Chunk, coord: BlockCoord): Pile | undefined {
    const x = coord.x - chunk.coord.x;
    const z = coord.z - chunk.coord.z;

    if (x < 0 || x >= CHUNK_SIZE) {
        return undefined;
    }

    if (z < 0 || z >= CHUNK_SIZE) {
        return undefined;
    }

    return chunk.piles[pileCoordToPileIndex(x, z)];
}

function pileCoordToPileIndex(x: number, z: number) {
    const value = x * CHUNK_SIZE + z;
    assert(value < CHUNK_SIZE * CHUNK_SIZE);
    return value;
}
function pileCoordToChunkCoord(coord: BlockCoord): BlockCoord {
    return blockCoordFunctions.create(conv(coord.x), conv(coord.z));

    function conv(value: number) {
        if (value == 0) {
            return 0;
        }

        if (value > 0) {
            return value - value % CHUNK_SIZE;
        }

        return Math.floor(value / CHUNK_SIZE) * CHUNK_SIZE;
    }
}

function getBlockMaterialPackIds(chunk: Chunk) {
    const ids = new Set();
    for (const pile of chunk.piles) {
        for (const layer of pile.layers) {
            ids.add(layer.block.materialReference.packId);
        }
    }
    return ids;
}

function* chunkCoordsAround(coord: BlockCoord, distance: number) {
    const currentChunkPosVec = blockCoordFunctions.getVec2(pileCoordToChunkCoord(coord));
    for (let x = -distance; x <= distance; x++) {
        for (let z = -distance; z <= distance; z++) {
            const xCoord = currentChunkPosVec.x + x * CHUNK_SIZE;
            const zCoord = currentChunkPosVec.y + z * CHUNK_SIZE;
            const dist = BABYLON.Vector2.Distance(currentChunkPosVec, new BABYLON.Vector2(xCoord, zCoord)) / CHUNK_SIZE;
            if (dist <= distance) {
                const chunkCoord = blockCoordFunctions.create(xCoord, zCoord);
                yield chunkCoord;
            }
        }
    }
}

function distanceInChunks(coord1: BlockCoord, coord2: BlockCoord) {
    coord1 = pileCoordToChunkCoord(coord1);
    coord2 = pileCoordToChunkCoord(coord2);
    return BABYLON.Vector2.Distance(blockCoordFunctions.getVec2(coord1), blockCoordFunctions.getVec2(coord2)) / CHUNK_SIZE;
}