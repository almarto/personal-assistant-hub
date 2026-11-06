const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export function isStrongPassword(password: string) {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

// Uniform integer in [0, max) from the Web Crypto API; rejection sampling avoids modulo bias.
function secureRandomInt(max: number) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

function pickRandom(characters: string) {
  return characters[secureRandomInt(characters.length)];
}

export function generatePassword() {
  const length = 12;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one of each required type, then fill the rest
  const characters = [pickRandom(uppercase), pickRandom(lowercase), pickRandom(numbers)];
  while (characters.length < length) {
    characters.push(pickRandom(allChars));
  }

  // Fisher-Yates shuffle
  for (let i = characters.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }

  return characters.join("");
}
