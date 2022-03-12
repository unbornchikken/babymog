export class InternalError extends Error {
    constructor(message: string, innerError?: Error) {
        super(message);

        // This should never get serialized:
        Object.defineProperty(this, 'innerErr', {
            enumerable: false,
            value: innerError
        });

        Error.captureStackTrace(this, this.constructor);
        if (innerError) {
            this.stack = this.stack + '\nInner Error:\n' + innerError.stack;
        }
    }
}