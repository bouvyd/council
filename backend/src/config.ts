const rawClientOrigin = process.env.CLIENT_ORIGIN ?? "*";
const nodeEnv = process.env.NODE_ENV ?? "development";

export const IS_DEV = nodeEnv !== "production";
export const DEV_DEFAULT_ROOM_ID = IS_DEV ? (process.env.DEV_DEFAULT_ROOM_ID ?? "test").trim().toLowerCase() : null;

export const CLIENT_ORIGIN =
	rawClientOrigin === "*"
		? true
		: rawClientOrigin
				.split(",")
				.map((value) => value.trim())
				.filter(Boolean);

export const PORT = Number(process.env.PORT ?? 3001);
