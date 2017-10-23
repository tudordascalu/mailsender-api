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
                if(!Date.parse(campaign.scheduledDate) || Date.parse(campaign.scheduledDate) < Date.now()) {
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

    public static updateCampaign(req: Request, res: Response, next: Function)
    {
      const user = res.locals.username;
      const body = req.body;
      const requiredFields = [ 'body', 'scheduledDate', 'listID' ];
    
      if (HTTPBody.hasAnyRequiredFields(body, requiredFields))
      { return HTTPResponse.missing(res, [ 'body', 'scheduledDate', 'listID' ], 'body'); }
      
      DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
        (err, dbData) =>
        {
          if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }
          
          let campaign = new Campaign(dbData[0]);
          campaign.updateCampaign(body);
          if(body.scheduledDate) {
            EmailScheduler.cancelCampaignSending(campaign);
          }
          
          EmailScheduler.updateCampaignDB(campaign, (errUpdate, resUpdate) => {
            if(errUpdate) {  return HTTPResponse.error(res, 'campaign could not be updated', 400); }

            if(body.scheduledDate) {
              if(Date.parse(body.scheduledDate) > Date.now()) {
                EmailScheduler.rescheduleCampaign(campaign);
              } else {
                console.log("Date is not valid");
              }
            }
          });
          return HTTPResponse.json(res, campaign.responseData); 
        });
    }
}
   