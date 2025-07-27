import { Router } from "express";
import {
  createVoucher,
  getAllVoucher,
  getByIdVoucher,
  updateVoucher,
  deleteVoucher,
  restoreVoucher,
  getVoucherByCode,
} from "../controllers/voucher.controller";

const router = Router();

router.get("/vouchers", getAllVoucher);
router.get("/vouchers/id/:id", getByIdVoucher);
router.get("/vouchers/code/:code", getVoucherByCode);
router.post("/vouchers/add", createVoucher);
router.patch("/vouchers/edit/:id", updateVoucher);
router.delete("/vouchers/delete/:id", deleteVoucher);
router.patch("/vouchers/restore/:id", restoreVoucher);

export default router;