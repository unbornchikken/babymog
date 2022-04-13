import assert from 'assert';
import { BlockCoord, blockCoordFunctions } from 'common/game/map/BlockCoord';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { ChunkGeometry, ChunkGeometryBuilder } from './ChunkGeometryBuilder';
import * as BABYLON from 'babylonjs';
import { chunkFunctions, CHUNK_SIZE } from 'common/game/map/Chunk';
import { BlockMaterialManager } from '../materials/BlockMaterialManager';
import { WorldManager } from 'common/game/map/WorldManager';
import PQueue from 'p-queue';
import type { WorkerMethodCall, WorkerMethodResult } from 'common/system/worker/WorkerThread';

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

export type ChunkGeometryWorkerInputMessage = ParamsInputMessage | PositionInputMessage;

export type GotoMethodArg = {
    coord: BlockCoord,
    visibleDistance: number,
};

export type ChunkHeader = {
    coord: BlockCoord,
    updatedOn: number,
};

export type ChunkGeometryData = Required<ChunkCell>;

export class ChunkGeometryWorker extends LoggerObject {
    private params?: Params;

    private currentChunkPosition?: BlockCoord;

    private cells: Map<string, ChunkCell> = new Map();

    private geometryBuilder?: ChunkGeometryBuilder;

    private q: PQueue = new PQueue({ concurrency: 1 });

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
            }
            const method = e.data as WorkerMethodCall<unknown>;
            if (method.$methodCall) {
                switch (method.$methodCall.methodName) {
                    case 'goto':
                        this.callGoto(method.$methodCall.id, method.$methodCall.arg as GotoMethodArg);
                        break;
                    case 'getGeometries':
                        this.callGetGeometries(method.$methodCall.id, method.$methodCall.arg as BlockCoord[]);
                        break;
                }
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
            this.cells.clear();
            this.geometryBuilder = undefined;
            await this.updateCells();
        });
    }

    private processPositionMessage(message: PositionInputMessage) {
        this.enqueue('Position message processing', async () => {
            await this.goto(message.coord);
        });
    }

    private callGoto(id: string, arg: GotoMethodArg) {
        this.enqueue('Calling goto method', async () => {
            try {
                const result = await this.goto(arg.coord, arg.visibleDistance);
                const resultMessage: WorkerMethodResult<ChunkHeader[], string> = {
                    $methodResult: {
                        id,
                        methodName: 'goto',
                        resultValue: result
                    }
                };
                this.postMessage(resultMessage);
            }
            catch (err) {
                this.logger.warn(err, 'goto method call failed.');
                const resultMessage: WorkerMethodResult<ChunkHeader, string> = {
                    $methodResult: {
                        id,
                        methodName: 'goto',
                        error: err.message
                    }
                };
                this.postMessage(resultMessage);
            }
        });
    }

    private callGetGeometries(id: string, arg: BlockCoord[]) {
        try {
            const result = this.getGeometries(arg);
            const resultMessage: WorkerMethodResult<ChunkGeometryData[], string> = {
                $methodResult: {
                    id,
                    methodName: 'getGeometries',
                    resultValue: result
                }
            };
            this.postMessage(resultMessage);
        }
        catch (err) {
            this.logger.warn(err, 'getGeometries method call failed.');
            const resultMessage: WorkerMethodResult<ChunkHeader, string> = {
                $methodResult: {
                    id,
                    methodName: 'getGeometries',
                    error: err.message
                }
            };
            this.postMessage(resultMessage);
        }
    }

    getGeometries(coords: BlockCoord[]) {
        const result: ChunkGeometryData[] = [];

        for (const coord of coords) {
            const key = blockCoordFunctions.toString(coord);
            const cell = this.cells.get(key);
            if (cell && cell.geometry && cell.updatedOn) {
                result.push({
                    coord,
                    geometry: cell.geometry,
                    updatedOn: cell.updatedOn,
                });
            }
        }

        return result;
    }

    private async goto(coord: BlockCoord, visibleDistance?: number): Promise<ChunkHeader[]> {
        const gotoChunkCoord = chunkFunctions.pileCoordToChunkCoord(coord);
        if (!this.currentChunkPosition || !blockCoordFunctions.equals(this.currentChunkPosition, gotoChunkCoord)) {
            this.currentChunkPosition = gotoChunkCoord;
            this.logger.debug('Position updated: %j', this.currentChunkPosition);
            return await this.updateCells(visibleDistance);
        }
        return [];
    }

    private async updateCells(visibleDistance?: number): Promise<ChunkHeader[]> {
        if (!this.params || !this.currentChunkPosition) {
            return [];
        }

        const params = this.params;
        const position = this.currentChunkPosition;

        for (const chunkCoord of chunkFunctions.chunkCoordsAround(position, params.buildDistance)) {
            const key = blockCoordFunctions.toString(chunkCoord);
            let cell = this.cells.get(key);
            if (!cell) {
                cell = { coord: chunkCoord };
            }
            this.cells.set(key, cell);
        }

        return await this.calculateCells(visibleDistance);
    }

    private async calculateCells(visibleDistance?: number): Promise<ChunkHeader[]> {
        assert(this.cells.size);
        assert(this.params);

        this.logger.debug('Starting to calculate %s cells.', this.cells.size);

        const doCellUpdate = async (cell: ChunkCell) => {
            if (!cell.geometry) {
                const cellStartOn = Date.now();
                await this.updateCellGeometry(cell);
                this.logger.trace('Chunk cell %s updated in %d ms.', blockCoordFunctions.toString(cell.coord), Date.now() - cellStartOn);
            }
        };

        const startOn = Date.now();
        const remaining: ChunkCell[] = [];
        const result: ChunkHeader[] = [];
        for (const cell of this.cells.values()) {
            const dist = chunkFunctions.distanceInChunks(this.currentChunkPosition!, cell.coord);
            if (!visibleDistance || dist <= visibleDistance) {
                await doCellUpdate(cell);
                result.push({
                    coord: cell.coord,
                    updatedOn: cell.updatedOn!
                });
            }
            else {
                remaining.push(cell);
            }
        }

        this.logger.debug('Chunk cells updated in %d ms. Number of cells: %d, nember of updates: %d, remaining: %s', Date.now() - startOn, this.cells.size, result.length, remaining.length);

        if (remaining.length) {
            this.enqueue(`Process ${remaining.length} remaining chunk geometry updates`, async () => {
                const startOn = Date.now();
                for (const cell of remaining) {
                    await doCellUpdate(cell);
                }
                this.logger.debug('%d remaining chunk cells updated in %d ms.', remaining.length, Date.now() - startOn);
            });
        }

        return result;
    }

    private async updateCellGeometry(cell: ChunkCell) {
        cell.geometry = await this.getGeometryBuilder().build(cell.coord);
        cell.updatedOn = Date.now();
    }

    private enqueue(what: string, fn: () => Promise<void>) {
        this.q.add(fn).catch(err => this.logger.error(err, '%s failed.', what));
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