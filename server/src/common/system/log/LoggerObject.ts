import { DependentObject } from 'common/system/ioc/DependentObject';
import type { Logger } from 'pino';

export class LoggerObject extends DependentObject {
    protected get logger() {
        return this.container.get<Logger>('logger').child({ type: this.constructor.name });
    }
}