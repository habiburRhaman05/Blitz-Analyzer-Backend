// services file 
import status from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { generateResumePDF, mergeResume, uploadResume } from "./resume.utils";

const generateResumeForDownload = async (
   {userId,
   resumeId,}:{userId:string,resumeId:string}
) => {

   const resume = await prisma.resume.findUnique({
      where: { id: resumeId }
   });

   if (!resume) {
      throw new AppError("Resume not found", status.NOT_FOUND);
   }

   // ✅ ownership check
   if (resume.userId !== userId) {
      throw new AppError("Unauthorized", status.UNAUTHORIZED);
   }

   // ✅ already generated & not edited
   // if (resume.resumeUrl && !resume.isEdit) {
   //    return {
   //       resumeUrl: resume.resumeUrl,
   //       reused: true
   //    };
   // }

   // ✅ check credit
   const wallet = await prisma.creditWallet.findUnique({
      where: { userId }
   });

   if (!wallet || wallet.balance < 10) {
      throw new AppError("Not enough credits", status.BAD_REQUEST);
   }

   // ✅ template check
   const template = await prisma.template.findUnique({
      where: { id: resume.templateId }
   });

   if (!template) {
      throw new AppError("Template not found", status.NOT_FOUND);
   }

   // ✅ merge HTML
   const finalHtml = mergeResume({
      templateString: template.htmlLayout,
      resumeData: resume.resumeData
   });

   // ✅ generate PDF
   const pdfBuffer = await generateResumePDF(finalHtml);
console.log("before uplaod");
console.log("pdf buffer",pdfBuffer);

   // ✅ upload
   const uploadedUrl = await uploadResume(pdfBuffer,`resume-userId_${userId}_templateId_${template.id}`);

   // ✅ transaction
   await prisma.$transaction(async (tx) => {
      await tx.resume.update({
         where: { id: resumeId },
         data: {
            resumeUrl: uploadedUrl,
            isEdit: false
         }
      });

      await tx.creditWallet.update({
         where: { userId },
         data: {
            balance: { decrement: 10 }
         }
      });
   });

   return {
      resumeUrl: uploadedUrl,
      reused: false
   };
};
const saveChanges = async ({
   payload,
   resumeId,
   templateId,
}: {
   resumeId: string;
   templateId: string;
   payload: any;
}) => {

   const template = await prisma.template.findUnique({
      where: { id: templateId }
   });
console.log(template?.id);

   if (!template) {
      throw new AppError("Template not found", status.NOT_FOUND);
   }

   const resume = await prisma.resume.findUnique({
      where:{id:resumeId}
   })
   
   if (!resume) {
      throw new AppError("Resume not found", status.NOT_FOUND);
   }

   return prisma.resume.update({
      where: { id: resumeId },
      data: {
         resumeData: payload,
         name:payload.name || resume.name,
         isEdit: true
      }
   });
};
const initResume = async ({
   userId,
   templateId
}: {
   userId: string;
   templateId: string;
}) => {

   const template = await prisma.template.findUnique({
      where: { id: templateId }
   });

   if (!template) {
      throw new AppError("Template not found", status.NOT_FOUND);
   }

   return prisma.resume.create({
      data: {
         templateId,
         userId,
         resumeData: {},
         resumeHtml: template.htmlLayout,
         resumeUrl: "",
         isEdit: true // dirty state
      }
   });
};

const getAllResumeById = async (userId:string) =>{
   const resumes = await prisma.resume.findMany({
      where:{
         userId
      },
     
   })

   return resumes
}
const deleteResume = async (resumeId:string) =>{
   const resumes = await prisma.resume.delete({
      where:{
         id:resumeId
      }
   })

   return resumes
}
export const resumeServices = { generateResumeForDownload, initResume, saveChanges,getAllResumeById,deleteResume }