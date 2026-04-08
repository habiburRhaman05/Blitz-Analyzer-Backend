import { BlogStatus } from "../../generated/prisma/enums";


export interface ICreateBlogPayload {
  title: string;
  excerpt?: string | null;
  fullContent: string;
  seoTags?: any;
  category?: string | null;
  status?: BlogStatus;
  publishedAt?: Date | null;
  authorId: string;
}

export interface IUpdateBlogPayload {
  title?: string;
  excerpt?: string | null;
  fullContent?: string;
  seoTags?: any;
  category?: string | null;
  status?: BlogStatus;
  publishedAt?: Date | null;
}

export interface IGetBlogsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: BlogStatus;
  category?: string;
  authorId?: string;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IGetBlogsResult<T> {
  data: T[];
  meta: IPaginationMeta;
}