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
const AVATAR_DIR = join(process.cwd(), 'storage', 'avatars');

for (const dir of [REVIEW_MEDIA_DIR, AVATAR_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
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
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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

    return {
      url: this.publicUrlFor('review-media', file.filename),
      mediaType: isPhoto ? 'photo' : 'video',
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: AVATAR_DIR,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase() || guessExt(file.mimetype);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_AVATAR_BYTES },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_PHOTO_MIME.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only image files allowed'), false);
        }
      },
    }),
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    return {
      url: this.publicUrlFor('avatars', file.filename),
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  private publicUrlFor(folder: string, filename: string): string {
    const publicBase =
      this.config.get<string>('PUBLIC_API_URL') ??
      'http://localhost:3000/api/v1';
    return `${publicBase.replace(/\/$/, '')}/storage/${folder}/${filename}`;
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
