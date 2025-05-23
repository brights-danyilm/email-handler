import { Email } from '../model/email';

export interface Sender {
    send(email: Email): Promise<SenderResult>
}

export class SenderResult {
    public get success() {
        return this._success;
    }

    private _success: boolean;

    constructor(input: SenderResultInput) {
        this._success = input.success;
    }

    public with(input: Partial<SenderResultInput>): SenderResult {
        return new SenderResult({
            success: input.success ?? this.success,
        });
    }
}

type SenderResultInput = {
    success: boolean,
}
