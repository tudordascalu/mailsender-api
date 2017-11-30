import { EmailController } from '../controllers/emailController';
import { RecipientController } from '../controllers/recipientController';
import { UserController } from '../controllers/userController';
import { Route } from '../protocols/http';
import { CampaignController } from './../controllers/campaignController';
import { DevController } from './../controllers/devController';

const secureAPI = true;

// Production routes for development purposes only
export const routes: Route[] =
[
  new Route('Get user', '/account', 'GET', secureAPI, UserController.get),
  new Route('Upload user images', '/account/images', 'POST', secureAPI, UserController.uploadImages, 'images'),
  new Route('Delete user images', '/account/images/delete', 'POST', secureAPI, UserController.deleteImages),

  // Routes
  new Route('Send email', '/email', 'POST', secureAPI, EmailController.sendEmail),
  // new Route('Send email', '/email/list', 'POST', secureAPI, EmailController.sendEmailToList),
  // new Route('List topics SNS', '/topics', 'GET', secureAPI, EmailController.listTopics),
  // new Route('List queues SQS', '/queues', 'GET', secureAPI, EmailController.listQueues),

  new Route('Get all recipient lists', '/lists', 'GET', secureAPI, RecipientController.getAllLists),
  new Route('Get spicific recipient list', '/lists/:id', 'GET', secureAPI, RecipientController.getSpecificList),
  new Route('Create recipient list', '/lists', 'POST', secureAPI, RecipientController.createList),
  new Route('Delete recipient list', '/lists/:id/delete', 'POST', secureAPI, RecipientController.deleteList),
  new Route('Update recipient list', '/lists/:id/update', 'POST', secureAPI, RecipientController.updateList),

  new Route('Create campaign', '/campaigns', 'POST', secureAPI, CampaignController.create),
  new Route('Get all campaigns', '/campaigns', 'GET', secureAPI, CampaignController.get),
  new Route('Delete spicific campaign', '/campaigns/:id/delete', 'POST', secureAPI, CampaignController.delete),
  new Route('Schedule campaign', '/campaigns/:id/send', 'GET', secureAPI, CampaignController.send),
  new Route('Update scheduled campaign', '/campaigns/:id/update', 'POST', secureAPI, CampaignController.update),

  new Route('Upload campaign images', '/campaigns/:id/images', 'POST', secureAPI, CampaignController.uploadImages, 'images'),
  new Route('Delete campaign images', '/campaigns/:id/images/delete', 'POST', secureAPI, CampaignController.deleteImages),
];

// Routes for development purposes only
export const devRoutes: Route[] =
[
  // new Route("Print sites", "/dev/projects/print", "GET", false, DevController.printSites),
];
