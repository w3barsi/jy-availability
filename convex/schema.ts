import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  availability: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD format
    isAvailable: v.optional(v.boolean()),
    isUnavailable: v.optional(v.boolean()),
  })
    .index("by_date", ["date"])
    .index("by_user_and_date", ["userId", "date"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
