import { appendFile } from 'fs';
import { Logger, LoggerLevel } from './logger';

export class DefaultLogger extends Logger {
    private constructor(
        private logFilePath: string = process.env.LOGS_PATH ?? './log.txt',
    ) {
        super();
    }

    private static instance: Logger;
    public static getInstance() {
        if (!this.instance) {
            this.instance = new DefaultLogger();
        }

        return this.instance;
    }

    private async writeToFile(
        level: LoggerLevel,
        text: string,
        ...args: any[]
    ) {
        return new Promise<void>((res, rej) => {
            appendFile(
                this.logFilePath,
                [
                    `${new Date().toISOString()}`,
                    `[${level}]`,
                    text,
                    ...args,
                ].join(' | '),
                (err) => {
                    if (!err) res();
                    else rej(err);
                },
            );
        });
    }

    protected override _info(text: string, ...args: any[]): Promise<void> {
        return this.writeToFile(LoggerLevel.INFO, text, ...args.map(a => a.toString()));
    }

    protected override _error(text: string, ...args: any[]): Promise<void> {
        return this.writeToFile(LoggerLevel.ERROR, text, ...args.map(a => a.toString()));
    }

    protected override _fatal(text: string, ...args: any[]): Promise<void> {
        return this.writeToFile(LoggerLevel.FATAL, text, ...args.map(a => a.toString()));
    }
}
