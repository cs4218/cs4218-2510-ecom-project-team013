import { Select } from "antd";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api, { ProductData } from "../../api";
import AdminMenu from "../../components/AdminMenu";
import Layout from "../../components/Layout";

const { Option } = Select;

type Category = {
  _id: string;
  name: string;
};

const CreateProduct: React.FC = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [shipping, setShipping] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);

  // Use a clean placeholder (no trailing space; browsers collapse it anyway).
  const shippingPlaceholder = "Select Shipping";

  // get all category
  const getAllCategory = async () => {
    try {
      const { data } = await api.category.getAllCategories();
      if (data?.success) {
        setCategories(data.category as Category[]);
      } else {
        // backend returned success:false
        toast.error(data?.message || "Failed to load categories");
      }
    } catch (error) {
      // keep console.log so tests can assert it if needed
      console.log(error);
      toast.error("Something went wrong in getting category");
    }
  };

  useEffect(() => {
    getAllCategory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // create product function
  const handleCreate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      const productData: ProductData = {
        name: name,
        description: description,
        price: price,
        quantity: quantity,
        category: category,
        shipping: shipping,
        photo: photo ?? undefined,
      };
      const { data } = await api.product.createProduct(productData);

      if (data?.success) {
        toast.success("Product Created Successfully");
        navigate("/dashboard/admin/products");
      } else {
        toast.error(data?.message || "Failed to create product");
      }
    } catch (error) {
      console.log(error);
      toast.error("something went wrong");
    }
  };

  return (
    <Layout title={"Dashboard - Create Product"}>
      <div className="container-fluid m-3 p-3">
        <div className="row">
          <div className="col-md-3">
            <AdminMenu />
          </div>
          <div className="col-md-9">
            <h1>Create Product</h1>
            <div className="m-1 w-75">
              <Select
                bordered={false}
                placeholder="Select a category"
                size="large"
                showSearch
                className="form-select mb-3"
                value={category || undefined}
                onChange={(value) => setCategory(value as string)}
                data-testid="category-select"
                aria-label="Category"
              >
                {categories?.map((c) => (
                  <Option key={c._id} value={c._id}>
                    {c.name}
                  </Option>
                ))}
              </Select>

              <div className="mb-3">
                <label className="btn btn-outline-secondary col-md-12">
                  {photo ? photo.name : "Upload Photo"}
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                    hidden
                  />
                </label>
              </div>

              <div className="mb-3">
                {photo && (
                  <div className="text-center">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt="product_photo"
                      height={"200px"}
                      className="img img-responsive"
                    />
                  </div>
                )}
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  value={name}
                  placeholder="write a name"
                  className="form-control"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <textarea
                  value={description}
                  placeholder="write a description"
                  className="form-control"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <input
                  type="number"
                  value={price}
                  placeholder="write a Price"
                  className="form-control"
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <input
                  type="number"
                  value={quantity}
                  placeholder="write a quantity"
                  className="form-control"
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <Select
                  bordered={false}
                  placeholder={shippingPlaceholder}
                  size="large"
                  showSearch
                  className="form-select mb-3"
                  value={shipping || undefined}
                  onChange={(value) => setShipping(value as string)}
                  data-testid="shipping-select"
                  aria-label="Shipping"
                >
                  <Option value="0">No</Option>
                  <Option value="1">Yes</Option>
                </Select>
              </div>

              <div className="mb-3">
                <button className="btn btn-primary" onClick={handleCreate}>
                  CREATE PRODUCT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateProduct;
