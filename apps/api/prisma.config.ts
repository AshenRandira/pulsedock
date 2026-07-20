import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

const defaultDatabaseUrl =
  'postgresql://pulsedock:pulsedock@localhost:5432/pulsedock?schema=public';

config({ path: '../../.env' });
config({ path: '.env', override: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? defaultDatabaseUrl,
  },
});
