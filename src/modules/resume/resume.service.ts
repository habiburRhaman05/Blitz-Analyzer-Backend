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
   if (resume.resumeUrl && !resume.isEdit) {
      return {
         resumeUrl: resume.resumeUrl,
         reused: true
      };
   }

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

   // ✅ upload
   const uploadedUrl = await uploadResume(pdfBuffer);

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
   resumeId,
   templateId,
   payload
}: {
   resumeId: string;
   templateId: string;
   payload: any;
}) => {

   const template = await prisma.template.findUnique({
      where: { id: templateId }
   });

   if (!template) {
      throw new AppError("Template not found", status.NOT_FOUND);
   }

   return prisma.resume.update({
      where: { id: resumeId },
      data: {
         resumeData: payload,
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
export const resumeServices = { generateResumeForDownload, initResume, saveChanges }