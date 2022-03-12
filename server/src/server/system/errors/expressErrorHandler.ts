import type { Request, Response, NextFunction } from 'express';
import { RequestError } from './RequestError';

const PROD = process.env.NODE_ENV === 'production';

export const expressErrorHandler = {
    handleError
};

function handleError() {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
        let resultCode = 500;
        if (err instanceof RequestError) {
            resultCode = 400;
        }
        res.status(resultCode).json({
            resultCode,
            errorType: err.constructor.name,
            errorMessage: err.message,
            errorCode: (err as any).code,
            errorStack: PROD ? undefined : err.stack?.split('\n').map(s => s.trim()).filter(s => s.length > 3)
        });
    };
}