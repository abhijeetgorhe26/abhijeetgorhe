#!/usr/bin/env node
// Builds resource/work/works.js — the lists the "Sample Work" section renders.
//
// Drop a video into resource/work/ (or an image into resource/work/design/) and it
// shows up on the site. Optional extras, matched by file name (e.g. my-client.mp4):
//   my-client.jpg   poster image (auto-made from the video if ffmpeg is installed)
//   my-client.json  { "title": "...", "tag": "...", "description": "...", "order": 1 }
//
// Runs automatically from the pre-commit hook (.githooks/pre-commit).
// Run by hand with: node tools/build-work.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, parse } from 'node:path';

const DIR = 'resource/work';
const OUT = join(DIR, 'works.js');
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

const files = readdirSync(DIR);
const works = files
    .filter((f) => VIDEO_EXT.includes(parse(f).ext.toLowerCase()))
    .map((file) => {
        const { name } = parse(file);
        const video = join(DIR, file);

        let meta = {};
        const metaFile = join(DIR, `${name}.json`);
        if (existsSync(metaFile)) {
            try { meta = JSON.parse(readFileSync(metaFile, 'utf8')); }
            catch (e) { console.warn(`  ! ignoring ${metaFile}: ${e.message}`); }
        }

        let poster = POSTER_EXT.map((ext) => `${name}${ext}`).find((p) => files.includes(p));
        if (!poster && canPoster && makePoster(video, join(DIR, `${name}.jpg`))) poster = `${name}.jpg`;

        const mb = statSync(video).size / 1e6;
        if (mb > LARGE_MB) {
            console.warn(`  ! ${video} is ${mb.toFixed(0)} MB — compress it for the web, e.g.\n` +
                `    ffmpeg -i ${video} -vf scale=-2:1080 -c:v libx264 -crf 24 -c:a aac -b:a 128k -movflags +faststart out.mp4`);
        }

        return {
            src: `${DIR}/${file}`,
            poster: poster ? `${DIR}/${poster}` : null,
            title: meta.title || titleFromName(name),
            tag: meta.tag || 'Video',
            description: meta.description || '',
            orientation: meta.orientation || orientationOf(video),
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
