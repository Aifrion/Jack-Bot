import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export const START_SCRIPT: string = readFileSync(
  join(here, 'start_script.txt'),
  'utf-8',
).trim();

interface QuestionsFile {
  [key: string]: string;
}

const questionsRaw = JSON.parse(
  readFileSync(join(here, 'questions.json'), 'utf-8'),
) as QuestionsFile;

export const QUESTIONS: string[] = Object.values(questionsRaw);
