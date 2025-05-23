import { Email } from '../model/email';
import { Logger } from '../util/logger';
import { Filter } from './filter';

export abstract class Handler {
    constructor(
        private filter: Filter,
        private logger: Logger,
    ) {}

    public async handle(email: Email) {
        await this.logger.info('Processing email', email);

        if (await this.filter.process(email)) {
            await this.logger.info('Passing email', email);
            await this.handlePass(email);
        } else {
            await this.logger.info('Dropping email', email);
            await this.handleDrop(email);
        }
    }

    protected abstract handlePass(email: Email): Promise<void>;
    protected abstract handleDrop(email: Email): Promise<void>;
}

export class EmtpyHandler extends Handler {
    protected override async handlePass(email: Email): Promise<void> {}
    protected override async handleDrop(email: Email): Promise<void> {}
}
