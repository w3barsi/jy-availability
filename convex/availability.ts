import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUnavailabilityForMonth = query({
  args: {
    year: v.number(),
    month: v.number(), // 0-11 (JavaScript month format)
  },
  handler: async (ctx, args) => {
    // Get first and last day of the month
    const firstDay = new Date(args.year, args.month, 1);
    const lastDay = new Date(args.year, args.month + 1, 0);
    
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];

    const unavailability = await ctx.db
      .query("availability")
      .withIndex("by_date")
      .filter((q) => 
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate),
          q.or(
            q.eq(q.field("isUnavailable"), true),
            q.eq(q.field("isAvailable"), false)
          )
        )
      )
      .collect();

    // Get user details for each unavailability record
    const unavailabilityWithUsers = await Promise.all(
      unavailability.map(async (record) => {
        const user = await ctx.db.get(record.userId);
        return {
          ...record,
          userName: user?.name || user?.email || 'Unknown',
        };
      })
    );

    return unavailabilityWithUsers;
  },
});

export const toggleUnavailability = mutation({
  args: {
    date: v.string(), // YYYY-MM-DD format
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to update availability");
    }

    // Check if unavailability record exists for this user and date
    const existing = await ctx.db
      .query("availability")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", userId).eq("date", args.date)
      )
      .unique();

    if (existing) {
      // Check both old and new field names
      const isCurrentlyUnavailable = existing.isUnavailable || existing.isAvailable === false;
      
      if (isCurrentlyUnavailable) {
        // Remove unavailability (delete the record)
        await ctx.db.delete(existing._id);
        return false;
      } else {
        // Mark as unavailable
        await ctx.db.patch(existing._id, { 
          isUnavailable: true,
          isAvailable: undefined // Clear old field
        });
        return true;
      }
    } else {
      // Create new unavailability record
      await ctx.db.insert("availability", {
        userId,
        date: args.date,
        isUnavailable: true,
      });
      return true;
    }
  },
});

export const getCurrentUserUnavailability = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const firstDay = new Date(args.year, args.month, 1);
    const lastDay = new Date(args.year, args.month + 1, 0);
    
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];

    const userUnavailability = await ctx.db
      .query("availability")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate),
          q.or(
            q.eq(q.field("isUnavailable"), true),
            q.eq(q.field("isAvailable"), false)
          )
        )
      )
      .collect();

    return userUnavailability.map(record => record.date);
  },
});
