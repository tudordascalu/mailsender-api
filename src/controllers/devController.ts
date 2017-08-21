import { Request, Response } from 'express';
import { config, keychain } from '../config/config';
import { Logger } from '../output/logger';
import { HTTPResponse } from '../output/response';
import { DataStore } from './../datastore/dataStore';
import { collections } from './../datastore/localStore';
import { HTTPBody } from './../protocols/http';

export class DevController
{
  public static printSites(req: Request, res: Response, next: Function)
  {
    DataStore.local.projects.printAll((err, str) =>
    {
      res.status(200).write(JSON.stringify(str, null, 3));
      res.end();
    });
  }
}
