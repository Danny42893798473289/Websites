/** Standard 6-player setup */
export const STANDARD_ROLES = [
  'werewolf',
  'werewolf',
  'seer',
  'witch',
  'villager',
  'villager',
];

export const ROLE_LABELS = {
  werewolf: 'Werewolf',
  seer: 'Seer',
  witch: 'Witch',
  villager: 'Villager',
};

export function isWerewolf(role) {
  return role === 'werewolf';
}

export function isGood(role) {
  return !isWerewolf(role);
}

export function alignmentForSeer(role) {
  return isWerewolf(role) ? 'werewolf' : 'good';
}

export function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
