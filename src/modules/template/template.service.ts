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

   const cacheData = await redis.get(redisKey)
   if(cacheData){
  return JSON.parse(cacheData)
   }
     const allTemplates = await prisma.template.findMany();
     await redis.set(redisKey,JSON.stringify(allTemplates))
     return allTemplates
}
const getTemplateById = async (id:string) =>{
   const redisKey =  `template-detsail-${id}`

   const cacheData = await redis.get(redisKey)
//    if(cacheData){
//   return JSON.parse(cacheData)
//    }
     const templateDetails = await prisma.template.findUnique({
      where:{id}
     });
     await redis.set(redisKey,JSON.stringify(templateDetails))
     return templateDetails
}

export const templateServices = {createTemplate,allTemplatesList,getTemplateById}