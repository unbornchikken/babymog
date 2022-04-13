import assert from 'assert';
import type * as BABYLON from 'babylonjs';
import { BlockCoord, blockCoordFunctions } from 'common/game/map/BlockCoord';
import { chunkFunctions, CHUNK_SIZE } from 'common/game/map/Chunk';
import { InternalError } from 'common/system/errors/InternalError';
import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { MapEx } from 'common/system/MapEx';
import type { WorkerThread } from 'common/system/worker/WorkerThread';
import { Component } from '../../system/babylon/Component';
import type { NodeWithPosition } from '../../system/babylon/coordinates';
import type { ChunkGeometryData, ChunkGeometryWorkerInputMessage, ChunkHeader, GotoMethodArg } from './ChunkGeometryWorker';
import { ChunkMeshBuilder } from './ChunkMeshBuilder';

const DEF_VISIBLE_DISTANCE = 7;
const DEF_BUILD_MORE_DISTANCE = 2;
const DEF_CHUNK_DELETE_TIMEOUT = 60000;

export type MapRendererOptions = {
    container: Container,
    player: NodeWithPosition,
    visibleDistance?: number,
    buildMoreDistance?: number,
    chunkDeleteTimeout?: number,
};

type ChunkCell = {
    coord: BlockCoord,
    mesh: BABYLON.Mesh,
    updatedOn: number,
};

export class MapRenderer extends Component<BABYLON.TransformNode> {
    constructor(options: MapRendererOptions) {
        super(options.container);

        this.player = options.player;
        this.visibleDistance = options.visibleDistance ?? DEF_VISIBLE_DISTANCE;
        this.buildMoreDistance = options.buildMoreDistance ?? DEF_BUILD_MORE_DISTANCE;
        this.chunkDeleteTimeout = options.chunkDeleteTimeout ?? DEF_CHUNK_DELETE_TIMEOUT;

        this.onWorkerMessageCallback = message => this.onWorkerMessage(message);
    }

    private player: NodeWithPosition;

    private playerChunkPosition?: BlockCoord;

    private visibleDistance: number;

    private buildMoreDistance: number;

    private chunkDeleteTimeout: number;

    private cells: MapEx<string, ChunkCell> = new MapEx();

    private meshBuilder?: ChunkMeshBuilder;

    private updatingChunks = false;

    private moreUpdatesNeeded = false;

    private get playerCoord() {
        return blockCoordFunctions.create(this.player.position);
    }

    private onWorkerMessageCallback: (message: any) => void;

    private attached() {
        // setup
        this.cells.clear();

        const worker = this.getChunkGeometryWorker();
        worker.postMessage({
            type: 'params',
            worldId: 'world1',
            buildDistance: this.visibleDistance + this.buildMoreDistance,
        });
        worker.on('message', this.onWorkerMessageCallback);

        // init
        this.updatePosition();
    }

    private detaching() {
        const worker = this.getChunkGeometryWorker();
        worker.removeListener('message', this.onWorkerMessageCallback);
    }

    private update() {
        this.updatePosition();
    }

    private onWorkerMessage(meesage: any) {
        // noop yet
    }

    private updatePosition() {
        const currentPlayerChunkPosition = chunkFunctions.pileCoordToChunkCoord(this.playerCoord);
        if (!this.playerChunkPosition || !blockCoordFunctions.equals(currentPlayerChunkPosition, this.playerChunkPosition)) {
            this.playerChunkPosition = currentPlayerChunkPosition;
            void this.updateChunks();
        }
    }

    private async updateChunks() {
        if (this.updatingChunks) {
            this.moreUpdatesNeeded = true;
        }
        else {
            this.updatingChunks = true;
            try {
                await this.doUpdateChunks();
            }
            catch (err) {
                this.logger.error(err, 'Chunk update failed.');
            }
            finally {
                this.updatingChunks = false;
                if (this.moreUpdatesNeeded) {
                    this.moreUpdatesNeeded = false;
                    setImmediate(() => this.updateChunks());
                }
            }
        }
    }

    private async doUpdateChunks() {
        assert(this.playerChunkPosition);

        const visibleChunkHeaders: ChunkHeader[] = await this.getChunkGeometryWorker().call<GotoMethodArg>('goto', {
            coord: this.playerChunkPosition,
            visibleDistance: this.visibleDistance,
        });

        const needToUpdateCoords: BlockCoord[] = [];

        for (const chunkHeader of visibleChunkHeaders) {
            const dist = chunkFunctions.distanceInChunks(chunkHeader.coord, this.playerChunkPosition);
            if (dist <= this.visibleDistance) {
                const key = blockCoordFunctions.toString(chunkHeader.coord);
                const cell = this.cells.get(key);
                if (!cell || cell.updatedOn !== chunkHeader.updatedOn) {
                    needToUpdateCoords.push(chunkHeader.coord);
                }
            }
        }

        const geometries: ChunkGeometryData[] = await this.getChunkGeometryWorker().call<BlockCoord[]>('getGeometries', needToUpdateCoords);
        for (const chunkData of geometries) {
            const dist = chunkFunctions.distanceInChunks(chunkData.coord, this.playerChunkPosition);
            const visible = dist <= this.visibleDistance;
            const key = blockCoordFunctions.toString(chunkData.coord);
            let cell = this.cells.get(key);
            if (cell) {
                if (!visible) {
                    this.deleteCell(key, cell);
                }
                else if (cell.updatedOn != chunkData.updatedOn) {
                    const mesh = this.getMeshBuilder().build(chunkData.geometry, this.scene);
                    mesh.parent = this.target;
                    // TODO: all dispose to a free list
                    cell.mesh.dispose();
                    cell.mesh = mesh;
                }
            }
            else if (visible) {
                const mesh = this.getMeshBuilder().build(chunkData.geometry, this.scene);
                mesh.parent = this.target;
                cell = {
                    coord: chunkData.coord,
                    updatedOn: chunkData.updatedOn,
                    mesh,
                };
                this.cells.set(key, cell);
            }
        }

        for (const cell of this.cells.values()) {
            const dist = chunkFunctions.distanceInChunks(cell.coord, this.playerChunkPosition);
            const visible = dist <= this.visibleDistance;
            if (visible) {
                if (!cell.mesh.isEnabled()) {
                    cell.mesh.setEnabled(true);
                }
            }
            else {
                this.deleteCell(undefined, cell);
            }
        }

        this.logger.debug('%d chunks updated.', geometries.length);
    }

    private deleteCell(key?: string, cell?: ChunkCell) {
        if (!cell) {
            assert(key);
            cell = this.cells.get(key);
        }
        else if (!key) {
            assert(cell);
            key = blockCoordFunctions.toString(cell.coord);
        }
        if (cell) {
            if (Date.now() - cell.updatedOn > this.chunkDeleteTimeout) {
                cell.mesh.dispose();
                this.cells.delete(key);
            }
            else if (cell.mesh.isEnabled()) {
                cell.mesh.setEnabled(false);
            }
        }
    }

    private getChunkGeometryWorker() {
        return this.container.get<WorkerThread>('ChunkGeometryWorker');
    }

    private getMeshBuilder() {
        if (!this.meshBuilder) {
            this.meshBuilder = new ChunkMeshBuilder(this.container);
        }
        return this.meshBuilder;
    }
}