// Executado somente pelo Node; não é importado pela aplicação client-side.
const { META_ACCESS_TOKEN: token, META_API_VERSION: version } = process.env;
if (!token || !/^v\d+\.0$/.test(version ?? "")) {
  console.error("Preencha META_ACCESS_TOKEN e META_API_VERSION em .env.local.");
  process.exit(1);
}
try {
  const response = await fetch(
    `https://graph.instagram.com/${version}/me?fields=user_id,username`,
    {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    },
  );
  const body = await response.json();
  if (!response.ok || body.error || !body.user_id) {
    console.error(
      "A Meta não confirmou a conta. Confira o token Instagram Login, a versão e as permissões. HTTP:",
      response.status,
    );
    process.exit(1);
  }
  console.log("Conta autenticada:", body.username);
  console.log("INSTAGRAM_ACCOUNT_ID=" + body.user_id);
  if (
    process.env.INSTAGRAM_ACCOUNT_ID &&
    process.env.INSTAGRAM_ACCOUNT_ID !== String(body.user_id)
  ) {
    console.error(
      "O ID configurado difere do ID desta conta. Corrija .env.local antes de importar.",
    );
    process.exitCode = 1;
  }
} catch {
  console.error(
    "Não foi possível consultar a Meta. Confira a conexão e tente novamente.",
  );
  process.exitCode = 1;
}
