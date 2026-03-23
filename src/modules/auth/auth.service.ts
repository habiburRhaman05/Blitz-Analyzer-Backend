import crypto from "crypto";
import status from "http-status";
import { JwtPayload } from "jsonwebtoken";

import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { redis } from "../../config/redis";
import { tokenUtils } from "../../utils/token";
import { jwtUtils } from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
import { UserRole, UserStatus, VerificationType } from "../../generated/prisma/enums";
import { envConfig } from "../../config/env";
import bcrypt from "bcrypt";
import type {
  IChangePassword,
  ILoginUserPayload,
  IRegisterPayload,
  IRequestUser,
} from "./auth.interface";
import { PROFILE_CACHE_EXPIRE, REFRESH_EXPIRE, SESSION_EXPIRE } from "../../config/cacheKeys";
import { emailQueue } from "../../queue/emailQueue";
import { getExpiry, hashOTP } from "../../utils/email.utils";




// 🔹 Utility: generate OTP
const generateOTP = (length = 6) => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};



const registerUser = async (payload: IRegisterPayload) => {
  try {
    // 1️⃣ Create user
    const { user } = await auth.api.signUpEmail({
      body: {
        email: payload.email,
        name: payload.name,
        password: payload.password,
        role: UserRole.USER
      }
    });

    // 2️⃣ Create profile (DB only)
    await prisma.customerProfile.create({
      data: {
        email: user.email,
        name: user.name,
        userId: user.id
      }
    });

    // 3️⃣ Send OTP (separate service)
    await sendOtp({
      email: user.email,
      name: user.name,
      type: VerificationType.EMAIL_VERIFY,
      expiration: 5
    });
    return { user };
  } catch (error: any) {
    throw new AppError(
      error?.message || "Registration failed",
      error?.statusCode || 500
    );
  }
};
const loginUser = async (payload: ILoginUserPayload) => {
  const { email, password } = payload;

  const attemptKey = `login_attempt:${email}`;
  const attempts = await redis.incr(attemptKey);

  if (attempts === 1) await redis.expire(attemptKey, 60);
  if (attempts > 5)
    throw new AppError("Too many login attempts", 429);

  const data = await auth.api.signInEmail({ body: { email, password } });

  if (data.user.status === UserStatus.BANNED)
    throw new AppError("User is blocked", status.FORBIDDEN);

  if (data.user.isDeleted)
    throw new AppError("User is deleted", status.NOT_FOUND);

  const accessTokenPayload = {
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
  };
  const refreshTokenPayload = {
    ...accessTokenPayload,
    token: data.token
  };

  const accessToken = tokenUtils.getAccessToken(accessTokenPayload);
  const refreshToken = tokenUtils.getRefreshToken(refreshTokenPayload);
  const sessionToken = data.token;


  return { accessToken, refreshToken, sessionToken, user: data.user };
};

const getAllNewTokens = async (
  refreshToken: string,
) => {


  const verifiedRefreshToken = jwtUtils.verifyToken(refreshToken, envConfig.REFRESH_TOKEN_SECRET)


  if (!verifiedRefreshToken.success && verifiedRefreshToken.error) {
    throw new AppError("Invalid refresh token", status.UNAUTHORIZED);
  }

  const data = verifiedRefreshToken.data as JwtPayload;


  const isSessionTokenExists = await prisma.session.findUnique({
    where: {
      token: data.token,
    },
    include: {
      user: true,
    }
  })

  if (!isSessionTokenExists) {
    throw new AppError("Invalid session token", status.UNAUTHORIZED);
  }

  const newAccessToken = tokenUtils.getAccessToken({
    userId: data.userId,
    role: data.role,
    name: data.name,
    email: data.email,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
  });

  const newRefreshToken = tokenUtils.getRefreshToken({
    userId: data.userId,
    role: data.role,
    name: data.name,
    email: data.email,
    status: data.status,
    isDeleted: data.isDeleted,
    emailVerified: data.emailVerified,
    token: isSessionTokenExists.token
  });

  const { token } = await prisma.session.update({
    where: {
      token: data.token
    },
    data: {
      token: data.token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      updatedAt: new Date(),
    }
  })

  console.log("token updated");


  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionToken: token,
  }

};

