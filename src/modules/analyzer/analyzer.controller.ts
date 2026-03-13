import { Request } from "express";
import { asyncHandler } from "../../utils/asyncHandler"
import { analyzerServices } from "./analyzer.services";
import { sendSuccess } from "../../utils/apiResponse";
import { pdfToText } from "pdf-ts";


const completeAnalysesResumeResult = asyncHandler(async(req:any,res)=>{
    
    
   
    const {jobInfo,parseText,scan_type} = req.body;


    let result = {}
    if(scan_type === "ats-scan"){
      result = await analyzerServices.resumeATSScan(parseText);
    }
    if(scan_type === "job-matcher"){
      result = await analyzerServices.resumeJobMatcher({resumeText:parseText,jobInfo});
    }

   
    return sendSuccess(res,{
        message:"Resume Analysis Successfully",
        data:result
    })
})


const parseResumeController = asyncHandler(async(req,res)=>{
  if (!req.file) {
      return res.status(400).send({ error: "No file uploaded" });
    }
       const parseText = await analyzerServices.parseResumeService(req.file.buffer);
       return sendSuccess(res,{
        message:"Resume Parsed SuccessFully",
        data:{
            parseText
        }
       })
})





export const analyzerControllers ={
completeAnalysesResumeResult,
parseResumeController
}

