import { Modal } from "antd";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api";
import AdminMenu from "../../components/AdminMenu";
import CategoryForm from "../../components/Form/CategoryForm";
import Layout from "../../components/Layout";

type Category = { _id: string; name: string };

const CreateCategory: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [updatedName, setUpdatedName] = useState("");

  // handle Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.category.createCategory(name);
      if (data?.success) {
        toast.success(`${name} is created`);
        getAllCategory();
      } else {
        toast.error(data?.message || "Failed to create category");
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong in input form");
    }
  };

  // get all categories
  const getAllCategory = async () => {
    try {
      const { data } = await api.category.getAllCategories();
      if (data?.success) {
        setCategories(data.category as Category[]);
      } else {
        toast.error(data?.message || "Failed to load categories");
        setCategories([]);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong in getting category");
    }
  };

  useEffect(() => {
    getAllCategory();
  }, []);

  // update category
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selected) {
        toast.error("No category selected");
        return;
      }
      const { data } = await api.category.updateCategory(
        selected._id,
        updatedName
      );
      if (data?.success) {
        toast.success(`${updatedName} is updated`);
        setSelected(null);
        setUpdatedName("");
        setVisible(false);
        getAllCategory();
      } else {
        toast.error(data?.message || "Failed to update category");
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  // delete category
  const handleDelete = async (pId: string) => {
    try {
      const { data } = await api.category.deleteCategory(pId);
      if (data?.success) {
        toast.success(`category is deleted`);
        getAllCategory();
      } else {
        toast.error(data?.message || "Failed to delete category");
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <Layout title={"Dashboard - Create Category"}>
      <div className="container-fluid m-3 p-3">
        <div className="row">
          <div className="col-md-3">
            <AdminMenu />
          </div>
          <div className="col-md-9">
            <h1>Manage Category</h1>
            <div className="p-3 w-50">
              <CategoryForm
                handleSubmit={handleSubmit}
                value={name}
                setValue={setName}
              />
            </div>
            <div className="w-75">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories?.map((c) => (
                    <tr key={c._id}>
                      <td>{c.name}</td>
                      <td>
                        <button
                          className="btn btn-primary ms-2"
                          onClick={() => {
                            setVisible(true);
                            setUpdatedName(c.name);
                            setSelected(c);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger ms-2"
                          onClick={() => {
                            handleDelete(c._id);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Modal
              onCancel={() => setVisible(false)}
              footer={null}
              open={visible}
            >
              <CategoryForm
                value={updatedName}
                setValue={setUpdatedName}
                handleSubmit={handleUpdate}
              />
            </Modal>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateCategory;
