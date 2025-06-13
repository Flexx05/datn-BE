import mongoose from "mongoose";
import Comment from "../models/comment.model";
import Product from "../models/product.model";
import Order from "../models/fake.order";
import { sendMail } from "../utils/sendMail";

// Hiển thị danh sách bình luận (có thể lọc theo người dùng,sản phẩm, trạng thái, thời gian )
export const getAllComment = async (req, res) => {
  try {
    const {
      status,
      rating,
      startDate,
      endDate,
      userName,
      productName,
      _page = 1,
      _limit = 10,
    } = req.query;

    const filter = {};

    // Lọc theo trạng thái
    if (status) {
      const allowedStatus = ["Chờ phê duyệt", "Đã phê duyệt", "Từ chối"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ." });
      }
      filter.status = status;
    }

    // Lọc theo số sao
    if (rating) {
      filter.rating = Number(rating);
    }

    // Lọc theo ngày
    if ((startDate && !endDate) || (!startDate && endDate)) {
      return res.status(400).json({ message: "Thiếu ngày bắt đầu hoặc kết thúc." });
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: "Định dạng ngày không hợp lệ." });
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    // Truy vấn danh sách bình luận
    let comments = await Comment.find(filter)
      .populate("productId", "name")
      .populate("userId", "fullName email");

    // Chuẩn hóa tiếng Việt không dấu
    const normalize = (str) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

    // Lọc theo tên người dùng
    if (userName) {
      const normalizedInput = normalize(userName);
      comments = comments.filter((c) =>
        c.userId?.fullName && normalize(c.userId.fullName).includes(normalizedInput)
      );
    }

    // Lọc theo tên sản phẩm
    if (productName) {
      const normalizedInput = normalize(productName);
      comments = comments.filter((c) =>
        c.productId?.name && normalize(c.productId.name).includes(normalizedInput)
      );
    }

    const total = comments.length;
    const page = parseInt(_page);
    const limit = parseInt(_limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedComments = comments.slice(start, end);

    return res.status(200).json({
      data: paginatedComments,
      pagination: {
        _page: page,
        _limit: limit,
        _total: total,
        _totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getCommentById = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id)
      .populate("productId", "name")
      .populate("userId", "fullName email")

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
    const { orderId, productId, content, rating } = req.body;
    const userId = req.user._id; 

    // 1. Kiểm tra dữ liệu đầu vào
    if (!orderId) {
      return res.status(400).json({ 
        message: "Vui lòng chọn đơn hàng cần đánh giá." 
      });
    }

    if (!productId) {
      return res.status(400).json({ 
        message: "Vui lòng chọn sản phẩm cần đánh giá." 
      });
    }

    if (!rating) {
      return res.status(400).json({ 
        message: "Vui lòng chọn số sao đánh giá." 
      });
    }

    // 2. Kiểm tra tính hợp lệ của rating (1-5 sao)
    const ratingNumber = Number(rating);
    if (!Number.isInteger(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      return res.status(400).json({ 
        message: "Điểm đánh giá phải là số nguyên từ 1 đến 5 sao." 
      });
    }

    // 3. Kiểm tra độ dài bình luận (nếu có)
    if (content && content.length > 500) {
      return res.status(400).json({ 
        message: "Bình luận không được vượt quá 500 ký tự." 
      });
    }

    // Lấy URL ảnh từ Cloudinary
    const images = req.files?.map(file => file.path) || [];

    // Kiểm tra số lượng ảnh
    if (images.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được upload tối đa 5 ảnh"
      });
    }

    
    // 5. Kiểm tra đơn hàng tồn tại và đã hoàn thành
    const order = await Order.findOne({
      _id: orderId,
      userId,
      status: "Thành công",
      paymentStatus: "Đã thanh toán"
    });

    if (!order) {
      return res.status(403).json({
        message: "Không tìm thấy đơn hàng hoặc đơn hàng chưa hoàn thành."
      });
    }

    // 6. Kiểm tra sản phẩm có trong đơn hàng không
    const matchedItem = order.items.find(item =>
      item.productId?.toString() === new mongoose.Types.ObjectId(productId).toString()
    );

  

    if (!matchedItem) {
      return res.status(403).json({
        message: "Sản phẩm này không có trong đơn hàng."
      });
    }

    // 7. Kiểm tra xem người dùng đã đánh giá sản phẩm này trong đơn hàng chưa
    const existingComment = await Comment.findOne({
      userId,
      orderId,
      productId
    });

    if (existingComment) {
      return res.status(400).json({
        message: "Bạn đã đánh giá sản phẩm này trong đơn hàng này."
      });
    }
   
    // 8. Tạo bình luận mới
    const comment = await Comment.create({
      productId,
      variationId: matchedItem.variationId || null, // Nếu có variantId thì lưu, nếu không thì để null
      userId,
      orderId,
      content: content || "",
      images,
      rating: ratingNumber,
      status: "Chờ phê duyệt"
    });

    // 9. Cập nhật rating trung bình của sản phẩm
    const allRatings = await Comment.find({ 
      productId, 
      status: "Đã phê duyệt" 
    }).select("rating");

    const totalRatings = allRatings.length;
    const sumRatings = allRatings.reduce((sum, item) => sum + Number(item.rating), 0);
    const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

    // Tính ratingCount theo từng mức sao
    const ratingCount = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    allRatings.forEach(({ rating }) => {
      ratingCount[rating] = (ratingCount[rating] || 0) + 1;
    });

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
      message: "Đánh giá thành công và đang chờ duyệt.",
      comment,
      updatedProduct
    });

  } catch (error) {
    return res.status(500).json({ 
      message: "Đã xảy ra lỗi khi gửi đánh giá. Vui lòng thử lại sau.",
      error: error.message 
    });
  }
};


// Cập nhập trạng thái duyệt của bình luận
export const updateCommentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || id.trim() === "") {
      return res.status(400).json({ message: "ID bình luận không được để trống." });
    }

    const allowedStatus = ["Chờ phê duyệt", "Đã phê duyệt", "Từ chối"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ"});
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      { status: status },
      { new: true }
    );

    if (!updatedComment) {
      return res.status(404).json({ message: "Bình luận không tồn tại." });
    }
    
    // Cập nhập lại số sao trung bình mỗi lần duyệt bình luận
    const productId = updatedComment.productId;
    const allRatings = await Comment.find({ 
      productId, 
      status: "Đã phê duyệt" 
    }).select("rating");

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
    const { adminReply } = req.body;

    if (!adminReply || adminReply.trim() === "") {
      return res.status(400).json({ message: "Nội dung trả lời không được để trống." });
    }

    const existingComment = await Comment.findById(id)
      .populate("userId", "email fullName");

    if (!existingComment) {
      return res.status(404).json({ message: "Bình luận không tồn tại." });
    }

    if (existingComment.status !== "Đã phê duyệt") {
      return res.status(400).json({ message: "Chỉ được trả lời bình luận đã được duyệt." });
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      {
        adminReply,
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
          <blockquote>${adminReply}</blockquote>
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
    const { id } = req.params;
    const productId = id;
    
    if (!productId || productId.trim() === "") {
      return res.status(400).json({ message: "ID sản phẩm không được để trống." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại." });
    }

    const comments = await Comment.find({ 
      productId, 
      status: "Đã phê duyệt" 
    })
    .sort({ createdAt: -1 })
    .populate({
      path: "userId productId",
      select: "fullName email name"
    });
    
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
