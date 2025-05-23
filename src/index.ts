import { Router } from './handler/router';
import { Email } from './model/email';
import { DefaultLogger } from './util/default-logger';

const logger = new DefaultLogger(process.env.LOGS_PATH ?? './logs.txt');
const [_, emailBody] = process.argv;
if (!emailBody) {
    logger.fatal('No email body passed');
}

Email.fromString(emailBody).then(email => 
    new Router(logger).route(email),
);
