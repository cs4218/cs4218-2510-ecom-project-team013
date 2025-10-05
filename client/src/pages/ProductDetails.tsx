import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout";
import "../styles/ProductDetailsStyles.css";

type Product = {
  _id?: string;
  name?: string;
  description?: string;
  price?: number;
  slug?: string;
  category?: { _id?: string; name?: string };
};

const ProductDetails: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product>({});
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // used to ignore stale async updates (e.g., fast slug switches)
  const activeTokenRef = useRef(0);

  useEffect(() => {
    // Force a fresh cycle whenever the location changes or slug changes.
    // (Some test harnesses remount routers in-place; this covers both.)
    const token = ++activeTokenRef.current;

    const run = async () => {
      if (!slug) {
        setProduct({});
        setRelatedProducts([]);
        return;
      }

      try {
        const { data } = await api.product.getSingleProduct(slug);
        if (activeTokenRef.current !== token) return; // stale

        const p: Product = data?.product ?? {};
        setProduct(p); // set main product immediately (don’t wait for related)

        const pid = p?._id;
        const cid = p?.category?._id;
        if (pid && cid) {
          try {
            const rel = await api.product.getRelatedProducts(pid, cid);
            if (activeTokenRef.current !== token) return; // stale
            setRelatedProducts(
              Array.isArray(rel?.data?.products) ? rel.data.products : []
            );
          } catch (err) {
            console.log(err);
            if (activeTokenRef.current !== token) return; // stale
            setRelatedProducts([]); // fail closed; keep product as-is
          }
        } else {
          setRelatedProducts([]); // insufficient ids → no related call
        }
      } catch (err) {
        console.log(err);
        if (activeTokenRef.current !== token) return; // stale
        // Keep a stable shell with no crash
        setProduct({});
        setRelatedProducts([]);
      }
    };

    void run();

    // cleanup: invalidate this run so late promises are ignored
    return () => {
      if (activeTokenRef.current === token) {
        activeTokenRef.current++;
      }
    };
  }, [slug, location.key]); // watch slug and location changes

  return (
    <Layout>
      <div className="row container product-details">
        <div className="col-md-6">
          <img
            src={`/api/v1/product/product-photo/${product?._id ?? ""}`}
            className="card-img-top"
            alt={product?.name ?? "Product image"}
            height="300"
            width={"350px"}
          />
        </div>
        <div className="col-md-6 product-details-info">
          <h1 className="text-center">Product Details</h1>
          <hr />
          <h6>Name : {product?.name ?? ""}</h6>
          <h6>Description : {product?.description ?? ""}</h6>
          <h6>
            Price :
            {typeof product?.price === "number"
              ? product.price.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })
              : ""}
          </h6>
          <h6>Category : {product?.category?.name ?? ""}</h6>
          <button className="btn btn-secondary ms-1">ADD TO CART</button>
        </div>
      </div>
      <hr />
      <div className="row container similar-products">
        <h4>Similar Products ➡️</h4>
        {relatedProducts.length < 1 && (
          <p className="text-center">No Similar Products found</p>
        )}
        <div className="d-flex flex-wrap">
          {relatedProducts?.map((p) => (
            <div className="card m-2" key={p._id}>
              <img
                src={`/api/v1/product/product-photo/${p?._id ?? ""}`}
                className="card-img-top"
                alt={p?.name ?? "Related product image"}
              />
              <div className="card-body">
                <div className="card-name-price">
                  <h5 className="card-title">{p?.name ?? ""}</h5>
                  <h5 className="card-title card-price">
                    {typeof p?.price === "number"
                      ? p.price.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })
                      : ""}
                  </h5>
                </div>
                <p className="card-text ">
                  {(p?.description ?? "").substring(0, 60)}...
                </p>
                <div className="card-name-price">
                  <button
                    className="btn btn-info ms-1"
                    onClick={() => {
                      if (p?.slug) navigate(`/product/${p.slug}`);
                    }}
                  >
                    More Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetails;
