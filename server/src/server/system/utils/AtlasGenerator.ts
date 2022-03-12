import fg from 'fast-glob';
import { InternalError } from '../errors/InternalError';
import fs from 'fs-extra';
import crypto from 'crypto';
import path from 'path';
import { fsHelpers } from './fsHelpers';
import type { Logger } from 'pino';
import assert from 'assert';
import { execHelpers } from './execHelpers';

const DEF_SIZE = 64;

type FileEntry = {
    filePath: string,
    lastModTime: number,
};

export type AtlasGeneratorOptions = {
    id: string,
    outDir: string,
    patterns: string[],
    size?: number,
    logger: Logger,
};

export type AtlasGeneratorResult = {
    imagePath: string,
    metadataPath: string,
};

export class AtlasGenerator {
    constructor(options: AtlasGeneratorOptions) {
        this.id = options.id;
        this.outDir = options.outDir;
        this.patterns = options.patterns.map(p => p.replaceAll('\\', '/'));
        this.size = options.size ?? DEF_SIZE;
        this.logger = options.logger;
    }

    readonly id: string;

    private readonly outDir: string;

    private readonly patterns: string[];

    private readonly size: number;

    private files?: FileEntry[];

    private logger: Logger;

    public async generate(): Promise<AtlasGeneratorResult> {
        const fileName = await this.getFileName();
        const imagePath = path.join(this.outDir, fileName + '.png');
        const metadataPath = path.join(this.outDir, fileName + '.json');

        if (await fsHelpers.tryTouch(imagePath) && fsHelpers.tryTouch(metadataPath)) {
            return {
                imagePath,
                metadataPath
            };
        }
        else {
            await fs.remove(imagePath);
            await fs.remove(metadataPath);
        }

        const filePaths = (await this.getFiles()).map(f => f.filePath);
        assert(filePaths.length);
        const inputs = '{' + filePaths.join(',') + '}';
        const output = path.join(this.outDir, fileName);
        const size = String(this.size);

        this.logger.debug('Executing harp-atlas-generator for %d input files to generate atlas "%s" as "%s".', filePaths.length, this.id, output);
        try {
            await execHelpers.run('npx', ['harp-atlas-generator', '-i', inputs, '-o', output, '-w', size, '-h', size]);
            this.logger.debug('Atlas "%s" has been generated. Image file: "%s", metadata file: "%s".', this.id, imagePath, metadataPath);
            return {
                imagePath,
                metadataPath
            };
        }
        catch (err) {
            throw new InternalError(`Generating atlas "${ this.id }" failed.`, err);
        }
    }

    private async getFileName() {
        const hash = crypto.createHash('md5');
        for (const file of await this.getFiles()) {
            hash.update(file.filePath);
            hash.update(String(file.lastModTime));
        }
        return `${ this.id }_atlas_${ hash.digest('hex') }_${ this.size }`;
    }

    private async getFiles() {
        if (this.files) {
            return this.files;
        }

        const files: FileEntry[] = [];
        const stream = fg.stream(this.patterns);
        for await (const file of stream) {
            const filePath = String(file);
            let lastModTime = 0;
            try {
                const stat = await fs.stat(filePath);
                if (!stat.isFile()) {
                    throw new InternalError(`Filesystem entry is not a file: "${ filePath }".`);
                }
                lastModTime = stat.mtimeMs;
            }
            catch (err) {
                if (err instanceof InternalError) {
                    throw err;
                }
                throw new InternalError(`Cannot read file: "${ filePath }".`, err);
            }
            files.push({ filePath, lastModTime });
        }

        if (files.length === 0) {
            throw new InternalError('Patterns doesn\'t resolve files.');
        }

        this.files = files.sort((a, b) => {
            if (a.filePath < b.filePath) {
                return -1;
            }
            if (b.filePath < a.filePath) {
                return 1;
            }
            return 0;
        });
        return this.files;
    }
}
