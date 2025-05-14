const createSlug = (name) => {
  return name
    .toLowerCase()
    .normalize("NFD") // chuẩn hóa chuỗi Unicode
    .replace(/[\u0300-\u036f]/g, "") // xóa dấu
    .replace(/[^a-z0-9\s-]/g, "") // xóa ký tự đặc biệt
    .trim()
    .replace(/\s+/g, "-") // thay khoảng trắng bằng dấu -
    .replace(/-+/g, "-"); // loại bỏ dấu - liên tiếp;
};

export function generateSlug(name, existingSlugs) {
  let baseSlug = createSlug(name);
  let slug = baseSlug;
  let count = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${count}`;
    count++;
  }

  return slug;
}

// Dùng hàm generateSlug() để tạo slug không trùng lặp dựa vào tên
