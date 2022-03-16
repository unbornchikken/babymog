import type { BlockCoord } from './BlockCoord';
import type { Chunk } from './Chunk';
import type { WorldMetadata } from './WorldMetadata';

export interface WorldDataInterface {
    getWorldMetadata(worldId: string): Promise<WorldMetadata>;
    getChunk(worldId: string, coord: BlockCoord): Promise<Chunk>;
}