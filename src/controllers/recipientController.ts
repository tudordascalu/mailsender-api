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
  // req body: recipients
  public static createList(req: Request, res: Response, next: Function)
  {
    const body = req.body;
    const user = 'Tudor';

    let missing;
    if (missing = HTTPBody.missingFields(body, ['recipients']))
    { return HTTPResponse.missing(res, missing, 'body'); }

    if (body.recipients.length === 0)
    { return HTTPResponse.error(res, 'recipients must not be empty', 400); }

    body.id = uuid();
    body.owners = [user];

    const list = RecipientList.fromRequest(body);
    DataStore.local.recipients.addOrUpdate({ id: list.id }, list, {},
      (err, dbData) =>
      {
        if (err) return HTTPResponse.error(res, 'error creating the list in db', 400);
        else { HTTPResponse.json(res, { listID: dbData.id }); }
      },
    );
  }

  public static getAllLists(req: Request, res: Response, next: Function)
  {
    const user = 'Tudor';

    DataStore.local.recipients.find({ owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.json(res, []); }

        let userLists = [];
        for (let i = 0; i < dbData.length; i++)
        {
          const list = RecipientList.fromDatastore(dbData[i]);
          userLists.push(list.responseData);
        }
        HTTPResponse.json(res, userLists);
      },
    );
  }

  public static getSpecificList(req: Request, res: Response, next: Function)
  {
    const user = 'Tudor';

    DataStore.local.recipients.find({ id: req.params.id, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }

        const list = RecipientList.fromDatastore(dbData[0]);
        HTTPResponse.json(res, list.responseData);
      },
    );
  }

  public static deleteList(req: Request, res: Response, next: Function)
  {
    const user = 'Tudor';

    DataStore.local.recipients.find({ id: req.params.id, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }

        const list = dbData[0];
        DataStore.local.recipients.remove({ id: list.id }, {},
          (err, dbData) =>
          {
            if (err) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }
            HTTPResponse.success(res);
          },
        );
      },
    );
  }

  public static updateList(req: Request, res: Response, next: Function)
  {
    const body = req.body;
    // const user = res.locals.user.realtor;
    const user = 'Tudor';
    const recipients = body.recipients;
    const status = body.status;

    if (!recipients || recipients.length === 0) { return HTTPResponse.error(res, 'recipients list is empty', 400); }

    DataStore.local.recipients.find({ id: req.params.id, owners: user }, {},
      (err, dbData) =>
      {
        if (err || dbData.length === 0) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }

        let list = new RecipientList(dbData[0]);
        list.updateRecipients(recipients, status);
        
        DataStore.local.recipients.addOrUpdate({ id: list.id }, list, {},
          (err, dbData) =>
          {
            if (err) { return HTTPResponse.error(res, 'error updating the list in db', 400); }
            HTTPResponse.json(res, list);
          },
        );
      },
    );
  }

}
