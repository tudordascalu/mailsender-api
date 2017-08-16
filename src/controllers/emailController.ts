import { Request, Response } from "express"
import * as uuid from "uuid/v4"
import { config } from "../config/config"
import { Email } from "./../models/email"
import { HTTPBody } from "../protocols/http"
import { DataStore } from "./../datastore/datastore"
import { HTTPResponse } from "./../output/response"
import { RecipientController } from "./recipientController"
import { RecipientList } from "./../models/recipient"
import * as schedule from "node-schedule"

// AWS
var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var ses = new AWS.SES();
var sns = new AWS.SNS();
var sqs = new AWS.SQS();

export class EmailController
{
  // req body: sender,recipients,message,subject
  public static sendEmail(req: Request, res: Response, next: Function)
  {
    const data = req.body;
    const user = res.locals.username;
    const requiredFields =
    [
      "sender", "recipients", "message",
      "subject",
    ];

    let missing
    if (missing = HTTPBody.missingFields(data, requiredFields))
    { return HTTPResponse.missing(res, missing, "body") }

    if (data.recipients.length === 0)
    { return HTTPResponse.error(res, "recipients field must not be empty", 400) }

    let email = Email.formatEmail(data);

    DataStore.local.blacklist.find({ name: 'blacklist' }, {},  // find the blacklist object inside blacklist collection
      (err, dbData) =>
      {
        let blacklistedEmails = dbData[0].emails;

        // remove the blacklisted destination addresses from the email that will be sent
        for(let i=0;i<email.Destination.ToAddresses.length;i++)
        {
          if(blacklistedEmails.indexOf(email.Destination.ToAddresses[i]) != -1)
          {
            email = Email.removeToAddress(email,i)
            i--;
          }
        }

        if(email.Destination.ToAddresses.length == 0) return HTTPResponse.json(res, { status: 'all recipients are blacklisted'})

        ses.sendEmail(email, function(err, data)
        {
          if (err)  // an error occurred
          {
           console.log(err)
           HTTPResponse.json(res, { status: 'nope'})
          }
          else  // successful response
          {
          HTTPResponse.json(res, { status: 'ok'})
          }
        });
      }
    )
  }


  // req body: sender,listID,message,subject
  public static sendEmailToList(req: Request, res: Response, next: Function)
  {
    const data = req.body;
    const user = res.locals.username;
    const requiredFields =
    [
      "sender", "listID", "message",
      "subject",
    ];

    let missing
    if (missing = HTTPBody.missingFields(data, requiredFields))
    { return HTTPResponse.missing(res, missing, "body") }

    DataStore.local.recipients.find({ id: req.body.listID, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, "recipients lists does not exist or you cannot access it", 400) }
        const list = RecipientList.fromDatastore(dbData[0])
        data.recipients = list.recipients;

        EmailController.sendEmail(req,res,next);
      },
    )
  }


  public static listTopics(req: Request, res: Response, next: Function)
  {
    sns.listTopics({}, function(err, data)
    {
      if (err)  // an error occurred
      {
        console.log(err)
        HTTPResponse.json(res, { status: 'nope'})
      }
      else  // successful response
      {
        console.log(data)
       HTTPResponse.json(res, { status: 'ok', topics: data.Topics})
      }
    });
  }


  public static listQueues(req: Request, res: Response, next: Function)
  {
    sqs.listQueues({}, function(err, data)
    {
      if (err)  // an error occurred
      {
        console.log(err)
        HTTPResponse.json(res, { status: 'nope'})
      }
      else  // successful response
      {
        console.log(data)
       HTTPResponse.json(res, { status: 'ok', queues: data.QueueUrls})
      }
    });
  }


  public static handleComplaintsQueue()
  {
    const queueName = 'ses_complaints_queue';
    let QueueUrl = ''

    sqs.getQueueUrl({QueueName: queueName}, function(err, data)
    {
      if (err)  // an error occurred
      {
        console.log(err)
        console.log('failed to find the complaints queue')
      }
      else
      {
        QueueUrl = data.QueueUrl
        let params = {
          QueueUrl: QueueUrl,
          // MaxNumberOfMessages: 10,
        };
        sqs.receiveMessage(params, function(err, data)
        {
          if (err)  // an error occurred
          {
            console.log(err)
            console.log('failed to receive message from complaints queue')
          }
          else  // successful response
          {
            if(!data.Messages)  // no message in the queue
            {
              console.log('no messages in the queue')
              return EmailController.scheduleTask()
            }
            else
            {
              let complainedRecipients = []
              const body = JSON.parse(data.Messages[0].Body)
              const jsonData = JSON.parse(body.Message).complaint.complainedRecipients
              const ReceiptHandle = data.Messages[0].ReceiptHandle;

              for(let j=0;j<jsonData.length;j++) // go through each email address from complainedRecipients
              {
                if(complainedRecipients.indexOf(jsonData[j].emailAddress) == -1)
                {
                  complainedRecipients.push(jsonData[j].emailAddress)
                }
              }

              EmailController.findBlacklist(complainedRecipients, () => {
                EmailController.deleteMessageFromQueue(QueueUrl,ReceiptHandle,() => {
                  return EmailController.scheduleTask()
                })
              })
            }
          }
        })
      }
    })
  }


  private static findBlacklist(complainedRecipients, callback){
    DataStore.local.blacklist.find({ name: 'blacklist' }, {},  // find the blacklist object inside blacklist collection
      (err, dbData) =>
      {
        if(err) console.log("error finding the blacklist in db")

        if (dbData.length === 0) // no blacklist object found => create one from scratch
        {
          EmailController.addOrUpdateBlacklist(complainedRecipients)
        }
        else
        {
          let emails = dbData[0].emails
          let changed = false

          for(let i=0;i<complainedRecipients.length;i++)
          {
            if(emails.indexOf(complainedRecipients[i]) == -1)
            {
              emails.push(complainedRecipients[i])
              changed = true
            }
          }

          if(changed)
          {
            EmailController.addOrUpdateBlacklist(emails)
          }

          else console.log('blacklist found, but nothing changed')
        }
        callback()
      }
    )
  }


  private static addOrUpdateBlacklist(emails){
    DataStore.local.blacklist.addOrUpdate({ name: 'blacklist' }, { name: 'blacklist', emails : emails }, {},
      (err, dbData) =>
      {
        if(err) console.log("error updating the blacklist in db")

        else console.log("success updating the emails from blacklist")
      },
    )
  }


  private static deleteMessageFromQueue(QueueUrl,ReceiptHandle, callback){
    let params2 = {
      QueueUrl: QueueUrl,
      ReceiptHandle: ReceiptHandle /* required */
    };
    sqs.deleteMessage(params2, function(err, data) {
      if (err)  // an error occurred
      {
        console.log(err)
        console.log('failed to delete message from complaints queue')
      }
      else  // successful response
      {
        console.log('message deleted from complaints queue')
      }
      callback()
    });
  }


  private static scheduleTask()
  {
    const delay = 5
    const scheduledTime = new Date((new Date()).getTime() + delay * 1000)

    schedule.scheduleJob(scheduledTime, () =>
    { EmailController.handleComplaintsQueue() })
  }
}
