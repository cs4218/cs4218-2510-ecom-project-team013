import braintree from "braintree";
import dotenv from "dotenv";
import type { RequestHandler } from "express";
import fs from "fs";
import slugify from "slugify";
import categoryModel from "../models/categoryModel";
import orderModel from "../models/orderModel";
import productModel from "../models/productModel";

dotenv.config();

//payment gateway
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

export const createProductController: RequestHandler = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      (req as any).fields || {};
    const { photo } = (req as any).files || {};
    // validation
    switch (true) {
      case !name:
        return res.status(500).send({ error: "Name is Required" });
      case !description:
        return res.status(500).send({ error: "Description is Required" });
      case !price:
        return res.status(500).send({ error: "Price is Required" });
      case !category:
        return res.status(500).send({ error: "Category is Required" });
      case !quantity:
        return res.status(500).send({ error: "Quantity is Required" });
      case photo && photo.size > 1000000:
        return res
          .status(500)
          .send({ error: "photo is Required and should be less then 1mb" });
    }

    const products = new productModel({
      ...(req as any).fields,
      slug: slugify(name),
    });
    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    res.status(201).send({
      success: true,
      message: "Product Created Successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in creating product",
    });
  }
};

//get all products
export const getProductController: RequestHandler = async (req, res, next) => {
  try {
    const products = await productModel
      .find({})
      .populate("category")
      .select("-photo")
      .limit(12)
      .sort({ createdAt: -1 });

    res.status(200).send({
      success: true,
      counTotal: products.length,
      message: "All Products",
      products,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Erorr in getting products",
      error: (error as any).message,
    });
  }
};

// get single product
export const getSingleProductController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const slug = req.params?.slug;
    if (!slug) {
      return res.status(400).send({
        success: false,
        message: "slug is required",
      });
    }

    const product = await productModel
      .findOne({ slug })
      .select("-photo")
      .populate("category");

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Single product fetched",
      product,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error while getting single product",
      error,
    });
  }
};

// get photo
export const productPhotoController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { pid } = req.params || {};
    const product = await productModel.findById(pid).select("photo");

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const data = product?.photo?.data;
    if (!data || (Buffer.isBuffer(data) && data.length === 0)) {
      return res.status(404).send({
        success: false,
        message: "Photo not found",
      });
    }

    const contentType = product.photo.contentType || "application/octet-stream";
    res.set("Content-Type", contentType);
    return res.status(200).send(data);
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error while getting photo",
      error,
    });
  }
};

//delete controller
export const deleteProductController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const product = await productModel.findByIdAndDelete(req.params.pid);

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Product Deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting product",
    });
  }
};

// Update Product
export const updateProductController: RequestHandler = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields ?? {};
    const { photo } = req.files ?? {};

    // Validation
    switch (true) {
      case !name:
        return res
          .status(400)
          .send({ success: false, message: "Name is Required" });
      case !description:
        return res
          .status(400)
          .send({ success: false, message: "Description is Required" });
      case !price:
        return res
          .status(400)
          .send({ success: false, message: "Price is Required" });
      case !category:
        return res
          .status(400)
          .send({ success: false, message: "Category is Required" });
      case !quantity:
        return res
          .status(400)
          .send({ success: false, message: "Quantity is Required" });
      case shipping === undefined || shipping === null:
        return res
          .status(400)
          .send({ success: false, message: "Shipping is Required" });
      case photo && (photo as any).size > 1000000:
        return res
          .status(400)
          .send({ success: false, message: "Photo should be less than 1MB" });
    }

    const updateData: any = {
      name,
      description,
      price,
      category,
      quantity,
      shipping,
      slug: slugify(Array.isArray(name) ? name[0] : name),
    };

    const product = await productModel.findByIdAndUpdate(
      req.params.pid,
      updateData,
      { new: true }
    );

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    if (photo) {
      product.photo = {
        data: fs.readFileSync((photo as any).path),
        contentType: (photo as any).type,
      };
      await product.save();
    }

    res.status(200).send({
      success: true,
      message: "Product Updated Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in Update product",
    });
  }
};

// filters
export const productFiltersController: RequestHandler = async (req, res) => {
  try {
    const { checked, radio } = req.body;
    const args: any = {};
    if (checked.length > 0) args.category = checked;
    if (radio.length) args.price = { $gte: radio[0], $lte: radio[1] };
    const products = await productModel.find(args);
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error WHile Filtering Products",
      error,
    });
  }
};

// product count
export const productCountController: RequestHandler = async (req, res) => {
  try {
    const total = await productModel.find({}).estimatedDocumentCount();
    res.status(200).send({
      success: true,
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      message: "Error in product count",
      error,
      success: false,
    });
  }
};

// product list base on page
export const productListController: RequestHandler = async (req, res) => {
  try {
    const perPage = 6;
    const page = (req.params as any).page
      ? Number((req.params as any).page)
      : 1;
    const products = await productModel
      .find({})
      .select("-photo")
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "error in per page ctrl",
      error,
    });
  }
};

// search product
export const searchProductController: RequestHandler = async (req, res) => {
  try {
    const { keyword } = req.params;
    const resutls = await productModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      })
      .select("-photo");
    res.json(resutls);
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error In Search Product API",
      error,
    });
  }
};

// similar products
export const realtedProductController: RequestHandler = async (req, res) => {
  try {
    const { pid, cid } = req.params || {};
    if (!pid || !cid) {
      return res.status(400).send({
        success: false,
        message: "Both pid and cid are required",
      });
    }

    const products = await productModel
      .find({
        category: cid,
        _id: { $ne: pid },
      })
      .select("-photo")
      .limit(3)
      .populate("category");

    return res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error while getting related products",
      error,
    });
  }
};

// get products by category
export const productCategoryController: RequestHandler = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    const products = await productModel.find({ category }).populate("category");
    res.status(200).send({
      success: true,
      category,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      error,
      message: "Error While Getting products",
    });
  }
};

//payment gateway api
//token
export const braintreeTokenController: RequestHandler = async (req, res) => {
  try {
    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send(response);
      }
    });
  } catch (error) {
    console.log(error);
  }
};

//payment
export const brainTreePaymentController: RequestHandler = async (req, res) => {
  try {
    const { nonce, cart } = req.body as any;
    let total = 0;
    cart.map((i: any) => {
      total += i.price;
    });
    const newTransaction = gateway.transaction.sale(
      {
        amount: total,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },
      function (error, result) {
        if (result) {
          const order = new (orderModel as any)({
            products: cart,
            payment: result,
            buyer: (req as any).user._id,
          }).save();
          res.json({ ok: true });
        } else {
          res.status(500).send(error);
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
};
