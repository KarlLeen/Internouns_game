import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_TABLE'];
const missing = required.filter((key) => !process.env[key] || !process.env[key].trim());
if (missing.length > 0) {
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}

const srcPath = path.join(root, 'index.html');
const outDir = path.join(root, 'dist');
const outPath = path.join(outDir, 'index.html');

const src = fs.readFileSync(srcPath, 'utf8');

const replacements = {
  SUPABASE_URL: process.env.SUPABASE_URL.trim(),
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY.trim(),
  SUPABASE_TABLE: process.env.SUPABASE_TABLE.trim()
};

function replaceConst(source, key, value) {
  const pattern = new RegExp(`const\\s+${key}\\s*=\\s*'[^']*';`);
  if (!pattern.test(source)) {
    throw new Error(`Could not find constant in index.html: ${key}`);
  }
  return source.replace(pattern, `const ${key} = '${value}';`);
}

let output = src;
for (const [key, value] of Object.entries(replacements)) {
  output = replaceConst(output, key, value.replace(/'/g, "\\'"));
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, output, 'utf8');

console.log(`Built ${path.relative(root, outPath)} with injected Supabase config.`);
