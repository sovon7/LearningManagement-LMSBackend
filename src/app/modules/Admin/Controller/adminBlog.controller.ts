import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { Blog } from '../../../common/modules/Blog';

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

export const getBlogs = async (_req: Request, res: Response) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    return res.status(200).json({ data: blogs });
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
      ...fields,
      thumbnailImage: `/uploads/blogs/${req.file.filename}`,
      authorId: req.user.userId,
      published: req.body?.published === 'true'
    });

    return res.status(201).json({ message: 'Blog created successfully.', data: blog });
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

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found.' });
    }

    if (String(blog.authorId) !== req.user.userId) {
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
    if (req.body?.published !== undefined) {
      blog.published = req.body.published === 'true';
    }

    await blog.save();
    if (req.file) {
      await removeThumbnail(previousThumbnail);
    }
    return res.status(200).json({ message: 'Blog updated successfully.', data: blog });
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

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found.' });
    }

    if (String(blog.authorId) !== req.user.userId) {
      return res.status(403).json({ message: 'Candidate users can only delete their own blogs.' });
    }

    await blog.deleteOne();
    await removeThumbnail(blog.thumbnailImage);
    return res.status(200).json({ message: 'Blog deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Blog deletion failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
