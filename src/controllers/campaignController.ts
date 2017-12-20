import * as AWS from 'aws-sdk';
import { Request, Response } from 'express';
import * as fs from 'file-system';
import * as nodeschedule from 'node-schedule';
import { config } from '../config/config';
import { EmailScheduler } from '../handlers/emailScheduler';
import { RecipientList } from '../models/recipient';
import { HTTPResponse } from '../output/response';
import { HTTPBody, HTTPRequest } from '../protocols/http';
import { DataStore } from './../datastore/datastore';
import { Campaign } from './../models/campaign';
import { Email } from './../models/email';
import { RecipientController } from './recipientController';

const s3 = new AWS.S3();
const bucket = 'zigna-emarketer';

export class CampaignController
{
  public static get(req: Request, res: Response, next: Function)
  {
    const id = req.params.id;
    // const userID = res.locals.user.realtor;
    const userID = 'Tudor';

    const query: any = { owners: userID };
    if (id) { query.id = id; }

    DataStore.local.campaigns.find(query, {}, (err, dbData) =>
    {
      if (err || dbData.length === 0) { return HTTPResponse.json(res, []); }

      let campaigns = [];
      for (let i = 0; i < dbData.length; i++)
      {
        const campaign = Campaign.fromDatastore(dbData[i]);
        campaigns.push(campaign.publicData);
      }

      HTTPResponse.json(res, campaigns);
    });
  }

  public static create(req: Request, res: Response, next: Function)
  {
    const body = req.body;
    const user = 'Tudor'
    const requiredFields = ['templateID', 'listID', 'subject'];

    let missing;
    if (missing = HTTPBody.missingFields(body, requiredFields))
    { return HTTPResponse.missing(res, missing, 'body'); }

    if (body.scheduledDate)
    {
      if (!Date.parse(body.scheduledDate) || Date.parse(body.scheduledDate) < Date.now())
      { return HTTPResponse.error(res, 'scheduled date is invalid', 400); }
    }

    DataStore.local.recipients.find({ id: body.listID }, {}, (err, dbData) =>
    {
      if (err || dbData.length === 0) return HTTPResponse.error(res, 'the specified list does not exist', 404);

      const campaign = Campaign.fromRequest(body);
      campaign.owners = [user];

      DataStore.local.campaigns.addOrUpdate({ id: campaign.id }, campaign.dbData, {}, (err, dbData2) =>
      {
        if (err) return HTTPResponse.error(res, 'error creating the campaign', 500);

        if (campaign.scheduledDate)
        {
          EmailScheduler.scheduleCampaign(campaign, (errSchedule, dataSchedule) =>
          {
            if (errSchedule) return HTTPResponse.error(res, 'error scheduling the campaign in db', 400);
            return HTTPResponse.json(res, { message: 'Campaign created and scheduled for sending', campaignID: dbData.id });
          });
        }
        else { return HTTPResponse.json(res, { message: 'Campaign created', campaignID: dbData.id }); }
      });
    });
  }

