import { Router } from "express"
import { adminControllers } from "./admmin.controller"
import { authMiddleware, roleMiddleware } from "../../middleware/auth-middlewares"

const router = Router()

router.get("/users",authMiddleware,roleMiddleware(["ADMIN"]), adminControllers.getUsers)
router.patch("/users/:id/status",authMiddleware,roleMiddleware(["ADMIN"]), adminControllers.updateStatus)
router.delete("/users/:id",authMiddleware,roleMiddleware(["ADMIN"]), adminControllers.deleteUser)

export const adminRoutes = router