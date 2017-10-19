import { Request, Response } from 'express';
import * as uuid from 'uuid/v4';
import { config } from '../config/config';
import { HTTPBody, HTTPRequest } from '../protocols/http';
import { DataStore } from './../datastore/datastore';
import { HTTPResponse } from './../output/response';
import { Campaign } from './../models/campaign';
import { Schedule } from './../models/schedule';
import { Email } from './../models/email';
import * as nodeschedule from 'node-schedule';
import { EmailScheduler } from '../handlers/emailScheduler';

export class CampaignController
{
    public static createCampaign(req: Request, res: Response, next: Function){
        const body = req.body;
        const user = res.locals.username;
        const requiredFields = [ 'body', 'scheduledDate', 'listID' ];

        let missing;
        if (missing = HTTPBody.missingFields(body, requiredFields))
        { return HTTPResponse.missing(res, missing, 'body'); }
        
        if (body.body === null)
        { return HTTPResponse.error(res, 'body must not be empty', 400); }

        body.id = uuid();
        body.owners = [user];
        const campaign = Campaign.fromRequest(body);
        DataStore.local.campaigns.addOrUpdate({ id: campaign.id }, campaign.dbData, {},
            (err, dbData) =>
            {   
              // Add campaign schedule in db
              if(campaign.scheduledDate) {
                // Schedule campaign
                if(!Date.parse(campaign.scheduledDate)) {
                  return HTTPResponse.error(res, 'scheduled date must be valid', 400);
                }

                EmailScheduler.scheduleCampaign(campaign, 
                  (errSchedule, dataSchedule)=>{
                    if(errSchedule) return HTTPResponse.error(res, 'error scheduling the campaign in db', 400);
                    return HTTPResponse.json(res, {schedulerID: dataSchedule.id, campaignID: dbData.id});
                });
              }
              else {
                // Campaign not scheduled
                if (err) return HTTPResponse.error(res, 'error creating the campaign in db', 400);
                return HTTPResponse.json(res, dbData.id);
              }
            },
        );

    }

    public static getAllCampaigns(req: Request, res: Response, next: Function)
    {
      const user = res.locals.username;
  
      DataStore.local.campaigns.find({ owners: user }, {},
        (err, dbData) =>
        {
          if (err || dbData.length === 0) { return HTTPResponse.json(res, []); }
          let userCampaigns = [];
          for (let i = 0; i < dbData.length; i++)
          {
            const campaign = Campaign.fromDatastore(dbData[i]);

            userCampaigns.push(campaign.responseData);
          }
          HTTPResponse.json(res, userCampaigns);
        },
      );
    }

    public static getSpecificCampaign(req: Request, res: Response, next: Function)
    {
      const user = res.locals.username;
      DataStore.local.campaigns.find({ id: req.params.id , owners: user}, {},
        (err, dbData) =>
        {
          if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }
          const list = Campaign.fromDatastore(dbData[0]);
          HTTPResponse.json(res, list.responseData);
        },
      );
    }

    public static deleteCampaign(req: Request, res: Response, next: Function)
    {
      const user = res.locals.username;
  
      DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
        (err, dbData) =>
        {
          if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign do not exist or you cannot access it', 400); }
          const campaign = dbData[0];
  
          if (campaign.owners.length === 1)
          {
            DataStore.local.campaigns.remove({ id: campaign.id }, {},
              (err, dbData) =>
              {
                if (err) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }
                HTTPResponse.success(res);
              },
            );
          }
          else
          {
            for (let i = 0; i < campaign.owners.length; i++)
            {
              if (campaign.owners[i] === user) { campaign.owners.splice(i, 1); }
              break;
            }
            DataStore.local.campaigns.addOrUpdate({ id: campaign.id }, campaign, {},
              (err, dbData) =>
              {
                if (err || dbData.length === 0) { return HTTPResponse.error(res, 'error updating the campaign in db', 400); }
                HTTPResponse.success(res);
              },
            );
          }
        },
      );
    }

    public static sendCampaign(req: Request, res: Response, next: Function)
    {
      const user = res.locals.username;
      DataStore.local.campaigns.find({ id: req.params.id , owners: user}, {},
        (err, dbData) =>{
          if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }
          
          const body = dbData[0];
          console.log(body);
          if (body['recipients'])
          {
            if (body.recipients.length === 0)
            { return HTTPResponse.error(res, 'recipients field must not be empty', 400); }
      
            const email = new Email(body);
            EmailScheduler.sendEmailBlock(email, (errEmail, dataEmail) =>{
              if(errEmail) { return HTTPResponse.error(res, errEmail, 400); }
              return HTTPResponse.success(res);
            });
          }
          else if (body['listID'])
          {
            DataStore.local.recipients.find({ id: body.listID }, {},
              (err, dbData) =>
              {
                if (err || dbData.length === 0) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }
                const list = dbData[0].recipients;
                body.recipients = list;
      
                const email = new Email(body);
                EmailScheduler.sendEmailBlock(email, (errEmail, dataEmail) =>{
                  if(errEmail) { return HTTPResponse.error(res, errEmail, 400); }
                  return HTTPResponse.success(res);
                });
              },
            );
          }
        });
    }
