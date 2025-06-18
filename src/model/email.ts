import { ParsedMail, simpleParser } from 'mailparser';
import { Attachment } from './attachment';

export class Email {
    /** @todo more fields */
    constructor(
        public readonly to: string[],
        public readonly from: string[],
        public readonly subject?: string,
        public readonly body?: string,
        public readonly replyTo?: string,
        public readonly inReplyTo?: string,
        public readonly attachments?: Attachment[],
    ) {}

    /**
     * Convert raw email (string) to Email object
     *
     * @param text raw email text
     * @return Email
     * @throws InvalidInputException if given string is not a valid email
     */
    public static async fromString(text: string): Promise<Email> {
        let parsedEmail: ParsedMail;

        try {
            parsedEmail = await simpleParser(text);
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
