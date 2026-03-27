// services file 
import status from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { generateCustomResumePDF, generateResumePDF, mergeResume, uploadCustomResumepdf, uploadResume } from "./resume.utils";
import { cloudinaryInstance } from "../../config/cloudinary.config";
import streamifier from "streamifier";

const generateResumeForDownload = async (
   { userId,
      resumeId, }: { userId: string, resumeId: string }
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
   // const uploadedUrl = await uploadResume(pdfBuffer,`resume-userId_${userId}_templateId_${template.id}`);

   const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinaryInstance.uploader.upload_stream(
         {
            resource_type: "raw",
            folder: "blitz-analyzer/resumes",
            public_id: `resume-userId_${userId}_templateId_${template.id}`
         },
         (error, result) => {
            if (error) return reject(error);


            resolve(result);
         }
      );

      streamifier.createReadStream(pdfBuffer).pipe(stream);
   });

   console.log("uploaded");


   // ✅ transaction
   await prisma.$transaction(async (tx) => {
      await tx.resume.update({
         where: { id: resumeId },
         data: {
            resumeUrl: uploadResult.secure_url,
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
      resumeUrl: uploadResult.secure_url,
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


   if (!template) {
      throw new AppError("Template not found", status.NOT_FOUND);
   }

   const resume = await prisma.resume.findUnique({
      where: { id: resumeId }
   })

   if (!resume) {
      throw new AppError("Resume not found", status.NOT_FOUND);
   }

   return prisma.resume.update({
      where: { id: resumeId },
      data: {
         resumeData: payload.resumeData,
         name: payload.name || resume.name,
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

const getAllResumeById = async (userId: string) => {
   const resumes = await prisma.resume.findMany({
      where: {
         userId
      },

   })

   return resumes
}
const deleteResume = async (resumeId: string) => {
   const resumes = await prisma.resume.delete({
      where: {
         id: resumeId
      }
   })

   return resumes
}


const generateCustomResumeForDownload = async (htmlContent, resumeData, userId) => {
   const pdfBuffer = await generateCustomResumePDF(htmlContent);
   const uploadPDFUrl = await uploadCustomResumepdf(pdfBuffer, userId);
   // check credit
   const wallet = await prisma.creditWallet.findUnique({
      where: { userId }
   });

   if (!wallet || wallet.balance < 10) {
      throw new AppError("Not enough credits", status.BAD_REQUEST);
   }
   await prisma.creditWallet.update({
      where: { userId },
      data: {
         balance: { decrement: 10 }
      }
   });
   console.log(uploadPDFUrl);
   
   return uploadPDFUrl
}

export const resumeServices = { generateResumeForDownload, initResume, saveChanges, getAllResumeById, deleteResume, generateCustomResumeForDownload }