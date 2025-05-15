import Comment from "../models/comment.model";
import Auth from "../models/auth.model";
import Product from "../models/fake.product";

export const getAllComment = async (req, res) => {
    try {
      const { status, productId, userId, startDate, endDate } = req.query;

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
      
      // Khởi tạo filter gắn vào đối tượng rỗng
      const filter = {};
      
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

      const comment = await Comment.find(filter).populate("productId").populate("userId");
  
      if (comment.length === 0) {
            const appliedFilters = [status, productId, userId, (startDate && endDate)].filter(Boolean).length;
            // Kiểm tra nếu điều kiện lọc 2 hoặc 3 không trả về gì, tránh đưa ra thông báo cụ thể như lọc 1 điều kiện
            if (appliedFilters >= 2) {
                return res.status(404).json({
                message: "Không tìm thấy bình luận nào phù hợp với điều kiện lọc."
                });
            }
        // Kiểm tra nếu điều kiện lọc không trả về gì
        if (status) {
            return res.status(404).json({
              message: `Không có bình luận nào phù hợp với trạng thái đã lọc.`,
            });
          }
          // Kiểm tra nếu điều kiện lọc không trả về gì
          if (productId) {
            return res.status(404).json({
              message: `Không có bình luận nào cho phù hợp với sản phẩm đã lọc.`,
            });
          }
          // Kiểm tra nếu điều kiện lọc không trả về gì
          if (userId) {
            return res.status(404).json({
              message: `Không có bình luận nào phù hợp với người dùng đã lọc.`,
            });
          }
          // Kiểm tra nếu điều kiện lọc không trả về gì
          if (startDate && endDate) {
            return res.status(404).json({
              message: `Không có bình luận nào trong khoảng thời gian đã lọc.`,
            });
          }
        return res.status(404).json({ message: "Không tìm thấy bình luận nào phù hợp với điều kiện lọc." });
      }
      return res.status(200).json(comment);

    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  };

// Thêm bình luận mới
export const addComment = async (req, res) => {
    try {
      const { productId, userId, content } = req.body;
  
      // Kiểm tra dữ liệu đầu vào
      if (!productId || !userId || !content) {
        return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin: productId, userId, content" });
      }

      const productExists = await Product.findById(productId);
      if (!productExists) {
        return res.status(404).json({ message: "Không tìm thấy sản phẩm với productId đã cung cấp" });
      }
  
      // Kiểm tra xem userId có tồn tại không
      const userExists = await Auth.findById(userId);
      if (!userExists) {
        return res.status(404).json({ message: "Không tìm thấy người dùng với userId đã cung cấp" });
      }
  
      // Tạo comment mới
      const newComment = new Comment({
        productId,
        userId,
        content,
        status: "hidden",  // Mặc định bình luận ẩn chờ duyệt
        createdAt: Date.now()
      });
  
      await newComment.save();
  
      return res.status(201).json({ message: "Thêm bình luận thành công", comment: newComment });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Đã xảy ra lỗi khi thêm bình luận" });
    }
  };