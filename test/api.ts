import * as chai from "chai"
import * as chaiHttp from "chai-http"
// import * as request from "request"
// import * as http from "http"

let authServer = "https://api.zigna.dk/v3",
    apiServer = "http://localhost:3000/v1"
let err, res, body, accessToken

const expect = chai.expect
chai.use(chaiHttp)

const emailData = {
  sender: "support@zigna.co",
  recipients: ["andrei@zigna.co"],
  message: "test mail",
  subject: "this is a test",
}

const emailData2 = {
  sender: "support@zigna.co",
  listID: "f8dfc4be-ffb2-4a5d-90f7-59e870f912f0",
  message: "test mail",
  subject: "this is a test",
}

const recipientData = {
  recipients: ["andrei@zigna.co","support@zigna.co","thomas@zigna.co"]
}

const recipientData2 = {
  add: ["support@zigna.co"],
  delete: ["thomas@zigna.co","test@zigna.co"]
}

const listID = "f8dfc4be-ffb2-4a5d-90f7-59e870f912f0";

authenticate()
// postRequest(0, "/email", emailData)
// postRequest(0, "/email/list", emailData2)
// postRequest(0, "/list", recipientData)
// getRequest(0, "/list", {})
// getRequest(0, "/list/"+listID, {})
// postRequest(0, "/list/"+listID+"/delete", {})
// postRequest(0, "/list/"+listID+"/update", recipientData2)

function authenticate()
{
  describe("Authentication", () =>
  {
      before((done) =>
      {
          let data = {"grant_type": "password", "username": "jlh@zigna.dk", "password": "Test1234"}
          // let data = {"grant_type": "password", "username": "thomas@zigna.co", "password": "123456"}
          chai.request(authServer)
          .post("/oauth2/token")
          .set("content-type", ContentType.urlEncoded)
          .send(data)
          .end(jsonCallback(done))
      })

      it("should return status code 200", (done) =>
      {
          expect(err).to.be.null
          expect(res).to.have.status(200)
          done()
      })

      it("should provide access token", (done) =>
      {
          accessToken = body.access_token
          expect(accessToken).to.not.be.null
          done()
      })

      it("should provide refresh token", (done) =>
      {
          expect(body.refresh_token).to.not.be.null
          done()
      })
  })
}

function postRequest(delay: number, url: string, data: any)
{
  describe("POST " + url, () =>
  {
    before((done) =>
    {
        chai.request(apiServer)
        .post(url)
        .set("content-type", ContentType.json)
        .set("authorization", "Bearer " + accessToken)
        .send(data)
        .end(jsonCallback(done))
    })

    it("should return status 200", (done) =>
    {
        console.log("error: " + err)
        console.log("body: " + JSON.stringify(body))
        expect(res).to.have.status(200)
        expect(err).to.be.null
        done()
    })
  })
}

function getRequest(delay: number, url: string, data: any)
{
  describe("GET " + url, () =>
  {
      before((done) =>
      {
        console.log("get before")
          chai.request(apiServer)
          .get(url)
          .set("content-type", ContentType.json)
          .set("authorization", "Bearer " + accessToken)
          .send(data)
          .end(jsonCallback(done))
      })

      it("should return status 200", (done) =>
      {
        console.log("body: " + JSON.stringify(body))
        expect(res).to.have.status(200)
        expect(err).to.be.null
        done()
      })
  })
}

class ContentType
{
  static urlEncoded = "application/x-www-form-urlencoded"
  static json = "application/json"
}

function jsonCallback(done)
{
  return (error, response) =>
  {
    err = error
    res = response
    if (response)
    { body = JSON.parse(response.text) }
    done()
  }
}

function textCallback(done)
{
  return (error, response) =>
  {
    // console.log(`response: ${ JSON.stringify(response) }`)
    err = error
    res = response
    done()
  }
}
