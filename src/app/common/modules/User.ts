import mongoose, { Schema, model, type Document } from 'mongoose';

export type UserRole = 'ADMIN' | 'CANDIDATE';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ['ADMIN', 'CANDIDATE'],
      default: 'CANDIDATE',
      uppercase: true,
      trim: true
    }
  },
  { timestamps: true }
);

export const User = mongoose.models.User || model<IUser>('User', userSchema);
