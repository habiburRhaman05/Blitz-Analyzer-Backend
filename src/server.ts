import { startServer } from "./app";
import { connectToDatabase, prisma } from "./config/db";
import { UserRole } from "./generated/prisma/enums";
import { auth } from "./lib/auth";
import "./workers/emailWorker";

(async () => {
 
  await connectToDatabase();
  await startServer();

 const { user } = await auth.api.signUpEmail({
      body:{
             name:"Blitz Admin",
      email:"admin@blitz-analyzer.com",
      needPasswordChange:false,
      password:"admin1234",
        role:UserRole.ADMIN
      }
    })

  await prisma.admin.create({
    data:{
       name:"Blitz Admin",
      email:"admin@blitz-analyzer.com",
      userId:user.id
    }
  })
  console.log("created");
  
    
})();
