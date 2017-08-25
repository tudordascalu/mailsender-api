import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { Logger } from '../output/logger';


const alg = 'RS256'; // "HS256"

// let privateKey = "VerySecretSecret"
// let privateKey = fs.readFileSync("keys/private-test.pem")
const publicKey = fs.readFileSync('keys/public.pem');

export function validate(token: any): { err: any, username: String }
{
  let options =
  {
    algorithms: [alg],
    issuer: 'http://zigna.api.v3/',
    // audience: "",
  };

  let decoded;

  try
  { decoded = jwt.verify(token, publicKey, options); }
  catch (err)
  { return { err: err, username: null }; }

  if (decoded == null)
  { return { err: 'Invalid token', username: null }; }

  let user = decoded.unique_name;
  return {err: null, username: user};
}

// export function issue()
// {
//   let payload = { iat: Date.now() }
//   let options = { algorithm: alg, expiresIn: "1h" }
//   let token = jwt.sign(payload, privateKey, options)

//   // logger.write(`issued token: ${ token }`)
//   return token
// }
