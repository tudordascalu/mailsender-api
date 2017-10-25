export class RecipientList
{
    static keys = ['id', 'recipients', 'owners'];

    id?: string;
    recipients?: string[];
    owners?: string[];

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

    public updateRecipients(data: { deleteRecipients: string[], addRecipients: string[] })
    {
        for (let i = 0; i < data.deleteRecipients.length; i++)
        {
            const recipient = data.deleteRecipients[i];
            const index = this.recipients.indexOf(recipient);
            if (index !== -1) { this.recipients.splice(index, 1); }
        }

        for (let i = 0; i < data.addRecipients.length; i++)
        {
            const recipient = data.addRecipients[i];
            const index = this.recipients.indexOf(recipient);
            if (index === -1) { this.recipients.push(recipient); }
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
