import type { Request, Response } from 'express';
import { Video } from '../../../common/modules/Video';

export const getVideos = async (_req: Request, res: Response) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    return res.status(200).json({ data: videos });
  } catch (error) {
    return res.status(500).json({ message: 'Video fetch failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createVideo = async (req: Request, res: Response) => {
  try {
    const { title, url, courseId } = req.body || {};

    if (!title || !url || !courseId) {
      return res.status(400).json({ message: 'title, url and courseId are required for video creation.' });
    }

    const video = await Video.create({
      title,
      url,
      courseId,
      createdBy: req.user?.userId
    });

    return res.status(201).json({ message: 'Video created successfully.', data: video });
  } catch (error) {
    return res.status(500).json({ message: 'Video creation failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    Object.assign(video, req.body || {});
    await video.save();
    return res.status(200).json({ message: 'Video updated successfully.', data: video });
  } catch (error) {
    return res.status(500).json({ message: 'Video update failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    await video.deleteOne();
    return res.status(200).json({ message: 'Video deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Video deletion failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
