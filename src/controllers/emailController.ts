import { Request, Response } from "express"
import * as uuid from "uuid/v4"
import { config } from "../config/config"
import { Email } from "./../models/email"
import { HTTPBody } from "../protocols/http"
import { DataStore } from "./../datastore/datastore"
import { HTTPResponse } from "./../output/response"

// AWS
var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var ses = new AWS.SES();

export class EmailController
{
  public static sendEmail(req: Request, res: Response, next: Function)
  {
    const data = req.body;
    const user = res.locals.username;
    console.log(user)
    const requiredFields =
    [
      "sender", "recipients", "message",
      "subject",
    ];

    let missing
    if (missing = HTTPBody.missingFields(data, requiredFields))
    { return HTTPResponse.missing(res, missing, "body") }

    if (data.recipients.length === 0)
    { return HTTPResponse.error(res, "recipients field must not be empty", 400) }

    const email = Email.formatEmail(data);

     ses.sendEmail(email, function(err, data)
     {
       if (err)// an error occurred
       {
         console.log(err)
         HTTPResponse.json(res, { status: 'nope'})
       }
       else
       {// successful response
        HTTPResponse.json(res, { status: 'ok'})
       }
     });

  }
}
