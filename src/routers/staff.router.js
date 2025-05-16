import { Router } from "express";
import { getAllStaff, updateUserRole } from "../controllers/staff.controller";

const router = Router()

router.get("/staffs", getAllStaff)


export default router