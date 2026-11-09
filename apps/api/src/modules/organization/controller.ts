import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import { updateOrganizationSchema } from "./validation";
import { getOrganizationSettings, updateOrganizationSettings } from "./service";

export async function getSettingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const organization = await getOrganizationSettings(req.auth.organizationId);
    res.json({ data: organization });
  } catch (err) {
    next(err);
  }
}

export async function updateSettingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw ApiError.unauthorized();
    const input = updateOrganizationSchema.parse(req.body);
    const organization = await updateOrganizationSettings(
      req.auth.organizationId,
      input,
      req.auth.userId
    );
    res.json({ data: organization });
  } catch (err) {
    next(err);
  }
}
