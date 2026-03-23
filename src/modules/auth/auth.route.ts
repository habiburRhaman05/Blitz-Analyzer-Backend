
import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest";
import { authControllers } from "./auth.controller";
import { authSchemas } from "./auth.schema";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";

const router: Router = Router();

router.post(
  "/register",
  validateRequest(authSchemas.registerUserSchema),
  authControllers.registerController
);

router.post(
  "/login",
  validateRequest(authSchemas.loginUserSchema),
  authControllers.loginController
);
router.get(
  "/me",
authMiddleware,
 roleMiddleware(["USER","ADMIN"]),
  authControllers.getUserProfileController
);
router.get(
  "/logout",
authMiddleware,
 roleMiddleware(["USER","ADMIN"]),
  authControllers.logoutUserController
);
router.post(
  "/refresh-token",
  authControllers.getRefreshTokenController
);
router.post(
  "/request-reset-password",
  authControllers.requestPasswordResetController
);
router.put(
  "/change-password",
authMiddleware,
 roleMiddleware(["USER","ADMIN"]),
// validateRequest(authSchemas.changePasswordSchema),
  authControllers.changePasswordController
);
router.put(
  "/reset-password",
  authControllers.resetPasswordController
);
router.post(
  "/verify-email",
  authControllers.verifyEmail
);
router.post(
  "/resend-otp",
  authControllers.resendOtp
);

router.put(
  "/change-avatar",
  authMiddleware,
 roleMiddleware(["USER","ADMIN"]),
  authControllers.changeProfileAvatar
);
router.put(
  "/update-profile",
  authMiddleware,

 roleMiddleware(["USER","ADMIN"]),
  authControllers.updateProfileInfo
);

export default router;
