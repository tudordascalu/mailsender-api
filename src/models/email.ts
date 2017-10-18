// Define the parameters required for an email here for both request and database.

export class Email
{
id: string;
  body: string;
  subject: string ="LALALA";
  sender: string ="support@zigna.co";
  recipients: string[];

  public get request()
  {
    const params = {
      Destination: { ToAddresses: this.recipients },
      Message: {
       Body: {
        Text: { Charset: 'UTF-8', Data: this.body },
       },
       Subject: { Charset: 'UTF-8', Data: this.subject },
      },
      Source: this.sender,
     };

     return params;
  }

  constructor(data: any)
  {
    if (data) { Object.assign(this, data); }
  }

  public removeRecipient(email: string)
  {
    const index = this.recipients.indexOf(email);
    if (index >= 0) { this.recipients.splice(index, 1); }
    // for (let i = 0; i < this.recipients.length; i++) {
    //   const element = this.recipients[i];
    //   if (element === email) { this.recipients.splice(i, 1); }
    // }
    // const recipients = this.recipients;
    // recipients.splice(index, 1);
  }
}
