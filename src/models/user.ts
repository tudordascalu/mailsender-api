export class User
{
  static keys = ['id', 'images'];

  id: string;
  images = [];

  constructor(data: any)
  {
    this.update(data);
  }

  // Do setup specific for websites created from a request here
  public static fromRequest(data: any): User
  {
    const user = new User(data);
    return user;
  }

  // Do setup specific for websites created from a database query here
  public static fromDatastore(data: any): User
  {
    const user = new User(data);
    return user;
  }

  public update(data: any)
  {
    for (let i = 0; i < User.keys.length; i++)
    {
      const key = User.keys[i];
      if (data[key] !== undefined) { this[key] = data[key]; }
    }
  }

  public get publicData()
  {
    const parameters: any = {};
    Object.assign(parameters, this);
    return parameters;
  }

  public get dbData()
  {
    const parameters: any = {};
    Object.assign(parameters, this);
    return parameters;
  }
}
