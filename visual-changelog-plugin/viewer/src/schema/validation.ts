import { z } from "zod";

export const kpiCardSchema = z.object({
  label: z.string(),
  value: z.union([z.number(), z.string()]),
  delta: z.union([z.number(), z.string()]).optional(),
  trend: z.enum(["up", "down", "neutral"]).optional(),
});

export const kpiBarSectionSchema = z.object({
  type: z.literal("kpi-bar"),
  title: z.string().optional(),
  cards: z.array(kpiCardSchema),
});

export interface HeatmapNodeInput {
  name: string;
  changes: number;
  children?: HeatmapNodeInput[];
}

export const heatmapNodeSchema: z.ZodType<HeatmapNodeInput> = z.object({
  name: z.string(),
  changes: z.number(),
  children: z.lazy(() => heatmapNodeSchema.array()).optional(),
});

export const heatmapSectionSchema = z.object({
  type: z.literal("heatmap"),
  title: z.string().optional(),
  root: heatmapNodeSchema,
});

export const fileChangeSchema = z.object({
  path: z.string(),
  status: z.enum(["added", "modified", "deleted", "renamed", "untracked"]),
  linesAdded: z.number().optional(),
  linesRemoved: z.number().optional(),
  reason: z.string().optional(),
});

export const fileListSectionSchema = z.object({
  type: z.literal("file-list"),
  title: z.string().optional(),
  files: z.array(fileChangeSchema),
});

export const proseSectionSchema = z.object({
  type: z.literal("prose"),
  title: z.string().optional(),
  content: z.string(),
});

export const mermaidSectionSchema = z.object({
  type: z.literal("mermaid"),
  title: z.string().optional(),
  definition: z.string(),
  caption: z.string().optional(),
});

export const testSuiteDeltaSchema = z.object({
  passed: z.number().optional(),
  failed: z.number().optional(),
  skipped: z.number().optional(),
  total: z.number().optional(),
  newTests: z.number().optional(),
});

export const testSuiteSectionSchema = z.object({
  type: z.literal("test-suite"),
  title: z.string(),
  runner: z.string().optional(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  total: z.number(),
  duration: z.number().optional(),
  delta: testSuiteDeltaSchema.optional(),
});

export const sectionSchema = z.discriminatedUnion("type", [
  kpiBarSectionSchema,
  heatmapSectionSchema,
  fileListSectionSchema,
  proseSectionSchema,
  mermaidSectionSchema,
  testSuiteSectionSchema,
]);

export const changelogEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  draft: z.boolean().optional(),
  git: z.object({
    branch: z.string(),
    commitHash: z.string(),
    baseRef: z.string(),
    prNumber: z.number().optional(),
  }),
  previousEntryId: z.string().optional(),
  sections: z.array(sectionSchema),
});
