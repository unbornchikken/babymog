import type { BlockCoord } from './BlockCoord';
import type { Chunk } from './Chunk';

export interface ChunkDataInterface {
    getChunk(coord: BlockCoord): Promise<Chunk>;
}