import * as aws from 'aws-sdk';
import * as nodeschedule from 'node-schedule';
import { DataStore } from '../datastore/datastore';
import { Logger } from '../output/logger';
import { Email } from '../models/email';
import { Schedule } from '../models/schedule';
import { Campaign } from '../models/campaign';

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

    public static sendEmailBlock(email: Email, completion: (err, data) => (void)) {
      this.sendEmail(email, (err, mailData) =>
      {
        if (err) { return completion('could not send emails', null); }
        else { return completion(null, 'successfuly sent emails'); }
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

    // public static rescheduleCampaign(scheduleName, rescheduleTime = null){
        
    //     if(nodeschedule.scheduledJobs[scheduleName]){
    //         console.log("da");
    //         nodeschedule.scheduledJobs[scheduleName].cancel();
    //     }

    //     if(!rescheduleTime){
    //         console.log('Campaign sending was canceled')
    //         return null;
    //     }

    //     const job = nodeschedule.scheduleJob(rescheduleTime, ()=>{});
    //     console.log(job);
    //     return job;
    // }

    public static rescheduleCampaign(campaign){
        const rescheduleTime = Date.parse(campaign.scheduledDate);
        this.deleteScheduleDB(campaign);
        // const job = nodeschedule.scheduleJob(rescheduleTime, ()=>{});
        // const schedule = Schedule.fromCampaign(campaign);
        // schedule.scheduleName = job.name;
        this.scheduleCampaign(campaign, (err, data) => {
            if(err) { console.log("could not schedule campaign"); }
            else{
                console.log("campaign was scheduled");
            }
        })
        // this.updateScheduleDB(schedule);
    }

    public static updateScheduleDB(schedule: Schedule) {
        DataStore.local.schedule.addOrUpdate({ id: schedule.id }, schedule, {},
            (err, dbData) =>{
                if(err )  {
                    console.log("could not update campaign in schedule collection"); 
                    return;
                };
                console.log("Campaign updated in schedule db")
            },
        );
    }

    public static updateCampaignDB(campaign: Campaign, completion: (err, data) => (void)) {
        DataStore.local.campaigns.addOrUpdate({ id: campaign.id }, campaign, {},
            (err, dbData) =>{
                if(err)  {
                    return completion("Campaign was not updated", null);
                };
                return completion(null, "Campaign updated")
            },
        );
    }

    public static deleteScheduleDB(campaign: Campaign) {
        DataStore.local.schedule.remove({ id: campaign.id }, {},
            (err, dbData) =>{
                if(err )  {
                    console.log("could not remove campaign in schedule collection"); 
                    return;
                };
                console.log("Campaign removed in schedule db")
            },
        );
    }

    public static scheduleCampaign(campaign: Campaign, completion: (err, data) => (void)) {
        // Schedule campaign
      
        const schedule = Schedule.fromCampaign(campaign);
        const scheduledTime = Date.parse(campaign.scheduledDate);
        //const scheduledTime = new Date((new Date()).getTime() + 60000);
        var job = nodeschedule.scheduleJob(scheduledTime, ()=>{
            this.sendCampaign(campaign,
            (errSchedule, dataSchedule)=> {
              if(errSchedule) console.log(errSchedule);
              else console.log('scheduled email sending');
            }) 
        });
      
        schedule.scheduleName = job.name;
      
        DataStore.local.schedule.addOrUpdate({ id: schedule.id }, schedule.dbData, {}, 
        (errSchedule, dbDataSchedule)=> 
        { 
          if(errSchedule) {
            console.log("123");
            return completion(errSchedule, null);
          }
          else {
            console.log("campaign scheduled");      
            return completion(null, dbDataSchedule);
          }
        })
      }
      
      public static sendCampaign(campaign: Campaign, completion: (err, data) => (void)){
      
        let body:any = campaign;
        console.log(body);
        if (body['recipients']) {
          if (body.recipients.length === 0) { return completion('recipients field must not be empty', null); }
      
          const email = new Email(body);
          EmailScheduler.sendEmailBlock(email, (errEmail, dataEmail) => {
            if(errEmail) { return completion(errEmail, dataEmail) }
            return completion(null, dataEmail);
          });
        }
        else if (body['listID'])
        {
          DataStore.local.recipients.find({ id: body.listID }, {},
            (err, dbData) =>
            {
              if (err || dbData.length === 0) { return completion('recipients lists does not exist or you cannot access it', dbData)}
              const list = dbData[0].recipients;
              body.recipients = list;
      
              const email = new Email(body);
              EmailScheduler.sendEmailBlock(email, (errEmail, dataEmail) =>{
                if(errEmail) { return completion(errEmail, dataEmail) }
                return completion(null, dataEmail);
              });
            },
          );
        }
      }
      
}
