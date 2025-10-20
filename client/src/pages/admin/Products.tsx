import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import api from "../../api";
import AdminMenu from "../../components/AdminMenu";
import Layout from "../../components/Layout";
import IProduct from "../../interfaces/IProduct";

const Products: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);

  //GET all products
  const getAllProducts = async () => {
    try {
      const { data } = await api.product.getAllProducts();
      setProducts(data.products);
    } catch (error) {
      console.log(error);
      toast.error("Something Went Wrong");
    }
  };

  // Lifecycle method
  useEffect(() => {
    getAllProducts();
  }, []);

  return (
    <Layout>
      <div className="row">
        <div className="col-md-3">
          <AdminMenu />
        </div>

        <div className="col-md-9">
          <h1 className="text-center">All Products List</h1>

          <div className="d-flex flex-wrap gap-2 w-100">
            {products?.map((p, index) => (
              <Link
                key={p._id}
                to={`/dashboard/admin/product/${p.slug}`}
                className="product-link"
                data-testid={`div-product-${p.slug}`}
              >
                <div
                  className="card m-2"
                  style={{ width: "18rem" }}
                  data-testid={`div-product-${index}`}
                >
                  <img
                    src={`/api/v1/product/product-photo/${p._id}`}
                    className="card-img-top"
                    alt={p.name}
                  />
                  <div className="card-body">
                    <h5 className="card-title">{p.name}</h5>
                    <p className="card-text">{p.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Products;
