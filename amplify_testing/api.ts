import * as chai from "chai"
import * as chaiHttp from "chai-http"
import * as randomString from "randomstring"
// import * as request from "request"
// import * as http from "http"

let authServer = "https://api.zigna.dk/v3",
    // apiServer = "http://localhost:3000/emarketer/v1"
    apiServer = "http://localhost:3000/v1"
let err, res, body, accessToken

const expect = chai.expect
chai.use(chaiHttp)

authenticate()

/// Pages
// MMLiving: "183590878325771"
// Zigna Marketing Page: "1575968772422551"
// Hjemlig: 581097962026263

/// Accounts
// MMLiving: "461699837507708"
// TestAccount: "458576697820022"
// Hjemlig: "461913110819714"

// const campaignID = "23842579548140359"
const adAccountID = "461699837507708"
const budget = 37165
const caseNumber = "1utyP0Gh0hsCHghDuDeyWBwDt18i0jSn" // randomString.generate(6)
const campaignID = "23842614401720502"

const campaignData =
{
  caseNumber: caseNumber,
  budget: budget,
  pageURL: "http://www.mmliving.dk/sag/67981/Amager-Strandvej-162C-4-TH-2300-Koebenhavn-S",
  fbPageID: "183590878325771",
  adAccountID: adAccountID,
}

const adSetData =
{
  campaignID: campaignID,
  budget: budget,
  caseNumber: caseNumber,
  adAccountID: adAccountID,
}

const ads = []
for (let i = 36; i <= 40; i++)
{
  let filename = `${ i }`
  while (filename.length < 3)
  { filename = `0${ filename }` }

  ads.push(
  {
    title: "Amager Strandvej 162C 4TH, 2300 Koebenhavn S",
    body: "Eksklusiv lejlighed fra 2014 ved Øresund metrostation. 121 kvm. med stor altan og smuk udsigt. Månedlig ejerudgift 3.975 kr.",
    imageURL: `https://s3.eu-central-1.amazonaws.com/zigna-fbads-images/DK88921/Cropped/${ filename }.jpg`,
  })
}

const creativeData =
{
  pageURL: "http://www.mmliving.dk/sag/67981/Amager-Strandvej-162C-4-TH-2300-Koebenhavn-S",
  fbPageID: "183590878325771",
  ads: ads,
  caseNumber: caseNumber,
  adAccountID: adAccountID,
}

const creatives =
[
  "23842614402880502", "23842614402910502", "23842614402870502", "23842614402900502", "23842614402890502",
  "23842614402930502", "23842614402920502", "23842614402960502", "23842614402940502", "23842614402980502",
  "23842614403000502", "23842614403020502", "23842614402990502", "23842614403030502", "23842614403010502",
  "23842614403080502", "23842614403040502", "23842614403070502", "23842614403060502", "23842614403050502",
  "23842614404020502", "23842614404050502", "23842614404030502", "23842614404010502", "23842614404040502",
  "23842614404070502", "23842614404080502", "23842614404110502", "23842614404090502", "23842614404100502",
  "23842614405840502", "23842614405870502", "23842614405850502", "23842614405860502", "23842614405830502",
  "23842614409200502", "23842614409180502", "23842614409210502", "23842614409220502", "23842614409190502",
]

const adSets = ["23842614402520502", "23842614402380502", "23842614402470502", "23842614402420502"]

const adSetNumber = 4
const creativesLower = 35, range = 10
let creativesUpper = Math.min(creativesLower + range, creatives.length)
const subCreatives = creatives.slice(creativesLower, creativesUpper)

const adData =
{
  offset: creativesLower,
  creatives: subCreatives,
  adSetID: adSets[adSetNumber - 1],
  adSetNumber: adSetNumber,
  adAccountID: adAccountID,
  caseNumber: caseNumber,
}

// postRequest(0, "/fbads/partial/campaign", campaignData)
// postRequest(0, "/fbads/partial/adsets", adSetData)
// postRequest(0, "/fbads/partial/creatives", creativeData)
console.log("Number of creatives: " + subCreatives.length)
postRequest(0, "/fbads/partial/ads", adData)

// postRequest(0, "/fbads/campaign", campaignData)
// getRequest(0, "/fbads/campaign", { campaignID: campaignID })
// getRequest(0, "/fbads/campaign", {})
// postRequest("/fbads/account", {})
// getRequest(0, "/fbads/campaign/insights", { campaignID: campaignID })

function authenticate()
{
  describe("Authentication", () =>
  {
      before((done) =>
      {
          let data = {"grant_type": "password", "username": "jjn@zigna.dk", "password": "123456"}
          chai.request(authServer)
          .post("/oauth2/token")
          .set("content-type", ContentType.urlEncoded)
          .send(data)
          .end(defaultCallback(done))
          // done();
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
        .end(defaultCallback(done))
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
        setTimeout(function()
        {
          chai.request(apiServer)
          .get(url)
          .set("content-type", ContentType.json)
          .set("authorization", "Bearer " + accessToken)
          .send(data)
          .end(defaultCallback(done))
        }, (delay * 1000))
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

function defaultCallback(done)
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
