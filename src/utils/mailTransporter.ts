
import nodemailer from "nodemailer"
import { envConfig } from "../config/env";


const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,         // Corrected from 547
  secure: true,     // Required for port 587; set to true ONLY for port 465
  auth: {
    user:"devhabib2005@gmail.com",
    pass:"yhqthhvqbsknziis" 
  },

});

transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});

export const mailTransport = transporter

