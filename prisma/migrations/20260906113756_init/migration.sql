-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'אביזרי הולכת מים',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "silenceDays" INTEGER NOT NULL DEFAULT 14,
    "outreachTpl" TEXT NOT NULL DEFAULT '',
    "visitHour" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "regionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phone2" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "products" TEXT[],
    "annualVol" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'C',
    "status" TEXT NOT NULL DEFAULT 'active',
    "since" INTEGER NOT NULL DEFAULT 0,
    "terms" TEXT NOT NULL DEFAULT '',
    "openQuote" INTEGER NOT NULL DEFAULT 0,
    "openQuoteAt" TIMESTAMP(3),
    "lastVisitAt" TIMESTAMP(3),
    "memo" TEXT NOT NULL DEFAULT '',
    "outreachStatus" TEXT,
    "outreachSentAt" TIMESTAMP(3),
    "outreachVisitAt" TIMESTAMP(3),
    "outreachConfirmedAt" TIMESTAMP(3),
    "seminarState" TEXT NOT NULL DEFAULT 'none',
    "seminarTopics" TEXT[],
    "seminarSeats" INTEGER NOT NULL DEFAULT 0,
    "seminarNote" TEXT NOT NULL DEFAULT '',
    "seminarAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "customerId" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "nextAction" TEXT NOT NULL DEFAULT '',
    "nextAt" TIMESTAMP(3),
    "nextDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallNote" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "callId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by" TEXT NOT NULL,

    CONSTRAINT "CallNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "customerId" INTEGER NOT NULL,
    "num" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "due" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "orderId" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "spec" TEXT NOT NULL DEFAULT '',
    "qty" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_uuid_key" ON "Settings"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_uuid_key" ON "Region"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Region_slug_key" ON "Region"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_uuid_key" ON "Customer"("uuid");

-- CreateIndex
CREATE INDEX "Customer_userId_idx" ON "Customer"("userId");

-- CreateIndex
CREATE INDEX "Customer_regionId_idx" ON "Customer"("regionId");

-- CreateIndex
CREATE INDEX "Customer_userId_phone_idx" ON "Customer"("userId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Call_uuid_key" ON "Call"("uuid");

-- CreateIndex
CREATE INDEX "Call_customerId_idx" ON "Call"("customerId");

-- CreateIndex
CREATE INDEX "Call_at_idx" ON "Call"("at");

-- CreateIndex
CREATE UNIQUE INDEX "CallNote_uuid_key" ON "CallNote"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Order_uuid_key" ON "Order"("uuid");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderLine_uuid_key" ON "OrderLine"("uuid");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallNote" ADD CONSTRAINT "CallNote_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
