import { ClassType, ObjectType, Field, Int } from "type-graphql";

export default function PaginationResponse<TItem>(
  TItemClass: ClassType<TItem>
) {
  // `isAbstract` decorator option is mandatory to prevent registering in schema
  @ObjectType({ isAbstract: true })
  abstract class PaginatedResponseClass {
    @Field(() => [TItemClass]) data: Array<TItem>;
    @Field(() => PaginationModel) page: PaginationModel;
  }
  return PaginatedResponseClass;
}

export class PaginatedResponseModel<T> {
  data: Array<T>;
  page: PaginationModel;
}

@ObjectType()
export class PaginationModel {
  @Field(() => Int, { nullable: true }) next?: number;
  @Field(() => Int, { nullable: true }) current?: number;
  @Field(() => Int, { nullable: true }) previous?: number;
  @Field(() => Int, { nullable: true }) total?: number;
  @Field(() => Int, { nullable: true }) limit?: number;
  @Field(() => Int, { nullable: true }) index?: number;
}
