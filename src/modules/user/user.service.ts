import { prisma } from "../../lib/prisma"


const dashboardKPIReports = async (userId:string)=>{

    await prisma.customerProfile.findUnique({
        where:{id:userId,userId}
    })
    const kpis = await prisma.$transaction(async (tx) =>{
        const totalResume = await tx.resume.count({
            where:{userId}
        })
        const totalAnalysis = await tx.analysis.count({
            where:{userId}
        });
        const totalTransactions = await tx.payment.count({
            where:{userId}
        });
        return {totalAnalysis,totalResume,totalTransactions}
    })
    return kpis

}

const getKPISData = async () => {
  const [
    totalUsers,
    verifiedUsers,
    totalAnalyses,
    totalResumes,
    totalPayments,

  ] = await Promise.all([
    // Total users
    prisma.user.count(),

    // Verified users
    prisma.user.count({
      where: { emailVerified: true },
    }),

    // Total analyses
    prisma.analysis.count(),

    // Total resumes
    prisma.resume.count(),

    // Total payments
    prisma.payment.count(),

  ]);


  return {
    totalUsers,
    verifiedUsers,
    totalAnalyses,
    totalResumes,
    totalPayments,
  };
};

export const userServices = {dashboardKPIReports,getKPISData}