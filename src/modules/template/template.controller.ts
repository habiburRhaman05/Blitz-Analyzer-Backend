import status from "http-status";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { templateServices } from "./template.service";

const createTemplateController = asyncHandler(async(req ,res)=>{
    const result = await templateServices.createTemplate(req.body);
    return sendSuccess(res,{
        data:result,message:"New Template Created Successfully",
        statusCode:status.CREATED
    })
})

const getAllTemplates = asyncHandler(async(req ,res)=>{
    const result = await templateServices.allTemplatesList();
    return sendSuccess(res,{
        data:result,message:"all template fetched",
        
    })
})
const getTemplateDetails = asyncHandler(async(req ,res)=>{
    const result = await templateServices.getTemplateById(req.params.id as string);
    return sendSuccess(res,{
        data:result,message:"fetched template details",
        
    })
})

export const templateControllers = {
createTemplateController,
getAllTemplates,
getTemplateDetails
}