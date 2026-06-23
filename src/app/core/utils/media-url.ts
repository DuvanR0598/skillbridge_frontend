import { environment } from '../../../environments/environment';

/**
 * Resuelve la URL de un recurso (ej. avatar) a una URL absoluta.
 *
 * - URLs absolutas (http/https), data: o blob: se devuelven tal cual
 *   (ej. avatar de Google o preview local en base64).
 * - URLs relativas del backend (ej. "/uploads/avatars/x.jpg") se prefijan
 *   con el origen del backend para que el navegador no las resuelva contra
 *   el servidor del frontend.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${environment.apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}
