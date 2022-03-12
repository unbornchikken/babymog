import assert from 'assert';
import { BlockMaterial } from '../materials/BlockMaterial';

export class Block {
    constructor(material: BlockMaterial) {
        this.material = material;
    }

    readonly material: BlockMaterial;

    static fromJSON(json: any) {
        assert(typeof json === 'object');
        assert(typeof json._type === this.name);
        assert(typeof json.material === 'object');
        return new Block(BlockMaterial.fromJSON(json.material));
    }

    toJson() {
        return {
            _type: this.constructor.name,
            material: this.material.toJson(),
        };
    }
}