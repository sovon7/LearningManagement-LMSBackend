import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';

const blogUploadDirectory = path.join(process.cwd(), 'uploads', 'blogs');
const courseUploadDirectory = path.join(process.cwd(), 'uploads', 'courses');
const imageFormats: Record<string, { extension: string; acceptedExtensions: string[] }> = {
	'image/jpeg': { extension: '.jpg', acceptedExtensions: ['.jpg', '.jpeg'] },
	'image/png': { extension: '.png', acceptedExtensions: ['.png'] }
};

const createThumbnailUploader = (directory: string) => multer({
	storage: multer.diskStorage({
		destination: (_req, _file, callback) => {
			fs.mkdir(directory, { recursive: true }, (error) => callback(error, directory));
		},
		filename: (_req, file, callback) => {
			callback(null, `${Date.now()}-${randomUUID()}${imageFormats[file.mimetype].extension}`);
		}
	}),
	limits: { fileSize: 5 * 1024 * 1024, files: 1 },
	fileFilter: (_req, file, callback) => {
		const format = imageFormats[file.mimetype];
		const fileExtension = path.extname(file.originalname).toLowerCase();
		if (!format || !format.acceptedExtensions.includes(fileExtension)) {
			return callback(new Error('Thumbnail must be a JPG, JPEG, or PNG image.'));
		}

		return callback(null, true);
	}
});

const blogUploader = createThumbnailUploader(blogUploadDirectory);
const courseUploader = createThumbnailUploader(courseUploadDirectory);

const handleThumbnailUpload = (uploader: multer.Multer, req: Request, res: Response, next: NextFunction) => {
	uploader.single('thumbnail')(req, res, (error: unknown) => {
		if (!error) {
			return next();
		}

		const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
			? 'Thumbnail must be 5 MB or smaller.'
			: error instanceof Error
				? error.message
				: 'Thumbnail upload failed.';

		return res.status(400).json({ message });
	});
};

export const uploadBlogThumbnail = (req: Request, res: Response, next: NextFunction) =>
	handleThumbnailUpload(blogUploader, req, res, next);

export const uploadCourseThumbnail = (req: Request, res: Response, next: NextFunction) =>
	handleThumbnailUpload(courseUploader, req, res, next);
