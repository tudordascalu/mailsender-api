export class RecipientList
{
    static keys = ['id', 'recipients', 'owners', 'listName', 'editDate', 'numberOfEmails', 'status'];

    id?: string;
    recipients?: string[];
    owners?: string[];
    listName?: string;
    editDate?: string;
    numberOfEmails?: number;
    status?: string;

    get dbData()
    {
        const parameters: any = {};
        Object.assign(parameters, this);
        return parameters;
    }

    constructor(data: any)
    {
        for (let i = 0; i < RecipientList.keys.length; i++)
        {
            const key = RecipientList.keys[i]
            if (data[key] !== undefined) { this[key] = data[key] }
        }
    }

    // Do setup specific for websites created from a request here
    public static fromRequest(data: any): RecipientList
    {
        const site = new RecipientList(data);
        
        return site;
    }

    // Do setup specific for websites created from a database query here
    public static fromDatastore(data: any): RecipientList
    {
        const site: any = new RecipientList(data);
        return site;
    }

    public updateRecipients(recipients: string[])
    {
    //     for (let i = 0; i < data.deleteRecipients.length; i++)
    //     {
    //         const recipient = data.deleteRecipients[i];
    //         const index = this.recipients.indexOf(recipient);
    //         if (index !== -1) { this.recipients.splice(index, 1); }
    //     }

    //     for (let i = 0; i < data.addRecipients.length; i++)
    //     {
    //         const recipient = data.addRecipients[i];
    //         const index = this.recipients.indexOf(recipient);
    //         if (index === -1) { this.recipients.push(recipient); }
    //     }
        this.recipients = recipients;
        this.numberOfEmails = this.recipients.length;
        this.editDate = RecipientList.getEditDate();
    }

    public get responseData()
    {
        const parameters =
        {
            id: this.id,
            recipients: this.recipients,
            listName: this.listName,
            editDate: this.editDate,
            numberOfEmails: this.numberOfEmails,
            status: this.status
        };
        return parameters;
    }

    public static getEditDate(){
        var currentDate = new Date();
        
        var date = currentDate.getDate();
        var month = currentDate.getMonth(); //Be careful! January is 0 not 1
        var year = currentDate.getFullYear();
        
        var minutes = currentDate.getMinutes();
        var hours = currentDate.getHours();
        
        var testHours = (hours+24-2)%24; 
        var mid='AM';
        if(hours==0){ //At 00 hours we need to show 12 am
            hours=12;
        }
        else if(hours>12)
        {
            hours=hours%12;
            mid='PM';
        }
        
        var dateString = date + "-" +(month + 1) + "-" + year + " " + hours + "." + minutes + mid;
        return dateString;
    }
}
