import status from "http-status";
import { redis } from "../../config/redis";
import { CreditType, UserRole } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getProfileCacheKey } from "../auth/auth.service";

type DeductCreditsMeta = {
  reason: string;
  referenceId?: string;
  type?: CreditType;
};

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
 * Deduct credits and record the transaction atomically. Re-checks the
 * balance inside the transaction so concurrent requests can't overdraw it.
 */
const deductCredits = async (
  userId: string,
  amount: number,
  meta: DeductCreditsMeta
) => {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.findUnique({
      where: { userId },
    });

    if (!wallet) throw new AppError("Wallet not found", status.NOT_FOUND);

    if (wallet.balance < amount) {
      throw new AppError("Insufficient credits", status.PAYMENT_REQUIRED);
    }

    const updatedWallet = await tx.creditWallet.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
      },
    });

    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -amount,
        type: meta.type ?? CreditType.USAGE,
        reason: meta.reason,
        referenceId: meta.referenceId ?? null,
      },
    });

    return updatedWallet;
  });
};

/**
 * Refund credits for a job that failed after exhausting its retries.
 * Guarded by referenceId so a duplicate failure event can't double-refund.
 */
const refundCredits = async (
  userId: string,
  amount: number,
  meta: DeductCreditsMeta
) => {
  return prisma.$transaction(async (tx) => {
    if (meta.referenceId) {
      const alreadyRefunded = await tx.creditTransaction.findFirst({
        where: { referenceId: meta.referenceId, type: CreditType.REFUND },
      });
      if (alreadyRefunded) return null;
    }

    const wallet = await tx.creditWallet.findUnique({ where: { userId } });
    if (!wallet) throw new AppError("Wallet not found", status.NOT_FOUND);

    const updatedWallet = await tx.creditWallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: CreditType.REFUND,
        reason: meta.reason,
        referenceId: meta.referenceId ?? null,
      },
    });

    return updatedWallet;
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

           // reset user cache 
             const cacheKey = getProfileCacheKey(user.userId, UserRole.USER);
             await redis.del(cacheKey);
 

         return updatedUser

      
}

export const walletServices = {
  getMyWallet,
  getWalletWithTransactions,
  deductCredits,
  refundCredits,
  claimFreeCredit
};