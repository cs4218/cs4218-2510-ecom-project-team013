import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useSearch } from "../../context/search";

const SearchInput: React.FC = () => {
  const [values, setValues] = useSearch();
  const navigate = useNavigate();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.search.searchKeyword(values.keyword);
      setValues({ ...values, results: data });
      navigate("/search");
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div>
      <form className="d-flex" role="search" onSubmit={handleSubmit}>
        <input
          className="form-control me-2"
          type="search"
          placeholder="Search"
          aria-label="Search"
          value={values.keyword}
          onChange={(e) => setValues({ ...values, keyword: e.target.value })}
        />
        <button className="btn btn-outline-success" type="submit">
          Search
        </button>
      </form>
    </div>
  );
};

export default SearchInput;
