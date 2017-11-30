import * as uuid from 'uuid/v4';

export class Campaign
{
  static keys = ['id', 'body', 'subject', 'scheduledDate', 'listID', 'owners'];

  id?: string;
  body?: string;
  subject?: string;
  scheduledDate?: string;
  listID?: string;
  owners?: string[];
  images = [];
  recipients = [];

  constructor(data: Campaign)
  {
    this.update(data, Campaign.keys);
  }

  // Do setup specific for websites created from a request here
  public static fromRequest(data: Campaign): Campaign
  {
    const site = new Campaign(data);
    site.id = uuid();
    return site;
  }

  // Do setup specific for websites created from a database query here
  public static fromDatastore(data: any): Campaign
  {
    const site: any = new Campaign(data);
    return site;
  }

  public update(data: any, keys = ['body', 'subject', 'listID'])
  {
    for (let i = 0; i < keys.length; i++)
    {
      const key = keys[i];
      if (data[key] !== undefined) { this[key] = data[key]; }
    }
  }

  public get dbData()
  {
    const parameters: any = {};
    Object.assign(parameters, this);
    return parameters;
  }

  public get publicData()
  {
    const parameters =
      {
        id: this.id,
        body: this.body,
        subject: this.subject,
        scheduledDate: this.scheduledDate,
        listID: this.listID,
      };
    return parameters;
  }

}
