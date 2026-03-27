import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/AppError"

const createReview = async (userId: string, payload: any) => {
  // check profile exists
  const profile = await prisma.customerProfile.findUnique({
    where: { userId }
  })

  if (!profile) {
    throw new AppError("Customer profile not found", 404)
  }

  // check already reviewed
  const existingReview = await prisma.review.findUnique({
    where: { userId: profile.id }
  })

  if (existingReview) {
    throw new AppError("You already submitted a review", 400)
  }

  return prisma.review.create({
    data: {
      reviewText: payload.reviewText,
      rating: payload.rating,
      userId: profile.id
    }
  })
}

const getAllReviews = async (query: any) => {
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 10
  const skip = (page - 1) * limit
  const sort = query.sort === "asc" ? "asc" : "desc"

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      skip,
      take: limit,
      orderBy: {
        rating: sort
      },
      include: {
        user: {
          select: {
            name: true,
            profileAvatar: true,
            profession: true
          }
        }
      }
    }),
    prisma.review.count()
  ])

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit)
    },
    data: reviews
  }
}

const deleteReview = async (reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId }
  })

  if (!review) {
    throw new AppError("Review not found", 404)
  }

  return prisma.review.delete({
    where: { id: reviewId }
  })
}

export const reviewServices = {
  createReview,
  getAllReviews,
  deleteReview
}