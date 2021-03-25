import { User } from "../entity/user";
import { MyContext } from "../types";
import {
  Field,
  Mutation,
  Arg,
  Resolver,
  Ctx,
  ObjectType,
  Query,
  UseMiddleware,
} from "type-graphql";
import argon from "argon2";
import { COOKIE_NAME, FORGET_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordDto } from "../models/UsernamePasswordDto";
import { validateRegistor } from "../utils/validataRegister";
import { sendMail } from "../utils/sendEmail";
import { v4 } from "uuid";
import { getConnection } from "typeorm";
import { isAuth } from "../middleware/isAuth";

@ObjectType()
class FieldError {
  @Field(() => String)
  field!: string;
  @Field(() => String)
  message!: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true }) errors?: FieldError[];
  @Field(() => User, { nullable: true }) user?: User;
}

@Resolver()
export class UserResolver {
  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ): Promise<Boolean> {
    const user = await User.findOne({ email });
    // const user = await User.findOne({ where: { email } });
    if (!user) {
      return false;
    }

    const token = v4();
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 24 * 3
    );
    sendMail(
      user.email,
      `<a href="http://localhost:3000/change-password/${token}">Reset Password</a>`
    );
    return true;
  }

  @Mutation(() => UserResponse)
  @UseMiddleware(isAuth)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return { errors: [{ field: "newPassword", message: "min length 3" }] };
    }

    const key = FORGET_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);

    if (!userId) {
      return { errors: [{ field: "token", message: "token not valid" }] };
    }

    const user = await User.findOne(Number(userId));

    if (!user) {
      return { errors: [{ field: "token", message: "User not exist" }] };
    }

    const hashedPassword = await argon.hash(newPassword);
    user.password = hashedPassword;
    await User.update(Number(userId), user);

    await redis.del(key);

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordDto,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegistor(options);
    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon.hash(options.password);

    try {
      const user = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          password: hashedPassword,
          email: options.email,
        })
        .returning("*")
        .execute();

      req.session.userId = user.raw.id;

      return { user: user.raw[0] };
    } catch (error) {
      if (error.code === "23505") {
        return {
          errors: [{ field: "username", message: "username already taken" }],
        };
      }
      console.log(error);

      return {
        errors: [{ field: "username", message: "Something wrond" }],
      };
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes("@")
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    );

    if (!user) {
      return {
        errors: [{ field: "usernameOrEmail", message: "User doesnt exist" }],
      };
    }

    const valid = await argon.verify(user.password, password);
    if (!valid) {
      return {
        errors: [{ field: "password", message: "User/Password wrong" }],
      };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext): Promise<Boolean> {
    return new Promise((resolver) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        err ? resolver(false) : resolver(true);
      })
    );
  }

  @Query(() => User, { nullable: true })
  @UseMiddleware(isAuth)
  async me(@Ctx() { req }: MyContext): Promise<User | null> {
    const user = await User.findOne(req.session.userId);

    if (!user) {
      return null;
    }

    return user;
  }
}
