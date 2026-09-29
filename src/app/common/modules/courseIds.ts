import { Course } from './Course';
import { CourseCounter } from './CourseCounter';
import { Types } from 'mongoose';

const counterId = 'course';
const courseIdPattern = /^LMS-CRS-(\d+)$/;

const formatCourseId = (sequence: number) => `LMS-CRS-${String(sequence).padStart(4, '0')}`;

export const nextCourseId = async () => {
  const counter = await CourseCounter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (!counter) {
    throw new Error('Unable to generate a course ID.');
  }

  return formatCourseId(counter.sequence);
};

export const initializeCourseIds = async () => {
  const existingCourses = await Course.find({ courseId: courseIdPattern }).select('courseId').lean();
  const highestSequence = existingCourses.reduce((highest, course) => {
    const match = course.courseId?.match(courseIdPattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  await CourseCounter.updateOne(
    { _id: counterId },
    { $max: { sequence: highestSequence } },
    { upsert: true }
  );

  const legacyCourses = await Course.collection
    .find({ $or: [{ courseId: { $exists: false } }, { courseId: null }, { courseId: '' }] })
    .project<{ _id: Types.ObjectId }>({ _id: 1 })
    .sort({ _id: 1 })
    .toArray();

  for (const course of legacyCourses) {
    const counter = await CourseCounter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { sequence: 1 } },
      { new: true }
    );

    if (!counter) {
      throw new Error('Unable to assign a course ID to existing course data.');
    }

    await Course.collection.updateOne(
      { _id: course._id },
      { $set: { courseId: formatCourseId(counter.sequence) } }
    );
  }

  await Course.collection.updateMany(
    {},
    { $unset: { createdBy: '', createdAt: '', updatedAt: '', __v: '' } }
  );
  await Course.collection.updateMany(
    {},
    [{ $unset: ['modules._id', 'modules.topics._id'] }]
  );
  await Course.collection.createIndex({ courseId: 1 }, { unique: true });
};
