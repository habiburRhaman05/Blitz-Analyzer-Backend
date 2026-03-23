import { redis } from "../../config/redis";
import { prisma } from "../../lib/prisma";
import { ITemplateDataPayload } from "./template.interface";

const createTemplate = async (templateData:ITemplateDataPayload) =>{
     const newTemplate = await prisma.template.create({
        data:templateData
     });
     return newTemplate
}
const allTemplatesList = async () =>{
   const redisKey = "templates-list";


     const allTemplates = await prisma.template.findMany();

     return allTemplates
}
const getTemplateById = async (id:string) =>{
   const redisKey =  `template-detsail-${id}`

 
     const templateDetails = await prisma.template.findUnique({
      where:{id}
     });
   //   await redis.set(redisKey,JSON.stringify(templateDetails))
     return templateDetails
}
const updateTemplate = async (id:string) =>{
  
}
const deleteTemplate = async (id:string) =>{
  
}

export const templateServices = {createTemplate,allTemplatesList,getTemplateById,updateTemplate,deleteTemplate}