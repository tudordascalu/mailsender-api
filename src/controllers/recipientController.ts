import { Request, Response } from 'express';
import * as uuid from 'uuid/v4';
import { config } from '../config/config';
import { HTTPBody } from '../protocols/http';
import { DataStore } from './../datastore/datastore';
import { Email } from './../models/email';
import { RecipientList } from './../models/recipient';
import { HTTPResponse } from './../output/response';

export class RecipientController
{
  // req body: sender, recipients,message, subject
  public static createList(req: Request, res: Response, next: Function)
  {
    const data = req.body;
    const user = res.locals.username;

    if (data.recipients.length === 0)
    { return HTTPResponse.error(res, 'recipients must not be empty', 400); }

    data.id = uuid();
    data.owners = [user];
    const list = RecipientList.fromRequest(data);

    DataStore.local.recipients.addOrUpdate({ id: list.id }, list.dbData, {},
      (err, dbData) =>
      {
        if (err) return HTTPResponse.error(res, 'error creating the list in db', 400);
        else HTTPResponse.json(res, dbData);
      },
    );
  }

  public static getAllLists(req: Request, res: Response, next: Function)
  {
    const user = res.locals.username;

    DataStore.local.recipients.find({ owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.json(res, []); }
        let userLists = [];
        for (let i = 0; i < dbData.length; i++)
        {
          const list = RecipientList.fromDatastore(dbData[0]);
          userLists.push(list);
        }
        HTTPResponse.json(res, userLists);
      },
    );
  }

  public static getSpecificList(req: Request, res: Response, next: Function)
  {
    const user = res.locals.username;

    DataStore.local.recipients.find({ id: req.params.id, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }
        const list = RecipientList.fromDatastore(dbData[0]);
        HTTPResponse.json(res, list);
      },
    );
  }

  public static deleteList(req: Request, res: Response, next: Function)
  {
    const user = res.locals.username;

    DataStore.local.recipients.find({ id: req.params.id, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }
        const list = dbData[0];

        if (list.owners.length === 1)
        {
          DataStore.local.recipients.remove({ id: list.id }, {},
            (err, dbData) =>
            {
              if (err) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }
              HTTPResponse.success(res);
            },
          );
        }
        else
        {
          for (let i = 0; i < list.owners.length; i++)
          {
            if (list.owners[i] === user) { list.owners.splice(i, 1); }
            break;
          }
          DataStore.local.recipients.addOrUpdate({ id: list.id }, list, {},
            (err, dbData) =>
            {
              if (err) return HTTPResponse.error(res, 'error updating the list in db', 400);
              else HTTPResponse.json(res, dbData);
            },
          );
        }
      },
    );
  }

  public static updateList(req: Request, res: Response, next: Function)
  {
    const user = res.locals.username;
    const recipients = { addRecipients: req.body.add, deleteRecipients: req.body.delete};

    DataStore.local.recipients.find({ id: req.params.id, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }

        let list = new RecipientList(dbData[0]);

        list.updateRecipients(recipients);
        DataStore.local.recipients.addOrUpdate({ id: list.id }, list, {},
          (err, dbData) =>
          {
            if (err) return HTTPResponse.error(res, 'error updating the list in db', 400);
            else HTTPResponse.json(res, dbData);
          },
        );
      },
    );
  }
}
