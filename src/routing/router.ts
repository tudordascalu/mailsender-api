import * as cors from 'cors';
import * as express from 'express';
import * as path from 'path';
import { config } from '../config/config';
import * as authController from '../controllers/authController';
import { Logger } from './../output/logger';
import { HTTPResponse } from './../output/response';
import { devRoutes, routes } from './routes';

const multer = require('multer');

/**********
 * Router *
 **********/
export class Router
{
  public static configure(app: express)
  {
    app.use(cors(config.corsOptions));
    let router = express.Router();

    routes.forEach((element) =>
    {
      const path = `/emarketer/v${ config.version }` + element.path;
      // const path = `/v${ config.version }` + element.path;
      
      const upload = multer({ dest: 'images/' });
      if (element.secure)
      { router.use(path, authController.requireTokenAuthentication); }

      switch (element.method)
      { // tslint:disable:semicolon
        case 'POST':
        {
          if (element.multipartType)
          { router.post(path, upload.array(element.multipartType, 100), element.handler); }
          else
          { router.post(path, element.handler); }
          break;
        }
        case 'PUT':     router.put(path, element.handler); break
        case 'DELETE':  router.delete(path, element.handler); break
        default:        router.get(path, element.handler); break
      } // tslint:enable:semicolon
    });

    devRoutes.forEach((element) =>
    {
      const path = `/emarketer/v${ config.version }` + element.path;
      console.log(path);

      switch (element.method)
      { // tslint:disable:semicolon
        case 'POST':    router.post(path, element.handler); break
        case 'PUT':     router.put(path, element.handler); break
        case 'DELETE':  router.delete(path, element.handler); break
        default:        router.get(path, element.handler); break
      } // tslint:enable:semicolon
    });

    // Not Found handler
    router.all('*', function(req: Request, res: Response)
    { HTTPResponse.error(res, 'Not found', 404); });

    app.use(router);

    // Error handler
    app.use(function(err: any, req: Request, res: Response, next: Function)
    {
      // Returns stacktrace in development
      let msg = (config.env === 'dev') ? (err) : (null);
      Logger.write('error', err);
      console.log(err);
      HTTPResponse.error(res, msg, 500);
    });
  }
}
