// Mirrors the backend's plans, stories and API contract into the React project
// (../frontend/trip-managment/backend/) so front-end work can read them. Run: npm run sync:frontend
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const frontend = join(root, '..', 'frontend', 'trip-managment');
const target = join(frontend, 'backend');

if (!existsSync(frontend)) {
  console.error(`Front-end project not found at ${frontend}`);
  process.exit(1);
}

const copies = [
  ['.squad/plans', 'plans'],
  ['.squad/stories', 'stories'],
  ['contract', 'contracts'],
];

mkdirSync(target, { recursive: true });
for (const [from, to] of copies) {
  // Replace the whole folder so files removed in the backend disappear here too.
  rmSync(join(target, to), { recursive: true, force: true });
  cpSync(join(root, from), join(target, to), { recursive: true });
  console.log(`${from} -> backend/${to}`);
}

writeFileSync(
  join(target, 'README.md'),
  `# Backend reference (read-only mirror)

Copied from the backend project (\`trip-management/\`) by \`npm run sync:frontend\`.
**Do not edit here**: change the backend and re-run the sync.

| Folder | Source in the backend | What it is |
|--------|-----------------------|------------|
| [contracts/](contracts/README.md) | \`contract/\` | API contract: every module's endpoints, bodies, query parameters, errors and response examples, plus \`openapi.json\`. **Build the front end from this.** |
| [plans/](plans/00-index.md) | \`.squad/plans/\` | Implementation plans per backend story (what each feature does and why). |
| [stories/](stories/) | \`.squad/stories/\` | Story intakes: requirements, acceptance criteria, out of scope. |

Last synced: ${new Date().toISOString()}
`,
);
console.log(`Synced to ${target}`);
