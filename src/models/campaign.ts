import * as uuid from 'uuid/v4';
import { RecipientList } from './recipient';

export class Campaign
{
    static keys = ['id','changes', 'templateID', 'body', 'subject', 'scheduledDate', 'listID', 'owners', 'editDate', 'status', 'campaignName'];
    id?: string;
    body?: string;
    subject?: string;
    scheduledDate?: string;
    listID?: string;
    owners?: string[];
    status?: string;
    editDate?: string;
    campaignName: string;
    templateID: string;
    changes: {};
    recipients = [];

  constructor(data: Campaign)
  {
    this.update(data);
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

  public update(data: any)
  {
    for (let i = 0; i < Campaign.keys.length; i++)
    {
      const key = Campaign.keys[i];
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
        status: this.status,
        editDate: this.editDate,
        campaignName: this.campaignName,
        templateID: this.templateID,
        changes: this.changes,
    };
    return parameters;
 }
}
