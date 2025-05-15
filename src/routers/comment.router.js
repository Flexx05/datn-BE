import {Router} from "express";
import { addComment, getAllComment } from "../controllers/comment.controller";

const router = Router();

router.get("/comments", getAllComment);
router.post("/comments", addComment);

export default router;