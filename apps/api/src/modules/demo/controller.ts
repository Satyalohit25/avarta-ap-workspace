import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database";
import { seedDemoDataset } from "../../lib/demo-seeder";

export async function resetDemoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await seedDemoDataset(prisma);
    res.json({
      data: summary,
      message: "Avarta demo environment has been reset to pristine baseline with dynamic dates anchored to today.",
    });
  } catch (err) {
    next(err);
  }
}
