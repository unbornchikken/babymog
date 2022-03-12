import type { BlockCoord } from './BlockCoord';
import type { Chunk } from './Chunk';

export interface ChunkIO {
    getChunk(coord: BlockCoord): Promise<Chunk>;
}