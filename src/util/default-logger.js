import { appendFile } from 'fs';
import { Logger, LoggerLevel } from './logger';
export class DefaultLogger extends Logger {
    constructor(logFilePath) {
        super();
        this.logFilePath = logFilePath;
    }
    async writeToFile(level, text, ...args) {
        return new Promise((res, rej) => {
            appendFile(this.logFilePath, [
                `${new Date().toISOString()}`,
                `[${level}]`,
                text,
                ...args,
            ].join(' | '), (err) => {
                if (!err)
                    res();
                else
                    rej(err);
            });
        });
    }
    _info(text, ...args) {
        return this.writeToFile(LoggerLevel.INFO, text, args);
    }
    _error(text, ...args) {
        return this.writeToFile(LoggerLevel.ERROR, text, args);
    }
    _fatal(text, ...args) {
        return this.writeToFile(LoggerLevel.FATAL, text, args);
    }
}
