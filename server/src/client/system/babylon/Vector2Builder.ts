import assert from 'assert';

export class Vector2Builder {
    readonly numbers: number[] = [];

    add(x: number, y: number): Vector2Builder;
    add(vec: BABYLON.Vector2): Vector2Builder;
    add(arg0: number | BABYLON.Vector2, y?: number) {
        if (typeof arg0 === 'number') {
            assert(y !== undefined);
            this.numbers.push(arg0);
            this.numbers.push(y);
        }
        else {
            this.numbers.push(arg0.x);
            this.numbers.push(arg0.y);
        }
        return this;
    }
}