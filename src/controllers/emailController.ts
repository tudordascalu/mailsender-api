import { Request, Response } from "express"
import * as uuid from "uuid/v4"
import { config } from "../config/config"
import { HTTPBody } from "../protocols/http"
import { DataStore } from "./../datastore/datastore"
import { HTTPResponse } from "./../output/response"

export class EmailController
{
  public static sendEmail(req: Request, res: Response, next: Function)
  {

  }
}