const getCustomerProfile = async (user: IRequestUser) => {
  const cacheKey = `profile:${user.userId}-${user.role}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const baseUser = await prisma.user.findUnique({
    where: {
      id: user.userId
    },
    include: { admin: true, customerProfile: true }
  });

  if (baseUser?.role === UserRole.ADMIN) {
    const admin = await prisma.admin.findUnique({
      where: { id: baseUser?.admin?.id! }, include: {
        user: true,
      }
    });

    if (!admin)
      throw new AppError("User not found", status.NOT_FOUND);

    await redis.set(
      cacheKey,
      JSON.stringify(admin),
      "EX",
      PROFILE_CACHE_EXPIRE
    );
    console.log("Customer logged in");
    return admin;
  } else {
    const customerProfile = await prisma.customerProfile.findUnique({
      where: { id: baseUser?.customerProfile?.id! }, include: {
        user: true,
        analysisHistory: true,
        wallet: true
      }
    });

    if (!customerProfile)
      throw new AppError("User not found", status.NOT_FOUND);

    await redis.set(
      cacheKey,
      JSON.stringify(customerProfile),
      "EX",
      PROFILE_CACHE_EXPIRE
    );
    console.log("Customer logged in");
    return customerProfile;
  }
};

const logoutUser = async (
  sessionToken: string,
  refreshToken: string
) => {
  await redis.del(`session:${sessionToken}`);
  await redis.del(`refresh:${refreshToken}`);
  return true;
};

const changePassword = async (payload: IChangePassword) => {
  const session = await redis.get(
    `session:${payload.sessionToken}`
  );

  if (!session)
    throw new AppError("Session expired", status.UNAUTHORIZED);

  const updatedUser = await auth.api.changePassword({
    headers: new Headers({
      Authorization: `Bearer ${payload.sessionToken}`,
    }),
    body: {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    },
  });

  return updatedUser;
};

const requestResetPassword = async (email: string) => {
  const response = await auth.api.requestPasswordReset({
    body: { email },
  });

  if (!response.status)
    throw new AppError("Failed to request reset", 400);

  return true;
};

const resetPassword = async (
  newPassword: string,
  token: string
) => {
  const response = await auth.api.resetPassword({
    body: { token, newPassword },
  });

  if (!response.status)
    throw new AppError("Failed to reset password", 400);

  return true;
};

const verifyEmail = async (payload:{
  email: string;
  otp: string;
}) => {
 try {
    const { email, otp } = payload;

    // 1️⃣ Find verification record
    const record = await prisma.verification.findFirst({
      where: {
        identifier: email,
        type: VerificationType.EMAIL_VERIFY
      },
      orderBy: {
        createdAt: "desc" // always take latest OTP
      }
    });

    if (!record) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    // 2️⃣ Check expiry
    if (record.expiresAt < new Date()) {
      // cleanup expired token
      await prisma.verification.delete({ where: { id: record.id } });
      throw new AppError("OTP expired", 400);
    }

    // 3️⃣ Compare OTP with hashed value
    const isMatch = await bcrypt.compare(otp, record.value);

    if (!isMatch) {
      // optional: increment attempts
      throw new AppError("Invalid OTP", 400);
    }

    // 4️⃣ Mark user as verified
    const user = await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true
      }
    });

    // 5️⃣ Delete verification record (one-time use)
    await prisma.verification.delete({
      where: { id: record.id }
    });

    return {
      success: true,
      message: "Email verified successfully",
      user
    };

  } catch (error: any) {
    throw new AppError(
      error?.message || "Email verification failed",
      error?.statusCode || 400
    );
  }
};


const changeAvatar = async (profileAvatarUrl: string, userId: string) => {
  const result = await prisma.$transaction(async (tx) => {

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        image: profileAvatarUrl
      }
    });

    const isAdmin = user.role === "ADMIN" ? true : false;


    if (isAdmin) {
      await tx.admin.update({
        where: { userId: userId },
        data: {
          profileAvatar: profileAvatarUrl,
        }
      })
    } else {
      await tx.customerProfile.update({
        where: { userId: userId },
        data: {
          profileAvatar: profileAvatarUrl,
        }
      })

    }


    return user

  })

  return result;
}
const updateProfile = async (updatedData: any, userId: string) => {


  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      admin: { include: { user: true } }, customerProfile: {
        include: { user: true }
      }
    }
  });
  const isAdmin = user?.role === "ADMIN" ? true : false;

  if (isAdmin) {
    await prisma.$transaction(async (ts) => {
      await ts.user.update({
        where: { id: user?.id! },
        data: {
          name: updatedData.name || user?.name,
        }
      })
      await ts.admin.update({
        where: { userId: user?.id! },
        data: {
          name: updatedData.name || user?.admin?.name,
          loaction: updatedData.location || user?.admin?.loaction,
          contactNumber: updatedData.contactNumber || user?.admin?.contactNumber,
        }
      })
    })
  } else {
    await prisma.customerProfile.update({
      where: { userId: user?.id! },
      data: {
        name: updatedData.name || user?.customerProfile?.name,
        location: updatedData.location || user?.customerProfile?.location,
        contactNumber: updatedData.contactNumber || user?.customerProfile?.contactNumber,
        experienceLevel: updatedData.experienceLevel || user?.customerProfile?.experienceLevel,
        profession: updatedData.profession || user?.customerProfile?.profession,
      }
    })

  }

  return user?.role === "USER" ? user?.customerProfile : user?.admin
}





 const sendOtp = async (payload:{
  email: string;
  name: string;
  type: VerificationType;
  expiration?: number; 
}) => {
  const { email, name, type, expiration = 5 } = payload;

  try {
    // 1️⃣ Generate OTP + hash
    const otp = generateOTP();
    const tokenHash = await hashOTP(otp);
    const expiresAt = getExpiry(expiration);

    // 2️⃣ DB operations (fast transaction)
    await prisma.$transaction(async (tx) => {
      await tx.verification.deleteMany({
        where: {
          identifier: email,
          type
        }
      });

      await tx.verification.create({
        data: {
          identifier: email,
          value:tokenHash, 
          type,
          expiresAt
        }
      });
    });

    // 3️⃣ Send email (outside transaction)
    await emailQueue.add("verify-email", {
      user: { name, email },
      otp,
      expiryMinutes: expiration
    });

    return { success: true };

  } catch (error: any) {
    throw new AppError(
      error?.message || "Failed to send OTP",
      error?.statusCode || 500
    );
  }
};


 const resendOtp = async (email: string, type: VerificationType = VerificationType.EMAIL_VERIFY) => {
  // 1️⃣ Check user exists
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("User not found", 404);

  // 2️⃣ Optional: Check cooldown (30s–1min)
  const lastOtp = await prisma.verification.findFirst({
    where: { identifier: email, type },
    orderBy: { createdAt: "desc" }
  });

  if (lastOtp && lastOtp.createdAt.getTime() + 30_000 > Date.now()) {
    throw new AppError("Please wait before requesting a new OTP", 429);
  }

  // 3️⃣ Reuse sendOtp service
  await sendOtp({
    email: user.email,
    name: user.name,
    type,
    expiration: 5
  });

  return true
};

export const authServices = {
  registerUser,
  loginUser,
  getAllNewTokens,
  getCustomerProfile,
  logoutUser,
  changePassword,
  requestResetPassword,
  resetPassword,
  verifyEmail,
  changeAvatar,
  updateProfile,
  resendOtp
};
