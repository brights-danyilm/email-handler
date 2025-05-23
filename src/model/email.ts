import { ParsedMail, simpleParser } from "mailparser";

export class Email {
    /** @todo more fields */
    constructor(
        public to: string[],
        public from: string[],
        public subject?: string,
        public body?: string,
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

        return new Email(
            receivers,
            senders,
            parsedEmail.subject,
            parsedEmail.text,
        );
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
