import status from "http-status";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { resumeServices } from "./resume.service";

const createResumeController = asyncHandler(async(req ,res)=>{


    const payload = {
         resumeData: req.body.resumeData,
   
    userId: res.locals.auth.userId,
    templateId: req.body.templateId
    }

    const result = await resumeServices.createResume(payload);
    return sendSuccess(res,{
        data:result,message:"your resume is ready",
        statusCode:status.CREATED
    })
})

const initlizeResume = asyncHandler(async(req ,res)=>{

    const payload = {
    userId: res.locals.auth.userId,
    templateId: req.body.templateId
    }

    const result = await resumeServices.initResume(payload);
    return sendSuccess(res,{
        data:result,message:"your resume is initlize",
        statusCode:status.CREATED
    })
})

export const resumeControllers = {
createResumeController,initlizeResume
}