/*
    public static cancelSchedule(req: Request, res: Response, next: Function)
    {
      const user = res.locals.username;
      DataStore.local.schedule.find({ id: req.params.id }, {},
        (err, dbData) =>
        {   
          if (err || dbData.length === 0) { return HTTPResponse.error(res, 'could not cancel job', 400); }
          
          const schedule = dbData[0];
          nodeschedule.id.cancel();
          return HTTPResponse.success(res);
        },
      );
    }
*/
    public static updateCampaign(req: Request, res: Response, next: Function)
    {
      const user = res.locals.username;
      const body = req.body;
      const requiredFields = [ 'body', 'scheduledDate', 'listID' ];
      
      let missing;
      if (missing = HTTPBody.missingFields(body, requiredFields))
      { return HTTPResponse.missing(res, missing, 'body'); }
      
      DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
        (err, dbData) =>
        {
          if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }
          
          let campaign = new Campaign(dbData[0]);
          campaign.updateCampaign(body);  

          DataStore.local.campaigns.addOrUpdate({ id: campaign.id }, campaign, {},
            (err, dbData) =>
            {
              if (err) { return HTTPResponse.error(res, 'error updating the campaign in db', 400); }
              
              if(body.scheduledDate){

                let rescheduleTime = null;
                if(Date.parse(body.scheduledDate)){
                  rescheduleTime = Date.parse(body.scheduledDate);
                } 
                
                DataStore.local.schedule.find({ id: campaign.id }, {},
                  (err, dbData) =>
                  {   
                    if (err || dbData.length === 0) { return HTTPResponse.error(res, 'could not reschedule/cancel job', 400); }
                    
                    let schedule = new Schedule(dbData[0]);
                    const job = EmailScheduler.rescheduleCampaign(schedule.scheduleName, rescheduleTime);
                    
                    if(job) {
                      schedule.scheduleName = job.name;
                      EmailScheduler.updateScheduleDB(schedule);
                      return HTTPResponse.json({"tudor":"tudor"}, 200);
                    } 
                    EmailScheduler.deleteScheduleDB(schedule);
                    return HTTPResponse.json({"tudor":"tudor"}, 200);
                  },
                );
              }
              else {
                campaign = Campaign.fromDatastore(dbData[0]);
                return HTTPResponse.json(res, campaign.responseData);    
              }
            },
          );
        },
      );
    }
}
/*
function scheduleCampaign(campaign: Campaign, completion: (err, data) => (void)) {
  // Schedule campaign

  const schedule = Schedule.fromCampaign(campaign);
  //const scheduledTime = Date.parse(campaign.scheduledDate);
  const scheduledTime = new Date((new Date()).getTime() + 60000);
  var job = nodeschedule.scheduleJob(scheduledTime, ()=>{
    sendCampaign(campaign,
      (errSchedule, dataSchedule)=>{
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

function sendCampaign(campaign: Campaign, completion: (err, data) => (void)){

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
*/