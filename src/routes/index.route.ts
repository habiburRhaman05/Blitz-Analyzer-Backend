import { Router } from "express";
import authRouter from "../modules/auth/auth.route"
import analyzerRouter from "../modules/analyzer/analyzer.route";
import templateRouter from "../modules/template/template.route";
import resumeRouter from "../modules/resume/resume.route";

const indexRouter = Router();
indexRouter.use("/auth",authRouter)
indexRouter.use("/analyzer",analyzerRouter)
indexRouter.use("/resume",resumeRouter)
indexRouter.use("/template",templateRouter)


export default indexRouter