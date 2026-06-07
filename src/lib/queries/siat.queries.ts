import { gql } from '../graphql';

const SEARCH_CODIGOS_SIAT = `
  query SearchCodigosSiat($contains: String!) {
    codigosSiat(where: {
      or: [
        { codigoProducto: { contains: $contains } }
        { descripcionProducto: { contains: $contains } }
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
  if (q.length < 2) return [];
  const data = await gql<CodigosSiatResponse>(SEARCH_CODIGOS_SIAT, { contains: q });
  return data.codigosSiat.nodes;
}
