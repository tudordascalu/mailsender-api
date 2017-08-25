import { EmailController } from '../controllers/emailController';
import { RecipientController } from '../controllers/recipientController';
import { Route } from '../protocols/http';
import { DevController } from './../controllers/devController';

const secureAPI = true;

// Production routes for development purposes only
export const routes: Route[] =
[
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
];

// Routes for development purposes only
export const devRoutes: Route[] =
[
  // new Route("Print sites", "/dev/projects/print", "GET", false, DevController.printSites),
];
