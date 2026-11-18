#!/usr/bin/env node
// Builds resource/work/works.js — the lists the "Sample Work" section renders.
//
// Drop a video into resource/work/video/ (or an image into resource/work/design/) and it
// shows up on the site. Optional extras, matched by file name (e.g. my-client.mp4):
//   my-client.jpg   poster image (auto-made from the video if ffmpeg is installed)
//   my-client.json  { "title": "...", "tag": "Documentary", "description": "...", "order": 1,
//                     "compare": true ("Reference vs Mine") or a label like "Before / After",
//                     "orientation": "square" for 1:1 videos, "featured": true (hero card) }
//
// Runs automatically from the pre-commit hook (.githooks/pre-commit).
// Run by hand with: node tools/build-work.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, parse } from 'node:path';

const DIR = 'resource/work';
const OUT = join(DIR, 'works.js');
const VIDEO_DIR = join(DIR, 'video');
const VIDEO_EXT = ['.mp4', '.webm', '.mov'];
const POSTER_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const LARGE_MB = 25;

const has = (cmd) => {
    try { execFileSync(cmd, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
};
const canProbe = has('ffprobe');
const canPoster = has('ffmpeg');

// "my-client_final" -> "My Client Final"
const titleFromName = (name) =>
    name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

const orientationOf = (file) => {
    if (!canProbe) return null;
    try {
        const out = execFileSync('ffprobe', [
            '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height:stream_side_data=rotation',
            '-of', 'json', file,
        ]).toString();
        const s = JSON.parse(out).streams?.[0];
        if (!s) return null;
        const rotated = Math.abs(s.side_data_list?.[0]?.rotation ?? 0) === 90;
        const [w, h] = rotated ? [s.height, s.width] : [s.width, s.height];
        return w > h ? 'landscape' : 'portrait';
    } catch { return null; }
};

// Image size, so the page can reserve space and give wide banners a full row
const sizeOf = (file) => {
    if (!canProbe) return {};
    try {
        const out = execFileSync('ffprobe', [
            '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height', '-of', 'json', file,
        ]).toString();
        const { width, height } = JSON.parse(out).streams?.[0] ?? {};
        return width && height ? { width, height } : {};
    } catch { return {}; }
};

// "1:05" style running time for the card
const durationOf = (file) => {
    if (!canProbe) return null;
    try {
        const sec = parseFloat(execFileSync('ffprobe', [
            '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
        ]).toString());
        if (!Number.isFinite(sec)) return null;
        const s = Math.round(sec);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    } catch { return null; }
};

const makePoster = (video, poster) => {
    try {
        execFileSync('ffmpeg', [
            '-v', 'error', '-y', '-ss', '1', '-i', video,
            '-frames:v', '1', '-vf', 'scale=-2:720', '-q:v', '4', poster,
        ]);
        console.log(`  poster created: ${poster}`);
        return true;
    } catch { return false; }
};

const files = existsSync(VIDEO_DIR) ? readdirSync(VIDEO_DIR) : [];
const works = files
    .filter((f) => VIDEO_EXT.includes(parse(f).ext.toLowerCase()))
    .map((file) => {
        const { name } = parse(file);
        const video = join(VIDEO_DIR, file);

        let meta = {};
        const metaFile = join(VIDEO_DIR, `${name}.json`);
        if (existsSync(metaFile)) {
            try { meta = JSON.parse(readFileSync(metaFile, 'utf8')); }
            catch (e) { console.warn(`  ! ignoring ${metaFile}: ${e.message}`); }
        }

        let poster = POSTER_EXT.map((ext) => `${name}${ext}`).find((p) => files.includes(p));
        if (!poster && canPoster && makePoster(video, join(VIDEO_DIR, `${name}.jpg`))) poster = `${name}.jpg`;

        const mb = statSync(video).size / 1e6;
        if (mb > LARGE_MB) {
            console.warn(`  ! ${video} is ${mb.toFixed(0)} MB — compress it for the web, e.g.\n` +
                `    ffmpeg -i ${video} -vf scale=-2:1080 -c:v libx264 -crf 24 -c:a aac -b:a 128k -movflags +faststart out.mp4`);
        }

        return {
            src: `${VIDEO_DIR}/${file}`,
            poster: poster ? `${VIDEO_DIR}/${poster}` : null,
            title: meta.title || titleFromName(name),
            tag: meta.tag || 'Video',
            description: meta.description || '',
            orientation: meta.orientation || orientationOf(video),
            duration: meta.duration || durationOf(video),
            ...(meta.compare ? { compare: meta.compare } : {}),
            ...(meta.featured ? { featured: true } : {}),
            order: Number.isFinite(meta.order) ? meta.order : 100,
        };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map(({ order, ...work }) => work);

// Graphic design: images in resource/work/design/, same .json extras (title, tag, description, order)
const DESIGN_DIR = join(DIR, 'design');
const designFiles = existsSync(DESIGN_DIR) ? readdirSync(DESIGN_DIR) : [];
const designs = designFiles
    .filter((f) => POSTER_EXT.includes(parse(f).ext.toLowerCase()))
    .map((file) => {
        const { name } = parse(file);
        let meta = {};
        const metaFile = join(DESIGN_DIR, `${name}.json`);
        if (existsSync(metaFile)) {
            try { meta = JSON.parse(readFileSync(metaFile, 'utf8')); }
            catch (e) { console.warn(`  ! ignoring ${metaFile}: ${e.message}`); }
        }
        const image = join(DESIGN_DIR, file);
        const mb = statSync(image).size / 1e6;
        if (mb > 2) console.warn(`  ! ${image} is ${mb.toFixed(1)} MB — export a smaller JPG/WebP for the web`);
        return {
            src: `${DESIGN_DIR}/${file}`,
            ...sizeOf(image),
            title: meta.title || titleFromName(name),
            tag: meta.tag || 'Design',
            description: meta.description || '',
            order: Number.isFinite(meta.order) ? meta.order : 100,
        };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map(({ order, ...design }) => design);

writeFileSync(OUT,
    '// Generated by tools/build-work.mjs — do not edit by hand.\n' +
    `window.SAMPLE_WORKS = ${JSON.stringify(works, null, 4)};\n` +
    `window.SAMPLE_DESIGNS = ${JSON.stringify(designs, null, 4)};\n`);
console.log(`build-work: ${works.length} video(s), ${designs.length} design(s) -> ${OUT}`);

// ---------- SEO: VideoObject structured data in index.html + video sitemap ----------
// Lets Google list each edit in video search. Both are rebuilt from the same list as the page.
const SITE = 'https://abhijeetgorhe.me/';
const isoDuration = (mmss) => {
    if (!mmss) return undefined;
    const [m, s] = mmss.split(':').map(Number);
    return `PT${m ? `${m}M` : ''}${s}S`;
};
const uploadDateOf = (src, meta) => meta.uploadDate || statSync(src).mtime.toISOString().slice(0, 10);
const metaOf = (src) => {
    const file = src.replace(/\.[^.]+$/, '.json');
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; }
};
const describe = (w) => w.description || `${w.title} — ${w.tag.toLowerCase()} edit by Abhijeet Gorhe.`;
const videoObjects = works.map((w) => ({
    '@type': 'VideoObject',
    name: w.title,
    description: describe(w),
    thumbnailUrl: w.poster ? SITE + w.poster : SITE + 'resource/og-image.jpg',
    contentUrl: SITE + w.src,
    uploadDate: uploadDateOf(w.src, metaOf(w.src)),
    ...(w.duration ? { duration: isoDuration(w.duration) } : {}),
    genre: w.tag,
    creator: { '@id': SITE + '#person' },
}));

const INDEX = 'index.html';
if (existsSync(INDEX)) {
    const html = readFileSync(INDEX, 'utf8');
    const start = '<!-- work-videos:start (generated by tools/build-work.mjs — do not edit by hand) -->';
    const end = '<!-- work-videos:end -->';
    const a = html.indexOf(start);
    const b = html.indexOf(end);
    if (a !== -1 && b > a) {
        const ld = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            '@id': SITE + '#work',
            name: 'Selected edits by Abhijeet Gorhe',
            itemListElement: videoObjects.map((v, i) => ({ '@type': 'ListItem', position: i + 1, item: v })),
        }, null, 4).replace(/\n/g, '\n    ');
        const block = `${start}\n    <script type="application/ld+json">\n    ${ld}\n    </script>\n    `;
        writeFileSync(INDEX, html.slice(0, a) + block + html.slice(b));
        console.log(`build-work: ${videoObjects.length} VideoObject(s) -> ${INDEX}`);
    }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const today = new Date().toISOString().slice(0, 10);
const videoTags = videoObjects.map((v) => `    <video:video>
      <video:thumbnail_loc>${esc(v.thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${esc(v.name)}</video:title>
      <video:description>${esc(v.description)}</video:description>
      <video:content_loc>${esc(v.contentUrl)}</video:content_loc>
      <video:publication_date>${v.uploadDate}</video:publication_date>
    </video:video>`).join('\n');
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>${SITE}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>${SITE}resource/hero/portrait.webp</image:loc>
    </image:image>
    <image:image>
      <image:loc>${SITE}resource/og-image.jpg</image:loc>
    </image:image>
${videoTags}
  </url>
</urlset>
`);
console.log('build-work: sitemap.xml updated');
