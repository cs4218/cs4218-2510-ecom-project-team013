import axios from "axios";

export const searchApi = {
  async searchKeyword(keyword: string) {
    return await axios.get(`/api/v1/product/search/${keyword}`);
  },
};
