
import { Prisma } from "../../generated/prisma/client";
import { BlogStatus } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import {
  ICreateBlogPayload,
  IUpdateBlogPayload,
  IGetBlogsQuery,
} from "./blog.interface";
import slugify from "slugify"

const generateSlug = async (title: string) => {
  let baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.blog.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
};


const createBlog = async (payload: ICreateBlogPayload) => {
  try {
    const slug = await generateSlug(payload.title);

    const blog = await prisma.blog.create({
      data: {
        ...payload,
        slug,
        status: payload.status ?? BlogStatus.DRAFT,
        publishedAt:
          payload.status === "PUBLISHED" ? new Date() : null,
      },
    });

    return blog;
  } catch (error: any) {
    throw new AppError(error.message || "Failed to create blog", 500);
  }
};

const updateBlog = async (blogId: string, payload: IUpdateBlogPayload) => {
  const existing = await prisma.blog.findUnique({
    where: { id: blogId },
  });

  if (!existing) throw new AppError("Blog not found", 404);

  let slug;
  if (payload.title && payload.title !== existing.title) {
    slug = await generateSlug(payload.title);
  }

  const updated = await prisma.blog.update({
    where: { id: blogId },
    data: {
      ...payload,
      ...(slug && { slug }),
      ...(payload.status === "PUBLISHED" && !existing.publishedAt
        ? { publishedAt: new Date() }
        : {}),
    },
  });

  return updated;
};

const deleteBlog = async (blogId: string) => {
  const exists = await prisma.blog.findUnique({
    where: { id: blogId },
  });

  if (!exists) throw new AppError("Blog not found", 404);

  return prisma.blog.delete({
    where: { id: blogId },
  });
};

const getAllBlogs = async (query: IGetBlogsQuery) => {
  const { page = 1, limit = 10, search, status, category, authorId } = query;

  const skip = (page - 1) * limit;

  const where: Prisma.BlogWhereInput = {
    AND: [
      status ? { status } : {},
      category ? { category } : {},
      authorId ? { authorId } : {},
      search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { fullContent: { contains: search, mode: "insensitive" } },
              { excerpt: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [total, blogs] = await Promise.all([
    prisma.blog.count({ where }),
    prisma.blog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: true,
        _count: { select: { comments: true } },
      },
    }),
  ]);

  return {
    data: blogs,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getBlogById = async (blogId: string) => {
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    include: {
      author: true,
      comments: {
        include: {
          author: true,
          replies: true,
        },
      },
    },
  });

  if (!blog) throw new AppError("Blog not found", 404);

  return blog;
};

export const blogServices = {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
};