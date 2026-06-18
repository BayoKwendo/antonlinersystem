// =============================================================================
//  Health / connectivity routes.
// =============================================================================
import { Router } from "../deps.ts";
import testController from "../controllers/testController.ts";

const router = new Router();

router.get("/", testController.health);

export default router;
