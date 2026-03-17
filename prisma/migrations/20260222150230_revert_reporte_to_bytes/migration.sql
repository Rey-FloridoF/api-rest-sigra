/*
  Warnings:

  - Changed the type of `reporte` on the `Reportes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Reportes" DROP COLUMN "reporte",
ADD COLUMN     "reporte" BYTEA NOT NULL;
