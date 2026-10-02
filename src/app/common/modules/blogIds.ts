import { Types } from 'mongoose';
import { Blog } from './Blog';
import { BlogCounter } from './BlogCounter';

const counterId = 'blog';
const blogIdPattern = /^LMS-BLG-(\d+)$/;

const formatBlogId = (sequence: number) => `LMS-BLG-${String(sequence).padStart(5, '0')}`;

export const nextBlogId = async () => {
  const counter = await BlogCounter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (!counter) {
    throw new Error('Unable to generate a blog ID.');
  }

  return formatBlogId(counter.sequence);
};

export const initializeBlogIds = async () => {
  const existingBlogs = await Blog.find({ blogId: blogIdPattern }).select('blogId').lean();
  const highestSequence = existingBlogs.reduce((highest, blog) => {
    const match = blog.blogId?.match(blogIdPattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  await BlogCounter.updateOne(
    { _id: counterId },
    { $max: { sequence: highestSequence } },
    { upsert: true }
  );

  const legacyBlogs = await Blog.collection
    .find({ $or: [{ blogId: { $exists: false } }, { blogId: null }, { blogId: '' }] })
    .project<{ _id: Types.ObjectId }>({ _id: 1 })
    .sort({ _id: 1 })
    .toArray();

  for (const blog of legacyBlogs) {
    const counter = await BlogCounter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { sequence: 1 } },
      { new: true }
    );

    if (!counter) {
      throw new Error('Unable to assign a Blog ID to existing blog data.');
    }

    await Blog.collection.updateOne(
      { _id: blog._id },
      { $set: { blogId: formatBlogId(counter.sequence), published: true } }
    );
  }

  await Blog.collection.createIndex({ blogId: 1 }, { unique: true });
};
