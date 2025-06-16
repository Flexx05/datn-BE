import mongoose from "mongoose";
import Comment from "../models/comment.model";
import Product from "../models/product.model";
import Order from "../models/fake.order";
import { sendMail } from "../utils/sendMail";
import {addCommentValidation, updateCommentStatusValidation, replyToCommentValidation} from "../validations/comment.validation";


// Hiển thị danh sách bình luận (có thể lọc theo người dùng,sản phẩm, trạng thái, thời gian )
export const getAllComment = async (req, res) => {
  try {
    const {
      _page = 1,
      _limit = 10,
      _sort = "createdAt",
      _order = "desc",
      search,
      status,
      rating,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    if (status) {
      const allowedStatus = ["hidden", "visible"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ." });
      }
      query.status = status;
    }

    // Validate rating từ 1-5
    if (rating) {
      const ratingNum = parseInt(rating);
      if (ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ message: "Số sao phải từ 1 đến 5" });
      }
      query.rating = ratingNum;
    }

    // Lọc theo khoảng thời gian
    if ((startDate && !endDate) || (!startDate && endDate)) {
      return res.status(400).json({ message: "Thiếu ngày bắt đầu hoặc kết thúc." });
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: "Định dạng ngày không hợp lệ." });
      }

      if (start > end) {
        return res.status(400).json({ message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." });
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    // Tạo điều kiện tìm kiếm tổng quát
    const normalize = (str) =>
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    
    const searchNormalized = search ? normalize(search) : null;

    const options = {
      page: parseInt(_page, 10),
      limit: parseInt(_limit, 10),
      sort: { [_sort]: _order === "desc" ? -1 : 1 },
      populate: [
        { path: "productId", select: "name" },
        { path: "userId", select: "fullName email" },
      ],
    };

    const allComments = await Comment.paginate(query, options);

    // Lọc thêm theo tên sản phẩm hoặc người dùng sau khi populate (do MongoDB không join sâu)
    if (searchNormalized) {
      allComments.docs = allComments.docs.filter((c) => {
        const product = c.productId?.name ? normalize(c.productId.name) : "";
        const user = c.userId?.fullName ? normalize(c.userId.fullName) : "";
        const email = c.userId?.email ? normalize(c.userId.email) : "";
    
        return (
          product.includes(searchNormalized) ||
          user.includes(searchNormalized) ||
          email.includes(searchNormalized)
        );
      });
    }

    return res.status(200).json(allComments.docs);
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
    const {error, value} = addCommentValidation.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }
    const { orderId, productId, content, rating, images } = value;
    const userId = req.user._id; 

    // Kiểm tra đơn hàng tồn tại và đã hoàn thành
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

    // Kiểm tra sản phẩm có trong đơn hàng không
    const matchedItem = order.items.find(item =>
      item.productId?.toString() === new mongoose.Types.ObjectId(productId).toString()
    );

    if (!matchedItem) {
      return res.status(403).json({
        message: "Sản phẩm này không có trong đơn hàng."
      });
    }


    // Tạo bình luận mới với trạng thái visible
    const comment = await Comment.create({
      productId,
      variationId: matchedItem.variationId || null,
      userId,
      orderId,
      content: content || "",
      images: images || [],
      rating,
      status: "visible" // Mặc định là visible
    });

    // Cập nhật rating trung bình của sản phẩm
    const allRatings = await Comment.find({ 
      productId, 
      status: "visible" // Chỉ tính các bình luận visible
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
      message: "Đánh giá thành công.",
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
    const { error, value } = updateCommentStatusValidation.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }

    const { status } = value;


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
      status: "visible" // Chỉ tính các bình luận đã phê duyệt
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
     const { error, value } = replyToCommentValidation.validate(req.body, {
       abortEarly: false,
       convert: false,
     });
     if (error) {
       const errors = error.details.map((err) => err.message);
       return res.status(400).json({ message: errors });
     }
     
    const { adminReply } = value;
   
    const existingComment = await Comment.findById(id)
      .populate("userId", "email fullName");

    if (!existingComment) {
      return res.status(404).json({ message: "Bình luận không tồn tại." });
    }

    if (existingComment.status !== "visible") {
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="color: #1890ff; text-align: center;">Phản hồi bình luận từ <span style="color: #ff4d4f;">Binova Shop</span></h2>
    
            <p>Xin chào <strong>${existingComment.userId.fullName || "bạn"}</strong>,</p>
    
            <p>Chúng tôi rất cảm ơn bạn đã để lại bình luận cho sản phẩm. Dưới đây là nội dung mà bạn đã gửi:</p>
    
            <div style="background-color: #fff; border-left: 4px solid #1890ff; padding: 10px 15px; margin: 10px 0; font-style: italic; color: #333;">
              ${existingComment.content}
            </div>
    
            <p><strong>Phản hồi từ admin:</strong></p>
            <div style="background-color: #fff; border-left: 4px solid #52c41a; padding: 10px 15px; margin: 10px 0; color: #333;">
              ${adminReply}
            </div>
    
            <p style="margin-top: 24px;">Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.</p>
    
            <p style="margin-top: 32px;">Trân trọng,<br/>
            <strong>Đội ngũ hỗ trợ khách hàng</strong><br/>
            Binova Shop</p>
          </div>
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

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại." });
    }

    const comments = await Comment.find({ 
      productId, 
      status: "visible" 
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
