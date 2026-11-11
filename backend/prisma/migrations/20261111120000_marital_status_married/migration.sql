-- Marital status options are now Single (NEVER_MARRIED), Married and Divorced.
ALTER TYPE "MaritalStatus" ADD VALUE IF NOT EXISTS 'MARRIED';
