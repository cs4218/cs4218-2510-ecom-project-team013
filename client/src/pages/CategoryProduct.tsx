import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout";
import ICategory from "../interfaces/ICategory";
import IProduct from "../interfaces/IProduct";
import "../styles/CategoryProductStyles.css";

const CategoryProduct = () => {
  const params = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState<ICategory>();
  const [products, setProducts] = useState<IProduct[]>([]);

  const getProductsByCategory = async () => {
    try {
      const { data } = await api.product.getProductsByCategory(params.slug);

      setProducts(data?.products);
      setCategory(data?.category);
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong in getting the data");
    }
  };

  useEffect(() => {
    if (params?.slug) getProductsByCategory();
  }, [params?.slug]);

  return (
    <Layout>
      <div className="container mt-3 category">
        <h4 className="text-center">
          Category - {category?.name ?? params?.slug}
        </h4>
        <h6 className="text-center">{products?.length} result found </h6>

        <div className="row">
          <div className="col-md-9 offset-1">
            <div className="d-flex flex-wrap">
              {products?.map((p) => (
                <div className="card m-2" key={p._id}>
                  <img
                    src={`/api/v1/product/product-photo/${p._id}`}
                    className="card-img-top"
                    alt={p.name}
                    data-testid={`product_img_${p._id}`}
                  />

                  <div className="card-body">
                    <div className="card-name-price">
                      <h5
                        className="card-title"
                        data-testid={`product_name_${p._id}`}
                      >
                        {p.name}
                      </h5>

                      <h5
                        className="card-title card-price"
                        data-testid={`product_price_${p._id}`}
                      >
                        {p.price.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </h5>
                    </div>

                    <p
                      className="card-text "
                      data-testid={`product_description_${p._id}`}
                    >
                      {p.description.substring(0, 60)}...
                    </p>

                    <div className="card-name-price">
                      <button
                        className="btn btn-info ms-1"
                        onClick={() => navigate(`/product/${p.slug}`)}
                        data-testid={`product_more_details_${p._id}`}
                      >
                        More Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CategoryProduct;
