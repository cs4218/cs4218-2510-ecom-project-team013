import { createContext, useContext, useState } from "react";

type SearchValue = {
  keyword: string;
  // TODO: Define a proper type for results
  results: any[];
};

type SearchContextType = [
  SearchValue,
  React.Dispatch<React.SetStateAction<SearchValue>>,
];

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchValue, setSearchValue] = useState<SearchValue>({
    keyword: "",
    results: [],
  });

  return (
    <SearchContext.Provider value={[searchValue, setSearchValue]}>
      {children}
    </SearchContext.Provider>
  );
};

// Custom hook
const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};

export { SearchProvider, useSearch };
