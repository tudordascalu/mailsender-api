import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { Logger } from '../output/logger';


const alg = 'RS256'; // "HS256"

// let privateKey = "VerySecretSecret"
// let privateKey = fs.readFileSync("keys/private-test.pem")
const publicKey = fs.readFileSync('keys/public.pem');

export function validate(token: any): { err: any, user: any }
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
  { return { err: err, user: null }; }

  if (decoded == null)
  { return { err: 'Invalid token', user: null }; }

  const user =
    {
      realtor: decoded.realtorID,
      email: decoded.email,
    };
  return { err: null, user: user };
}

// export function issue()
// {
//   let payload = { iat: Date.now() }
//   let options = { algorithm: alg, expiresIn: "1h" }
//   let token = jwt.sign(payload, privateKey, options)

//   // logger.write(`issued token: ${ token }`)
//   return token
// }
