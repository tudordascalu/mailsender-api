import * as AWS from 'aws-sdk';
import { Request, Response } from 'express';
import * as fs from 'file-system';
import * as nodeschedule from 'node-schedule';
import * as uuid from 'uuid/v4';
import { config } from '../config/config';
import { EmailScheduler } from '../handlers/emailScheduler';
import { HTTPBody, HTTPRequest } from '../protocols/http';
import { DataStore } from './../datastore/datastore';
import { Campaign } from './../models/campaign';
import { Email } from './../models/email';
import { Schedule } from './../models/schedule';
import { HTTPResponse } from './../output/response';

const s3 = new AWS.S3();
const bucket = 'zigna-emarketer';

export class CampaignController
{
  public static createCampaign(req: Request, res: Response, next: Function)
  {
    const body = req.body;
    const user = res.locals.user.realtor;
    const requiredFields = ['body', 'listID', 'subject'];

    let missing;
    if (missing = HTTPBody.missingFields(body, requiredFields))
    { return HTTPResponse.missing(res, missing, 'body'); }

    if (body.body === null)
    { return HTTPResponse.error(res, 'body must not be empty', 400); }

    // Check if list exists
    DataStore.local.recipients.find({ id: body.listID }, {},
      (err, dbList) =>
      {
        if (err || dbList.length < 1) return HTTPResponse.error(res, 'error finding a list with the specified id', 404);

        body.id = uuid();
        body.owners = [user];
        const campaign = Campaign.fromRequest(body);

        // Check for the scheduledDate
        let scheduleFlag = false;
        if (campaign.scheduledDate)
        {
          if (!Date.parse(campaign.scheduledDate) || Date.parse(campaign.scheduledDate) < Date.now())
          { return HTTPResponse.error(res, 'scheduled date must be valid', 422); }

          scheduleFlag = true;
        }

        // Create campaign
        DataStore.local.campaigns.addOrUpdate({ id: campaign.id }, campaign.dbData, {},
          (err, dbData) =>
          {
            if (err) return HTTPResponse.error(res, 'error creating the campaign', 500);

            if (scheduleFlag)
            {
              EmailScheduler.scheduleCampaign(campaign,
                (errSchedule, dataSchedule) =>
                {
                  if (errSchedule) return HTTPResponse.error(res, 'error scheduling the campaign in db', 400);
                  return HTTPResponse.json(res, { message: 'Campaign created and scheduled for sending', campaignID: dbData.id });
                },
              );
            }
            else { return HTTPResponse.json(res, { message: 'Campaign created', campaignID: dbData.id }); }
          },
        );
      },
    );
  }

