import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REVIEW_MEDIA_DIR = join(process.cwd(), 'storage', 'review-media');

if (!existsSync(REVIEW_MEDIA_DIR)) {
  mkdirSync(REVIEW_MEDIA_DIR, { recursive: true });
}

const ALLOWED_PHOTO_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/quicktime']);
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  constructor(private readonly config: ConfigService) {}

  @Post('review-media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: REVIEW_MEDIA_DIR,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase() || guessExt(file.mimetype);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_VIDEO_BYTES },
      fileFilter: (_req, file, cb) => {
        if (
          ALLOWED_PHOTO_MIME.has(file.mimetype) ||
          ALLOWED_VIDEO_MIME.has(file.mimetype)
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Unsupported file type'), false);
        }
      },
    }),
  )
  uploadReviewMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');

    const isPhoto = ALLOWED_PHOTO_MIME.has(file.mimetype);
    if (isPhoto && file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Photo exceeds 5 MB');
    }

    const publicBase =
      this.config.get<string>('PUBLIC_URL') ?? 'http://localhost:3000';
    const url = `${publicBase.replace(/\/$/, '')}/storage/review-media/${file.filename}`;
    return {
      url,
      mediaType: isPhoto ? 'photo' : 'video',
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}

function guessExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'video/mp4':
      return '.mp4';
    case 'video/quicktime':
      return '.mov';
    default:
      return '';
  }
}
