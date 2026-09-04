import { execSync } from 'child_process';
import { existsSync, renameSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();
const envFile = join(rootDir, '.env');
const envDev = join(rootDir, '.env.back');
const envProd = join(rootDir, '.env.production');

console.log('🔄 Starting production migration...\n');

// Step 1: Check if files exist
if (!existsSync(envProd)) {
  console.error('❌ Error: .env.production file not found!');
  process.exit(1);
}

try {
  // Step 2: Backup current .env if it exists
  if (existsSync(envFile)) {
    console.log('📦 Backing up .env to .env.development');
    renameSync(envFile, envDev);
  }

  // Step 3: Rename .env.production to .env
  console.log('🔧 Setting .env.production as active .env');
  renameSync(envProd, envFile);

  // Step 4: Run migration
  console.log('🚀 Running pnpm migrate...\n');
  execSync('pnpm migrate', { stdio: 'inherit' });
  console.log('\n✅ Migration completed successfully!');

} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exitCode = 1;
} finally {
  // Step 5: Restore files regardless of success/failure
  console.log('\n🔄 Restoring environment files...');
  
  if (existsSync(envFile)) {
    renameSync(envFile, envProd);
    console.log('✅ Restored .env.production');
  }
  
  if (existsSync(envDev)) {
    renameSync(envDev, envFile);
    console.log('✅ Restored .env from .env.development');
  }
  
  console.log('\n✨ Done!');
}