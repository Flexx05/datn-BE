import crypto from "crypto";
import qs from "qs";
import moment from "moment";

// Hàm sắp xếp object theo key để tạo chữ ký
const sortObject = (obj) => {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
};

// Tạo URL thanh toán VNPAY

export const createPaymentUrl = (ipAddr, orderId, amount, bankCode = null) => {
  const now = moment();
  const createDate = now.format("YYYYMMDDHHmmss");

  // Encode orderId để tránh ký tự đặc biệt
  const safeOrderId = encodeURIComponent(orderId.toString());

  const vnpParams = {
    vnp_Amount: amount * 100,
    vnp_Command: "pay",
    vnp_CreateDate: createDate,
    vnp_CurrCode: "VND",
    vnp_IpAddr: ipAddr === "::1" ? "127.0.0.1" : ipAddr,
    vnp_Locale: "vn",
    vnp_OrderInfo: encodeURIComponent(`Thanh toan don hang ${safeOrderId}`),
    vnp_OrderType: "other",
    vnp_ReturnUrl:
      process.env.VNP_RETURN_URL || "https://domainmerchant.vn/ReturnUrl",
    vnp_TmnCode: process.env.VNP_TMN_CODE || "DEMOV210",
    vnp_TxnRef: safeOrderId,
    vnp_Version: "2.1.0",
  };

  // if (bankCode) {
  //   vnpParams.vnp_BankCode = bankCode;
  // }

  const sortedParams = sortObject(vnpParams);

  // Tạo chuỗi ký tự cho việc tạo chữ ký
  const signData = Object.keys(sortedParams)
    .map((key) => `${key}=${sortedParams[key]}`)
    .join("&");

  // Tạo chữ ký HMAC SHA512
  const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  // Thêm chữ ký vào tham số
  sortedParams.vnp_SecureHash = signed;

  // Tạo URL thanh toán với các tham số đã được encode
  const paymentUrl =
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?" +
    Object.keys(sortedParams)
      .map((key) => `${key}=${sortedParams[key]}`)
      .join("&");

  return {
    vnpTxnRef: safeOrderId,
    paymentUrl,
  };
};

// Xác thực callback từ VNPAY
export const verifyReturnUrl = (params) => {
  try {
    console.log("Received params in verifyReturnUrl:", params);

    // Kiểm tra xem có phải object không
    if (!params || typeof params !== "object") {
      console.error("Invalid params:", params);
      return false;
    }

    // Kiểm tra và log tất cả các trường của params
    console.log("All fields in params:");
    Object.keys(params).forEach((key) => {
      console.log(`${key}:`, params[key]);
    });

    const secureHash = params.vnp_SecureHash;
    if (!secureHash) {
      console.error("Missing vnp_SecureHash in params");
      return false;
    }

    // Xóa các tham số không cần thiết trước khi xác thực
    const vnpParams = { ...params };
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    // Sắp xếp tham số
    const sortedParams = sortObject(vnpParams);

    // Tạo chuỗi ký tự cần ký
    const signData = Object.keys(sortedParams)
      .map((key) => `${key}=${sortedParams[key]}`)
      .join("&");

    // Tạo chữ ký để xác thực
    const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    console.log("Debug verify return URL:");
    console.log("Sign data:", signData);
    console.log("Secure hash received:", secureHash);
    console.log("Secure hash calculated:", signed);

    // So sánh chữ ký
    return secureHash === signed;
  } catch (error) {
    console.error("Lỗi khi xác thực URL trả về từ VNPAY:", error);
    return false;
  }
};

// Trích xuất orderId từ mã giao dịch
export const parseOrderIdFromTxnRef = (txnRef) => {
  try {
    // Giả sử định dạng txnRef là DH{YY}{MM}{DD}-{RANDOM}
    return txnRef.split("-")[1];
  } catch (error) {
    console.error("Lỗi khi trích xuất orderId từ txnRef:", error);
    return null;
  }
};
