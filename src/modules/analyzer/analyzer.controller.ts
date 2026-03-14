import { Request } from "express";
import { asyncHandler } from "../../utils/asyncHandler"
import { analyzerServices } from "./analyzer.services";
import { sendError, sendSuccess } from "../../utils/apiResponse";
import { pdfToText } from "pdf-ts";
import { v7 as uuidv7 } from "uuid";
import { redis } from "../../config/redis";


const completeAnalysesResumeResult = asyncHandler(async(req,res)=>{
    
  
    

  const id = req.params.id
  

  // check redis key exist 

   const data = await redis.get(`resume:${id}`);
   
   if(!data){
     return sendError(res,{
      message:"cache not found werfewrwer"
     })
   }
   
   
    const {jobInfo,parseText,analysisType} = JSON.parse(data)

console.log(JSON.parse(data));

 
    if(analysisType === "ats_scan"){
      let result = await analyzerServices.resumeATSScan(parseText);
      return sendSuccess(res,{
        message:"Resume Analysis Successfully",
        data:result
    })
    }
    if(analysisType === "job_match"){
     let  result = await analyzerServices.resumeJobMatcher({resumeText:parseText,jobInfo});
          return sendSuccess(res,{
        message:"Resume Analysis Successfully",
        data:result
    })
    }

   
    
})



const parseResumeController = asyncHandler(async (req, res) => {
console.log("comming");

  if (!req.file) {
    return res.status(400).send({ error: "No file uploaded" });
  }


  const { analysisType, jobData } = req.body;
console.log("body",req.body);

  if (!analysisType) {
    return res.status(400).json({ error: "analysisType is required" });
  }

  const parseText = await analyzerServices.parseResumeService(req.file.buffer);

  const analysisId = uuidv7();

  const parseDoc = {
    id: analysisId,
    parseText,
    analysisType,
    jobInfo: analysisType === "job_match" ? JSON.parse(jobData) : null,

    resumeFile: {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    }
  };

  // Save in Redis with TTL 60 seconds
  await redis.set(
    `resume:${analysisId}`,
    JSON.stringify(parseDoc),
    "EX",
    60
  );

  return sendSuccess(res, {
    message: "Resume Parsed Successfully",
    data: {
      id: analysisId
    }
  });

});



export const analyzerControllers ={
completeAnalysesResumeResult,
parseResumeController
}