  public static getAllCampaigns(req: Request, res: Response, next: Function)
  {
    const user = res.locals.user.realtor;

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
    const user = res.locals.user.realtor;

    DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 404); }

        const campaign = Campaign.fromDatastore(dbData[0]);
        HTTPResponse.json(res, campaign.responseData);
      },
    );
  }

  public static deleteCampaign(req: Request, res: Response, next: Function)
  {
    const user = res.locals.user.realtor;

    DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0)
        { return HTTPResponse.error(res, 'campaign do not exist or you cannot access it', 400); }

        const campaign = dbData[0];
        DataStore.local.campaigns.remove({ id: campaign.id }, {},
          (err, dbData) =>
          {
            if (err) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }
            HTTPResponse.success(res);
          },
        );
      },
    );
  }

  public static sendCampaign(req: Request, res: Response, next: Function)
  {
    const user = res.locals.user.realtor;

    DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }

        const body = dbData[0];

        if (body['recipients'])
        {
          if (body.recipients.length === 0)
          { return HTTPResponse.error(res, 'recipients field must not be empty', 400); }

          const email = new Email(body);
          EmailScheduler.sendEmailBlock(email, (errEmail, dataEmail) =>
          {
            if (errEmail) { return HTTPResponse.error(res, errEmail, 400); }
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

              EmailScheduler.sendEmailBlock(email, (errEmail, dataEmail) =>
              {
                if (errEmail) { return HTTPResponse.error(res, errEmail, 400); }
                return HTTPResponse.success(res);
              });
            },
          );
        }
      },
    );
  }

  public static async updateCampaign(req: Request, res: Response, next: Function)
  {
    const user = res.locals.user.realtor;
    const body = req.body;

    // Check if body is empty
    if (Object.getOwnPropertyNames(body).length === 0)
    { return HTTPResponse.error(res, 'body is empty', 400); }

    // Check if campaign exists
    DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
      async (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 404); }

        let campaign = new Campaign(dbData[0]);
        campaign.updateCampaign(body);

        // Check if a new scheduledDate is send
        if (body.scheduledDate)
        {
          if (!Date.parse(body.scheduledDate) || Date.parse(body.scheduledDate) < Date.now())
          { return HTTPResponse.error(res, 'scheduled date must be valid', 422); }

          // Cancel the previous schedule
          await EmailScheduler.cancelCampaignSending(campaign);
          // Assign the new schedule
          campaign['scheduledDate'] = body.scheduledDate;
          await EmailScheduler.rescheduleCampaign(campaign);
        }

        // Update campaign inside our db
        EmailScheduler.updateCampaignDB(campaign, (errUpdate, resUpdate) =>
        {
          if (errUpdate) { return HTTPResponse.error(res, 'campaign could not be updated', 500); }
          return HTTPResponse.json(res, campaign.responseData);
        });
      },
    );
  }

  public static uploadCampaignImages(req: Request, res: Response, next: Function)
  {
    const id = req.params.id;
    const files = req.files;
    if (!files || files.length === 0) { return HTTPResponse.error(res, 'No files uploaded', 400); }

    if (!id) { return uploadError(res, 'no campaign specified', req.files); }

    DataStore.local.projects.find({ id: id }, {}, (err, dbData) =>
    {
      const project = Campaign.fromDatastore(dbData[0]);
      if (!project) { return uploadError(res, 'project does not exist', req.files); }

      const imageURLs = (project.images) ? (project.images) : ([]);
      for (let i = 0; i < files.length; i++)
      {
        const path = files[i].path;
        let fileName = `${i}`;
        while (fileName.length < 3) { fileName = `0${fileName}`; }
        uploadFile(path, id, fileName, (data, err) =>
        {
          imageURLs.push(data.Location);
          if (i === files.length - 1)
          {
            DataStore.local.projects.addOrUpdate({ id: id }, { images: imageURLs }, {}, (err, dbData2) => { });
            HTTPResponse.json(res, { images: imageURLs });
          }
        });
      }
    });
  }

  public static deleteCampaignImages(req: Request, res: Response, next: Function)
  {
    const id = req.params.id;
    const deleteURLs = req.body.delete;

    if (!id) { return HTTPResponse.error(res, 'no campaign specified', 400); }

    DataStore.local.projects.find({ id: id }, {}, (err, dbData) =>
    {
      if (dbData.length === 0) { return HTTPResponse.error(res, 'project does not exist', 400); }
      const project = Campaign.fromDatastore(dbData[0]);
      const imageURLs = (project.images) ? (project.images) : ([]);
      const params = { Bucket: bucket, Delete: { Objects: [], Quiet: false } };

      for (let i = 0; i < deleteURLs.length; i++)
      {
        const url = deleteURLs[i];
        const index = imageURLs.indexOf(url);
        if (index >= 0) { imageURLs.splice(index, 1); }

        const fileName = url.split(`${bucket}`)[1];
        if (fileName) { params.Delete.Objects.push({ Key: fileName }); }
      }

      s3.deleteObjects(params, (err2, data2) =>
      { DataStore.local.projects.addOrUpdate({ id: id }, { images: imageURLs }, {}, (err, dbData2) => { }); });
      HTTPResponse.json(res, { images: imageURLs });
    });
  }
}

function uploadFile(path: string, id: string, fileName: string, callback: (data, err) => (void))
{
  fs.readFile(path, (err, data) =>
  {
    let key = `projects/${id}/${fileName}.png`;

    const params =
      {
        Bucket: bucket,
        Body: data,
        ContentType: 'image/png',
        Key: key,
        ACL: 'public-read',
      };

    s3.upload(params, (err, data) =>
    {
      callback(data, err);
      fs.unlink(path, (err, data) => { });
    });
  });
}

function uploadError(res, error: string, images: any[])
{
  for (let i = 0; i < images.length; i++)
  { fs.unlink(images[i].path, (err, data) => { }); }
  HTTPResponse.error(res, error, 400);
}
