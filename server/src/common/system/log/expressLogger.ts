import type { Container } from 'common/system/ioc/Container';
import type { Request, Response, NextFunction } from 'express';
import type { Logger } from 'pino';

export const expressLogger = {
    log
};

function log(container: Container) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (res.headersSent) {
                writeToLog(container.get<Logger>('logger'), req.method, req.url, res.statusCode);
            }
            else {
                res.once('finish', () => writeToLog(container.get<Logger>('logger'), req.method, req.url, res.statusCode));
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}

function writeToLog(logger: Logger, method: string, url: string, status: number) {
    logger.debug({
        method,
        url,
        status,
    });
}