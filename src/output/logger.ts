
import * as expressWinston from 'express-winston';
import * as moment from 'moment-timezone';
// import * as morgan from "morgan"
import * as winston from 'winston';
import * as winstonRotator from 'winston-daily-rotate-file';
import { config } from '../config/config';

function formatter(options)
{
  const levelString = (options.level.toUpperCase() + '****').substring(0, 6);
  return '[' + options.timestamp() + '] ' + levelString + ' ' + (options.message ? options.message : ' ') +
  (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
}

function timestamp()
{
  const timeFormat = 'HH:mm:ss';
  return moment.tz(Date.now(), config.timezone).format(timeFormat);
}

function logger(color: Boolean): winston.Logger
{
  let transport = new (winston.transports.Console)(
  { timestamp: timestamp, formatter: formatter, colorize: color});

  return new (winston.Logger)
  ({ transports: [ transport ] });
}

function fileLogger(fileName: string, color: Boolean, level: string): winston.Logger
{
  const logPath = './logs/';
  const datePattern = 'yyyy-MM-dd.';

  let transport = new winstonRotator
  ({
    filename: logPath + fileName,
    datePattern: datePattern,
    prepend: true,
    level: level,
    json: false,
    timestamp: timestamp,
    formatter: formatter,
    colorize: color,
  });

  let logger = new (winston.Logger)
  ({ transports: [ transport ] });

  return logger;
}

const wLog = logger(false);
const sysLog = logger(false);
const fileLog = fileLogger('log', false, 'debug');

export class Logger
{
  static levels =
  {
    debug: 'debug',
    info: 'info',
    error: 'error',
  };

  public static configure(app)
  {
    const msgFormat = 'HTTP {{req.method}} {{req.path}} {{res.statusCode}} {{res.responseTime}}ms';
    const meta = false;

    // app.use(morgan(config.env))
    wLog.level = config.logLevel;
    sysLog.level = config.logLevel;
    wLog.exitOnError = false;

    app.use(expressWinston.logger(
    { winstonInstance: sysLog, msg: msgFormat, meta: false, level: 'debug' }));

    app.use(expressWinston.logger(
    { winstonInstance: fileLog, msg: msgFormat, meta: false, level: 'debug' }));
  }

  public static write(level: String, msg: any)
  {
    this.writeObject(level, msg, null);
  }

  public static writeObject(level: String, msg: any, obj: Object)
  {
    wLog.log(level, msg, obj);
    fileLog.log(level, msg, obj);
  }
}
