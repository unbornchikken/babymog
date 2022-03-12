import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';
import * as BABYLON from 'babylonjs';
import assert from 'assert';
import { InternalError } from 'common/system/errors/InternalError';

export type TextureAtlasOptions = {
    container: Container,
    collection?: string,
    id: string,
    size?: number,
};

export type TextureAtlasUrls = {
    imageUrl: string,
    metadataUrl: string,
};

export interface TextureAtlasMetadata {
    [textureId: string]: {
        x: number,
        y: number,
        width: number,
        height: number,
    };
}

export type TextureAtlasUVs = {
    [textureId: string]: BABYLON.Vector4
};

export class TextureAtlas extends LoggerObject {
    constructor(options: TextureAtlasOptions) {
        super(options.container);

        this.collection = options.collection;
        this.id = options.id;
        this.size = options.size;
        this.urls = this.getUrls();
    }

    public readonly collection?: string;

    public readonly id: string;

    get title() {
        return this.collection ? this.collection + '/' + this.id : this.id;
    }

    public readonly size?: number;

    public readonly urls: TextureAtlasUrls;

    private metadata?: TextureAtlasMetadata;

    private uvs?: TextureAtlasUVs;

    public async getTextureUVs(textureId: string) {
        const uvs = await this.tryGetTextureUVs(textureId);
        if (uvs === undefined) {
            throw new InternalError(`Texture "${ textureId }" not found in atlas "${ this.title }".`);
        }
        return uvs;
    }

    public async tryGetTextureUVs(textureId: string): Promise<BABYLON.Vector4 | undefined> {
        const uvs = await this.getUVs();
        return uvs[textureId];
    }

    public async getTextureIds() {
        const uvs = await this.getUVs();
        return Object.keys(uvs);
    }

    public async getUVs() {
        if (this.uvs) {
            return this.uvs;
        }

        const metadata = await this.getMetadata();

        let maxX = 0;
        let maxY = 0;
        for (const coords of Object.values(metadata)) {
            const currentMaxX = coords.x + coords.width - 1;
            const currentMaxY = coords.y + coords.height - 1;
            if (currentMaxY > maxY) {
                maxY = currentMaxY;
            }
            if (currentMaxX > maxX) {
                maxX = currentMaxX;
            }
        }

        this.uvs = {};
        const D = 1;
        for (const [id, coords] of Object.entries(metadata)) {
            const x1 = coords.x + D;
            const x2 = coords.x + coords.width - 1 - D;
            const y1 = coords.y + coords.height - 1 - D;
            const y2 = coords.y + D;
            const x1s = scale(x1, maxX);
            const x2s = scale(x2, maxX);
            const y1s = 1 - scale(y1, maxY);
            const y2s = 1 - scale(y2, maxY);
            this.uvs[id] = new BABYLON.Vector4(
                x1s,
                y1s,
                x2s,
                y2s,
            );
        }
        return this.uvs;

        function scale(value: number, max: number) {
            return value / max;
        }
    }

    public async getMetadata() {
        if (this.metadata) {
            return this.metadata;
        }
        const response = await fetch(this.urls.metadataUrl);
        this.metadata = await response.json();
        assert(this.metadata);
        return this.metadata;
    }

    private getUrls() {
        let imageUrl = 'api/atlas/' + this.title;
        let metadataUrl = imageUrl + '/metadata';

        const size = this.size ? `?size=${this.size}` : '';

        imageUrl += size;
        metadataUrl += size;

        return {
            imageUrl,
            metadataUrl,
        };
    }
}