import { describe, expect, test } from "bun:test";
import { userUploadKey } from "./uploads";

describe("userUploadKey", () => {
  test("prefixes the object key with the user id", () => {
    expect(userUploadKey("user_1", "photo.png")).toBe("user_1/photo.png");
  });

  test("strips forward slashes so a filename cannot climb out of the prefix", () => {
    expect(userUploadKey("user_1", "../../user_2/secret.pdf")).toBe(
      "user_1/.._.._user_2_secret.pdf"
    );
  });

  test("strips backslashes the same way", () => {
    expect(userUploadKey("user_1", "..\\..\\user_2\\secret.pdf")).toBe(
      "user_1/.._.._user_2_secret.pdf"
    );
  });

  test("never emits a separator inside the filename part", () => {
    const hostile = ["a/b/c", "a\\b\\c", "/absolute", "\\\\unc\\path", ".././../x"];
    for (const filename of hostile) {
      const key = userUploadKey("user_1", filename);
      const [prefix, ...rest] = key.split("/");
      expect(prefix).toBe("user_1");
      expect(rest).toHaveLength(1);
      expect(rest[0]).not.toContain("\\");
    }
  });
});
