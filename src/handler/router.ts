import { Email } from '../model/email';
import { SenderOffice365 } from '../sender/sender-0365';
import { SenderGoogle } from '../sender/sender-google';
import { SenderOutbound } from '../sender/sender-outbound';
import { DefaultLogger } from '../util/default-logger';
import { Logger } from '../util/logger';
import { DummyFilter } from './filter';
import { GeneralHandler } from './handler';

export interface IRouter {
    route(email: Email): Promise<void>
}

export class Router implements IRouter {
    private logger: Logger;
    constructor() {
        this.logger = DefaultLogger.getInstance();
    }

    /**
     * Routes email to appropriate handler and filter
     *
     * i.e. if we want to have different logic for emails sent from/to
     * different domains
     *
     * @todo implement real logic
     */
    public async route(email: Email) {
        new GeneralHandler(
            new DummyFilter(),
            this.logger,
            email.to[0].includes(process.env.O365_DOMAIN)
                ? new SenderOffice365(this.logger)
                : new SenderGoogle(this.logger),
        ).handle(email);
    }
}

export class OutboundRouter implements IRouter {
    private logger: Logger;
    constructor() {
        this.logger = DefaultLogger.getInstance();
    }

    /**
     * Routes email to appropriate handler and filter
     *
     * i.e. if we want to have different logic for emails sent from/to
     * different domains
     *
     * @todo implement real logic
     */
    public async route(email: Email) {
        new GeneralHandler(
            new DummyFilter(),
            this.logger,
            new SenderOutbound(this.logger),
        ).handle(email);
    }
}
