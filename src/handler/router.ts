import { Email } from '../model/email';
import { DefaultLogger } from '../util/default-logger';
import { Logger } from '../util/logger';
import { DummyFilter } from './filter';
import { EmtpyHandler } from './handler';

export class Router {
    constructor(
        private logger: Logger,
    ) {}

    /**
     * Routes email to appropriate handler and filter
     *
     * i.e. if we want to have different logic for emails sent from/to
     * different domains
     *
     * @todo implement real logic
     */
    public route(email: Email) {
        new EmtpyHandler(
            new DummyFilter(),
            this.logger,
        ).handle(email);
    }
}
