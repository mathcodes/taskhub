-- CreateTable
CREATE TABLE "PlaybookTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "rawJson" TEXT NOT NULL,
    "stepsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookAssignment" (
    "id" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaybookAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookAssignmentWorker" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "accessToken" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaybookAssignmentWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookRun" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PlaybookRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookStepResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaybookStepResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaybookAssignmentWorker_accessToken_key" ON "PlaybookAssignmentWorker"("accessToken");

-- CreateIndex
CREATE INDEX "PlaybookAssignment_playbookId_idx" ON "PlaybookAssignment"("playbookId");

-- CreateIndex
CREATE INDEX "PlaybookAssignmentWorker_assignmentId_idx" ON "PlaybookAssignmentWorker"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaybookRun_workerId_key" ON "PlaybookRun"("workerId");

-- CreateIndex
CREATE INDEX "PlaybookRun_status_idx" ON "PlaybookRun"("status");

-- CreateIndex
CREATE INDEX "PlaybookStepResult_runId_idx" ON "PlaybookStepResult"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaybookStepResult_runId_stepIndex_key" ON "PlaybookStepResult"("runId", "stepIndex");

-- AddForeignKey
ALTER TABLE "PlaybookAssignment" ADD CONSTRAINT "PlaybookAssignment_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "PlaybookTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookAssignmentWorker" ADD CONSTRAINT "PlaybookAssignmentWorker_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "PlaybookAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookRun" ADD CONSTRAINT "PlaybookRun_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "PlaybookAssignmentWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookStepResult" ADD CONSTRAINT "PlaybookStepResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PlaybookRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
