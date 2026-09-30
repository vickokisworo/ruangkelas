const KNOWN_ERRORS = {
  'Invalid login credentials': 'Email atau kata sandi salah.',
  'User already registered': 'Email ini sudah terdaftar. Coba masuk saja.',
}

export function toFriendlyErrorMessage(error) {
  if (!error) return ''
  return KNOWN_ERRORS[error.message] ?? error.message
}
