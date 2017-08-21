import { Request, Response } from 'express';
import * as auth from '../authorization/jwtauth';
import { Logger } from '../output/logger';
import { HTTPResponse } from '../output/response';

// Middleware function that provides access to the next function if token is present and valid
export function requireTokenAuthentication(req: Request, res: Response, next: Function)
{
  // check header or url parameters or post parameters for token
  let bearer = req.headers['authorization'];
  let token = (bearer != null) ? (bearer.split('Bearer ')[1]) : (null);
  if (token)
  {
    let { err, username } = auth.validate(token);
    res.locals.username = username;

    if (err || !username)
    { return HTTPResponse.unauthorized(res, err); }
    else
    { next(); }
  }
  else
  { return HTTPResponse.unauthorized(res, 'No token provided.'); }
}

// Issue an access token
// export function issueAccessToken(req: Request, res: Response, next: Function)
// {
//   writer.respondJSON(res, { access: auth.issue() })
// }
