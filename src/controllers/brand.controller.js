import brandModel from "../models/brand.model";
import productModel from "../models/product.model";
import { generateSlug } from "../utils/createSlug";
import {
  createBrandSchema,
  updateBrandSchema,
} from "../validations/brand.validation";

export const createBrand = async (req, res) => {
  try {
    const { error, value } = createBrandSchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }
    const { name } = req.body;
    const checkName = await brandModel.findOne({ name: name });
    if (checkName) {
      return res.status(400).json({ message: "Tên thương hiệu đã tồn tại" });
    }
    const brands = await brandModel.find();
    const newBrand = await brandModel.create({
      ...value,
      slug: generateSlug(
        value.name,
        brands.map((brand) => brand.slug)
      ),
    });
    return res
      .status(201)
      .json({ message: "Brand created successfully", newBrand });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAllBrands = async (req, res) => {
  try {
    const {
      _page = 1,
      _limit = 10,
      _sort = "createdAt",
      _order,
      isActive,
      search,
    } = req.query;
    const query = {};
    if (typeof search === "string" && search.trim() !== "") {
      query.name = { $regex: search, $options: "i" };
    }
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    const options = {
      page: parseInt(_page, 10),
      limit: parseInt(_limit, 10),
      sort: { [_sort]: _order === "desc" ? -1 : 1 },
    };

    const brands = await brandModel.paginate(query, options);
    return res.status(200).json(brands);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await brandModel.findById(id);
    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }
    return res.status(200).json(brand);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateBrandSchema.validate(req.body, {
      abortEarly: false,
      convert: false,
    });
    if (error) {
      const errors = error.details.map((err) => err.message);
      return res.status(400).json({ message: errors });
    }
    const { name, logoUrl, isActive } = value;
    const brand = await brandModel.findByIdAndUpdate(
      id,
      { name, isActive, logoUrl },
      { new: true }
    );
    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }
    return res
      .status(200)
      .json({ message: "Brand updated successfully", brand });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const showBrand = async (req, res) => {
  try {
    const { slug } = req.params;
    const brand = await brandModel.findOne({ slug: slug });
    if (!brand) {
      return res.status(404).json({ error: "Brand not found" });
    }
    return res.status(200).json({ message: "Brand show successfully", brand });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await brandModel.findById(id);
    if (!brand) {
      return res.status(404).json({ error: "Thương hiệu không tồn tại" });
    }
    if (brand.isActive === true) {
      // Xóa mềm: chuyển isActive = false cho brand
      await brandModel.findByIdAndUpdate(id, { isActive: false });
      // Chuyển sản phẩm sang thương hiệu không xác định
      let unBrand = await brandModel.findOne({
        slug: "thuong-hieu-khong-xac-dinh",
      });
      if (!unBrand) {
        unBrand = await brandModel.create({
          name: "Thương hiệu không xác định",
          slug: "thuong-hieu-khong-xac-dinh",
          isActive: true,
        });
      }
      await productModel.updateMany(
        { brandId: id },
        { brandId: unBrand._id, brandName: unBrand.name }
      );
      return res.status(200).json({
        message:
          "Brand soft deleted successfully, products moved to unknown brand",
        brandId: id,
        moveToBrandId: unBrand._id,
      });
    } else {
      // Xóa cứng
      await brandModel.findByIdAndDelete(id);
      return res
        .status(200)
        .json({ message: "Brand hard deleted successfully" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

