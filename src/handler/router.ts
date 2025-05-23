import { Email } from '../model/email';
import { SenderOffice365 } from '../sender/sender-0365';
import { Logger } from '../util/logger';
import { DummyFilter } from './filter';
import { O365Handler } from './handler';

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
        new O365Handler(
            new DummyFilter(),
            this.logger,
            new SenderOffice365(this.logger),
        ).handle(email);
    }
}
