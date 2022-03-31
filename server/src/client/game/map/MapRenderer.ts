import assert from 'assert';
import * as BABYLON from 'babylonjs';
import { BlockCoord, blockCoordFunctions } from 'common/game/map/BlockCoord';
import { chunkFunctions, CHUNK_SIZE } from 'common/game/map/Chunk';
import { InternalError } from 'common/system/errors/InternalError';
import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';
import type { WorkerThread } from 'common/system/worker/WorkerThread';
import type { ChunkGeometryWorkerInputMessage, ChunkGeometryWorkerOuputMessage, ChunkGeomteryEntry, UpdatedChunk } from './ChunkGeometryWorker';
import { ChunkMeshBuilder } from './ChunkMeshBuilder';

const DEF_VISIBLE_DISTANCE = 7;
const DEF_BUILD_MORE_DISTANCE = 2;

export type MapRendererOptions = {
    container: Container,
    player: BABYLON.TransformNode,
    visibleDistance?: number,
    buildMoreDistance?: number,
};

type ChunkCell = {
    coord: BlockCoord,
    mesh: BABYLON.Mesh,
    geometryUpdatedOn: number,
};

export class MapRenderer extends LoggerObject implements BABYLON.Behavior<BABYLON.TransformNode> {
    constructor(options: MapRendererOptions) {
        super(options.container);

        this.player = options.player;
        this.visibleDistance = options.visibleDistance ?? DEF_VISIBLE_DISTANCE;
        this.buildMoreDistance = options.buildMoreDistance ?? DEF_BUILD_MORE_DISTANCE;

        this.onPlayerPositionUpdatedCallback = () => this.onPlayerPositionUpdated();
        this.onWorkerMessageCallback = message => this.onWorkerMessage(message);
    }

    get name() {
        return this.constructor.name;
    }

    private scene?: BABYLON.Scene;

    private target?: BABYLON.TransformNode;

    private player: BABYLON.TransformNode;

    private lastPlayerBlockCoord?: BlockCoord;

    private visibleDistance: number;

    private buildMoreDistance: number;

    private lastPlayerCoord?: BlockCoord;

    private cells: Map<string, ChunkCell> = new Map();

    private meshBuilder?: ChunkMeshBuilder;

    private get playerCoord() {
        return blockCoordFunctions.create(this.player.position);
    }

    private onPlayerPositionUpdatedCallback: () => void;

    private onWorkerMessageCallback: (message: any) => void;

    init() {
        // noop
    }

    attach(target: BABYLON.TransformNode) {
        // setup
        this.cells.clear();

        this.target = target;
        this.scene = target.getScene();

        const worker = this.getChunkGeometryWorker();
        worker.postMessage({
            type: 'params',
            worldId: 'world1',
            buildDistance: this.visibleDistance + this.buildMoreDistance,
        });
        worker.on('message', this.onWorkerMessageCallback);

        this.player.onAfterWorldMatrixUpdateObservable.add(this.onPlayerPositionUpdatedCallback);

        // init
        this.updatePosition();
    }

    detach() {
        const worker = this.getChunkGeometryWorker();
        worker.removeListener('message', this.onWorkerMessageCallback);
        this.player.onAfterWorldMatrixUpdateObservable.removeCallback(this.onPlayerPositionUpdatedCallback);
        this.scene = undefined;
        this.target = undefined;
        this.updatePosition();
    }

    private onPlayerPositionUpdated() {
        this.updatePosition();
    }

    private updatePosition() {
        const currentPlayerCoord = this.playerCoord;
        if (!this.lastPlayerBlockCoord || !blockCoordFunctions.equals(currentPlayerCoord, this.lastPlayerBlockCoord)) {
            this.logger.debug('Updating player position to %s.', blockCoordFunctions.toString(currentPlayerCoord));
            this.getChunkGeometryWorker().postMessage({
                type: 'position',
                coord: currentPlayerCoord
            });
            this.lastPlayerBlockCoord = currentPlayerCoord;

            this.hideFarChunks();
            this.removeOldChunks();
        }
    }

    private onWorkerMessage(message: any) {
        const outMessage = message as ChunkGeometryWorkerOuputMessage;
        switch (outMessage.type) {
            case 'updatedChunks':
                this.processUpdatedChunksWorkerMessage(outMessage.chunks);
                return;
            case 'chunkGeometries':
                this.processChunkGeometriesWorkerMessage(outMessage.chunkGeometries);
                break;
            default:
                throw new InternalError(`Unknown message: ${ JSON.stringify(message) }`);
        }
    }

    private processUpdatedChunksWorkerMessage(chunks: UpdatedChunk[]) {
        this.logger.debug('Starting to process %d updated chunks.', chunks.length);

        const playerChunkPosVec = blockCoordFunctions.getVec2(chunkFunctions.pileCoordToChunkCoord(this.playerCoord));
        const coords = chunks
            .filter(c => {
                const dist = BABYLON.Vector2.Distance(playerChunkPosVec, blockCoordFunctions.getVec2(c.coord)) / CHUNK_SIZE;
                if (dist <= this.visibleDistance) {
                    const key = blockCoordFunctions.toString(c.coord);
                    const cell = this.cells.get(key);
                    if (!cell || cell.geometryUpdatedOn !== c.updatedOn) {
                        return true;
                    }
                }
                return false;
            })
            .map(c => c.coord);

        if (coords.length) {
            this.logger.debug('Requesting geometries for %d visible chunks.', coords.length);

            const message: ChunkGeometryWorkerInputMessage = {
                type: 'getChunkGeometries',
                coords
            };

            this.getChunkGeometryWorker().postMessage(message);
        }
    }

    private processChunkGeometriesWorkerMessage(chunkGeometries: ChunkGeomteryEntry[]) {
        this.logger.debug('Starting to process %d updated chunks.', chunkGeometries.length);

        for (const entry of chunkGeometries) {
            this.updateGeometry(entry);
        }
    }

    private updateGeometry(entry: ChunkGeomteryEntry) {
        assert(this.scene);
        assert(this.target);

        const mesh = this.getMeshBuilder().build(entry.geometry, this.scene);
        mesh.parent = this.target;
    }

    private hideFarChunks() {
        // TODO
    }

    private removeOldChunks() {
        // TODO
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