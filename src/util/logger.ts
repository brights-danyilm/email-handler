export class Logger {
    public async info(text: string, ...args: any[]) {
        console.log(text, args);
        await this._info(text, args);
    }
    protected async _info(text: string, ...args: any[]) {}

    public async error(text: string, ...args: any[]) {
        console.error(text, args);
        await this._error(text, args);
    }
    protected async _error(text: string, ...args: any[]) {}

    public async fatal(text: string, ...args: any[]) {
        console.error(text, args);
        await this._fatal(text, args);
        process.exit(1);
    }
    protected async _fatal(text: string, ...args: any[]) {}
}

export enum LoggerLevel {
    INFO = 'INFO',
    ERROR = 'ERROR',
    FATAL = 'FATAL',
}
