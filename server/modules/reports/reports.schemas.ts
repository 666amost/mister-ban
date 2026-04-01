import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const periodSchema = z.enum(["day", "month"]);

export const dailyReportQuerySchema = z.object({
  date: dateSchema.optional(),
});

export const monthlyReportQuerySchema = z.object({
  month: monthSchema.optional(),
});

export const storesSummaryQuerySchema = z.object({
  period: periodSchema.optional(),
  date: dateSchema.optional(),
  month: monthSchema.optional(),
});
