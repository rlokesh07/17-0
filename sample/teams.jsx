// teams.jsx — 32 current NFL franchises with ESPN core-API ids, logo abbr, colors.
// Logo: https://a.espncdn.com/i/teamlogos/nfl/500/{abbr}.png
const TEAMS = [
  { id: 22, abbr: 'ari', name: 'Cardinals',   city: 'Arizona',       color: '#97233F' },
  { id: 1,  abbr: 'atl', name: 'Falcons',     city: 'Atlanta',       color: '#A71930' },
  { id: 33, abbr: 'bal', name: 'Ravens',      city: 'Baltimore',     color: '#241773' },
  { id: 2,  abbr: 'buf', name: 'Bills',       city: 'Buffalo',       color: '#00338D' },
  { id: 29, abbr: 'car', name: 'Panthers',    city: 'Carolina',      color: '#0085CA' },
  { id: 3,  abbr: 'chi', name: 'Bears',       city: 'Chicago',       color: '#0B162A' },
  { id: 4,  abbr: 'cin', name: 'Bengals',     city: 'Cincinnati',    color: '#FB4F14' },
  { id: 5,  abbr: 'cle', name: 'Browns',      city: 'Cleveland',     color: '#FF3C00' },
  { id: 6,  abbr: 'dal', name: 'Cowboys',     city: 'Dallas',        color: '#041E42' },
  { id: 7,  abbr: 'den', name: 'Broncos',     city: 'Denver',        color: '#FB4F14' },
  { id: 8,  abbr: 'det', name: 'Lions',       city: 'Detroit',       color: '#0076B6' },
  { id: 9,  abbr: 'gb',  name: 'Packers',     city: 'Green Bay',     color: '#203731' },
  { id: 34, abbr: 'hou', name: 'Texans',      city: 'Houston',       color: '#03202F' },
  { id: 11, abbr: 'ind', name: 'Colts',       city: 'Indianapolis',  color: '#002C5F' },
  { id: 30, abbr: 'jax', name: 'Jaguars',     city: 'Jacksonville',  color: '#006778' },
  { id: 12, abbr: 'kc',  name: 'Chiefs',      city: 'Kansas City',   color: '#E31837' },
  { id: 13, abbr: 'lv',  name: 'Raiders',     city: 'Las Vegas',     color: '#111111' },
  { id: 24, abbr: 'lac', name: 'Chargers',    city: 'Los Angeles',   color: '#0080C6' },
  { id: 14, abbr: 'lar', name: 'Rams',        city: 'Los Angeles',   color: '#003594' },
  { id: 15, abbr: 'mia', name: 'Dolphins',    city: 'Miami',         color: '#008E97' },
  { id: 16, abbr: 'min', name: 'Vikings',     city: 'Minnesota',     color: '#4F2683' },
  { id: 17, abbr: 'ne',  name: 'Patriots',    city: 'New England',   color: '#002244' },
  { id: 18, abbr: 'no',  name: 'Saints',      city: 'New Orleans',   color: '#9F8958' },
  { id: 19, abbr: 'nyg', name: 'Giants',      city: 'New York',      color: '#0B2265' },
  { id: 20, abbr: 'nyj', name: 'Jets',        city: 'New York',      color: '#125740' },
  { id: 21, abbr: 'phi', name: 'Eagles',      city: 'Philadelphia',  color: '#004C54' },
  { id: 23, abbr: 'pit', name: 'Steelers',    city: 'Pittsburgh',    color: '#FFB612' },
  { id: 25, abbr: 'sf',  name: '49ers',       city: 'San Francisco', color: '#AA0000' },
  { id: 26, abbr: 'sea', name: 'Seahawks',    city: 'Seattle',       color: '#69BE28' },
  { id: 27, abbr: 'tb',  name: 'Buccaneers',  city: 'Tampa Bay',     color: '#D50A0A' },
  { id: 10, abbr: 'ten', name: 'Titans',      city: 'Tennessee',     color: '#4B92DB' },
  { id: 28, abbr: 'wsh', name: 'Commanders',  city: 'Washington',    color: '#5A1414' },
];
const TEAM_BY_ID = Object.fromEntries(TEAMS.map(t => [t.id, t]));
const logoUrl = (abbr) => `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`;

const MIN_YEAR = 1999;
const MAX_YEAR = 2025;
const YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);

Object.assign(window, { TEAMS, TEAM_BY_ID, logoUrl, YEARS, MIN_YEAR, MAX_YEAR });
