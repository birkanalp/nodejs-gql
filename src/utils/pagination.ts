import { BaseEntity, SelectQueryBuilder } from "typeorm";
import { PaginatedResponseModel } from "../models/pagination";

export const pagination = async <T extends BaseEntity>(
  repo: SelectQueryBuilder<T>,
  index: number,
  limit: number
): Promise<PaginatedResponseModel<T>> => {
  const skip = (index - 1) * limit;
  const _countAsync = repo.getCount();
  const _dataAsync = repo.skip(skip).take(limit).getMany();
  const [_count, _data] = await Promise.all([_countAsync, _dataAsync]);

  return {
    data: _data || [],
    page: {
      limit: limit,
      total: _count,
      current: index,
      previous: index > 1 ? index - 1 : undefined,
      next: _count > skip + limit ? index + 1 : undefined,
      index: index,
    },
  };
};
