import { Request, Response } from "express"

import { sendSuccess } from "../../utils/apiResponse"
import { asyncHandler } from "../../utils/asyncHandler"
import { adminServices } from "./admin.service"


const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminServices.getAllUsers(req.query)

  return sendSuccess(res, {
    statusCode: 200,
    message: "Users fetched successfully",
    ...result
  })
})

const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { status } = req.body

  const data = await adminServices.changeStatus(id as string, status)

  return sendSuccess(res, {
    statusCode: 200,
    message: "Status updated",
    data
  })
})

const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const data = await adminServices.softDelete(id as string)

  return sendSuccess(res, {
    statusCode: 200,
    message: "User deleted",
    data
  })
})

export const adminControllers = {
  getUsers,
  updateStatus,
  deleteUser
}