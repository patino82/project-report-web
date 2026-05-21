This migration was created offline by Hermes on branch feat/auth-nextauth-migration.
It contains SQL to create NextAuth tables (Account, Session, VerificationToken) and to add relation indices required by the Prisma adapter.

IMPORTANT: This file was created without connecting to a live database. Review the SQL in migration.sql before applying it with `npx prisma migrate deploy` or `npx prisma migrate dev`.
