import { Email } from '../model/email';

export interface Filter {
    process(email: Email): Promise<boolean>;
}

export class DummyFilter implements Filter {
    public async process(email: Email): Promise<boolean> {
        return !!email.body && email.body.includes('PASS');
    }
}
