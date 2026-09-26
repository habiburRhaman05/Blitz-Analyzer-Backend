// services file 
import status from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { generateCustomResumePDF, generateResumePDF, mergeResume, uploadCustomResumepdf, uploadResume } from "./resume.utils";
import { cloudinaryInstance } from "../../config/cloudinary.config";
import { uploadPdfBufferToCloudinary } from "../media/media.service";
import streamifier from "streamifier";
import { getProfileCacheKey } from "../auth/auth.service";
import { redis } from "../../config/redis";
import { UserRole } from "../../generated/prisma/enums";
import { templateServices } from "../template/template.service";

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

   // ✅ template check
   const template = await prisma.template.findUnique({
      where: { id: resume.templateId }
   });

   if (!template) {
      throw new AppError("Template not found", status.NOT_FOUND);
   }

   // ✅ check credit - only premium templates charge, and only their own
   // price (was previously a hardcoded 10 regardless of template.isPremium,
   // so every generation charged even on free templates).
   let wallet: { balance: number } | null = null;
   if (template.isPremium) {
      wallet = await prisma.creditWallet.findUnique({
         where: { userId }
      });

      if (!wallet || wallet.balance < template.price) {
         throw new AppError("Not enough credits", status.BAD_REQUEST);
      }
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
            // .pdf in the public_id so the delivered file is recognized as a
            // PDF (raw uploads keep the id verbatim as the filename/extension).
            public_id: `resume-userId_${userId}_templateId_${template.id}.pdf`
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

      if (template.isPremium) {
         await tx.creditWallet.update({
            where: { userId },
            data: {
               balance: { decrement: template.price }
            }
         });
      }
   });

   // reset user cache 
       const cacheKey = getProfileCacheKey(userId, UserRole.USER);
       await redis.del(cacheKey);
   
   return {
      resumeUrl: uploadResult.secure_url,
      name: resume.name,
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

   const resume = await prisma.resume.create({
      data: {
         templateId,
         userId,
         resumeData: {},
         resumeHtml: template.htmlLayout,
         resumeUrl: "",
         isEdit: true // dirty state
      }
   });

   // Real usage signal for "Most Popular Templates" - fire-and-forget so a
   // tracking hiccup never blocks the user from actually building.
   templateServices.incrementUsage(templateId).catch((err) =>
      console.error("Failed to record template usage:", err)
   );

   return resume;
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


const generateCustomResumeForDownload = async (htmlContent, userId) => {
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
  
      // reset user cache 
       const cacheKey = getProfileCacheKey(userId, UserRole.USER);
       await redis.del(cacheKey);
   
   return uploadPDFUrl
}

// Stores a browser-generated PDF to Cloudinary and returns its URL. Called
// ONLY when the user explicitly asks for a shareable link - normal download
// happens entirely in the browser and never touches the cloud.
const shareResumePdf = async (
   { userId, resumeId, buffer }: { userId: string; resumeId: string; buffer: Buffer }
) => {
   const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
   });
   if (!resume) throw new AppError("Resume not found", status.NOT_FOUND);

   const uploaded = await uploadPdfBufferToCloudinary(buffer, "Resume", {
      resource_type: "raw",
      folder: "blitz-analyzer/resumes",
      public_id: `resume-share-${resumeId}.pdf`,
   });

   await prisma.resume.update({
      where: { id: resumeId },
      data: { resumeUrl: uploaded.secure_url },
   });

   return { resumeUrl: uploaded.secure_url };
};

export const resumeServices = { generateResumeForDownload, initResume, saveChanges, getAllResumeById, deleteResume, generateCustomResumeForDownload, shareResumePdf }