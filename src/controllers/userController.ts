import * as AWS from 'aws-sdk';
import { Request, Response } from 'express';
import * as fs from 'file-system';
import * as nodeschedule from 'node-schedule';
import * as uuid from 'uuid/v4';
import { config } from '../config/config';
import { EmailScheduler } from '../handlers/emailScheduler';
import { User } from '../models/user';
import { HTTPBody, HTTPRequest } from '../protocols/http';
import { DataStore } from './../datastore/datastore';
import { Email } from './../models/email';
import { Schedule } from './../models/schedule';
import { HTTPResponse } from './../output/response';

// const s3 = new AWS.S3({
//   accessKeyId: 'AKIAIYYGOQUV7HLXU23A',
//   secretAccessKey: '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'
// });
const s3 = new AWS.S3({
  accessKeyId: 'AKIAJ2LSRESR3JZ7HPPA',
  secretAccessKey: '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'
});
// const bucket = 'zigna-emarketer';
const bucket = 'email-marketer-tudor';
export class UserController
{
  public static get(req: Request, res: Response, next: Function)
  {
    const userID = 'Tudor';
    // console.log(res.locals.user);
    if (!userID) { return HTTPResponse.error(res, 'invalid user', 400); }

    DataStore.local.users.find({ id: userID }, {}, (err, dbData) =>
    {
      if (err || dbData.length === 0) {
        const user =  { id: userID, images: []}
        return DataStore.local.users.addOrUpdate({ id: userID }, user, {}, (err2, dbData2) => {
          HTTPResponse.json(res, user);
        });
      }
      const user = User.fromDatastore(dbData[0]);
      HTTPResponse.json(res, user.publicData);
    });
  }

  public static uploadImages(req: Request, res: Response, next: Function)
  {
    const userID = 'Tudor';
    const files = req.files;
    if (!files || files.length === 0) { return HTTPResponse.error(res, 'No files uploaded', 400); }

    if (!userID) { return uploadError(res, 'invalid user', req.files); }

    DataStore.local.users.find({ id: userID }, {}, (err, dbData) =>
    {
      const user = User.fromDatastore(dbData[0]);
      if (err) { return uploadError(res, 'error querying datastore', req.files); }

      const imageURLs = (user.images) ? (user.images) : ([]);
      for (let i = 0; i < files.length; i++)
      {
        const index = i + imageURLs.length;
        const path = files[i].path;
        let fileName = `${index}`;
        while (fileName.length < 3) { fileName = `0${fileName}`; }
        uploadFile(path, userID, fileName, (data, err) =>
        {
          console.log(err);
          imageURLs.push(data.Location);
          if (i === files.length - 1)
          {
            DataStore.local.users.addOrUpdate({ id: userID }, { images: imageURLs }, {}, (err, dbData2) => { });
            HTTPResponse.json(res, { images: imageURLs });
          }
        });
      }
    });
  }

  public static deleteImages(req: Request, res: Response, next: Function)
  {
    const userID = 'Tudor';
    const deleteURLs = req.body.delete;

    if (!userID) { return HTTPResponse.error(res, 'invalid user', 400); }

    DataStore.local.users.find({ id: userID }, {}, (err, dbData) =>
    {
      if (err || dbData.length === 0) { return HTTPResponse.success(res); }

      const user = User.fromDatastore(dbData[0]);
      const imageURLs = (user.images) ? (user.images) : ([]);
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
      { DataStore.local.users.addOrUpdate({ id: userID }, { images: imageURLs }, {}, (err, dbData2) => { }); });
      HTTPResponse.json(res, { images: imageURLs });
    });
  }
}

function uploadFile(path: string, id: string, fileName: string, callback: (data, err) => (void))
{
  fs.readFile(path, (err, data) =>
  {
    let key = `users/${id}/${fileName}.png`;

    const params =
      {
        Bucket: bucket,
        Body: data,
        ContentType: 'image/png',
        Key: key,
        ACL: 'public-read',
      };
      console.log(params);
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
