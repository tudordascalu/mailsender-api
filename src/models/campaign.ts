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

    get dbData()
    {
        const parameters: any = {};
        Object.assign(parameters, this);
        return parameters;
    }

    constructor(data: Campaign)
    {
        for (let i = 0; i < Campaign.keys.length; i++)
        {
            const key = Campaign.keys[i];
            if (data[key] !== undefined) { this[key] = data[key]; }
        }
    }

    // Do setup specific for websites created from a request here
    public static fromRequest(data: Campaign): Campaign
    {
        const site = new Campaign(data);
        return site;
    }

    // Do setup specific for websites created from a database query here
    public static fromDatastore(data: Campaign): Campaign
    {
        const site: any = new Campaign(data);
        return site;
    }

    public updateCampaign(data: Campaign)
    {
        const keys = ['body', 'subject', 'listID'];

        for (let i = 0; i < keys.length; i++)
        {
            const key = keys[i];
            if (data[key] !== undefined) { this[key] = data[key]; }
        }
    }

    public get responseData()
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
