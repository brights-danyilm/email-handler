import { Email } from '../model/email';
import { SenderOffice365 } from '../sender/sender-0365';
import { SenderGoogle } from '../sender/sender-google';
import { SenderOutbound } from '../sender/sender-outbound';
import { Logger } from '../util/logger';
import { DummyFilter } from './filter';
import { GeneralHandler } from './handler';

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
        new GeneralHandler(
            new DummyFilter(),
            this.logger,
            email.to[0].includes(process.env.O365_DOMAIN)
                ? new SenderOffice365(this.logger)
                : new SenderGoogle(this.logger),
        ).handle(email);
    }
}

export class OutboundRouter {
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
        new GeneralHandler(
            new DummyFilter(),
            this.logger,
            new SenderOutbound(this.logger),
        ).handle(email);
    }
}
