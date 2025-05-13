import productModel from "../models/product.model";
import attributeModel from "../models/attribute.model";
import { productSchema } from "../validations/product.validation";
import mongoose from "mongoose";

export const getAllProduct = async (req, res) => {
  try {
    const { _page = 1, _limit = 10, _sort = "createdAt", _order } = req.query;
    const options = {
      page: parseInt(_page),
      limit: parseInt(_limit),
      sort: { [_sort]: _order === "desc" ? -1 : 1 },
    };
    const product = await productModel.paginate({}, options);
    return res.status(200).json(product);
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id);
    if (!product)
      return res.status(404).json({ message: "Sản phẩm khôn tồn tại" });
    return res.status(200).json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const product = await productModel.findOne({ slug });
    if (!product)
      return res.status(404).json({ message: "Sản phẩm khôn tồn tại" });
    return res.status(200).json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!product)
      return res.status(404).json({ message: "Sản phẩm khôn tồn tại" });
    return res.status(200).json(product);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
