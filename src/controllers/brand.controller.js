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

export const getAllBrands = async (req, res) => {
    try {
      const brands = await brandModel.find();
      return res.status(200).json({ message: "Get all brands successfully", brands });
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
      return res.status(200).json({ message: "Get brand successfully", brand });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  export const updateBrand = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, slug, logoUrl } = req.body;
      const brand = await brandModel.findByIdAndUpdate(id, { name, slug, logoUrl }, { new: true });
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      return res.status(200).json({ message: "Brand updated successfully", brand });
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
      const brand = await brandModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      return res.status(200).json({ message: "Brand deleted successfully", brand });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  export const searchBrand = async (req, res) => {
    try {
      const { name } = req.query;
      // console.log(req.query);
      const brands = await brandModel.find({ name: { $regex: name, $options: "i" } });
      if (brands.length === 0) {
        return res.status(404).json({ error: "No brands found" });
      }
      return res.status(200).json({ message: "Get brands successfully", brands });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
  