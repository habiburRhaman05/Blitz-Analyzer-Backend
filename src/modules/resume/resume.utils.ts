import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import { uploadPdfBufferToCloudinary } from "../media/media.service";
import { AppError } from "../../utils/AppError";

export const mergeResume = ({templateString,resumeData}:{resumeData:any,templateString:string})=>{
const template = Handlebars.compile(templateString);
const finalHTML = template(resumeData);

return finalHTML
}


export async function generateResumePDF(html:string, options = {}) {
const browser = await puppeteer.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // আপনার Chrome path
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

  try {
    const page = await browser.newPage();
    // Set HTML content
    await page.setContent(html, { waitUntil: "networkidle0" });
    // Optional: Add custom CSS for Tailwind or template
    // await page.addStyleTag({ path: "path/to/tailwind.css" });
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
      ...options,
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
};


export const uploadResume = async (resumeBuffer:Uint8Array<ArrayBufferLike> | any,filename:string):Promise<string>=>{
  console.log("start uploading");
  
  //  const  {secure_url} = await uploadPdfBufferToCloudinary(resumeBuffer,"resume",{
  //   folder:"resumes",
  //   public_id:filename,
  //   resource_type:"row"
  //  })
const secure_url = "https://collection.cloudinary.com/drngnsgwy/240f440bd6d672875f4285acc7e61f0e"
   if(!secure_url){
    throw new AppError(`failed to upload ${filename} in cloudinary`,400)
   }
   console.log("end uploading",secure_url);
   
    return secure_url
}