export class Logger {
    async info(text, ...args) {
        console.log(text, args);
        await this._info(text, args);
    }
    async _info(text, ...args) { }
    async error(text, ...args) {
        console.error(text, args);
        await this._error(text, args);
    }
    async _error(text, ...args) { }
    async fatal(text, ...args) {
        console.error(text, args);
        await this._fatal(text, args);
        process.exit(1);
    }
    async _fatal(text, ...args) { }
}
export var LoggerLevel;
(function (LoggerLevel) {
    LoggerLevel["INFO"] = "INFO";
    LoggerLevel["ERROR"] = "ERROR";
    LoggerLevel["FATAL"] = "FATAL";
})(LoggerLevel || (LoggerLevel = {}));
