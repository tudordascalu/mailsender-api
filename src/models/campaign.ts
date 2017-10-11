export class Campaign
{
    static keys = ['id', 'body', 'scheduledDate', 'listID', 'owners'];
    
      id: string;
      body: string[];
      scheduledDate: string;
      owners: string[];
      listID : string;

      get dbData()
      {
        const parameters: any = {};
        Object.assign(parameters, this);
        return parameters;
      }
      
      constructor(data: any) { Object.assign(this, data);}

      public static fromRequest(data: any): Campaign
      {
        const site = new Campaign(data);
        // Do setup specific for websites created from a request here
        return site;
      }
        
      public static fromDatastore(data: any): Campaign
      {
        const site: any = new Campaign(data);
        // Do setup specific for websites created from a database query here
        return site;
      }

      public get responseData()
      {
        const parameters =
        {
          id: this.id,
          body: this.body,
          scheduledDate: this.scheduledDate,
          listID: this.listID
        };
        return parameters;
      }
    


}
