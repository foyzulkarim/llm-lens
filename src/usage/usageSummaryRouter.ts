import { Router, Request, Response, NextFunction } from "express";
import { UsageSummaryService } from "./usageSummaryService";

export function createUsageSummaryRouter(summaryService: UsageSummaryService): Router {
  const router = Router();

  router.get("/summary", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string | undefined;
      const model = req.query.model as string | undefined;

      const summary = await summaryService.getSummary(userId, model);

      res.json(summary);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
