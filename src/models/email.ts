import { CampaignParser } from './../emails/parser';
// Define the parameters required for an email here for both request and database.

export class Email
{
  id: string;
  body: string;
  subject: string = 'LALALA';
  sender: string = 'support@zigna.co';
  recipients: string[];

  public get request()
  {
    this.body = CampaignParser.getStructure(this);
    this.recipients = getValidRecipients(this.recipients);

    const params = {
      Destination: { ToAddresses: this.recipients },
      Message:
      {
        Body:
        { Html: { Data: this.body, Charset: 'UTF-8' } },
        Subject: { Data: this.subject },
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

function getValidRecipients(recipients: string[]): string[]
{
  console.log(recipients);
  recipients = filterValidEmails(recipients);
  recipients.push('thomas@zigna.co');
  console.log(recipients);
  return recipients;
}

function filterValidEmails(recipients: any[])
{
  for (let i = 0; i < recipients.length; i++)
  {
    const email = recipients[i];
    if (!isValidEmail(email))
    {
      recipients.splice(i, 1);
      i--;
    }
  }
  return recipients;
}

function isValidEmail(email: any): boolean
{
  if (typeof email !== 'string')
  { return false; }

  if (email.indexOf('@') < 0) { return false; }
  if (email.split('@')[1].indexOf('.') < 0) { return false; }

  return true;
}
