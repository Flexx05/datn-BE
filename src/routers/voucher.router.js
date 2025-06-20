import { Router } from "express";
import {
  createVoucher,
  getAllVoucher,
  getByIdVoucher,
  updateVoucher,
  deleteVoucher,
} from "../controllers/voucher.controller";

const router = Router();

router.get("/voucher", getAllVoucher);
router.get("/voucher/:id", getByIdVoucher);
router.post("/voucher/add", createVoucher);
router.patch("/voucher/edit/:id", updateVoucher);
router.delete("/voucher/delete/:id", deleteVoucher);


export default router;