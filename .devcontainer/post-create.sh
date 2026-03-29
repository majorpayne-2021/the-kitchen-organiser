#!/usr/bin/env sh
set -e

# Create data directories
mkdir -p data/dev/photos data/dev/avatars

# Symlink public dirs to data/dev
ln -sfn ../data/dev/photos public/photos
ln -sfn ../data/dev/avatars public/avatars

# Install all dependencies (including devDependencies)
npm install

# Rebuild native modules for Alpine/musl (prebuilt binaries target glibc)
npm rebuild better-sqlite3 --build-from-source

# Generate Prisma client from schema
npx prisma generate

# Create database and apply migrations (also runs seed)
npx prisma migrate dev

echo ""
echo "Dev environment ready! Run: npm run dev"
