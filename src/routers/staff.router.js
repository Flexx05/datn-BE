import { Router } from "express";
import { getAllStaff, updateStaffRole } from "../controllers/staff.controller";
import { verifyToken } from "../middlewares/checkAuth";

const router = Router()

router.get("/staffs", getAllStaff),
router.patch("/staffs/:id/role", verifyToken, updateStaffRole)


export default router