import assert from 'assert';
import { BlockCoord, blockCoordFunctions } from 'common/game/map/BlockCoord';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { ChunkGeometry, ChunkGeometryBuilder } from './ChunkGeometryBuilder';
import * as BABYLON from 'babylonjs';
import { chunkFunctions, CHUNK_SIZE } from 'common/game/map/Chunk';
import { BlockMaterialManager } from '../materials/BlockMaterialManager';
import { WorldManager } from 'common/game/map/WorldManager';
import PQueue from 'p-queue';
import type { Container } from 'common/system/ioc/Container';

const DEF_UPDATE_BLOCK_SIZE = 4;

type ChunkCell = {
    coord: BlockCoord,
    geometry?: ChunkGeometry,
    updatedOn?: number,
};

type Params = {
    worldId: string,
    buildDistance: number,
    blockTextureSize?: number,
};

type ParamsInputMessage = Params & {
    type: 'params',
};

type PositionInputMessage = {
    type: 'position',
    coord: BlockCoord,
};

type GetChunkGeometriesInputMessage = {
    type: 'getChunkGeometries',
    coords: BlockCoord[],
};

export type ChunkGeometryWorkerInputMessage = ParamsInputMessage | PositionInputMessage | GetChunkGeometriesInputMessage;

export type UpdatedChunk = {
    coord: BlockCoord,
    updatedOn: number,
};

type UpdatedChunksOutputMessage = {
    type: 'updatedChunks',
    chunks: UpdatedChunk[],
};

export type ChunkGeomteryEntry = {
    coord: BlockCoord,
    geometry: ChunkGeometry,
    updatedOn: number,
};

type ChunkGeometriesOutputMessage = {
    type: 'chunkGeometries',
    chunkGeometries: ChunkGeomteryEntry[],
};

export type ChunkGeometryWorkerOuputMessage = UpdatedChunksOutputMessage | ChunkGeometriesOutputMessage;

export type ChunkGeometryWorkerOptions = {
    container: Container,
    updateBlockSize?: number,
};

export class ChunkGeometryWorker extends LoggerObject {
    constructor(options: ChunkGeometryWorkerOptions) {
        super(options.container);

        this.updateBlockSize = options.updateBlockSize ?? DEF_UPDATE_BLOCK_SIZE;
    }

    private params?: Params;

    private position?: BlockCoord;

    private cells: ChunkCell[] = [];

    private geometryBuilder?: ChunkGeometryBuilder;

    private q: PQueue = new PQueue({ concurrency: 1 });

    private updateBlockSize: number;

    processMessage(e: any) {
        try {
            const message = e.data as ChunkGeometryWorkerInputMessage;
            switch (message.type) {
                case 'params':
                    this.processParamsMessage(message);
                    break;
                case 'position':
                    this.processPositionMessage(message);
                    break;
                case 'getChunkGeometries':
                    this.processGetGeometriesMessage(message);
                    break;
            }
        }
        catch (err) {
            this.logger.error(err, 'Message processing failed.');
        }
    }

    private processParamsMessage(message: ParamsInputMessage) {
        this.enqueue('Params message processing', async () => {
            this.params = message;
            this.logger.debug('Parameters updated: %j', this.params);
            this.cells.length = 0;
            this.geometryBuilder = undefined;
            await this.updateCells();
        });
    }

    private processPositionMessage(message: PositionInputMessage) {
        this.enqueue('Position message processing', async () => {
            await this.goto(message.coord);
        });
    }

    private processGetGeometriesMessage(message: GetChunkGeometriesInputMessage) {
        this.logger.debug('Providing geometries for %d chunk coords.', message.coords.length);

        const response: ChunkGeometriesOutputMessage = {
            type: 'chunkGeometries',
            chunkGeometries: []
        };

        for (const coord of message.coords) {
            const cell = this.getCell(coord);
            if (cell && cell.geometry && cell.updatedOn) {
                response.chunkGeometries.push({
                    coord,
                    geometry: cell.geometry,
                    updatedOn: cell.updatedOn,
                });
            }
        }

        if (response.chunkGeometries.length) {
            this.logger.debug('%d geometries provided.', response.chunkGeometries.length);
            this.postMessage(response);
        }
        else {
            this.logger.warn('Cannot provide geometries.');
        }
    }

