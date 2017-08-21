
import { Response } from 'express';

export class HTTPResponse
{
  // Responds with the supplied object in JSON format
  public static json(res: Response, obj: any)
  {
      res.setHeader('Content-Type', 'application/json');
      // res.status(200).send(JSON.stringify(obj, null, 3))
      res.status(200).json(obj);
  }

  public static text(res: Response, text: string)
  {
    // res.setHeader("Content-Type", "application/text")
    res.writeHead(200, { 'Content-Type': 'application/text'});
    res.status(200).end(text);
    // res.write(text)
    // res.end()
  }

  // Responds with a message that the API call is unauthorized
  public static unauthorized(res: Response, err: String)
  {
      this.error(res, err, 403);
  }

  // Responds with an error message
  public static error(res: Response, err: String, status: Number)
  {
      res.setHeader('Content-Type', 'application/json');
      res.status(status).json({ success: false, message: err });
  }

  public static missing(res: Response, missing: String[], container: String)
  {
    this.error(res, `missing fields in ${ container }: ${ missing }`, 400);
  }

  public static byType(res: Response, message, error, errorMessage)
  {
    if (error)
    {
      const msg = (errorMessage != null) ? (errorMessage) : (error);
      this.error(res, msg, 500);
    }
    else
    {
      if (message)
      { this.json(res, message); }
      else
      { this.success(res); }
    }
  }

  public static success(res: Response)
  {
    this.json(res, { success: 'true' });
  }
}
