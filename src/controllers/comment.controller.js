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

    // ✅ Lọc theo số sao
    if (rating) {
      query.rating = Number(rating);
    }

    // ✅ Lọc theo khoảng thời gian
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

    // ✅ Tạo điều kiện tìm kiếm tổng quát
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

    // ✅ Lọc thêm theo tên sản phẩm hoặc người dùng sau khi populate (do MongoDB không join sâu)
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
    
      allComments.totalDocs = allComments.docs.length;
      allComments.totalPages = Math.ceil(allComments.totalDocs / options.limit);
    }
    

    return res.status(200).json({
      data: allComments.docs,
      pagination: {
        _page: allComments.page,
        _limit: allComments.limit,
        _total: allComments.totalDocs,
        _totalPages: allComments.totalPages,
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
