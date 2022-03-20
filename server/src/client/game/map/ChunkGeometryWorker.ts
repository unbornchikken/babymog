import assert from 'assert';
import { BlockCoord, blockCoordFunctions } from 'common/game/map/BlockCoord';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { ChunkGeometry, ChunkGeometryBuilder } from './ChunkGeometryBuilder';
import * as BABYLON from 'babylonjs';
import { chunkFunctions, CHUNK_SIZE } from 'common/game/map/Chunk';
import { BlockMaterialManager } from '../materials/BlockMaterialManager';
import { WorldManager } from 'common/game/map/WorldManager';

type ChunkCell = {
    coord: BlockCoord,
    geometry?: ChunkGeometry,
    updated?: number,
};

type Params = {
    worldId: string,
    calculateDistance: number,
    blockTextureSize?: number,
};

type ParamsMessage = Params & {
    type: 'params',
};

type PositionMessage = {
    type: 'position',
    coord: BlockCoord,
};

export type ChunkGeometryWorkerMessage = ParamsMessage | PositionMessage;

export class ChunkGeometryWorker extends LoggerObject {
    private params?: Params;

    private position?: BlockCoord;

    private cells: ChunkCell[] = [];

    private calculating = false;

    private calculateMore = false;

    processMessage(e: any) {
        const message = e.data as ChunkGeometryWorkerMessage;
        switch (message.type) {
            case 'params':
                this.processParamsMessage(message);
                break;
            case 'position':
                this.processPositionMessage(message);
                break;
        }
    }

    private processParamsMessage(message: ParamsMessage) {
        this.params = message;
        this.logger.debug('Parameters updated: %j', this.params);
        this.cells.length = 0;
        this.updateCells();
    }

    private processPositionMessage(message: PositionMessage) {
        if (!this.position || !blockCoordFunctions.equals(this.position, message.coord)) {
            this.position = message.coord;
            this.logger.debug('Position updated: %j', this.position);
            this.updateCells();
        }
    }

    private updateCells() {
        if (!this.params || !this.position) {
            return;
        }

        const newCells: ChunkCell[] = [];
        const oldCells = new Map<string, ChunkCell>();
        for (const cell of this.cells) {
            oldCells.set(blockCoordFunctions.toString(cell.coord), cell);
        }

        let hasEmpty = false;
        const currentChunkPosVec = blockCoordFunctions.getVec2(chunkFunctions.pileCoordToChunkCoord(this.position));
        for (let x = -this.params.calculateDistance; x <= this.params.calculateDistance; x++) {
            for (let z = -this.params.calculateDistance; z <= this.params.calculateDistance; z++) {
                const xCoord = currentChunkPosVec.x + x * CHUNK_SIZE;
                const zCoord = currentChunkPosVec.y + z * CHUNK_SIZE;
                const dist = BABYLON.Vector2.Distance(currentChunkPosVec, new BABYLON.Vector2(xCoord, zCoord)) / CHUNK_SIZE;
                if (dist <= this.params.calculateDistance) {
                    const chunkCoord = blockCoordFunctions.create(xCoord, zCoord);
                    let cell = oldCells.get(blockCoordFunctions.toString(chunkCoord));
                    if (!cell) {
                        hasEmpty = true;
                        cell = { coord: chunkCoord };
                    }
                    newCells.push(cell);
                }
            }
        }

        this.cells = newCells;
        this.sortCells();
        if (hasEmpty) {
            this.startCalculateGeometries();
        }
    }

    private startCalculateGeometries() {
        this.calculateGeometries().catch(err => this.logger.error(err, 'Geometry calculation crashed.'));
    }

    private async calculateGeometries() {
        if (this.calculating) {
            this.calculateMore = true;
            return;
        }

        this.calculating = true;
        try {
            await this.calculateCells();
        }
        catch (err) {
            this.logger.error(err, 'Geometry calculation failed.');
        }
        finally {
            this.calculating = false;
        }

        if (this.calculateMore) {
            this.calculateMore = false;
            this.startCalculateGeometries();
        }
    }

    async calculateCells() {
        assert(this.cells.length);
        assert(this.params);

        const startOn = Date.now();

        const geometryBuilder = new ChunkGeometryBuilder({
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

        let updates = 0;
        for (const cell of this.cells) {
            if (cell.geometry) {
                continue;
            }

            const cellStartOn = Date.now();
            cell.geometry = await geometryBuilder.build(cell.coord);
            const now = new Date();
            cell.updated = now.getTime();
            this.logger.debug('Chunk cell %s updated in %d ms.', blockCoordFunctions.toString(cell.coord), Date.now() - cellStartOn);
            updates++;
        }

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
}