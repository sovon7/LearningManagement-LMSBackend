import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { Blog } from '../../../common/modules/Blog';
import { nextBlogId } from '../../../common/modules/blogIds';

const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

const validateBlogFields = (fields: { title: string; summary: string; description: string }) => {
  if (!fields.title.trim()) {
    return 'title is required.';
  }
  if (!fields.summary.trim() || countWords(fields.summary) > 300) {
    return 'summary is required and must not exceed 300 words.';
  }
  if (countWords(fields.description) < 550) {
    return 'description must contain at least 550 words.';
  }
  return null;
};

const removeThumbnail = async (thumbnailImage: string) => {
  const filename = path.basename(thumbnailImage);
  await unlink(path.join(process.cwd(), 'uploads', 'blogs', filename)).catch(() => undefined);
};

const serializeBlog = (blog: any, currentUserId: string, fallbackAuthorName = '') => {
  const data = typeof blog.toObject === 'function' ? blog.toObject() : blog;
  const author = data.authorId;
  const authorId = String(author && typeof author === 'object' ? author._id : author);

  return {
    blogId: data.blogId,
    title: data.title,
    thumbnailImage: data.thumbnailImage,
    summary: data.summary,
    description: data.description,
    published: data.published,
    authorName: author && typeof author === 'object' ? author.name || fallbackAuthorName : fallbackAuthorName,
    isOwner: authorId === currentUserId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
};

export const getBlogs = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const blogs = await Blog.find().populate('authorId', 'name').sort({ createdAt: -1 });
    return res.status(200).json({ data: blogs.map((blog) => serializeBlog(blog, req.user!.userId)) });
  } catch (error) {
    return res.status(500).json({ message: 'Blog fetch failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createBlog = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'A thumbnail image is required.' });
    }

    const fields = {
      title: String(req.body?.title || '').trim(),
      summary: String(req.body?.summary || '').trim(),
      description: String(req.body?.description || '').trim()
    };
    const validationMessage = validateBlogFields(fields);
    if (validationMessage) {
      await removeThumbnail(`/uploads/blogs/${req.file.filename}`);
      return res.status(400).json({ message: validationMessage });
    }

    const blog = await Blog.create({
      blogId: await nextBlogId(),
      ...fields,
      thumbnailImage: `/uploads/blogs/${req.file.filename}`,
      authorId: req.user.userId,
      published: true
    });

    return res.status(201).json({
      message: 'Blog created successfully.',
      data: serializeBlog(blog, req.user.userId, req.user.userName)
    });
  } catch (error) {
    if (req.file) {
      await removeThumbnail(`/uploads/blogs/${req.file.filename}`);
    }
    return res.status(500).json({ message: 'Blog creation failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const blog = await Blog.findOne({ blogId: req.params.blogId });
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found.' });
    }

    if (req.user.userRole !== 'CANDIDATE' || String(blog.authorId) !== req.user.userId) {
      return res.status(403).json({ message: 'Candidate users can only update their own blogs.' });
    }

    const fields = {
      title: req.body?.title === undefined ? blog.title : String(req.body.title).trim(),
      summary: req.body?.summary === undefined ? blog.summary : String(req.body.summary).trim(),
      description: req.body?.description === undefined ? blog.description : String(req.body.description).trim()
    };
    const validationMessage = validateBlogFields(fields);
    if (validationMessage) {
      if (req.file) {
        await removeThumbnail(`/uploads/blogs/${req.file.filename}`);
      }
      return res.status(400).json({ message: validationMessage });
    }

    const previousThumbnail = blog.thumbnailImage;
    Object.assign(blog, fields);
    if (req.file) {
      blog.thumbnailImage = `/uploads/blogs/${req.file.filename}`;
    }
    await blog.save();
    if (req.file) {
      await removeThumbnail(previousThumbnail);
    }
    return res.status(200).json({
      message: 'Blog updated successfully.',
      data: serializeBlog(blog, req.user.userId, req.user.userName)
    });
  } catch (error) {
    if (req.file) {
      await removeThumbnail(`/uploads/blogs/${req.file.filename}`);
    }
    return res.status(500).json({ message: 'Blog update failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const blog = await Blog.findOne({ blogId: req.params.blogId });
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found.' });
    }

    if (req.user.userRole !== 'ADMIN' && String(blog.authorId) !== req.user.userId) {
      return res.status(403).json({ message: 'Candidate users can only delete their own blogs.' });
    }

    await blog.deleteOne();
    await removeThumbnail(blog.thumbnailImage);
    return res.status(200).json({ message: 'Blog deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Blog deletion failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
