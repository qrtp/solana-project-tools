const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

// @ts-ignore
const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const createLoggerWithLabel = function (loggerName: string) {
    return createLogger({
        format: combine(
            label({ label: loggerName }),
            timestamp(),
            myFormat
        ),
        transports: [new transports.Console()]
    });
}

module.exports = createLoggerWithLabel