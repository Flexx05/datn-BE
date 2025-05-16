import Comment from "../models/comment.model";
import Auth from "../models/auth.model";
import Product from "../models/fake.product";

// Hiển thị danh sách bình luận (có thể lọc theo người dùng,sản phẩm, trạng thái, thời gian )
export const getAllComment = async (req, res) => {
  try {
    const { status, productId, userId, startDate, endDate } = req.query;
    // Khởi tạo filter gắn vào đối tượng rỗng
    const filter = {};
    
    // Kiểm tra xem admin có bỏ trống id trên URL hoặc thay thế id bằng dấu cách hay không
    if (productId !== undefined) {
      if (productId.trim() === '') {
        return res.status(400).json({ message: "Sản phẩm không được để trống." });
      }
      filter.productId = productId;
    }

     // Kiểm tra xem admin có bỏ trống id trên URL hoặc thay thế id bằng dấu cách hay không
    if (userId !== undefined) {
      if (userId.trim() === '') {
        return res.status(400).json({ message: "Người dùng không được để trống." });
      }
      filter.userId = userId;
    }
    
   
    // Kiểm tra status xem có bị thay đổi không đúng định dạng là "hidden" và "visible" không
    if (status !== undefined) {
      if (status.trim() === '') {
        return res.status(400).json({ message: "Trạng thái không được để trống." });
      }
      const allowedStatus = ["hidden", "visible"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          message: `Trạng thái không hợp lệ.`,
        });
      }
      filter.status = status;
    }

    // Kiểm tra xem có điền thiếu trên URL 1 trong 2 startDate và endDate không
    if ((startDate && !endDate) || (!startDate && endDate)) {
      return res.status(400).json({
        message: "Thời gian phải có ngày bắt đầu và ngày kết thúc.",
      });
    }
    

  // Kiểm tra nếu cả startDate và endDate được cung cấp từ query params
      if (startDate && endDate) {
      // Chuyển đổi chuỗi ngày từ query sang đối tượng Date
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Nếu ngày không hợp lệ (ví dụ như sai định dạng), trả về lỗi 400
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({ 
          message: "Định dạng ngày không hợp lệ. Vui lòng nhập đúng định dạng YYYY-MM-DD." 
          });
      }

      // Kiểm tra logic thời gian: ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc
      if (start > end) {
          return res.status(400).json({ 
          message: "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc." 
          });
      }

      // Thiết lập giờ cho ngày bắt đầu là 00:00:00 và ngày kết thúc là 23:59:59 để lọc trong cả ngày
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Thêm điều kiện lọc vào query: chỉ lấy những bình luận được tạo trong khoảng thời gian này
      filter.createdAt = { $gte: start, $lte: end };
      }

     const comment = await Comment.find(filter);    // populate("productId", "name").populate("userId", "fullName email");

    const hasFilter = status || productId || userId || (startDate && endDate);

      if (comment.length === 0) {
        if (hasFilter) {
          return res.status(404).json({ message: "Không tìm thấy bình luận nào phù hợp với điều kiện lọc." });
        } else {
          return res.status(404).json({ message: "Không có dữ liệu." });
        }
      }
    return res.status(200).json(comment);

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const addComment = async (req, res) => {
    try {
      const { productId, userId, content, rating } = req.body;
  
      if (!productId || !userId || !rating) {
        return res.status(400).json({ message: "vui lòng nhập đầy đủ thông tin" });
      }
  
      if (typeof content === "string" && content.length > 500) {
        return res.status(400).json({ message: "Bình luận không được quá 500 ký tự." });
      }
  
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Điểm đánh giá phải từ 1 đến 5 sao." });
      }
  
      const hasPurchased = await Order.findOne({
        userId,
        "items.productId": productId,
        status: "completed" // giả định trạng thái giao hàng thành công
      });
  
      if (!hasPurchased) {
        return res.status(403).json({ message: "Bạn chưa mua sản phẩm này, không thể đánh giá." });
      }
  
      const comment = await Comment.create({
        productId,
        userId,
        content,
        rating
      });
  
      return res.status(200).json(comment);
    } catch (error) {
      return res.status(500).json({ message: "Đã xảy ra lỗi khi gửi đánh giá.", error: error.message });
    }
  };