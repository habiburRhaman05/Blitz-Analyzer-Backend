import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { userServices } from "./user.service";

const getUserKPIReports = asyncHandler(async(req,res) =>{
    const userId = res.locals.user.id;
    const reports = await userServices.dashboardKPIReports(userId);
    return sendSuccess(res,{
        data:reports,
        message:"Fetched All Kpi reports"
    })
})
const getPublicKPIReports = asyncHandler(async(req,res) =>{
    const reports = await userServices.getKPISData();
    return sendSuccess(res,{
        data:reports,
        message:"Fetched  All public  Kpi reports"
    })

})

export const userControllers = {getUserKPIReports,getPublicKPIReports}