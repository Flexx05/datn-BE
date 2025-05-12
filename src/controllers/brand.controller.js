import brandModel from "../models/brand.model";

export const createBrand = async (req, res) => {
  try {
    const { name, slug, logoUrl } = req.body;
    const newBrand = await brandModel.create({ name, slug, logoUrl });
    return res.status(201).json({ message: "Brand created successfully", newBrand });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};