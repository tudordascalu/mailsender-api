// Define the parameters required for an email here for both request and database.

export class Email
{
  id: string;
  sender: string;
  recipients: string[];
  message: string;
  subject: string;

  public static formatEmail(data: any): any
  {
    let params = {
      Destination: {
       ToAddresses: [],
      },
      Message: {
       Body: {
        Text: {
         Charset: 'UTF-8',
         Data: data.message,
        },
       },
       Subject: {
        Charset: 'UTF-8',
        Data: data.subject,
       },
      },
      Source: data.sender,
     };

     for (let i = 0; i < data.recipients.length; i++)
     {
       params.Destination.ToAddresses.push(data.recipients[i]);
     }

     return params;
  }

  public static removeToAddress(formatedEmail, index: number)
  {
    formatedEmail.Destination.ToAddresses.splice(index, 1);

    return formatedEmail;
  }
}
