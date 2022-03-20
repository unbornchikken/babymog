import { Container } from 'common/system/ioc/Container';
import pino, { Logger } from 'pino';
import { ViewScene } from './system/babylon/ViewScene';
import { BlockMaterialManager } from './game/materials/BlockMaterialManager';
import { ChunkGeometryBuilder } from './game/map/ChunkGeometryBuilder';
import { WorldManager } from 'common/game/map/WorldManager';
import { blockCoordFunctions } from 'common/game/map/BlockCoord';
import { HackWorldDataInterface } from './game/map/HackWorldDataInterface';
import { ChunkMeshBuilder } from './game/map/ChunkMeshBuilder';

const container = new Container();

container.register(
    'logger',
    _ => pino({
        level: 'debug',
        browser: {
            asObject: true,
        }
    })
);

container.register('ChunkDataInterface', c => new HackWorldDataInterface());

const view = new ViewScene({
    container,
    async sceneFactory(view) {
        const engine = view.getEngine();
        const canvas = view.getCanvas();

        const scene = new BABYLON.Scene(engine);

        const camera = new BABYLON.ArcRotateCamera('camera1', -Math.PI / 2, Math.PI / 2.2, 5, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(canvas, true);
        const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 1, 0), scene);

        const geometryBuilder = new ChunkGeometryBuilder({
            container,
            materialManager: new BlockMaterialManager({ container }),
            worldManager: new WorldManager({ container: container, worldId: 'pupu' })
        });

        const meshBuilder = new ChunkMeshBuilder(container);

        const geometry = await geometryBuilder.build(blockCoordFunctions.create(0, 0));
        meshBuilder.build(geometry, scene);

        return scene;
    }
});

view.show().catch(err => {
    container.get<Logger>('logger').error(err, 'Showing view failed.');
});