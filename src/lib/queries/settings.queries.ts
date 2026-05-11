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

export const GET_ME = `
  query Me {
    me {
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
