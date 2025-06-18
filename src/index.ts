import { readFileSync } from 'fs';
import { config } from 'dotenv';

import { OutboundRouter, Router } from './handler/router';
import { Email } from './model/email';
import { DefaultLogger } from './util/default-logger';

config();

const logger = DefaultLogger.getInstance();

const receiver = process.argv[2];
if (!receiver) {
    logger.error('no receiver');
} else {
    logger.info('receiver:', receiver);
}

const emailBody = readFileSync(0).toString();

if (!emailBody) {
    logger.fatal('No email body passed');
}

Email.fromString(emailBody).then(email => {
    // email sent to one of our domains, means it is inbound
    if (receiver.endsWith(process.env.O365_DOMAIN)
        || receiver.endsWith(process.env.GOOGLE_DOMAIN)) {
            new Router().route(email);
        }

    else new OutboundRouter().route(email);
});
