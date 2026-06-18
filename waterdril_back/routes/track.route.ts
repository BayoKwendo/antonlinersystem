// =============================================================================
//  Real-time tracking route. GET /ws is upgraded to a WebSocket connection.
// =============================================================================
import { Router } from "../deps.ts";
import trackController from "../controllers/trackController.ts";

const router = new Router();

router.get("/ws", trackController.handle);

export default router;
