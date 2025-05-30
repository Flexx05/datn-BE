import Comment from "../models/comment.model";
import Product from "../models/product.model";
import Order from "../models/fake.order";
import { sendMail } from "../utils/sendMail";

// Hiển thị danh sách bình luận (có thể lọc theo người dùng,sản phẩm, trạng thái, thời gian )
export const getAllComment = async (req, res) => {
  try {
    const { status, productId, userId, startDate, endDate, userName, productName, rating } = req.query;
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
    
    // Lọc số sao đánh giá
    if(rating !== undefined && rating !== "") {
        filter.rating = Number(rating);
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

     let comment = await Comment.find(filter).populate("productId", "name").populate("userId", "fullName email");
    
      // Lọc theo tên người dùng nếu có
    if (userName) {
      comment = comment.filter(c =>
        c.userId?.fullName?.toLowerCase().includes(userName.toLowerCase())
      );
    }

    // Lọc theo tên sản phẩm nếu có
    if (productName) {
      comment = comment.filter(c =>
        c.productId?.name?.toLowerCase().includes(productName.toLowerCase())
      );
    }

    const hasFilter = status || productId || userId || (startDate && endDate) || userName || productName;

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

export const getCommentById = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra id có tồn tại không
    if (!id || id.trim() === '') {
      return res.status(400).json({ message: "ID bình luận không được để trống." });
    }

    const comment = await Comment.findById(id)
      .populate("productId", "name")
      .populate("userId", "fullName email");

    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận." });
    }

    return res.status(200).json(comment);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// Thêm bình luận, đánh giá cho sản phẩm(Chỉ cho phép người dùng đã mua hàng và đăng nhập mới có thể bình luận)
export const addComment = async (req, res) => {
  try {
    const { productId, content, rating } = req.body;
    const userId = req.user._id; 

    if (req.body.userId && req.body.userId !== String(req.user._id)) {
      return res.status(403).json({
        message: "Hệ thống sẽ tự lấy ID từ tài khoản đăng nhập."
      });
    }

    if (!productId || !rating) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
    }

    if (typeof content === "string" && content.length > 500) {
      return res.status(400).json({ message: "Bình luận không được quá 500 ký tự." });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Điểm đánh giá phải là số nguyên từ 1 đến 5." });
    }

    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(400).json({ message: "Sản phẩm không tồn tại." });
    }


    // Kiểm tra xem người dùng đã mua sản phẩm này chưa
    const orderExists = await Order.exists({
      userId,
      productId,
      status: 'completed' 
    });

    if (!orderExists) {
      return res.status(403).json({
        message: "Bạn chưa mua sản phẩm này, không thể đánh giá."
      });
    }

    const comment = await Comment.create({
      productId,
      userId,
      content,
      rating,
      status: "hidden"
    });


       // Lấy tất cả rating hiện tại của sản phẩm

       const allRatings = await Comment.find({ productId, status: "visible" }).select("rating");
       const totalRatings = allRatings.length;
       const sumRatings = allRatings.reduce((sum, item) => sum + Number(item.rating), 0);
       const avgRating = sumRatings / totalRatings;
   
       // Tính ratingCount theo từng mức sao
       const ratingCount = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
       allRatings.forEach(({ rating }) => {
         ratingCount[rating] = (ratingCount[rating] || 0) + 1;
       });
   
       // Cập nhật sản phẩm với averageRating, reviewCount và ratingCount
       const updatedProduct = await Product.findByIdAndUpdate(
         productId,
         {
           averageRating: avgRating,
           reviewCount: totalRatings,
           ratingCount: ratingCount
         },
         { new: true }
       );
   
       return res.status(200).json({
         message: "Đánh giá thành công",
         comment,
         updatedProduct
       });

  } catch (error) {
    return res.status(500).json({ message: "Đã xảy ra lỗi khi gửi đánh giá.", error: error.message });
  }
};

