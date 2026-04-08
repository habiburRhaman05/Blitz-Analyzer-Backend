import { Router } from "express";
import { issueController } from "./issue.controller";
import validateRequest from "../../middlewares/validateRequest";
import {
  createIssueSchema,
  getIssuesQuerySchema,
  issueIdParamsSchema,
  updateIssueSchema,
} from "./issue.validation";

const router = Router();

router.post(
  "/",
  validateRequest(createIssueSchema),
  issueController.createIssueController
);

router.get(
  "/",
  validateRequest(getIssuesQuerySchema, "query"),
  issueController.getAllIssuesController
);

router.get(
  "/:issueId",
  validateRequest(issueIdParamsSchema, "params"),
  issueController.getIssueByIdController
);

router.patch(
  "/:issueId",
  validateRequest(issueIdParamsSchema, "params"),
  validateRequest(updateIssueSchema),
  issueController.updateIssueController
);

router.delete(
  "/:issueId",
  validateRequest(issueIdParamsSchema, "params"),
  issueController.deleteIssueController
);

export default router;