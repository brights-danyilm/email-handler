import { createTransport, Transporter } from 'nodemailer';
import { Email } from '../model/email';
import { Sender, SenderResult } from './sender';
import { Logger } from '../util/logger';

export class SenderOutbound implements Sender {
    private transport: Transporter;

    constructor(
        private logger: Logger,
    ) {
        this.transport = createTransport({
            // TODO: maybe we will use services like mailjet in future?
            host: '127.0.0.1',
            port: 25,
            secure: false,
            tls: {
                rejectUnauthorized: false,
            },
            auth: undefined,
        });
    }
    
    async send(email: Email): Promise<SenderResult> {
        try {
            await this.transport.sendMail({
                to: email.receiver,
                from: email.from.join(', '),
                sender: email.from[0],
                subject: email.subject,
                html: email.body,
                headers: {
                    'X-Node-Processed': 'true',
                    // 'Reply-To': email.replyTo,
                    // 'In-Reply-To': email.inReplyTo,
                    'To': email.to.join(', '),
                },
                attachments: email.attachments?.map(att => ({
                    filename: att.filename,
                    content: att.content,
                    contentType: att.mimeType,
                    contentDisposition: att.contentDisposition,
                    cid: att.cid,
                })),
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