// Cập nhập trạng thái duyệt của bình luận
export const updateCommentStatus = async (req, res) => {
  try {
    // Truyền id của bình luận
    const { id } = req.params;
    const { status } = req.body;

    // Kiểm tra id tồn tại
    if (!id || id.trim() === "") {
      return res.status(400).json({ message: "ID bình luận không được để trống." });
    }

    // Kiểm tra giá trị hợp lệ cho status
    const allowedStatus = ["visible", "hidden"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ"});
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      { status: status },
      { new: true } // Trả về document sau khi cập nhật
    );

    if (!updatedComment) {
      return res.status(404).json({ message: "Bình luận không tồn tại." });
    }
    
    // Cập nhập lại số sao trung bình mỗi lần duyệt bình luận
    const productId = updatedComment.productId;
    const allRatings = await Comment.find({ productId, status: "visible" }).select("rating");
    const totalRatings = allRatings.length;
    const sumRatings = allRatings.reduce((sum, item) => sum + Number(item.rating), 0);
    const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

    // Tính ratingCount theo từng mức sao
    const ratingCount = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    allRatings.forEach(({ rating }) => {
      ratingCount[rating] = (ratingCount[rating] || 0) + 1;
    });

    await Product.findByIdAndUpdate(
      productId,
      {
        averageRating: avgRating,
        reviewCount: totalRatings,
        ratingCount: ratingCount
      }
    );

    return res.status(200).json({
      message: `Cập nhật trạng thái bình luận thành công.`,
      comment: updatedComment
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// Admin trả lời lại bình luận của người dùng
export const replyToComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyContent } = req.body;

    if (!replyContent || replyContent.trim() === "") {
      return res.status(400).json({ message: "Nội dung trả lời không được để trống." });
    }

    const existingComment = await Comment.findById(id).populate("userId", "email fullName");

    if (!existingComment) {
      return res.status(404).json({ message: "Bình luận không tồn tại." });
    }

    if (existingComment.status !== "visible") {
      return res.status(400).json({ message: "Chỉ được trả lời bình luận đã được duyệt." });
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      {
        replyContent,
        replyAt: new Date()
      },
      { new: true }
    );

    // Gửi email thông báo cho user
    if (existingComment.userId?.email) {
      await sendMail({
        to: existingComment.userId.email,
        subject: "Phản hồi bình luận từ Binova Shop",
        html: `
          <p>Xin chào ${existingComment.userId.fullName || "bạn"},</p>
          <p>Bình luận của bạn đã được admin phản hồi:</p>
          <blockquote>${existingComment.content}</blockquote>
          <p><b>Phản hồi từ admin:</b></p>
          <blockquote>${replyContent}</blockquote>
          <p>Trân trọng,<br/>Đội ngũ hỗ trợ khách hàng</p>
        `
      });
    }

    return res.status(200).json({
      message: "Trả lời bình luận thành công.",
      comment: updatedComment
    });

  } catch (error) {
    return res.status(500).json({ message: "Đã xảy ra lỗi khi trả lời bình luận.", error: error.message });
  }
};

// Lấy tất cả bình luận của người dùng theo sản phẩm(Chỉ lấy bình luận đã được duyệt)
export const getCommentsForClient = async (req, res) => {
  try {
    // Truyền id của sản phẩm
    const { id } = req.params;
    const productId = id;
    if (!productId || productId.trim() === "") {
      return res.status(400).json({ message: "ID sản phẩm không được để trống." });
    }
    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại." });
    }

    // Lấy tất cả bình luận đã được duyệt
    const comments = await Comment.find({ 
      productId, 
      status: "visible" 
    })
    .sort({ createdAt: -1 }).populate({
      path: "userId  productId",         // trường tham chiếu trong Comment
      select: "fullName email name"  // chỉ lấy những trường cần thiết của user
    }); // Mới nhất trước
    
    if (comments.length === 0) {
      return res.status(404).json({ message: "Không có bình luận nào cho sản phẩm này." });
    }
    return res.status(200).json({
      averageRating: product.averageRating || 0,
      totalComments: comments.length,
      comments
    });

  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi lấy bình luận", error: error.message });
  }
};

