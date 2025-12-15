/**
 * Normaliza una URL codificando caracteres especiales en el path
 * mientras preserva el protocolo y dominio intactos
 *
 * @param {string} url - La URL a normalizar
 * @returns {string} - La URL normalizada con caracteres especiales codificados
 *
 * @example
 * normalizeDocumentUrl('https://example.com/docs/file (1).pdf')
 * // returns 'https://example.com/docs/file%20(1).pdf'
 */
function normalizeDocumentUrl(url) {
  if (!url || typeof url !== 'string') {
    return url;
  }

  try {
    // Separar protocolo, host y path
    const urlMatch = url.match(/^(https?:\/\/[^\/]+)(\/.*)?$/i);

    if (!urlMatch) {
      // Si no coincide con el patrón esperado, devolver la URL original
      return url;
    }

    const baseUrl = urlMatch[1]; // protocolo + dominio
    const path = urlMatch[2] || ''; // path (puede estar vacío)

    if (!path) {
      return baseUrl;
    }

    // Codificar el path manteniendo los slashes
    // Dividir por / y codificar cada segmento
    const encodedPath = path
      .split('/')
      .map(segment => {
        // Si el segmento está vacío (por ejemplo, doble slash), mantenerlo
        if (!segment) return segment;

        // Intentar decodificar primero en caso de que ya esté parcialmente codificado
        try {
          segment = decodeURIComponent(segment);
        } catch (e) {
          // Si falla el decode, usar el segmento tal cual
        }

        // Codificar el segmento
        return encodeURIComponent(segment);
      })
      .join('/');

    return baseUrl + encodedPath;
  } catch (error) {
    // Si algo falla, devolver la URL original
    return url;
  }
}

/**
 * Normaliza un array de documentos codificando sus URLs
 *
 * @param {Array} documentos - Array de objetos de documentos
 * @returns {Array} - Array con URLs normalizadas
 */
function normalizeDocumentUrls(documentos) {
  if (!Array.isArray(documentos)) {
    return documentos;
  }

  return documentos.map(doc => {
    if (doc && doc.url) {
      return {
        ...doc,
        url: normalizeDocumentUrl(doc.url)
      };
    }
    return doc;
  });
}

module.exports = {
  normalizeDocumentUrl,
  normalizeDocumentUrls
};
