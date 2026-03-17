/*
  Warnings:

  - Added the required column `nombre` to the `Reportes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reportes" ADD COLUMN     "nombre" TEXT NOT NULL;
