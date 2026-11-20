// M9.3: `npm run release:check` — verifies the version in package.json is a
// valid semver for the versionCode scheme (src/config/version.ts) and that
// docs/store/release-notes/<version>.md has TR + EN "What's new" text within
// Google Play's per-language limit. Prints versionName / versionCode.
import { readFileSync, existsSync } from 'node:fs';

const MAJOR = 10000, MINOR = 100, MAX = 500; // keep in sync with src/config/version.ts
const fail = (msg) => { console.error('release:check FAILED — ' + msg); process.exit(1); };

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
if (!m) fail(`package.json version "${version}" is not MAJOR.MINOR.PATCH`);
const [maj, min, pat] = m.slice(1).map(Number);
if (min >= MAJOR / MINOR || pat >= MINOR) fail(`minor/patch must be < 100 (${version})`);
const code = maj * MAJOR + min * MINOR + pat;

const notesPath = new URL(`../../docs/store/release-notes/${version}.md`, import.meta.url);
if (!existsSync(notesPath)) fail(`missing docs/store/release-notes/${version}.md`);
const md = readFileSync(notesPath, 'utf8');
// Sections: "## tr-TR" and "## en-US"; text until the next "## " heading.
for (const lang of ['tr-TR', 'en-US']) {
  const sec = new RegExp(`^## ${lang}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm').exec(md);
  if (!sec) fail(`release notes: no "## ${lang}" section`);
  const text = sec[1].trim();
  if (!text) fail(`release notes: "${lang}" is empty`);
  if ([...text].length > MAX) fail(`release notes: "${lang}" is ${[...text].length} chars (max ${MAX})`);
  console.log(`  ${lang}: ${[...text].length}/${MAX} chars`);
}
console.log(`release:check OK — versionName ${version}, versionCode ${code}`);
