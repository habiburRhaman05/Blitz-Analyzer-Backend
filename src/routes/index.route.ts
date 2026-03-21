import { Router } from "express";
import authRouter from "../modules/auth/auth.route"
import analyzerRouter from "../modules/analyzer/analyzer.route";
import templateRouter from "../modules/template/template.route";
import resumeRouter from "../modules/resume/resume.route";
import pricngRouter from "../modules/pricing/pricingPlan.routes";
import paymentRouter from "../modules/payment/payment.route";
import walletRouter from "../modules/wallet/wallet.route";
import mediaRouter from "../modules/media/media.route";

const indexRouter = Router();
indexRouter.use("/auth",authRouter)
indexRouter.use("/analyzer",analyzerRouter)
indexRouter.use("/resume",resumeRouter)
indexRouter.use("/template",templateRouter)
indexRouter.use("/pricing",pricngRouter)
indexRouter.use("/payment",paymentRouter)
indexRouter.use("/wallet",walletRouter)
indexRouter.use("/upload-media",mediaRouter)



export default indexRouter