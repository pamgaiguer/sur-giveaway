import "server-only";
import { InstagramError } from "./errors";
export function getCredentials() {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const version = process.env.META_API_VERSION;
  if (
    !token ||
    !accountId ||
    !version ||
    !/^v\d+\.0$/.test(version) ||
    !/^\d+$/.test(accountId)
  )
    throw new InstagramError(
      "CONFIGURATION",
      "Integração pendente. Configure as credenciais e a versão da API no servidor.",
      503,
    );
  return { token, accountId, version };
}
