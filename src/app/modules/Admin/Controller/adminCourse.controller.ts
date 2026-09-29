import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { Course, normalizeCourseShortDescription } from '../../../common/modules/Course';
import { nextCourseId } from '../../../common/modules/courseIds';

const parseModules = (value: unknown): unknown[] | null => {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  return Array.isArray(value) ? value : null;
};

const validateCourse = (title: string, shortDescription: string, modules: unknown[]) => {
  if (!title.trim()) {
    return 'title is required.';
  }
  if (!shortDescription.trim() || shortDescription.length > 1000) {
    return 'shortDescription is required and must not exceed 1000 characters.';
  }
  if (!modules.length) {
    return 'A course must contain at least one module.';
  }

  for (const [moduleIndex, courseModule] of modules.entries()) {
    if (!courseModule || typeof courseModule !== 'object') {
      return `Module ${moduleIndex + 1} must be an object.`;
    }

    const module = courseModule as { title?: unknown; topics?: unknown };
    if (typeof module.title !== 'string' || !module.title.trim()) {
      return `Module ${moduleIndex + 1} requires a title.`;
    }
    if (!Array.isArray(module.topics) || module.topics.length < 1) {
      return `Module ${moduleIndex + 1} must contain at least one topic.`;
    }

    for (const [topicIndex, topicValue] of module.topics.entries()) {
      if (!topicValue || typeof topicValue !== 'object') {
        return `Topic ${topicIndex + 1} in module ${moduleIndex + 1} must be an object.`;
      }

      const topic = topicValue as { title?: unknown; content?: unknown; codeSnippets?: unknown };
      if (typeof topic.title !== 'string' || !topic.title.trim()) {
        return `Topic ${topicIndex + 1} in module ${moduleIndex + 1} requires a title.`;
      }
      if (typeof topic.content !== 'string' || !topic.content.trim()) {
        return `Topic ${topicIndex + 1} in module ${moduleIndex + 1} requires content.`;
      }
      if (topic.codeSnippets !== undefined && !Array.isArray(topic.codeSnippets)) {
        return `Topic ${topicIndex + 1} codeSnippets must be an array.`;
      }
      if (Array.isArray(topic.codeSnippets)) {
        for (const snippet of topic.codeSnippets) {
          if (!snippet || typeof snippet.language !== 'string' || !snippet.language.trim() || typeof snippet.code !== 'string' || !snippet.code.trim()) {
            return `Topic ${topicIndex + 1} code snippets require a language and code.`;
          }
        }
      }
    }
  }

  return null;
};

const removeThumbnail = async (thumbnailImage: string) => {
  const filename = path.basename(thumbnailImage);
  await unlink(path.join(process.cwd(), 'uploads', 'courses', filename)).catch(() => undefined);
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const filter = req.user?.userRole === 'ADMIN' ? {} : { publishStatus: 'published' };
    const courses = await Course.find(filter).sort({ _id: -1 });
    return res.status(200).json({ data: courses });
  } catch (error) {
    return res.status(500).json({ message: 'Course fetch failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'A course thumbnail is required.' });
    }

    const title = String(req.body?.title || '').trim();
    const shortDescription = normalizeCourseShortDescription(String(req.body?.shortDescription || '')).trim();
    const modules = parseModules(req.body?.modules);
    if (!modules) {
      await removeThumbnail(`/uploads/courses/${req.file.filename}`);
      return res.status(400).json({ message: 'modules must be a valid JSON array.' });
    }

    const validationMessage = validateCourse(title, shortDescription, modules);
    if (validationMessage) {
      await removeThumbnail(`/uploads/courses/${req.file.filename}`);
      return res.status(400).json({ message: validationMessage });
    }

    const course = await Course.create({
      courseId: await nextCourseId(),
      title,
      shortDescription,
      thumbnailImage: `/uploads/courses/${req.file.filename}`,
      modules,
      publishStatus: 'published'
    });

    return res.status(201).json({ message: 'Course created successfully.', data: course });
  } catch (error) {
    if (req.file) {
      await removeThumbnail(`/uploads/courses/${req.file.filename}`);
    }
    return res.status(500).json({ message: 'Course creation failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const course = await Course.findOne({ courseId: req.params.courseId });
    if (!course || (req.user?.userRole !== 'ADMIN' && course.publishStatus !== 'published')) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    return res.status(200).json({ data: course });
  } catch (error) {
    return res.status(500).json({ message: 'Course fetch failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getCourseTopic = async (req: Request, res: Response) => {
  try {
    const course = await Course.findOne({ courseId: req.params.courseId });
    if (!course || (req.user?.userRole !== 'ADMIN' && course.publishStatus !== 'published')) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const topicIndex = Number(req.params.topicIndex);
    const topics = course.modules.flatMap((courseModule: { topics: unknown[] }) => courseModule.topics);
    if (!Number.isInteger(topicIndex) || topicIndex < 0 || topicIndex >= topics.length) {
      return res.status(404).json({ message: 'Course topic not found.' });
    }

    return res.status(200).json({ data: topics[topicIndex] });
  } catch (error) {
    return res.status(500).json({ message: 'Course topic fetch failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.findOne({ courseId: req.params.courseId });
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const incoming = req.body || {};
    const title = incoming.title === undefined ? course.title : String(incoming.title).trim();
    const shortDescription = incoming.shortDescription === undefined
      ? course.shortDescription
      : normalizeCourseShortDescription(String(incoming.shortDescription)).trim();
    const modules = incoming.modules === undefined ? course.modules : parseModules(incoming.modules);
    if (!modules) {
      if (req.file) {
        await removeThumbnail(`/uploads/courses/${req.file.filename}`);
      }
      return res.status(400).json({ message: 'modules must be a valid JSON array.' });
    }

    const validationMessage = validateCourse(title, shortDescription, modules);
    if (validationMessage) {
      if (req.file) {
        await removeThumbnail(`/uploads/courses/${req.file.filename}`);
      }
      return res.status(400).json({ message: validationMessage });
    }

    const previousThumbnail = course.thumbnailImage;
    Object.assign(course, { title, shortDescription, modules });
    if (req.file) {
      course.thumbnailImage = `/uploads/courses/${req.file.filename}`;
    }
    course.publishStatus = 'published';

    await course.save();
    if (req.file) {
      await removeThumbnail(previousThumbnail);
    }
    return res.status(200).json({ message: 'Course updated successfully.', data: course });
  } catch (error) {
    if (req.file) {
      await removeThumbnail(`/uploads/courses/${req.file.filename}`);
    }
    return res.status(500).json({ message: 'Course update failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const course = await Course.findOne({ courseId: req.params.courseId });
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    await course.deleteOne();
    await removeThumbnail(course.thumbnailImage);
    return res.status(200).json({ message: 'Course deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Course deletion failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
