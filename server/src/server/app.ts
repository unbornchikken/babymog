import express from 'express';
import type { Express } from 'express';
import { WebSocketChannels } from './system/webSockets/WebSocketChannels';
import { Logger, pino } from 'pino';
import { AtlasApi } from './routes/AtlasApi';
import { expressLogger } from '../common/system/log/expressLogger';
import { expressErrorHandler } from './system/errors/expressErrorHandler';
import path from 'path';
import { Container } from 'common/system/ioc/Container';
import { MaterialDataManager } from './game/materials/MaterialDataManager';

const GENERATED_CONTENT_MAX_AGE = 2592000000; // 30 days
const PORT = 3000;

const container = new Container();

container.register(
    'logger',
    _ => pino({
        level: 'debug',
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: true
            }
        },
    })
);

container.register(
    'channels',
    c => new WebSocketChannels({ logger: c.get('logger'), httpServer: c.get('server') })
);

container.register('MaterialDataManager', c => new MaterialDataManager(c));

container.register(
    'app',
    _ => express()
);

container.register(
    'server',
    c => c.get<Express>('app').listen(PORT, () => {
        const logger = c.get<Logger>('logger');
        logger.info(`Express is listening at http://localhost:${PORT}`);
    })
);

const app = container.get<Express>('app');
const channels = container.get<WebSocketChannels>('channels');

// Magic
app.use(express.json());
app.use(expressLogger.log(container));

// index.html
app.get('/', (_, res) => res.sendFile(path.join(__dirname, '../../build/client/index.html')));

// API
new AtlasApi(container).registerRoutes();

// Staitc
app.use(express.static('build/client'));
app.use('/generated', express.static('generated', { maxAge: GENERATED_CONTENT_MAX_AGE}));

// Error
app.use(expressErrorHandler.handleError(container));

channels.init();