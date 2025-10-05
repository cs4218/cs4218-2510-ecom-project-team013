interface ICategoryFormProps {
  handleSubmit: (e: React.FormEvent<Element>) => void;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
}

const CategoryForm = ({
  handleSubmit,
  value,
  setValue,
}: ICategoryFormProps) => {
  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Enter new category"
            value={value}
            data-testid="category-input"
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          data-testid="submit-button"
        >
          Submit
        </button>
      </form>
    </>
  );
};

export default CategoryForm;
