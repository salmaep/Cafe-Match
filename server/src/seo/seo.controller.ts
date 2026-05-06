import { Controller, Get, Header, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { cafeSlugOrFallback } from '../common/utils/slug.util';

interface CafeRow {
  id: number;
  name: string;
  slug: string | null;
  updatedAt: Date;
}

const STATIC_ROUTES: { path: string; changefreq: string; priority: string }[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/discover', changefreq: 'daily', priority: '0.8' },
  { path: '/trending', changefreq: 'daily', priority: '0.8' },
];

@Controller()
export class SeoController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap(@Res() res: Response): Promise<void> {
    const baseUrl = this.resolveBaseUrl();
    const cafes: CafeRow[] = await this.dataSource.query(
      `SELECT id, name, slug, updated_at AS updatedAt
       FROM cafes
       WHERE is_active = 1 AND deleted_at IS NULL
       ORDER BY id ASC`,
    );

    const now = new Date().toISOString();
    const parts: string[] = [];
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
    parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    for (const route of STATIC_ROUTES) {
      parts.push('  <url>');
      parts.push(`    <loc>${escapeXml(baseUrl + route.path)}</loc>`);
      parts.push(`    <lastmod>${now}</lastmod>`);
      parts.push(`    <changefreq>${route.changefreq}</changefreq>`);
      parts.push(`    <priority>${route.priority}</priority>`);
      parts.push('  </url>');
    }

    for (const cafe of cafes) {
      const slug = cafeSlugOrFallback(cafe);
      const lastmod = cafe.updatedAt instanceof Date
        ? cafe.updatedAt.toISOString()
        : new Date(cafe.updatedAt).toISOString();
      parts.push('  <url>');
      parts.push(`    <loc>${escapeXml(`${baseUrl}/cafe/${slug}`)}</loc>`);
      parts.push(`    <lastmod>${lastmod}</lastmod>`);
      parts.push('    <changefreq>weekly</changefreq>');
      parts.push('    <priority>0.7</priority>');
      parts.push('  </url>');
    }

    parts.push('</urlset>');
    res.send(parts.join('\n'));
  }

  @Public()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  robots(@Res() res: Response): void {
    const baseUrl = this.resolveBaseUrl();
    const body = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /owner/',
      'Disallow: /login',
      'Disallow: /register',
      'Disallow: /bookmarks',
      'Disallow: /favorites',
      'Disallow: /shortlist',
      '',
      `Sitemap: ${baseUrl}/sitemap.xml`,
      '',
    ].join('\n');
    res.send(body);
  }

  private resolveBaseUrl(): string {
    const raw = this.config.get<string>('PUBLIC_WEB_URL') ?? 'https://salma.imola.ai';
    return raw.replace(/\/+$/, '');
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
