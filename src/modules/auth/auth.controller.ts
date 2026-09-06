import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { authServices } from "./auth.service";
import { tokenUtils } from "../../utils/token";
import { envConfig } from "../../config/env";
import { auth } from "../../lib/auth";
import { getGoogleAuthUrl } from "../../utils/google";
import { getRequestContext } from "../../utils/deviceInfo";

// -------------------- REGISTER --------------------
const registerController = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password ,contactNumber} = req.body;

  const result = await authServices.registerManager({
    name, email, password,contactNumber
  })
  return sendSuccess(res, {
    statusCode: 201,
    data: result,
    message: " User Account Created Successfully"
  })
});

// -------------------- LOGIN --------------------
const loginController = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const data = await authServices.loginUser({ email, password })

  tokenUtils.setBetterAuthSessionCookie(res, data.sessionToken)

  return sendSuccess(res, {
    statusCode: 200,
    data,
    message: "your are LoggedIn Sucessfully"
  })
});
// -------------------- PROFILE DATA --------------------
const getUserProfileController = asyncHandler(async (req: Request, res: Response) => {
  const user = await authServices.getCustomerProfile(res.locals.auth)
  return sendSuccess(res, {
    data: user,
    message: "Profile Data fetch Successfully"
  })
});
// -------------------- LOGOUT --------------------
const logoutUserController = asyncHandler(async (req: Request, res: Response) => {

  // signOut deletes the session row in Postgres and clears the cookie,
  // so the session is actually revoked, not just removed from the browser
  const { headers } = await auth.api.signOut({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  });

  const clearedCookies = headers.getSetCookie?.() ?? [];
  if (clearedCookies.length > 0) {
    res.setHeader("Set-Cookie", clearedCookies);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "User Logout Successfully"
  })
});
// -------------------- CHANGE PASSWORD --------------------
const changePasswordController = asyncHandler(async (req: Request, res: Response) => {

console.log(req.body);


  const better_auth_session_token = req.cookies["better-auth.session_token"];

  const { currentPassword, newPassword } = req.body

  const user = await authServices.changePassword({
    sessionToken: better_auth_session_token,
    currentPassword,
    newPassword
  })

  console.log("ssuccess");
  
  return sendSuccess(res, {
    statusCode: 200,
    data: user,
    message: "Password change Successfully"
  })
});
// -------------------- REQUEST FOR RESET PASSWORD MAIL --------------------
const requestPasswordResetController = asyncHandler(async (req: Request, res: Response) => {

  const { email } = req.body;


  const result = await authServices.requestResetPassword(email)

  return sendSuccess(res, {
    statusCode: 201,
    message: "Reset Password Link successFully send; Check Index",
  })
});
// --------------------  RESET PASSWORD MAIL --------------------
const resetPasswordController = asyncHandler(async (req: Request, res: Response) => {

  const { newPassword } = req.body;
  const { token } = req.query

  const result = await authServices.resetPassword(newPassword, token as string)
  return sendSuccess(res, {
    statusCode: 201,
    message: "Your Reset Password  successFully",
  })
});

// --------------------  VERIFY EMAIL --------------------
const verifyEmail = asyncHandler(async (req, res) => {

  const {email,otp} = req.body;
  const result = await authServices.verifyEmail({email,otp})


   return sendSuccess(res,{
    message:"Your email verification is successfull",
    statusCode:200
   })
 
})
// -------------------- SEND OTP  --------------------
const resendOtp = asyncHandler(async (req, res) => {

  const {email,verificationType} = req.body;

   await authServices.resendOtp(email,verificationType)

   return sendSuccess(res,{
 message: "OTP resent successfully" 
   })
 
})
// --------------------  CHANGE AVATAR --------------------
const changeProfileAvatar = asyncHandler(async (req, res) => {
        const payload = {
          profileAvatarUrl:req.body.profileAvatar,
          userId:res.locals.auth.userId,
        };
        console.log(payload);
        
        const updatedResult = await authServices.changeAvatar(payload.profileAvatarUrl,payload.userId)
        console.log("chnage both");
        
        return sendSuccess(res,{
          data:updatedResult,
          message:"Your Profile Avatar Change Successfully"
        })
})
// --------------------  UPDATE PROFILE --------------------
const updateProfileInfo = asyncHandler(async (req, res) => {
  
         const userId =res.locals.auth.userId
        
        const updatedResult = await authServices.updateProfile(req.body,userId)
        return sendSuccess(res,{
          data:updatedResult,
          message:"Your Profile Updated Successfully"
        })
})



// --------------------  LOGIN WITH GOOGLE --------------------

const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const redirectPath = req.query.redirect || "/dashboard";

  const encodedRedirectPath = encodeURIComponent(redirectPath as string);

  const callbackURL = `${envConfig.BETTER_AUTH_URL}/api/v1/auth/google/success?redirect=${encodedRedirectPath}`;
  const nonce = "random-string-123";
  res.render("googleRedirect", {
    callbackURL: callbackURL,
    betterAuthUrl: envConfig.BETTER_AUTH_URL,
    scriptNonce: nonce
  })
})

const googleLoginSuccess = asyncHandler(async (req: Request, res: Response) => {
  const redirectPath = req.query.redirect as string || "/dashboard";

  // better-auth's own OAuth flow already set the session cookie before
  // redirecting here, we just need to confirm it and create the profile
  const { response: session } = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  });

  if (!session?.user) {
    return res.redirect(`${envConfig.CLIENT_URL}/login?error=no_session_found`);
  }

  await authServices.googleLoginSuccess(session);

  // ?redirect=//profile -> /profile
  const isValidRedirectPath = redirectPath.startsWith("/") && !redirectPath.startsWith("//");
  const finalRedirectPath = isValidRedirectPath ? redirectPath : "/dashboard";

  res.redirect(`${envConfig.CLIENT_URL}${finalRedirectPath}`);
});


// ---------------- GOOGLE OAUTH ----------------
const googleRedirect = asyncHandler(async (_req: Request, res: Response) => {
  const url = getGoogleAuthUrl();
  console.log("main url",url);
  
  res.json({
    url:url
  })
});

const googleCallback = asyncHandler(async (req: Request, res: Response) => {

  const code = req.query.code as string | undefined;
  console.log("code",code);
  
  if (!code) {
    console.log(code);
    res.redirect(`${envConfig.CLIENT_URL}/login?error=oauth_missing_code`);
    return;
  }
  try {
    const ctx = getRequestContext(req);
    const result = await authServices.googleOAuthCallback(code, ctx);

    tokenUtils.setBetterAuthSessionCookie(res, result.sessionToken)
    res.redirect(`${envConfig.CLIENT_URL}/dashboard`);
  } catch (err) {
    const msg = err instanceof Error ? encodeURIComponent(err.message) : "oauth_failed";
    console.log(err);
    
    res.redirect(`${envConfig.CLIENT_URL}/login?error=${msg}`);
  }
});




const handleOAuthError = asyncHandler(async (req: Request, res: Response) => {
  const error = req.query.error as string || "oauth_failed";
  res.redirect(`${envConfig.CLIENT_URL}/login?error=${error}`);
})



export const authControllers = {
  registerController, loginController, getUserProfileController, logoutUserController,
  changePasswordController,
  requestPasswordResetController, resetPasswordController,
  verifyEmail,
  updateProfileInfo,changeProfileAvatar,
  resendOtp,
  googleLoginSuccess,
  handleOAuthError,
  googleLogin,
  googleRedirect,
  googleCallback
};
