import * as aws from 'aws-sdk';
import * as schedule from 'node-schedule';
import { DataStore } from '../datastore/datastore';
import { Logger } from '../output/logger';
import { Email } from '../models/email';
import { HTTPResponse } from './../output/response';

aws.config.update({
    accessKeyId: "AKIAI4RQ3KB4IIAKCCKA",
    secretAccessKey: "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",
    region: 'us-east-1'
});
const ses = new aws.SES();
export class EmailScheduler
{
    public static scheduleEmails() {
        DataStore.local.schedule.find({}, {},  (err, dbData) =>{
            
        });
    }

    public static sendEmailBlock(email: Email, res: Response) {
        console.log(email);
      this.sendEmail(email, (err, mailData) =>
      {
        if (err) { HTTPResponse.error(res, 'could not send emails', 500); }
        else { HTTPResponse.success(res); }
      });
    };
        
    public static sendEmail(email: Email, completion: (err, data) => (void)) {
    DataStore.local.blacklist.find({ name: 'blacklist' }, {},
        (err, dbData) =>
        {
        if (dbData.length > 0)
        {
            const blacklist = dbData[0].emails;
            for (let i = 0; i < blacklist.length; i++)
            { email.removeRecipient(blacklist[i]); }
        }

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

}
