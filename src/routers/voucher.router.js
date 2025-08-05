import { Router } from "express";
import {
  createVoucher,
  getAllVoucher,
  getByIdVoucher,
  updateVoucher,
  deleteVoucher,
  restoreVoucher,
  getVoucherByCode,
  getUserVouchers,
} from "../controllers/voucher.controller";
import { isAdmin, optionalVerifyToken, verifyToken } from "../middlewares/checkAuth";
const router = Router();

router.get("/vouchers", getAllVoucher);
router.get("/vouchers/id/:id", getByIdVoucher);
router.get("/vouchers/code/:code", getVoucherByCode);
router.post("/vouchers/add", verifyToken, isAdmin ,createVoucher);
router.patch("/vouchers/edit/:id", verifyToken, isAdmin ,updateVoucher);
router.delete("/vouchers/delete/:id", verifyToken, isAdmin ,deleteVoucher);
router.patch("/vouchers/restore/:id", verifyToken, isAdmin, restoreVoucher);
router.get("/vouchers/user", optionalVerifyToken ,getUserVouchers);

export default router;