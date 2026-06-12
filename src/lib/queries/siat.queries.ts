import { gql } from '../graphql';

const SEARCH_CODIGOS_SIAT = `
  query SearchCodigosSiat($contains: String!) {
    codigosSiat(where: {
      or: [
        { codigoProducto: { contains: $contains } }
        { descripcionProducto: { contains: $contains } }
        { descripcionActividad: { contains: $contains } }
      ]
    }) {
      nodes {
        id
        codigoProducto
        descripcionProducto
        descripcionActividad
      }
    }
  }
`;

export interface CodigoSiatNode {
  id: number;
  codigoProducto: string;
  descripcionProducto: string;
  descripcionActividad: string;
}

interface CodigosSiatResponse {
  codigosSiat: { nodes: CodigoSiatNode[] };
}

export async function searchCodigosSiat(q: string): Promise<CodigoSiatNode[]> {
  // Sin filtro en el frontend: con `contains: ""` el backend devuelve todos los códigos.
  // El catálogo es chico (11 códigos), así que no hace falta paginar ni exigir mínimo de caracteres.
  const data = await gql<CodigosSiatResponse>(SEARCH_CODIGOS_SIAT, { contains: q });
  return data.codigosSiat.nodes;
}
