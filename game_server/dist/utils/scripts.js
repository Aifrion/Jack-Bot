import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
export const START_SCRIPT = readFileSync(join(here, 'start_script.txt'), 'utf-8').trim();
const questionsRaw = JSON.parse(readFileSync(join(here, 'questions.json'), 'utf-8'));
export const QUESTIONS = Object.values(questionsRaw);
