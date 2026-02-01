export default defineEventHandler(() => {
	const runtimeConfig = useRuntimeConfig();
	const databaseConfigured = Boolean(
		runtimeConfig.databaseUrl ||
			process.env.DATABASE_URL ||
			process.env.NUXT_DATABASE_URL,
	);

	return {
		ok: true,
		databaseConfigured,
		vercel: Boolean(process.env.VERCEL),
	};
});
