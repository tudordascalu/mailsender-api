import { LocalStore } from './localStore';

export class DataStore
{
  private static _local: LocalStore;

  public static get local(): LocalStore
  {
    if (!this._local)
    { this._local = new LocalStore(); }

    this._local.connect();
    return this._local;
  }
}
