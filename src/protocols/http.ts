
import * as http from 'http';
import * as https from 'https';
import { HTTPResponse } from '../output/response';

export class Route
{
    name: String; path: String; method: String; secure: Boolean; handler: Function;

    constructor(name: String, path: String, method: String, secure: Boolean, handler: Function)
    {
        this.name = name;
        this.path = path;
        this.method = method;
        this.secure = secure;
        this.handler = handler;
    }
}

export class HTTPRequest
{
  static get(url, callback: (err, str) => void)
  {
    const httpsRequest = https.get(url, (res) => responseBuffer(res, callback));
    httpsRequest.end();
  }

  static post(host, path, parameters: {}, callback)
  {
    const body = JSON.stringify(parameters,
    // {
    //   "compilation_level" : "ADVANCED_OPTIMIZATIONS",
    //   "output_format": "json",
    //   "output_info": "compiled_code",
    //   "warning_level" : "QUIET",
    //   "js_code" : parameters,
    // }
    );

    const options =
    {
      host: host,
      port: 80,
      path: path,
      method: 'POST',
      headers:
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const httpRequest = http.request(options, (res) => responseBuffer(res, callback));

    httpRequest.write(body);
    httpRequest.end();
  }
}

function responseBuffer(response, callback): (response) => (void)
{
  const handler = (response) =>
  {
    let str = '';
    response.on('data', function(chunk)
    { str += chunk; });

    response.on('end', function ()
    { callback(null, str); });

    response.on('error', function (err)
    { callback(err, null); });
  };

  return handler;
}

export class HTTPBody
{
  static missingFields(container: any, requiredFields: string[]): any
  {
    if (container instanceof Array)
    { return this.missingArrayFields(container, requiredFields); }
    else if (container instanceof Object)
    { return this.missingObjectFields(container, requiredFields); }
  }

  private static missingObjectFields(container: {}, requiredFields: string[]): any
  {
      let missing = requiredFields.filter((field) =>
      { return (container[field] === undefined); });
      return (missing.length > 0) ? (missing) : (null);
  }

  private static missingArrayFields(container: any[], requiredFields: string[]): any
  {
    let missing = null;
    container.forEach((element) =>
    {
      let miss = this.missingObjectFields(element, requiredFields);
      if (miss && miss.length > 0)
      { missing = miss; }
    });

    return missing;
  }
}
