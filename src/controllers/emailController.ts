import * as aws from 'aws-sdk';
import { Request, Response } from 'express';
import * as uuid from 'uuid/v4';
import { config } from '../config/config';
import { Logger } from '../output/logger';
import { HTTPBody } from '../protocols/http';
import { DataStore } from './../datastore/datastore';
import { Email } from './../models/email';
import { RecipientList } from './../models/recipient';
import { HTTPResponse } from './../output/response';
import { RecipientController } from './recipientController';

// const aws = require('aws-sdk');
aws.config.update({region: 'us-east-1'});
const ses = new aws.SES();

export class EmailController
{
  // req body: sender,recipients,message,subject
  public static sendEmail(req: Request, res: Response, next: Function)
  {
    const data = req.body;
    const user = res.locals.username;
    const requiredFields = [ 'sender', 'recipients', 'body', 'subject' ];

    let missing;
    if (missing = HTTPBody.missingFields(data, requiredFields))
    { return HTTPResponse.missing(res, missing, 'body'); }

    if (data.recipients.length === 0)
    { return HTTPResponse.error(res, 'recipients field must not be empty', 400); }

    const email = new Email(data);
    sendEmail(email, (err, mailData) =>
    {
      if (err) { HTTPResponse.error(res, 'could not send emails', 500); }
      else { HTTPResponse.success(res); }
    });
  }

  public static sendEmailToList(req: Request, res: Response, next: Function)
  {
    const data = req.body;
    const user = res.locals.username;
    const requiredFields = [ 'sender', 'listID', 'body', 'subject' ];

    let missing;
    if (missing = HTTPBody.missingFields(data, requiredFields))
    { return HTTPResponse.missing(res, missing, 'body'); }

    DataStore.local.recipients.find({ id: req.body.listID, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }
        const list = dbData[0].recipients;
        data.recipients = list;

        const email = new Email(data);
        sendEmail(email, (err, mailData) =>
        {
          if (err) { HTTPResponse.error(res, err, 500); }
          else { HTTPResponse.success(res); }
        });
      },
    );
  }

  // public static listTopics(req: Request, res: Response, next: Function)
  // {
  //   sns.listTopics({}, function(err, data)
  //   {
  //     if (err)  // an error occurred
  //     {
  //       console.log(err);
  //       HTTPResponse.json(res, { status: 'nope'});
  //     }
  //     else  // successful response
  //     {
  //       console.log(data);
  //      HTTPResponse.json(res, { status: 'ok', topics: data.Topics});
  //     }
  //   });
  // }


  // public static listQueues(req: Request, res: Response, next: Function)
  // {
  //   sqs.listQueues({}, function(err, data)
  //   {
  //     if (err)  // an error occurred
  //     {
  //       console.log(err);
  //       HTTPResponse.json(res, { status: 'nope'});
  //     }
  //     else  // successful response
  //     {
  //       console.log(data);
  //       HTTPResponse.json(res, { status: 'ok', queues: data.QueueUrls});
  //     }
  //   });
  // }
}

function sendEmail(email: Email, completion: (err, data) => (void))
{
  DataStore.local.blacklist.find({ name: 'blacklist' }, {},
    (err, dbData) =>
    {
      const blacklist = dbData[0].emails;
      for (let i = 0; i < blacklist.length; i++)
      { email.removeRecipient(blacklist[i]); }

      if (email.recipients.length === 0)
      { return completion('all recipients are blacklisted', null); }

      ses.sendEmail(email.request, (err, data) =>
      {
        if (err)
        {
          Logger.write(Logger.levels.error, err);
          completion('failed to send emails', null);
        }
        else { completion(null, data); }
      });
    },
  );
}
