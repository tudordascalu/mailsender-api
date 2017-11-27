import { Request, Response } from 'express';
import * as uuid from 'uuid/v4';
import { config } from '../config/config';
import { HTTPBody, HTTPRequest } from '../protocols/http';
import { DataStore } from './../datastore/datastore';
import { HTTPResponse } from './../output/response';
import { Campaign } from './../models/campaign';
import { Schedule } from './../models/schedule';
import { Email } from './../models/email';
import * as nodeschedule from 'node-schedule';
import { EmailScheduler } from '../handlers/emailScheduler';
import { RecipientList } from '../models/recipient';
import { RecipientController } from './recipientController';

export class CampaignController {
    public static createCampaign(req: Request, res: Response, next: Function) {
        const body = req.body;
        const user = res.locals.user.realtor;
        const requiredFields = ['templateID', 'listID', 'subject', 'campaignName'];
        let missing;
        if (missing = HTTPBody.missingFields(body, requiredFields)) { return HTTPResponse.missing(res, missing, 'body'); }

        if (body.templateID === null) { return HTTPResponse.error(res, 'template must be assigned', 400); }

        // Check if list exists
        DataStore.local.recipients.find({ id: body.listID, owners: user }, {},
            (err, dbList) => {
                if (err || dbList.length < 1) return HTTPResponse.error(res, 'error finding a list with the specified id', 404);
                body.id = uuid();
                body.owners = [user];
                body.status = "active";
                body.editDate = RecipientList.getEditDate();
                const campaign = Campaign.fromRequest(body);


                // Check for the scheduledDate
                let scheduleFlag = false;
                if (campaign.scheduledDate) {
                    if (!Date.parse(campaign.scheduledDate) || Date.parse(campaign.scheduledDate) < Date.now()) { return HTTPResponse.error(res, 'scheduled date must be valid', 422); }

                    scheduleFlag = true;
                }

                // Create campaign
                DataStore.local.campaigns.addOrUpdate({ id: campaign.id, owners: user }, campaign.dbData, {},
                    (err, dbData) => {
                        console.log(err);
                        if (err) return HTTPResponse.error(res, 'error creating the campaign', 500);

                        if (scheduleFlag) {
                            EmailScheduler.scheduleCampaign(campaign,
                                (errSchedule, dataSchedule) => {
                                    if (errSchedule) return HTTPResponse.error(res, 'error scheduling the campaign in db', 400);
                                    return HTTPResponse.json(res, { message: "Campaign created and scheduled for sending", campaignID: dbData.id });
                                }
                            );
                        }
                        else { return HTTPResponse.json(res, { message: "Campaign created", campaignID: dbData.id }); }
                    }
                );
            }
        );
    }

    public static getAllCampaigns(req: Request, res: Response, next: Function) {
        const user = res.locals.user.realtor;

        DataStore.local.campaigns.find({ owners: user }, {},
            (err, dbData) => {
                if (err || dbData.length === 0) { return HTTPResponse.json(res, []); }

                let userCampaigns = [];
                for (let i = 0; i < dbData.length; i++) {
                    const campaign = Campaign.fromDatastore(dbData[i]);
                    userCampaigns.push(campaign.responseData);
                }

                HTTPResponse.json(res, userCampaigns);
            },
        );
    }

    public static getSpecificCampaign(req: Request, res: Response, next: Function) {
        const user = res.locals.user.realtor;

        DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
            (err, dbData) => {
                if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 404); }

                const campaign = Campaign.fromDatastore(dbData[0]);
                HTTPResponse.json(res, campaign.responseData);
            },
        );
    }

    public static deleteCampaign(req: Request, res: Response, next: Function) {
        const user = res.locals.user.realtor;

        DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
            (err, dbData) => {
                if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign do not exist or you cannot access it', 400); }

                const campaign = dbData[0];
                DataStore.local.campaigns.remove({ id: campaign.id }, {},
                    (err, dbData) => {
                        if (err) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }
                        HTTPResponse.success(res);
                    },
                );
            },
        );
    }

    public static sendCampaign(req: Request, res: Response, next: Function) {
        const user = res.locals.user.realtor;

        DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
            (err, dbData) => {
                if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 400); }

                const body = dbData[0];

                if (body['recipients']) {
                    if (body.recipients.length === 0) { return HTTPResponse.error(res, 'recipients field must not be empty', 400); }

                    const email = new Email(body);
                    EmailScheduler.sendEmailBlock(email, (errEmail, dataEmail) => {
                        if (errEmail) { return HTTPResponse.error(res, errEmail, 400); }
                        return HTTPResponse.success(res);
                    });
                }
                else if (body['listID']) {
                    DataStore.local.recipients.find({ id: body.listID }, {},
                        (err, dbData) => {
                            if (err || dbData.length === 0) { return HTTPResponse.error(res, 'recipients lists does not exist or you cannot access it', 400); }

                            const list = dbData[0].recipients;
                            body.recipients = list;
                            const email = new Email(body);

                            EmailScheduler.sendEmailBlock(email, (errEmail, dataEmail) => {
                                if (errEmail) { return HTTPResponse.error(res, errEmail, 400); }
                                return HTTPResponse.success(res);
                            });
                        },
                    );
                }
            }
        );
    }

    public static async updateCampaign(req: Request, res: Response, next: Function) {
        const user = res.locals.user.realtor;
        const body = req.body;

        // Check if body is empty
        if (Object.getOwnPropertyNames(body).length === 0) { return HTTPResponse.error(res, 'body is empty', 400); }

        // Check if campaign exists
        DataStore.local.campaigns.find({ id: req.params.id, owners: user }, {},
            async (err, dbData) => {
                if (err || dbData.length === 0) { return HTTPResponse.error(res, 'campaign does not exist or you cannot access it', 404); }

                let campaign = new Campaign(dbData[0]);
                campaign.updateCampaign(body);

                // Check if a new scheduledDate is send
                if (body.scheduledDate) {
                    if (!Date.parse(body.scheduledDate) || Date.parse(body.scheduledDate) < Date.now()) { return HTTPResponse.error(res, 'scheduled date must be valid', 422); }

                    // Cancel the previous schedule
                    await EmailScheduler.cancelCampaignSending(campaign);
                    // Assign the new schedule
                    campaign['scheduledDate'] = body.scheduledDate;
                    await EmailScheduler.rescheduleCampaign(campaign);
                }

                // Update campaign inside our db
                EmailScheduler.updateCampaignDB(campaign, (errUpdate, resUpdate) => {
                    if (errUpdate) { return HTTPResponse.error(res, 'campaign could not be updated', 500); }
                    return HTTPResponse.json(res, campaign.responseData);
                });
            }
        );
    }
}