  public static delete(req: Request, res: Response, next: Function)
  {
    const user = res.locals.user.realtor;

    DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {}, (err, dbData) =>
    {
      if (err || dbData.length === 0)
      { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }

      const campaign = dbData[0];
      DataStore.local.campaigns.remove({ id: campaign.id }, {}, (err, dbData) =>
      {
        if (err) { return HTTPResponse.error(res, 'error deleting campaign', 500); }
        HTTPResponse.success(res);
      });
    });
  }

  public static send(req: Request, res: Response, next: Function)
  {
    const userID = 'Tudor';
    const id = req.params.id;
    if (!userID) { return HTTPResponse.error(res, 'invalid user', 400); }
    if (!id) { return HTTPResponse.error(res, 'no campaign specified', 400); }

    DataStore.local.campaigns.find({ id: id, owners: userID }, {}, (err, dbData) =>
    {
      if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }

      const campaign = Campaign.fromDatastore(dbData[0]);
        DataStore.local.recipients.find({ id: campaign.listID }, {}, (err, dbData) =>
        {
          console.log(dbData);
          if (err || dbData.length === 0) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }

          const list = dbData[0].recipients;
          campaign.recipients = list;
          const email = new Email(campaign);

          EmailScheduler.sendEmailBlock(email, (errEmail, dataEmail) =>
          {
            if (errEmail) { return HTTPResponse.error(res, errEmail, 400); }
            return HTTPResponse.success(res);
          });
        });
    });
  }

  public static /*async*/ update(req: Request, res: Response, next: Function)
  {
    const user = 'Tudor';
    const body = req.body;

    // Check if body is empty
    if (Object.getOwnPropertyNames(body).length === 0)
    { return HTTPResponse.error(res, 'body is empty', 400); }

    // Check if campaign exists
    DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {}, /*async*/(err, dbData) =>
    {
      if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 404); }

      let campaign = new Campaign(dbData[0]);
      campaign.update(body);
      console.log(body);
      // Check if a new scheduledDate is send
      if (body.scheduledDate)
      {
        if (!Date.parse(body.scheduledDate) || Date.parse(body.scheduledDate) < Date.now())
        { return HTTPResponse.error(res, 'scheduled date must be valid', 400); }

          // Cancel the previous schedule
          /*await*/ EmailScheduler.cancelCampaignSending(campaign);
        // Assign the new schedule
        campaign['scheduledDate'] = body.scheduledDate;
          /*await*/ EmailScheduler.rescheduleCampaign(campaign);
      }

      // Update campaign inside our db
      EmailScheduler.updateCampaignDB(campaign, (errUpdate, resUpdate) =>
      {
        if (errUpdate) { return HTTPResponse.error(res, 'campaign could not be updated', 500); }
        return HTTPResponse.json(res, campaign.publicData);
      });
    });
  }

  // public static uploadImages(req: Request, res: Response, next: Function)
  // {
  //   const id = req.params.id;
  //   const files = req.files;
  //   if (!files || files.length === 0) { return HTTPResponse.error(res, 'No files uploaded', 400); }

  //   if (!id) { return uploadError(res, 'no campaign specified', req.files); }

  //   DataStore.local.projects.find({ id: id }, {}, (err, dbData) =>
  //   {
  //     const project = Campaign.fromDatastore(dbData[0]);
  //     if (!project) { return uploadError(res, 'project does not exist', req.files); }

  //     const imageURLs = (project.images) ? (project.images) : ([]);
  //     for (let i = 0; i < files.length; i++)
  //     {
  //       const index = i + imageURLs.length;
  //       const path = files[i].path;
  //       let fileName = `${index}`;
  //       while (fileName.length < 3) { fileName = `0${fileName}`; }
  //       uploadFile(path, id, fileName, (data, err) =>
  //       {
  //         imageURLs.push(data.Location);
  //         if (i === files.length - 1)
  //         {
  //           DataStore.local.projects.addOrUpdate({ id: id }, { images: imageURLs }, {}, (err, dbData2) => { });
  //           HTTPResponse.json(res, { images: imageURLs });
  //         }
  //       });
  //     }
  //   });
  // }

  // public static deleteImages(req: Request, res: Response, next: Function)
  // {
  //   const id = req.params.id;
  //   const deleteURLs = req.body.delete;

  //   if (!id) { return HTTPResponse.error(res, 'no campaign specified', 400); }

  //   DataStore.local.projects.find({ id: id }, {}, (err, dbData) =>
  //   {
  //     if (dbData.length === 0) { return HTTPResponse.error(res, 'project does not exist', 400); }
  //     const project = Campaign.fromDatastore(dbData[0]);
  //     const imageURLs = (project.images) ? (project.images) : ([]);
  //     const params = { Bucket: bucket, Delete: { Objects: [], Quiet: false } };

  //     for (let i = 0; i < deleteURLs.length; i++)
  //     {
  //       const url = deleteURLs[i];
  //       const index = imageURLs.indexOf(url);
  //       if (index >= 0) { imageURLs.splice(index, 1); }

  //       const fileName = url.split(`${bucket}`)[1];
  //       if (fileName) { params.Delete.Objects.push({ Key: fileName }); }
  //     }

  //     s3.deleteObjects(params, (err2, data2) =>
  //     { DataStore.local.projects.addOrUpdate({ id: id }, { images: imageURLs }, {}, (err, dbData2) => { }); });
  //     HTTPResponse.json(res, { images: imageURLs });
  //   });
  // }
}

// function uploadFile(path: string, id: string, fileName: string, callback: (data, err) => (void))
// {
//   fs.readFile(path, (err, data) =>
//   {
//     let key = `projects/${id}/${fileName}.png`;

//     const params =
//       {
//         Bucket: bucket,
//         Body: data,
//         ContentType: 'image/png',
//         Key: key,
//         ACL: 'public-read',
//       };

//     s3.upload(params, (err, data) =>
//     {
//       callback(data, err);
//       fs.unlink(path, (err, data) => { });
//     });
//   });
// }

// function uploadError(res, error: string, images: any[])
// {
//   for (let i = 0; i < images.length; i++)
//   { fs.unlink(images[i].path, (err, data) => { }); }
//   HTTPResponse.error(res, error, 400);
// }
