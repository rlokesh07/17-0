// teams.jsx — 32 franchises (name + color for wheel segments and badges).

const TEAMS = [
  { id: 22, abbr: 'ari', name: 'Cardinals', color: '#97233F' },
  { id: 1, abbr: 'atl', name: 'Falcons', color: '#A71930' },
  { id: 33, abbr: 'bal', name: 'Ravens', color: '#241773' },
  { id: 2, abbr: 'buf', name: 'Bills', color: '#00338D' },
  { id: 29, abbr: 'car', name: 'Panthers', color: '#0085CA' },
  { id: 3, abbr: 'chi', name: 'Bears', color: '#0B162A' },
  { id: 4, abbr: 'cin', name: 'Bengals', color: '#FB4F14' },
  { id: 5, abbr: 'cle', name: 'Browns', color: '#FF3C00' },
  { id: 6, abbr: 'dal', name: 'Cowboys', color: '#041E42' },
  { id: 7, abbr: 'den', name: 'Broncos', color: '#FB4F14' },
  { id: 8, abbr: 'det', name: 'Lions', color: '#0076B6' },
  { id: 9, abbr: 'gb', name: 'Packers', color: '#203731' },
  { id: 34, abbr: 'hou', name: 'Texans', color: '#03202F' },
  { id: 11, abbr: 'ind', name: 'Colts', color: '#002C5F' },
  { id: 30, abbr: 'jax', name: 'Jaguars', color: '#006778' },
  { id: 12, abbr: 'kc', name: 'Chiefs', color: '#E31837' },
  { id: 13, abbr: 'lv', name: 'Raiders', color: '#111111' },
  { id: 24, abbr: 'lac', name: 'Chargers', color: '#0080C6' },
  { id: 14, abbr: 'lar', name: 'Rams', color: '#003594' },
  { id: 15, abbr: 'mia', name: 'Dolphins', color: '#008E97' },
  { id: 16, abbr: 'min', name: 'Vikings', color: '#4F2683' },
  { id: 17, abbr: 'ne', name: 'Patriots', color: '#002244' },
  { id: 18, abbr: 'no', name: 'Saints', color: '#9F8958' },
  { id: 19, abbr: 'nyg', name: 'Giants', color: '#0B2265' },
  { id: 20, abbr: 'nyj', name: 'Jets', color: '#125740' },
  { id: 21, abbr: 'phi', name: 'Eagles', color: '#004C54' },
  { id: 23, abbr: 'pit', name: 'Steelers', color: '#FFB612' },
  { id: 25, abbr: 'sf', name: '49ers', color: '#AA0000' },
  { id: 26, abbr: 'sea', name: 'Seahawks', color: '#69BE28' },
  { id: 27, abbr: 'tb', name: 'Buccaneers', color: '#D50A0A' },
  { id: 10, abbr: 'ten', name: 'Titans', color: '#4B92DB' },
  { id: 28, abbr: 'wsh', name: 'Commanders', color: '#5A1414' },
];

const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t]));

const MIN_YEAR = 1999;
const MAX_YEAR = 2025;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);

Object.assign(window, { TEAMS, TEAM_BY_ID, YEARS, MIN_YEAR, MAX_YEAR });
