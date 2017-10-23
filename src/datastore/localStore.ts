import { config } from '../config/config';
import { Logger } from '../output/logger';

export class Collection
{
  private collection;
  constructor(connection, collectionName)
  { this.collection = connection.get(collectionName); }

  public printAll(callback: (error, result) => (void))
  { this.collection.find({}, {}, callback); }

  public find(query: {}, options: {}, callback: (error, result) => (void))
  { this.collection.find(query, options, callback); }

  public remove(query: {}, options: {}, callback: (error, result) => (void))
  { this.collection.remove( query, options, callback); }

  public addOrUpdate(query: {}, update: any, options: any, callback: (error, result) => (void))
  {
    if (options.new === undefined)
    { options.new = false; }
    if (options.upsert === undefined)
    { options.upsert = true; }
    this.collection.findOneAndUpdate(query, { $set: update }, options, callback);
  }
}

export const collections =
{ users: 'users', projects: 'projects', recipients: 'recipients', blacklist: 'blacklist', campaigns: 'campaigns', schedule: 'schedule' };

export class LocalStore
{
  private _connection: any;
  users: Collection; projects: Collection; recipients: Collection; blacklist: Collection; campaigns: Collection; schedule: Collection;

  constructor()
  {
    this.users = new Collection(this.connection, collections.users);
    this.projects = new Collection(this.connection, collections.projects);
    this.recipients = new Collection(this.connection, collections.recipients);
    this.blacklist = new Collection(this.connection, collections.blacklist);
    this.campaigns = new Collection(this.connection, collections.campaigns);
    this.schedule = new Collection(this.connection, collections.schedule);
  }

  public get connection()
  {
    if (!this._connection) { this.connect(); }
    return this._connection;
  }

  public connect()
  {
    if (this._connection == null)
    {
        const monk = require('monk');
        this._connection = monk(config.dbURL);
        this._connection.then(() =>
        { Logger.write(Logger.levels.info, 'Connected to database'); });
    }
  }
}
