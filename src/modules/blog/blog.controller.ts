import { Request, Response } from "express";

import { blogServices } from "./blog.services";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";

const createBlog = asyncHandler(async (req: Request, res: Response) => {
  const result = await blogServices.createBlog(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    data: result,
    message: "Blog created successfully",
  });
});

const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const { blogId } = req.params;

  const result = await blogServices.updateBlog(blogId, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    data: result,
    message: "Blog updated successfully",
  });
});

const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  const { blogId } = req.params;

  await blogServices.deleteBlog(blogId);

  return sendSuccess(res, {
    statusCode: 200,
    data: null,
    message: "Blog deleted successfully",
  });
});

const getAllBlogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await blogServices.getAllBlogs(req.query as any);

  return sendSuccess(res, {
    statusCode: 200,
    data: result,
    message: "Blogs fetched successfully",
  });
});

const getBlogById = asyncHandler(async (req: Request, res: Response) => {
  const { blogId } = req.params;

  const result = await blogServices.getBlogById(blogId);

  return sendSuccess(res, {
    statusCode: 200,
    data: result,
    message: "Blog fetched successfully",
  });
});

export const blogController = {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
};