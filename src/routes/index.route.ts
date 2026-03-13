import { Router } from "express";
import authRouter from "../modules/auth/auth.route"
import analyzerRouter from "../modules/analyzer/analyzer.route";

const indexRouter = Router();
indexRouter.use("/auth",authRouter)
indexRouter.use("/analyzer",analyzerRouter)


export default indexRouter