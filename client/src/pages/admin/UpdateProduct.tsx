import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import AdminMenu from "../../components/AdminMenu";
import Layout from "../../components/Layout";
import ICategory from "../../interfaces/ICategory";

const UpdateProduct: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [shipping, setShipping] = useState<boolean>(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [id, setId] = useState("");

  // Get product
  const getSingleProduct = async () => {
    try {
      const { data } = await axios.get(
        `/api/v1/product/get-product/${params.slug}`
      );
      setName(data.product.name);
      setId(data.product._id);
      setDescription(data.product.description);
      setPrice(data.product.price);
      setPrice(data.product.price);
      setQuantity(data.product.quantity);
      setShipping(data.product.shipping);
      setCategory(data.product.category._id);
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong in getting product");
    }
  };

  // Get all category
  const getAllCategory = async () => {
    try {
      const { data } = await axios.get("/api/v1/category/get-category");
      if (data?.success) {
        setCategories(data?.category);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong in getting category");
    }
  };

  useEffect(() => {
    getSingleProduct();
    getAllCategory();
  }, []);

  // Update Product
  const handleUpdate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    try {
      const productData = new FormData();
      productData.append("name", name);
      productData.append("description", description);
      productData.append("price", price);
      productData.append("quantity", quantity);
      photo && productData.append("photo", photo);
      productData.append("category", category);
      productData.append("shipping", shipping.toString());

      const { data } = await axios.put(
        `/api/v1/product/update-product/${id}`,
        productData
      );

      if (data?.success) {
        toast.success("Product Updated Successfully");
        navigate("/dashboard/admin/products");
      } else {
        toast.error(data?.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  // Delete Product
  const handleDelete = async () => {
    try {
      let answer = window.confirm("Are You Sure want to delete this product ?");
      if (!answer) return;
      const { data } = await axios.delete(
        `/api/v1/product/delete-product/${id}`
      );
      if (data?.success) {
        toast.success("Product Deleted Successfully");
        navigate("/dashboard/admin/products");
      } else {
        toast.error(data?.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <Layout title={"Dashboard - Update Product"}>
      <div className="container-fluid m-3 p-3">
        <div className="row">
          <div className="col-md-3">
            <AdminMenu />
          </div>

          <div className="col-md-9" data-testid="update-product-div">
            <h1>Update Product</h1>
            <div className="m-1 w-75">
              {/* Category */}
              <div className="mb-3">
                <select
                  className="form-select mb-3"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  data-testid="category-input"
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories?.map((c) => (
                    <option
                      key={c._id}
                      value={c._id}
                      data-testid={`category-option-${c._id}`}
                    >
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Photo */}
              <div className="mb-3">
                <label
                  className="btn btn-outline-secondary col-md-12"
                  data-testid="photo-label"
                >
                  {photo ? photo.name : "Upload Photo"}
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPhoto(e.target.files[0]);
                      }
                    }}
                    hidden
                    data-testid="photo-input"
                  />
                </label>
              </div>

              <div className="mb-3">
                {photo ? (
                  <div className="text-center" data-testid="preview-photo">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt="product_photo"
                      height={"200px"}
                      className="img img-responsive"
                      data-testid="preview-photo-img"
                    />
                  </div>
                ) : (
                  <div className="text-center" data-testid="existing-photo">
                    {id && (
                      <div className="text-center" data-testid="existing-photo">
                        <img
                          src={`/api/v1/product/product-photo/${id}`}
                          alt="product_photo"
                          height={"200px"}
                          className="img img-responsive"
                          data-testid="existing-photo-img"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Product Name */}
              <div className="mb-3">
                <input
                  type="text"
                  value={name}
                  placeholder="Write a name"
                  className="form-control"
                  data-testid="name-input"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Product Description */}
              <div className="mb-3">
                <textarea
                  value={description}
                  placeholder="Write a description"
                  className="form-control"
                  data-testid="description-input"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Product Price */}
              <div className="mb-3">
                <input
                  type="number"
                  value={price}
                  placeholder="Write a Price"
                  className="form-control"
                  data-testid="price-input"
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {/* Product Quantity */}
              <div className="mb-3">
                <input
                  type="number"
                  value={quantity}
                  placeholder="Write a quantity"
                  className="form-control"
                  data-testid="quantity-input"
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              {/* Product Has Shipping  */}

              <div className="mb-3">
                <select
                  value={shipping ? "true" : "false"}
                  className="form-control"
                  onChange={(e) => setShipping(e.target.value === "true")}
                  data-testid="shipping-input"
                >
                  <option value="false" data-testid="no-shipping-option">
                    No
                  </option>
                  <option value="true" data-testid="yes-shipping-option">
                    Yes
                  </option>
                </select>
              </div>

              {/* Update Product  */}
              <div className="mb-3">
                <button
                  className="btn btn-primary"
                  onClick={handleUpdate}
                  data-testid="update-btn"
                >
                  UPDATE PRODUCT
                </button>
              </div>

              {/* Delete Product  */}
              <div className="mb-3">
                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  data-testid="delete-btn"
                >
                  DELETE PRODUCT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UpdateProduct;
