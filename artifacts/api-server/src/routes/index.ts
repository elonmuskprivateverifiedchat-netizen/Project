import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import walletsRouter from "./wallets";
import tradesRouter from "./trades";
import managersRouter from "./managers";
import messagesRouter from "./messages";
import p2pRouter from "./p2p";
import assetsRouter from "./assets";
import supportRouter from "./support";
import authRouter from "./auth";
import kycRouter from "./kyc";
import notificationsRouter from "./notifications";
import cardsRouter from "./cards";
import bankRouter from "./bank";
import adminRouter from "./admin";
import programsRouter from "./programs";
import referralsRouter from "./referrals";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

router.use(requireAuth);

router.use("/users", usersRouter);
router.use("/wallets", walletsRouter);
router.use("/trades", tradesRouter);
router.use("/managers", managersRouter);
router.use("/messages", messagesRouter);
router.use("/p2p", p2pRouter);
router.use("/assets", assetsRouter);
router.use("/support", supportRouter);
router.use("/kyc", kycRouter);
router.use("/notifications", notificationsRouter);
router.use("/cards", cardsRouter);
router.use("/bank", bankRouter);
router.use("/admin", adminRouter);
router.use("/programs", programsRouter);
router.use("/referrals", referralsRouter);

export default router;
