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

export const templateControllers = {
createTemplateController
}