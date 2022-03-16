import type { Container } from 'common/system/ioc/Container';
import type { Request, Response, NextFunction } from 'express';
import type { Logger } from 'pino';
import { RequestError } from './RequestError';

const PROD = process.env.NODE_ENV === 'production';

export const expressErrorHandler = {
    handleError
};

function handleError(container: Container) {
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

        const logger = container.get<Logger>('logger');
        logger[resultCode < 500 ? 'info' : 'warn'](err, 'Request "%s" failed.', req.url);
    };
}