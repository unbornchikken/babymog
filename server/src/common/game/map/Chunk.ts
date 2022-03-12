import assert from 'assert';
import { InternalError } from 'common/system/errors/InternalError';
import { BlockCoord, BlockCoordFunctions } from './BlockCoord';
import type { Pile } from './Pile';

export const CHUNK_SIZE = 16;

export type Chunk = {
    coord: BlockCoord,
    piles: Pile[],
};

export const ChunkFunctions = {
    create,
    getPile,
    tryGetPile,
    pileCoordToChunkCoord,
    getBlockMaterialPackIds,
    pileCoordToPileIndex,
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
        throw new InternalError(`Pile not found at "${BlockCoordFunctions.toString(coord)}" in chunk "${BlockCoordFunctions.toString(chunk.coord)}".`);
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

function pileCoordToChunkCoord(pileCoord: BlockCoord): BlockCoord;
function pileCoordToChunkCoord(pile: Pile): BlockCoord;
function pileCoordToChunkCoord(arg: Pile | BlockCoord): BlockCoord {
    let coord: BlockCoord;
    if ('coord' in arg) {
        coord = arg.coord;
    }
    else {
        coord = arg;
    }

    return BlockCoordFunctions.create(conv(coord.x), conv(coord.y));

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