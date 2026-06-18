// =============================================================================
//  User / booking / payment routes.
//  Paths and verbs are kept identical to the legacy API so existing clients
//  (web portal + mobile app) keep working without changes.
// =============================================================================
import { Router } from "../deps.ts";
import c from "../controllers/userController.ts";

const router = new Router();

router
  // --- auth ---
  .post("/login", c.loginUser)
  .post("/password_reset", c.userPwd)

  // --- users ---
  .post("/user", c.createUser)
  .post("/user_edit", c.editUser)
  .post("/user_edit_photo", c.updateUser)
  .post("/update_customer", c.updateCustomerProfile)
  .post("/update_location", c.updateCurrentLocation)
  .post("/deactivate_user", c.updateStatus)
  .get("/users", c.getUser)
  .post("/user_driver", c.getUserDriver)
  .get("/user_driver_all", c.getUserDriverAll)
  .get("/user_driver_one", c.getUserDriverOne)
  .post("/nearby", c.getUserOneLat)

  // --- services ---
  .get("/service", c.getServices)
  .get("/service_portal", c.getServices)
  .post("/service_url", c.getServicesApp)
  .post("/service_add", c.addService)
  .post("/service", c.updateService)
  .post("/deactivate_service", c.updateStatusActive)

  // --- bookings / reporting ---
  .post("/booking_status", c.updateBookingUser)
  .post("/make_report", c.makeReport)
  .get("/service_request", c.getServiceRequest)
  .get("/service_request_driver", c.getServiceRequestDriver)
  .get("/transaction", c.getTransaction)

  // --- payments ---
  .post("/stk", c.stkTest)
  .post("/stk_t", c.stkTestInitiate)
  .post("/checkStk", c.checkSTKTest)
  .post("/pay", c.mpesaConfirmation)
  .post("/reconcile", c.mpesaConfirmationPortal)

  // --- misc ---
  .post("/send_sms", c.sendSMS);

export default router;
