
export class RecipientList
{
  static keys = ['id', 'recipients', 'owners'];

  id: string;
  recipients: string[];
  owners: string[];

  get dbData()
  {
    const parameters: any = {};
    Object.assign(parameters, this);
    return parameters;
  }

  constructor(data: any) { Object.assign(this, data); }

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

  public updateRecipients(data: { deleteRecipients: string[], addRecipients: string[] })
  {
    this.recipients = this.recipients.concat(data.addRecipients);
    for (let i = 0; i < data.deleteRecipients.length; i++)
    {
      const recipient = data.deleteRecipients[i];
      const index = this.recipients.indexOf(recipient);
      if (index !== -1)
      { this.recipients.splice(index, 1); }
    }
  }

  public get responseData()
  {
    const parameters =
    {
      id: this.id,
      recipients: this.recipients,
    };
    return parameters;
  }
}
