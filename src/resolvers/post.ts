import { Post } from "../entity/post";
import { MyContext } from "../types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { isAuth } from "../middleware/isAuth";
import { getConnection } from "typeorm";
import PaginationResponse from "../models/pagination";
import { pagination } from "../utils/pagination";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PostsResponse extends PaginationResponse(Post) {}

@Resolver()
export class PostResolver {
  @Query(() => PostsResponse)
  @UseMiddleware(isAuth)
  async posts(
    @Arg("limit", () => Int, { defaultValue: 10, nullable: true })
    limit: number,
    @Arg("index", () => Int, { defaultValue: 1, nullable: true })
    index: number
  ): Promise<PostsResponse> {
    // return Post.find();
    const qb = getConnection()
      .getRepository(Post)
      .createQueryBuilder("p")
      .orderBy('"createdAt"', "DESC");

    return pagination<Post>(qb, index, limit);
  }

  @Query(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async post(
    @Arg("id", () => Int) id: number,
    @Ctx() {}: MyContext
  ): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post | undefined> {
    return Post.create({ ...input, userId: req.session.userId }).save();
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id") id: number,
    @Arg("title", () => String, { nullable: true }) title: string,
    @Ctx() {}: MyContext
  ): Promise<Post | null> {
    const data = await Post.findOne(id);
    if (!data) {
      return null;
    }

    if (title !== undefined) {
      await Post.update(id, { title });
    }

    return data;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id") id: number,
    @Ctx() {}: MyContext
  ): Promise<boolean> {
    await Post.delete(id);
    return true;
  }
}
