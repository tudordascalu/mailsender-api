import * as express from 'express';
import { Logger } from '../output/logger';

const app = express();
const env = app.get('env').substring(0, 3);
const devConfig = require('../../src/config/config.dev.json');

let globalConfig = devConfig;
globalConfig.env = env;
if (env !== 'dev')
{
  const prodConfig = require('../../src/config/config.prod.json');
  for (let property in prodConfig)
  { globalConfig[property] = prodConfig[property]; }
}

process.env.TZ = globalConfig.timezone;

const whitelist =
[ 'http://localhost:4200', 'localhost' ];

globalConfig.corsOptions =
{ origin: whitelist, optionsSuccessStatus: 200 };

export const config = globalConfig;
export const keychain = require('../../keys/' + config.keychain);
