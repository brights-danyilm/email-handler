import { Email } from '../model/email';
import { Sender } from '../sender/sender';
import { Logger } from '../util/logger';
import { Filter } from './filter';

export abstract class Handler {
    constructor(
        protected filter: Filter,
        protected logger: Logger,
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

export class O365Handler extends Handler {
    constructor(
        filter: Filter,
        logger: Logger,
        private sender: Sender,
    ) {
        super(filter, logger);
    }

    protected override async handlePass(email: Email): Promise<void> {
        const res = await this.sender.send(email);

        if (res.success == false) {
            await this.logger.error(
                'Failed to send email',
                email,
            );
        }
    }

    protected override async handleDrop(email: Email): Promise<void> {}
}
