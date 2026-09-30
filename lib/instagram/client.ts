import "server-only";
import { getCredentials } from "./credentials";
import { InstagramError } from "./errors";
interface Page<T> {
  data: T[];
  paging?: { next?: string; cursors?: { after?: string } };
}
export class InstagramClient {
  private credentials = getCredentials();
  readonly accountId = this.credentials.accountId;
  private deadline = Date.now() + 250_000;
  async request<T>(path: string, params: Record<string, string>): Promise<T> {
    if (Date.now() >= this.deadline)
      throw new InstagramError(
        "PAGINATION",
        "A importação excedeu o tempo disponível. Nenhuma lista parcial foi utilizada. Tente novamente.",
        504,
      );
    const url = new URL(
      `https://graph.instagram.com/${this.credentials.version}/${path}`,
    );
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.credentials.token}` },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(
          Math.min(20_000, this.deadline - Date.now()),
        ),
      });
    } catch {
      throw new InstagramError(
        "UNAVAILABLE",
        "A API da Meta está indisponível ou demorou para responder. Tente novamente.",
        503,
      );
    }
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.error) {
      const code = body?.error?.code;
      if (code === 190 || response.status === 401)
        throw new InstagramError(
          "TOKEN",
          "O token expirou ou é inválido. Atualize o token no servidor.",
          401,
        );
      if ([4, 17, 32, 613, 80002].includes(code) || response.status === 429)
        throw new InstagramError(
          "RATE_LIMIT",
          "Limite de consultas da Meta atingido. Aguarde antes de tentar novamente.",
          429,
        );
      if ([10, 200].includes(code) || response.status === 403)
        throw new InstagramError(
          "PERMISSION",
          "A Meta negou acesso. Confira as permissões e a conta vinculada ao token.",
          403,
        );
      throw new InstagramError(
        "UNAVAILABLE",
        "Não foi possível consultar a Meta. Confira a versão da API e tente novamente.",
        502,
      );
    }
    return body as T;
  }
  async *pages<T>(path: string, fields: string): AsyncGenerator<T[]> {
    const cursors = new Set<string>();
    let after: string | undefined;
    do {
      let page: Page<T>;
      try {
        page = await this.request<Page<T>>(path, {
          fields,
          limit: "50",
          ...(after ? { after } : {}),
        });
      } catch (error) {
        if (
          after &&
          error instanceof InstagramError &&
          error.code === "UNAVAILABLE"
        )
          throw new InstagramError(
            "PAGINATION",
            "Erro ao carregar uma página. A lista incompleta foi descartada. Tente novamente.",
          );
        throw error;
      }
      if (!page || !Array.isArray(page.data))
        throw new InstagramError(
          "PAGINATION",
          "A Meta retornou uma página inválida. A importação foi descartada.",
        );
      yield page.data;
      if (!page.paging?.next) return;
      after = page.paging.cursors?.after;
      if (!after || cursors.has(after))
        throw new InstagramError(
          "PAGINATION",
          "A paginação da Meta não avançou. A lista incompleta foi descartada.",
        );
      cursors.add(after);
    } while (after);
  }
}
