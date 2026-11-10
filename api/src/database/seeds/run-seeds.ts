// First: env.validation's implicit number conversion needs decorator metadata.
import 'reflect-metadata';
import { validateEnv } from '../../config/env.validation.js';
import dataSource from '../data-source.js';
import { seedAdminUser } from './admin-user.seed.js';
import { seedCountries } from './countries.seed.js';
import { seedInspectionChecklist } from './inspection-checklist.seed.js';

// Entry point for `npm run seed`. Uses the same connection settings as the migrations.
await dataSource.initialize();
try {
  const inserted = await seedCountries(dataSource);
  console.log(`countries: inserted ${inserted}`);
  const indicators = await seedInspectionChecklist(dataSource);
  console.log(`inspection indicators: inserted ${indicators}`);

  // data-source.ts has already loaded .env into process.env.
  const env = validateEnv(process.env);
  if (env.SEED_ADMIN_EMAIL && env.SEED_ADMIN_PASSWORD) {
    const created = await seedAdminUser(
      dataSource,
      env.SEED_ADMIN_EMAIL,
      env.SEED_ADMIN_PASSWORD,
    );
    console.log(`admin user: ${created ? 'created' : 'already exists'}`);
  } else {
    console.log(
      'admin user: skipped (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set)',
    );
  }
} finally {
  await dataSource.destroy();
}
