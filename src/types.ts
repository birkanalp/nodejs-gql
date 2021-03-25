import { Request, Response } from "express";
import session from "express-session";
import { Redis } from "ioredis";

export type MyContext = {
  req: MyRequest;
  res: Response;
  redis: Redis;
};

type MyRequest = Request & {
  session: session.Session & Partial<session.SessionData> & { userId: number };
};
