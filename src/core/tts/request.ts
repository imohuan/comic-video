import axios, { AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";

const instance = axios.create({
  timeout: 1000 * 300
});

axiosRetry(instance, { retries: 3 });

instance.interceptors.response.use(
  function (response) {
    if (response.data.status) {
      if (response.data.status === 200) {
        return response.data.data;
      } else {
        return response.data;
      }
    }
    return response.data;
  },
  function (error) {
    return Promise.reject(error);
  }
);

export async function request<T = any>(url: string, option: Partial<AxiosRequestConfig> = {}): Promise<T> {
  return instance({ url, method: "get", ...option });
}
