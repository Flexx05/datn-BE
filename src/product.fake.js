export const Product = {
    findById: (productId) => {
        // Fake dữ liệu sản phẩm
        const products = [
            {
                productId: "p1",
                name: "Giày chạy bộ Adidas",
                isActive: false,
                image: "https://via.placeholder.com/150/0000FF/808080?Text=Áo+thun+Nam", // Ảnh sản phẩm
                variants: [
                    { 
                        variantId: "v1", 
                        color: "red", 
                        size: "M", 
                        stock: 10, 
                        price: 100000, 
                        image: "https://via.placeholder.com/150/FF0000/FFFFFF?Text=Áo+thun+Đỏ+M" // Ảnh biến thể
                    },
                    { 
                        variantId: "v2", 
                        color: "blue", 
                        size: "L", 
                        stock: 5, 
                        price: 120000, 
                        image: "https://via.placeholder.com/150/0000FF/FFFFFF?Text=Áo+thun+Xanh+L" // Ảnh biến thể
                    },
                ]
            },
            {
                productId: "p2",
                name: "Giày đá bóng Vapor 15",
                isActive: false,
                image: "https://via.placeholder.com/150/0000FF/808080?Text=Quần+Jeans+Nam", // Ảnh sản phẩm
                variants: [
                    { 
                        variantId: "v3", 
                        color: "black", 
                        size: "M", 
                        stock: 8, 
                        price: 150000, 
                        image: "https://via.placeholder.com/150/000000/FFFFFF?Text=Quần+Jeans+Đen+M" // Ảnh biến thể
                    },
                    { 
                        variantId: "v4", 
                        color: "gray", 
                        size: "L", 
                        stock: 10, 
                        price: 160000, 
                        image: "https://via.placeholder.com/150/808080/FFFFFF?Text=Quần+Jeans+Gray+L" // Ảnh biến thể
                    },
                ]
            },
            {
                productId: "p3",
                name: "Giày thể thao",
                isActive: true,  // Sản phẩm này đã bị xóa
                image: "https://via.placeholder.com/150/0000FF/808080?Text=Giày+Thể+Thao", // Ảnh sản phẩm
                variants: [
                    { 
                        variantId: "v5", 
                        color: "white", 
                        size: "42", 
                        stock: 3, 
                        price: 200000, 
                        image: "https://via.placeholder.com/150/FFFFFF/000000?Text=Giày+Thể+Thao+Trắng+42" // Ảnh biến thể
                    },
                    { 
                        variantId: "v6", 
                        color: "black", 
                        size: "44", 
                        stock: 7, 
                        price: 220000, 
                        image: "https://via.placeholder.com/150/000000/FFFFFF?Text=Giày+Thể+Thao+Đen+44" // Ảnh biến thể
                    },
                ]
            }
        ];

        // Tìm sản phẩm theo productId
        return products.find(product => product.productId === productId);
    }
};
