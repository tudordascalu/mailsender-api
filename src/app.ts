import * as express from 'express';
import * as fs from 'fs';
import * as schedule from 'node-schedule';
import * as path from 'path';
import { config } from './config/config';
import { DataStore } from './datastore/datastore';
import { ComplaintHandler } from './handlers/complaintHandler';
import { Logger } from './output/logger';
import { Router } from './routing/router';

/*****************
 * Configuration *
 *****************/

/***********
 * Startup *
 ***********/

initializeApp();
// scheduleTasks()

/************
 * Routines *
 ************/

/* Start App */
function initializeApp()
{
  const app = express();
  console.log('\n');
  if (DataStore.local.connection == null)
  { return console.log('Could not connect to database'); }

  Logger.configure(app);
  configureParsers(app);
  Router.configure(app);

  Logger.write(Logger.levels.info, `Started server with environment: ${ config.env }`);
  module.exports = app;
}

/* Schedule tasks */
function scheduleTasks()
{
  const delay = 5;
  const scheduledTime = new Date((new Date()).getTime() + delay * 1000);

  schedule.scheduleJob(scheduledTime, () =>
    { ComplaintHandler.handleComplaints(); });
}

/* Configure parsers */
function configureParsers(app: any)
{
  const cookieParser = require('cookie-parser');
  const bodyParser = require('body-parser');

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.text());
  app.use(cookieParser());
}

// function configurePaths(app: any)
// {
//   app.set("views", path.join(__dirname, "../views"))
//   app.set("view engine", "pug")
//   app.use(express.static(path.join(__dirname, "public")))
// }