    private enqueue(what: string, fn: () => Promise<void>) {
        this.q.add(fn).catch(err => this.logger.error(err, '%s failed.', what));
    }

    private getCell(coord: BlockCoord): ChunkCell | undefined {
        for (const cell of this.cells) {
            if (blockCoordFunctions.equals(cell.coord, coord)) {
                return cell;
            }
        }
        return undefined;
    }

    private async goto(coord: BlockCoord) {
        const currentChunkCoord = this.position && chunkFunctions.pileCoordToChunkCoord(this.position);
        if (!this.position || !blockCoordFunctions.equals(this.position, coord)) {
            this.position = coord;
            this.logger.debug('Position updated: %j', this.position);
            const newChunkCoord = chunkFunctions.pileCoordToChunkCoord(this.position);
            if (!currentChunkCoord || !blockCoordFunctions.equals(currentChunkCoord, newChunkCoord)) {
                this.logger.debug('Chunk coord updated: %j', newChunkCoord);
                await this.updateCells();
            }
        }
    }

    private async updateCells() {
        if (!this.params || !this.position) {
            return;
        }

        const params = this.params;
        const position = this.position;
        const newCells: ChunkCell[] = [];
        const oldCells = new Map<string, ChunkCell>();
        for (const cell of this.cells) {
            oldCells.set(blockCoordFunctions.toString(cell.coord), cell);
        }

        let hasEmpty = false;
        for (const chunkCoord of chunkFunctions.chunkCoordsAround(position, params.buildDistance)) {
            let cell = oldCells.get(blockCoordFunctions.toString(chunkCoord));
            if (!cell) {
                hasEmpty = true;
                cell = { coord: chunkCoord };
            }
            newCells.push(cell);
        }

        this.cells = newCells;
        this.sortCells();
        if (hasEmpty) {
            await this.calculateCells();
        }
    }

    private async calculateCells() {
        assert(this.cells.length);
        assert(this.params);

        this.logger.debug('Starting to calculate %s cells.', this.cells.length);

        const startOn = Date.now();

        const chunksToSend: UpdatedChunk[] = [];
        const sendMessages = () => {
            if (chunksToSend.length) {
                const updatedChunksMessage: UpdatedChunksOutputMessage = {
                    chunks: chunksToSend,
                    type: 'updatedChunks',
                };
                this.postMessage(updatedChunksMessage);
                chunksToSend.length = 0;
            }
        };

        let updates = 0;
        for (const cell of this.cells) {
            if (cell.geometry) {
                continue;
            }

            const cellStartOn = Date.now();
            await this.updateCellGeometry(cell);
            this.logger.trace('Chunk cell %s updated in %d ms.', blockCoordFunctions.toString(cell.coord), Date.now() - cellStartOn);
            updates++;

            chunksToSend.push({
                coord: cell.coord,
                updatedOn: cell.updatedOn!
            });
            if (chunksToSend.length === this.updateBlockSize) {
                sendMessages();
            }
        }

        sendMessages();

        this.logger.debug('Chunk cells updated in %d ms. Number of cells: %d, nember of updates: %d', Date.now() - startOn, this.cells.length, updates);
    }

    private sortCells() {
        assert(this.cells.length);
        assert(this.position);

        this.cells.sort((a, b) => {
            const distA = BABYLON.Vector2.Distance(
                blockCoordFunctions.getVec2(this.position!),
                blockCoordFunctions.getVec2(a.coord)
            );
            const distB = BABYLON.Vector2.Distance(
                blockCoordFunctions.getVec2(this.position!),
                blockCoordFunctions.getVec2(b.coord)
            );
            return distA - distB;
        });
    }

    private async updateCellGeometry(cell: ChunkCell) {
        cell.geometry = await this.getGeometryBuilder().build(cell.coord);
        cell.updatedOn = Date.now();
    }

    private postMessage(message: any) {
        postMessage(message);
    }

    private getGeometryBuilder() {
        assert(this.params);
        if (!this.geometryBuilder) {
            this.geometryBuilder = new ChunkGeometryBuilder({
                container: this.container,
                materialManager: new BlockMaterialManager({
                    container: this.container,
                    textureSize: this.params.blockTextureSize,
                }),
                worldManager: new WorldManager({
                    container: this.container,
                    worldId: this.params.worldId
                })
            });
        }
        return this.geometryBuilder;
    }
}