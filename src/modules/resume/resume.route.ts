import { Router } from "express";
import multer from "multer";
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares";
import { resumeControllers } from "./resume.controller";
const resumeRouter: Router = Router();

// In-memory upload for the browser-generated PDF share flow (<= 10MB).
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

resumeRouter.post(
  "/:resumeId/update-resume",
  authMiddleware,
  roleMiddleware(["USER"]),
  //add validation
  resumeControllers.updateResume
);
resumeRouter.delete(
  "/:resumeId/delete-resume",
  authMiddleware,
  roleMiddleware(["USER"]),
  //add validation
  resumeControllers.deleteResume
);

resumeRouter.post(
  "/initlize-resume",
  authMiddleware,
  roleMiddleware(["USER"]),

  //add validation
  resumeControllers.initlizeResume
);
resumeRouter.post(
  "/:id/generate-download",
  authMiddleware,
  roleMiddleware(["USER"]),

  //add validation
  resumeControllers.generateResumeForDownload
);
resumeRouter.post(
  "/:id/generate-custom-download",
  authMiddleware,
  roleMiddleware(["USER"]),
  //add validation
  resumeControllers.generateCustomResumeForDownload
);




resumeRouter.post(
  "/:id/share-pdf",
  authMiddleware,
  roleMiddleware(["USER"]),
  pdfUpload.single("file"),
  resumeControllers.shareResumePdf
);

resumeRouter.get(
  "/",
  authMiddleware,
  roleMiddleware(["USER"]),
  //add validation
  resumeControllers.getAllResumeById
);
export default resumeRouter;