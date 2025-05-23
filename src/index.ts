import { readFileSync } from 'fs';
import { config } from 'dotenv';

import { Router } from './handler/router';
import { Email } from './model/email';
import { DefaultLogger } from './util/default-logger';

config();

const logger = new DefaultLogger(process.env.LOGS_PATH ?? './logs.txt');

const emailBody = readFileSync(0).toString();

if (!emailBody) {
    logger.fatal('No email body passed');
}

Email.fromString(emailBody).then(email => 
    new Router(logger).route(email),
);
