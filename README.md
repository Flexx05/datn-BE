# 🧱 Node.js Project Base

## 📦 Mô tả

Dự án này là một **base backend sử dụng Node.js** giúp các thành viên phát triển nhanh chóng dựa trên cấu trúc sẵn có. Dự án có sẵn một số thư viện, cấu trúc thư mục rõ ràng và hỗ trợ môi trường phát triển nhất quán.

---

## 🚀 Công nghệ sử dụng

- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Mongoose](https://mongoosejs.com/)
- [Dotenv](https://github.com/motdotla/dotenv) – quản lý biến môi trường
- [ESLint + Prettier] – định dạng và lint code (tùy chọn)

---

## HƯỚNG DẪN CÀI ĐẶT
1. Clone dự án:
```bash
  git clone https://github.com/Flexx05/datn-BE.git
  cd datn-BE
```
2. Cài đặt dependencies:
```bash
  npm i
```
3. Tạo file `.env` từ mẫu:
```bash
  cp .env.example .env
```
sau đó cấu hình các biến môi trường trong `.env`
Ví dụ:
```ini
PORT=8080
DB_URL=datn-binova
JWT_SECRET_KEY=binova
```
4. Chạy server
```bash
npm run dev
```
## 📂 Cấu trúc thư mục

```bash
.
├── postman/                # Thư mục chứa file collection Postman (test API)
├── src/                    # Mã nguồn chính
│   ├── controllers/        # Xử lý logic nghiệp vụ
│   ├── middlewares/        # Middleware xác thực, xử lý lỗi,...
│   ├── models/             # Định nghĩa schema và model MongoDB
│   ├── routers/            # Khai báo các route chính
│   ├── validations/        # Xác thực dữ liệu đầu vào (Joi hoặc custom)
│   └── app.js              # Khởi tạo ứng dụng Express
├── .env.example            # Mẫu file môi trường cho dev
├── .gitignore              # Các file/thư mục không đưa vào Git
├── package.json            # Khai báo thông tin dự án và dependency
```

