import { Request, Response } from 'express';
import * as uuid from 'uuid/v4';
import { config } from '../config/config';
import { HTTPBody } from '../protocols/http';
import { DataStore } from './../datastore/datastore';
import { HTTPResponse } from './../output/response';
import { Campaign } from './../models/campaign';

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
              if (err) return HTTPResponse.error(res, 'error creating the campaign in db', 400);
              else HTTPResponse.json(res, dbData.id);
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

}