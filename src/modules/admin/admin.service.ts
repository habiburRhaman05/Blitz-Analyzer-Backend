
import { UserStatus } from "../../generated/prisma/enums"
import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/AppError"

const getAllUsers = async (query: any) => {
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const skip = (page - 1) * limit

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { isDeleted: false,role:"USER" },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.count({
      where: { isDeleted: false }
    })
  ])

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit)
    },
    data: users
  }
}


const changeStatus = async (userId: string, status: UserStatus) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) throw new AppError("User not found", 404)

  return prisma.user.update({
    where: { id: userId },
    data: { status:status }
  })
}

const softDelete = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) throw new AppError("User not found", 404)

  return prisma.user.update({
    where: { id: userId },
    data: {
      isDeleted: true,
      deletedAt: new Date()
    }
  })
}

export const adminServices = {
  getAllUsers,
  changeStatus,
  softDelete
}