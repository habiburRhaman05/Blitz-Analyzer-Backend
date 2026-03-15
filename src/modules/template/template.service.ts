import { prisma } from "../../lib/prisma";
import { ITemplateDataPayload } from "./template.interface";

const createTemplate = async (templateData:ITemplateDataPayload) =>{
     const newTemplate = await prisma.template.create({
        data:templateData
     });
     return newTemplate
}

export const templateServices = {createTemplate}