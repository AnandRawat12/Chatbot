import { Router } from "express";
import { handleData,sessionId } from "../controllers/chatBotController";

const router = Router();

router.get("/sessionId",sessionId)
router.post("/data", handleData);

export default router;
