-- Scalability audit: add indexes for query patterns that had none.
-- See schema.prisma comments on Project/Announcement/AnnouncementTargetUser
-- for the per-query justification behind each one below.

CREATE INDEX "Project_managerId_idx" ON "Project"("managerId");
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");

CREATE INDEX "Announcement_workspaceId_idx" ON "Announcement"("workspaceId");
CREATE INDEX "Announcement_createdById_idx" ON "Announcement"("createdById");

CREATE INDEX "AnnouncementTargetUser_userId_idx" ON "AnnouncementTargetUser"("userId");
