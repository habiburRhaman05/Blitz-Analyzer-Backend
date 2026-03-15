import status from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ICreateResumePayload } from "./resume.interface";
import { generateResumePDF, mergeResume, uploadResume } from "./resume.utils";

const createResume = async (resumePayload:ICreateResumePayload) =>{

   // check template exist or not

   const template = await prisma.template.findUnique({
      where:{id:resumePayload.templateId}
   })
   

   if(!template) {
      throw new AppError("Resume Template not found",status.NOT_FOUND)
   }
    
   // check template is paid by user or not 


         // merge resumeDataJson + htmllayoyt = final resume in html template
     const finalResumeHtml = mergeResume({
      templateString:template.htmlLayout,
      resumeData:resumePayload.resumeData
     })
 


    //Generate PDF - use background task leter 

    const resumePdfBuffer = await generateResumePDF(finalResumeHtml);

    //Upload PDF - use background task leter

    const uploadedResume = await uploadResume(resumePdfBuffer)

       // save data in db
    const newResume = await prisma.resume.create({
      data:{
         templateId:resumePayload.templateId,
         userId:resumePayload.userId,
         resumeData:resumePayload.resumeData,
         resumeHtml:finalResumeHtml,
         resumeUrl: uploadedResume
      }
    })


    return newResume

}

export const resumeServices = {createResume}