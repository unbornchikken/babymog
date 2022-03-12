import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { AtlasGenerator } from '../system/utils/AtlasGenerator';

export type AtlasResultType = 'image' | 'metadata';

export class AtlasController extends LoggerObject {
    constructor(container: Container, outDir: string) {
        super(container);

        this.outDir = outDir;
    }

    private outDir: string;

    async createResultFile(patterns: string[], size: number | undefined, resultType: AtlasResultType) {
        const gen = new AtlasGenerator({
            id: 'sample-box',
            logger: this.logger,
            outDir: this.outDir,
            patterns,
            size
        });
        const genResult = await gen.generate();
        let resultFilePath: string;
        let contentType: string;
        if (resultType === 'image') {
            resultFilePath = genResult.imagePath;
            contentType = 'image/png';
        }
        else {
            resultFilePath = genResult.metadataPath;
            contentType = 'application/json';
        }
        return { resultFilePath, contentType };
    }
}