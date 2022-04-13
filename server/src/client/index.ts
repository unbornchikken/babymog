import { Container } from 'common/system/ioc/Container';
import pino, { Logger } from 'pino';
import { ViewScene } from './system/babylon/ViewScene';
import { BlockMaterialManager } from './game/materials/BlockMaterialManager';
import { ChunkGeometryBuilder } from './game/map/ChunkGeometryBuilder';
import { WorldManager } from 'common/game/map/WorldManager';
import { blockCoordFunctions } from 'common/game/map/BlockCoord';
import { HackWorldDataInterface } from './game/map/HackWorldDataInterface';
import { ChunkMeshBuilder } from './game/map/ChunkMeshBuilder';
import * as BABYLON from 'babylonjs';
import { ChunkGeometryWorker } from './game/map/ChunkGeometryWorker';
import { InternalError } from 'common/system/errors/InternalError';
import { MapRenderer } from './game/map/MapRenderer';
import queryString from 'query-string';
import { WorkerThread } from 'common/system/worker/WorkerThread';
import { WebUIWorker } from './system/worker/WebUIWorker';
import { coordinates } from './system/babylon/coordinates';
import 'setimmediate';
import assert from 'assert';

assert(setImmediate);

const parsedQueryString = queryString.parse(location.search);

const container = new Container();

container.register(
    'logger',
    _ => pino({
        level: 'debug',
        browser: {
            serialize: true,
            asObject: true,
        }
    })
);

container.register('ChunkDataInterface', c => new HackWorldDataInterface(c));

//@ts-expect-error hack
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    if (parsedQueryString.worker === 'ChunkGeometryWorker') {
        const workerImpl = new ChunkGeometryWorker(container);
        onmessage = e => workerImpl.processMessage(e);
    }
    else {
        throw new InternalError('Unknown worker.');
    }
}
else {
    container.register('ChunkGeometryWorker', c => new WorkerThread({
        name: 'ChunkGeometryWorker',
        nativeWorker: new WebUIWorker('index.js?worker=ChunkGeometryWorker'),
        container: c
    }));

    const view = new ViewScene({
        container,
        async sceneFactory(view) {
            const engine = view.getEngine();
            const canvas = view.getCanvas();

            const scene = new BABYLON.Scene(engine);

            const camera = new BABYLON.ArcRotateCamera('camera1', -Math.PI / 2, Math.PI / 2.2, 5, new BABYLON.Vector3(0, 0, 0), scene);
            camera.attachControl(canvas, true);

            const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 1, 0), scene);

            const node = new BABYLON.TransformNode('map', scene);
            node.addBehavior(new MapRenderer({ container, player: camera }));

            return scene;
        }
    });

    view.show().catch(err => {
        container.get<Logger>('logger').error(err, 'Showing view failed.');
    });
}