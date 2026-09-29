import mongoose, { Schema, model } from 'mongoose';

interface ICourseCounter {
  _id: string;
  sequence: number;
}

const courseCounterSchema = new Schema<ICourseCounter>(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0 }
  },
  { versionKey: false }
);

export const CourseCounter = mongoose.models.CourseCounter || model<ICourseCounter>('CourseCounter', courseCounterSchema);
