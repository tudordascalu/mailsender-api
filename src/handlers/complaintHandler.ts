import * as aws from 'aws-sdk';
import * as schedule from 'node-schedule';
import { DataStore } from '../datastore/datastore';
import { Logger } from '../output/logger';

const sns = new aws.SNS();
const sqs = new aws.SQS();
const queueName = 'ses_complaints_queue';

export class ComplaintHandler
{
  public static handleComplaints()
  {
    sqs.getQueueUrl({ QueueName: queueName }, (err, data) =>
    {
      if (err)
      {
        Logger.write(Logger.levels.error, `Failed to connect to complaints queue: ${ err }`);
        return ComplaintHandler.scheduleTask();
      }

      const queueUrl = data.QueueUrl;
      const params = { QueueUrl: queueUrl }; // MaxNumberOfMessages: 10,
      sqs.receiveMessage(params, (err2, data2) =>
      {
        if (err || !data2.Messages)
        {
          Logger.write(Logger.levels.error, `Failed to find any complaints: ${ err }`);
          return ComplaintHandler.scheduleTask();
        }

        let complainedRecipients = [];
        const body = JSON.parse(data2.Messages[0].Body);
        const complainers = JSON.parse(body.Message).complaint.complainedRecipients;
        const receiptHandle = data2.Messages[0].ReceiptHandle;

        for (let j = 0; j < complainers.length; j++)
        {
          const address = complainers[j].emailAddress;
          if (complainedRecipients.indexOf(address) >= 0) { continue; }
          { complainedRecipients.push(address); }
        }

        ComplaintHandler.updateBlacklist(complainedRecipients, () => {
          ComplaintHandler.deleteMessageFromQueue(queueUrl, receiptHandle, () => {
            return ComplaintHandler.scheduleTask();
          });
        });
      });
    });
  }

  private static updateBlacklist(emails: string[], callback: () => (void)) {

    DataStore.local.blacklist.find({ name: 'blacklist' }, {},
    (err, dbData) =>
    {
      if (err) { Logger.write(Logger.levels.error, `could not find blacklist: ${ err }`); }

      let blacklist = emails;
      if (dbData.length === 1)
      { blacklist = blacklist.concat(dbData[0].emails); }

      blacklist = blacklist.filter((elem, index, self) =>
      { return index === self.indexOf(elem); });

      DataStore.local.blacklist.addOrUpdate({ name: 'blacklist' }, { emails : emails }, {}, (err2, dbData2) =>
      { callback(); });
    });
  }


  private static deleteMessageFromQueue(queueUrl: string, receiptHandle: string, callback?: (err, data) => (void)) {
    let params = { QueueUrl: queueUrl, ReceiptHandle: receiptHandle };
    sqs.deleteMessage(params, (err, data) =>
    {
      if (err)
      { Logger.write(Logger.levels.error, `failed to delete message from complaints queue: ${ err }`); }
    });
  }


  private static scheduleTask()
  {
    const delay = 5 * 60;
    const scheduledTime = new Date((new Date()).getTime() + delay * 1000);

    schedule.scheduleJob(scheduledTime, () =>
    { ComplaintHandler.handleComplaints(); });
  }
}
