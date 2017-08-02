import { Route } from "../protocols/http"
import { DevController } from "./../controllers/devController"
import { EmailController } from "../controllers/emailController"

const secureAPI = true

// Production routes for development purposes only
export const routes: Route[] =
[
  // Websites
  new Route("Send email", "/email", "POST", secureAPI, EmailController.sendEmail),
]

// Routes for development purposes only
export const devRoutes: Route[] =
[
  // new Route("Print sites", "/dev/projects/print", "GET", false, DevController.printSites),
]
