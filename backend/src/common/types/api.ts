export type ApiSuccess<T> = {
  code: 0;
  message: string;
  data: T;
};

export type ApiError = {
  code: number;
  message: string;
  detail?: string;
};

export type Pagination = {
  total: number;
  page: number;
  pageSize: number;
};

export type ApiSuccessDTO<T> = ApiSuccess<T>;
export type ApiErrorDTO = ApiError;
export type PaginationDTO = Pagination;
