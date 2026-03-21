import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

/**
 * Get user wallet
 */
const getMyWallet = async (userId: string) => {
  const wallet = await prisma.creditWallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    // create wallet automatically if not exists
    return await prisma.creditWallet.create({
      data: {
        userId,
        balance: 0,
      },
    });
  }

  return wallet;
};

/**
 * Get wallet with transactions (payments)
 */
const getWalletWithTransactions = async (userId: string) => {
  const wallet = await prisma.creditWallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!wallet) {
    throw new AppError("Wallet not found", 404);
  }

  return wallet;
};

/**
 * Deduct credits (for resume generation, analysis, etc.)
 */
const deductCredits = async (userId: string, amount: number) => {
  const wallet = await prisma.creditWallet.findUnique({
    where: { userId },
  });

  if (!wallet) throw new AppError("Wallet not found", 404);

  if (wallet.balance < amount) {
    throw new AppError("Insufficient credits", 400);
  }

  return await prisma.creditWallet.update({
    where: { userId },
    data: {
      balance: { decrement: amount },
    },
  });
};

const claimFreeCredit = async (id:string)=>{
      //check is alrready claimed or not 

     const user = await prisma.customerProfile.findUnique({
          where:{id:id,isFreeCreditClaim:false},
        })

         if(!user){
          throw new AppError("Your Are Already Claimed Your Free Credit",400)
         }

         // update user wallet

         const updatedUser = await prisma.creditWallet.update({
          where:{userId:id},
          data:{
           balance:{increment:10}
          }
         })
      await prisma.customerProfile.update({
          where:{id:id},
          data:{
         isFreeCreditClaim:true
          }
         })

         return updatedUser

      
}

export const walletServices = {
  getMyWallet,
  getWalletWithTransactions,
  deductCredits,
  claimFreeCredit
};