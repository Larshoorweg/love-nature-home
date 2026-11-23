// Asks Google once for the business rating and review count, and writes the
// numbers into every page between the <!--g:rating--> and <!--g:count--> markers.
// Run by .github/workflows/google-rating.yml once a day. Needs GOOGLE_PLACES_API_KEY.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const DATA = 'data/google-rating.json';
const QUERY = 'Love Nature Krabi Travel And Tour, Ao Nang, Krabi';

if (!KEY) {
  console.log('No GOOGLE_PLACES_API_KEY set. Nothing changed.');
  process.exit(0);
}

const data = JSON.parse(readFileSync(DATA, 'utf8'));

async function ask(url, options, mask) {
  const res = await fetch(url, {
    ...options,
    headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': mask, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Google answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

let place;
if (data.placeId) {
  place = await ask(`https://places.googleapis.com/v1/places/${data.placeId}`, {}, 'id,displayName,rating,userRatingCount');
} else {
  const found = await ask('https://places.googleapis.com/v1/places:searchText',
    { method: 'POST', body: JSON.stringify({ textQuery: QUERY }) },
    'places.id,places.displayName,places.rating,places.userRatingCount');
  place = (found.places || []).find((p) => /love nature krabi/i.test(p.displayName?.text || ''));
  if (!place) throw new Error('Could not find the business on Google. Nothing changed.');
}

const rating = Number(place.rating);
const count = Number(place.userRatingCount);
console.log(`Google says: ${place.displayName?.text} | ${rating} from ${count} reviews`);

// Safety net: ignore answers that make no sense, so a bad reply never reaches the site.
if (!(rating >= 1 && rating <= 5) || !Number.isInteger(count) || count < 1 || count < data.count * 0.5) {
  throw new Error('That answer looks wrong. Nothing changed.');
}

const ratingText = rating.toFixed(1);
const countText = count.toLocaleString('en-US');

const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'assets') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) pages.push(p);
  }
};
walk('.');

let changed = 0;
for (const p of pages) {
  const before = readFileSync(p, 'utf8');
  const after = before
    .replace(/<!--g:rating-->[^<]*<!--\/g-->/g, `<!--g:rating-->${ratingText}<!--/g-->`)
    .replace(/<!--g:count-->[^<]*<!--\/g-->/g, `<!--g:count-->${countText}<!--/g-->`);
  if (after !== before) { writeFileSync(p, after); changed += 1; }
}

if (changed || data.placeId !== place.id || data.rating !== rating || data.count !== count) {
  writeFileSync(DATA, JSON.stringify({ rating, count, placeId: place.id, updated: new Date().toISOString().slice(0, 10) }, null, 2) + '\n');
}
console.log(changed ? `Updated ${changed} pages.` : 'Numbers are already up to date.');
