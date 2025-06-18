import { createTransport, Transporter } from 'nodemailer';
import { Email } from '../model/email';
import { Sender, SenderResult } from './sender';
import { Logger } from '../util/logger';

export class SenderOffice365 implements Sender {
    private transport: Transporter;

    constructor(
        private logger: Logger,
    ) {
        this.transport = createTransport({
            host: process.env.SMTP_O365_HOST,
            port: parseInt(process.env.SMTP_O365_PORT),
            secure: false,
            auth: undefined,
        });
    }
    
    async send(email: Email): Promise<SenderResult> {
        try {
            await this.transport.sendMail({
                to: email.to,
                from: email.from.join(', '),
                sender: email.from[0],
                subject: email.subject,
                text: email.body,
            });

            await this.logger.info('Email sent', email);
        } catch (e) {
            this.logger.error('Error while sending email', e, email);
            return new SenderResult({ success: false });
        }

        return new SenderResult({
            success: true,
        });
    }
}
