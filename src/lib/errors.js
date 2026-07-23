const messages = {
  23503:
    "Este item está sendo usado em um agendamento e não pode ser excluído. Prefira desativá-lo.",
  "23P01":
    "Este horário entra em conflito com outro agendamento. Escolha outro período.",
  PGRST116: "O registro não foi encontrado ou você não tem acesso a ele.",
};

export function friendlyError(error) {
  if (messages[error?.code]) return messages[error.code];
  if (error?.message?.includes("Invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (error?.message?.includes("User already registered"))
    return "Já existe uma conta com este e-mail.";
  return "Ocorreu um problema inesperado. Tente novamente.";
}
