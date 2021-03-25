import { UsernamePasswordDto } from "../models/UsernamePasswordDto";

export const validateRegistor = (options: UsernamePasswordDto) => {
  if (options.username.length <= 2) {
    return [{ field: "username", message: "min length 3" }];
  }

  if (options.username.includes("@")) {
    return [{ field: "username", message: "cannot include @" }];
  }

  if (!options.email.includes("@")) {
    return [{ field: "email", message: "invalid email" }];
  }

  if (options.password.length <= 2) {
    return [{ field: "password", message: "min length 3" }];
  }
  return null;
};
