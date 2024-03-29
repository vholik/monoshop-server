/*
  Warnings:

  - A unique constraint covering the columns `[itemId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `itemId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "itemId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_itemId_key" ON "Order"("itemId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
