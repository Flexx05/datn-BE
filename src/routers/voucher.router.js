import { Router } from "express";
import {
  createVoucher,
  getAllVoucher,
  getByIdVoucher,
  updateVoucher,
  deleteVoucher,
} from "../controllers/voucher.controller";

const router = Router();

router.get("/vouchers", getAllVoucher);
router.get("/vouchers/id/:id", getByIdVoucher);
router.post("/vouchers/add", createVoucher);
router.patch("/vouchers/edit/:id", updateVoucher);
router.delete("/vouchers/delete/:id", deleteVoucher);


export default router;