import type { Container } from 'common/system/ioc/Container';
import type { MaterialDataManager } from '../game/materials/MaterialDataManager';
import { ApiRoute } from './ApiRoute';
import type { RequestFunction } from './AtlasApi';

export class MaterialsApi extends ApiRoute {
    constructor(container: Container) {
        super(container, 'materials');
    }

    private getMaterialDataManager() {
        return this.container.get<MaterialDataManager>('MaterialDataManager');
    }

    registerRoutes() {
        this.app.get(this.makeRoute('/block-material-pack/:id'), this.getBlockMaterialPack());
    }

    private getBlockMaterialPack(): RequestFunction {
        return async (req, res, next) => {
            try {
                res.json(await this.getMaterialDataManager().getBlockMaterialPack(req.params.id));
            }
            catch (err) {
                next(err);
            }
        };
    }
}