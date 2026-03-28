import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import { uploadPdfBufferToCloudinary } from "../media/media.service";
import { AppError } from "../../utils/AppError";
import { cloudinaryInstance } from "../../config/cloudinary.config";
import streamifier from "streamifier";
export const mergeResume = ({ templateString, resumeData }: { resumeData: any, templateString: string }) => {
  const template = Handlebars.compile(templateString);
  const finalHTML = template(resumeData);

  return finalHTML
}


export async function generateResumePDF(html: string, options = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // আপনার Chrome path
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    // Set HTML content
    await page.setContent(html, { waitUntil: "networkidle0" });
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


export const uploadResume = async (resumeBuffer: Uint8Array<ArrayBufferLike> | any, filename: string): Promise<string> => {
  console.log("start uploading");

  const { secure_url } = await uploadPdfBufferToCloudinary(resumeBuffer, "resume", {
    folder: "resumes",
    public_id: filename,
    resource_type: "row"
  })
  if (!secure_url) {
    throw new AppError(`failed to upload ${filename} in cloudinary`, 400)
  }
  console.log("end uploading", secure_url);

  return secure_url
}
export async function generateCustomResumePDF(htmlContent: any) {
  const finalHtmlContent = `
<html>
  <head>
    <meta charset="UTF-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body { 
        font-family: 'Plus Jakarta Sans', sans-serif; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact;
      }
      svg {
        display: inline-block;
        vertical-align: middle;
      }
    </style>
  </head>
  <body>
      ${htmlContent}
  </body>
</html>
`;
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(finalHtmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error("PDF Export Error:", error);
    return null;
  }
}



export async function uploadCustomResumepdf(pdfBuffer, userId) {

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinaryInstance.uploader.upload_stream(
      {
        resource_type: "image",
        format: "pdf",
        folder: "blitz-analyzer/resumes",
        public_id: `resume-userId_${userId}_${Date.now()}`,
      },
      (error, result) => {
        if (error) return reject(error);


        resolve(result);
      }
    );

    streamifier.createReadStream(pdfBuffer).pipe(stream);
  });

  return uploadResult.secure_url
}