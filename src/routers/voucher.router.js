import { Router } from "express";
import {
  createVoucher,
  getAllVoucher,
  getByIdVoucher,
  updateVoucher,
  deleteVoucher,
  searchVoucherByCode,
  filterVouchersByStatus,
  updateVoucherStatus

} from "../controllers/voucher.controller";

const router = Router();

router.get("/voucher", getAllVoucher);
router.get("/voucher/search-by-code",searchVoucherByCode)
router.get("/voucher/filter-by-status", filterVouchersByStatus);
router.get("/voucher/:id", getByIdVoucher);
router.post("/voucher/add", createVoucher);
router.put("/voucher/edit/:id", updateVoucher);
router.patch("/voucher/status/:id", updateVoucherStatus);
router.delete("/voucher/delete/:id", deleteVoucher);


export default router;