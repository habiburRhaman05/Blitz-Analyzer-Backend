import Handlebars from "handlebars";
import puppeteer from "puppeteer";

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


export const uploadResume = async (file:Uint8Array<ArrayBufferLike>)=>{
    return  "http.upload.com/my-resume.pdf"
    
}