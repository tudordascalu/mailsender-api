
export class RecipientList
{
  static keys = ["id", "recipients", "owners"];

  id: string;
  recipients: string[];
  owners: string[];

  constructor(data: any) {
    this.update(data);
  }

  public static fromRequest(data: any): RecipientList
  {
    const site = new RecipientList(data);
    // Do setup specific for websites created from a request here
    return site;
  }

  public static fromDatastore(data: any): RecipientList
  {
    const site: any = new RecipientList(data);
    // Do setup specific for websites created from a database query here
    return site;
  }

  public update(data: any)
  {
    for (let i = 0; i < RecipientList.keys.length; i++)
    {
      const key = RecipientList.keys[i];
      if (data[key]) { this[key] = data[key]; }
    }
    // Object.assign(this, data)
  }
}
