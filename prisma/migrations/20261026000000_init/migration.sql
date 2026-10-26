-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "channel" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL,
    "servicePageViews" INTEGER NOT NULL,
    "formViews" INTEGER NOT NULL,
    "formStarts" INTEGER NOT NULL,
    "leads" INTEGER NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostEntry" (
    "id" SERIAL NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "channel" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'BOTH',
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" SERIAL NOT NULL,
    "metric" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "isSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSummary" (
    "id" SERIAL NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "filters" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyMetric_date_idx" ON "DailyMetric"("date");

-- CreateIndex
CREATE INDEX "DailyMetric_channel_date_idx" ON "DailyMetric"("channel", "date");

-- CreateIndex
CREATE INDEX "DailyMetric_campaign_date_idx" ON "DailyMetric"("campaign", "date");

-- CreateIndex
CREATE INDEX "CostEntry_dateFrom_dateTo_idx" ON "CostEntry"("dateFrom", "dateTo");

-- CreateIndex
CREATE UNIQUE INDEX "Target_metric_channel_month_key" ON "Target"("metric", "channel", "month");

