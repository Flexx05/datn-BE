import mongoose, {Schema} from "mongoose";

const commentSchema = new mongoose.Schema({
    // ID sản phẩm được bình luận
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product", 
        required: true
    },
    // ID người dùng bình luận
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth",
        required: true
    },
    // Nội dung bình luận
    content: {
        type: String,
        required: true,
    },
    // Thời gian bình luận
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Trạng thái của bình luận: Chưa duyệt và được duyệt
    status: {
        type: String,
        enum: ['hidden', 'visible'],
        default: 'hidden'
    },
    // Nội dung trả lời bình luận của admin
    replyContent: {
        type: String,
        default: ""
    },
    // Thời gian trả lời bình luận của admin
    replyAt: {
        type: Date,
        default: null
    }
})

export default mongoose.model("Comment", commentSchema);