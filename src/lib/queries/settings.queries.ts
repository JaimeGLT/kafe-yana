export const GET_USUARIOS = `
  query GetUsuarios {
    usuarios {
      nombre
      apellido
      userName
      rol
      email
      celular
      estado
    }
  }
`;
