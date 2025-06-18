import { ParsedMail, simpleParser } from 'mailparser';
import { Attachment } from './attachment';

export class Email {
    /** @todo more fields */
    constructor(
        /** receiver is to whom we will actually send the email */
        public readonly receiver: string,
        /** to is To: header, display only */
        public readonly to: string[],
        public readonly from: string[],
        public readonly subject?: string,
        public readonly body?: string,
        public readonly replyTo?: string,
        public readonly inReplyTo?: string,
        public readonly attachments?: Attachment[],
        public readonly cc?: string[],
        public readonly bcc?: string[],
    ) {}

    /**
     * Convert raw email (string) to Email object
     *
     * @param text raw email text
     * @return Email
     * @throws InvalidInputException if given string is not a valid email
     */
    public static async fromString(text: string, receiver: string): Promise<Email> {
        let parsedEmail: ParsedMail;

        try {
            parsedEmail = await simpleParser(text, {
                // do not convert cid: attachments into base64-inlined
                // this conversion breaks images
                skipImageLinks: true,
            });
        } catch (e) {
            const err = e as Error;
            throw new InvalidInputException(err.message, text);
        }

        if (!parsedEmail.to) {
            throw new Error('Email not sent to anyone');
        }

        const receivers = new Array<string>; 
        if (!Array.isArray(parsedEmail.to)) {
            receivers.push(parsedEmail.to.text);
        } else {
            receivers.push(...parsedEmail.to.map(addr => addr.html));
        }

        if (!parsedEmail.from) {
            throw new Error('Email sent from nobody');
        }

        const ccs = new Array<string>;
        if (parsedEmail.cc) {
            if (!Array.isArray(parsedEmail.cc)) {
                ccs.push(parsedEmail.cc.text);
            } else {
                ccs.push(...parsedEmail.cc.map(addr => addr.text));
            }
        }

        const bccs = new Array<string>;
        if (parsedEmail.bcc) {
            if (!Array.isArray(parsedEmail.bcc)) {
                bccs.push(parsedEmail.bcc.text);
            } else {
                bccs.push(...parsedEmail.bcc.map(addr => addr.text));
            }
        }

        const senders = new Array<string>;
        if (!Array.isArray(parsedEmail.from)) {
            senders.push(parsedEmail.from.text);
        } else {
            senders.push(...parsedEmail.from.map(addr => addr.html));
        }

        let body = parsedEmail.text;
        if (parsedEmail.html !== false) {
            body = parsedEmail.html;
        }

        return new Email(
            receiver,
            receivers,
            senders,
            parsedEmail.subject,
            body,
            parsedEmail.replyTo?.value[0]?.address,
            parsedEmail.inReplyTo,
            parsedEmail.attachments.map(att => new Attachment(
                att.contentType,
                att.related ? 'inline' : 'attachment',
                att.filename,
                att.content,
                att.cid,
            )),
            ccs,
            bccs,
        );
    }

    toString() {
        return `${this.from} -> ${this.to} \n\n # ${this.subject} \n\n ${this.body}`;
    }
}

class InvalidInputException extends Error {
    constructor(
        message: string,
        public email: string,
    ) {
        super(message);
    }
}
