const rawClientOrigin = process.env.CLIENT_ORIGIN ?? "*";

export const CLIENT_ORIGIN =
	rawClientOrigin === "*"
		? true
		: rawClientOrigin
				.split(",")
				.map((value) => value.trim())
				.filter(Boolean);

export const PORT = Number(process.env.PORT ?? 3001);
