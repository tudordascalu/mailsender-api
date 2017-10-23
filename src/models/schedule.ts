export class Schedule
{   
    id: string;
    scheduledDate: string;
    listID: string;
    body: string;
    recipients: string[];
    scheduleName: string;
    //subject: string;
    //sender: string;
    
    constructor(data: any){ Object.assign(this, data); }

    get dbData()
    {
      const parameters: any = {};
      Object.assign(parameters, this);
      return parameters;
    }

    public static fromRequest(data: any): Schedule
    {
      const site = new Schedule(data);
      // Do setup specific for websites created from a request here
      return site;
    }

    public static fromCampaign(data: any): Schedule
    {    
        const site: any = new Schedule(data);
        // Do setup specific for websites created from a database query here
        return site;
    }
  


}