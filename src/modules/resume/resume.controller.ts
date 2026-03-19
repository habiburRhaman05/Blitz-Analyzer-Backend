
// controller 
import status from "http-status";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { resumeServices } from "./resume.service";

const updateResume = asyncHandler(async(req ,res)=>{


    const payload = {
         payload: req.body,
    resumeId:req.body.resumeId,

    templateId: req.body.templateId
    }

    const result = await resumeServices.saveChanges(payload);
    return sendSuccess(res,{
        data:result,
        message:"your resume is ready",
        statusCode:status.CREATED
    })
})

const initlizeResume = asyncHandler(async(req ,res)=>{

    const payload = {
    userId: res.locals.user.id,
    templateId: req.body.templateId
    }

    const result = await resumeServices.initResume(payload);
    return sendSuccess(res,{
        data:result,message:"your resume is initlize",
        statusCode:status.CREATED
    })
})

const generateResumeForDownload = asyncHandler(async(req ,res)=>{

   

    const result = await resumeServices.generateResumeForDownload({
    userId: res.locals.user.id,
    resumeId: req.params.id as string
    });
    return sendSuccess(res,{
        data:result,message:"your resume is initlize",
        statusCode:status.CREATED
    })
})

export const resumeControllers = {
updateResume,initlizeResume,generateResumeForDownload
}