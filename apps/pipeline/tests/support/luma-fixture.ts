// Shapes copied from the real Team1 Luma exports (api.lu.ma/ics/get, fetched 2026-10-12).
export const KOREA_EVENT = [
  'BEGIN:VEVENT',
  'DTSTART:20261017T050000Z',
  'DTEND:20261017T070000Z',
  'DTSTAMP:20261012T141107Z',
  'ORGANIZER;CN="Team1 Korea":MAILTO:calendar-invite@lu.ma',
  'UID:evt-5I3vezpRHD0bJ1z@events.lu.ma',
  'SUMMARY:Univ Connect: Aidenteti Crew',
  'DESCRIPTION:Get up-to-date information at: https://luma.com/f95ppglk\\n\\nAd',
  ' dress:\\n서울용산시제품제작소\\nSeoul\\, South Korea\\n\\nHosted by Te',
  ' am1 Korea\\, Team1 & AidentetiCrew',
  'LOCATION:South Korea\\, Seoul\\, Yongsan District\\, Cheongpa-ro\\, 77 서울용',
  ' 산시제품제작소 2층\\, 3층',
  'GEO:37.533643;126.96031839999999',
  'STATUS:TENTATIVE',
  'END:VEVENT',
]

export const CHILE_EVENT = [
  'BEGIN:VEVENT',
  'DTSTART:20250910T220000Z',
  'DTEND:20250911T000000Z',
  'UID:evt-chile@events.lu.ma',
  'SUMMARY:Avalanche en la UC',
  'DESCRIPTION:Get up-to-date information at: https://luma.com/CampusAvax\\n\\nAddress:\\nCampus San Joaquín\\, Pontificia Universidad Catolica de Chile\\nSala AE 201\\, Ingeniería Comercial\\nMacul\\, Región Metropolitana\\nChile\\n\\nHosted by Fabio & Team1',
  'LOCATION:Campus San Joaquín\\, Av. Vicuña Mackenna 4860\\, Macul\\, Región Metropolitana\\, Chile',
  'GEO:-33.4986;-70.6143',
  'END:VEVENT',
]

export const HIDDEN_ADDRESS_EVENT = [
  'BEGIN:VEVENT',
  'DTSTART:20240517T000000Z',
  'DTEND:20240517T020000Z',
  'ORGANIZER;CN="SamuelTecs":MAILTO:calendar-invite@lu.ma',
  'UID:evt-I6oNgVbP4LzcPbo@events.lu.ma',
  'SUMMARY:Web3 y Blockchain (Avalanche)',
  'DESCRIPTION:Get up-to-date information at: https://luma.com/avax_ags\\n\\nAddress:\\nCheck event page for more details.\\n\\nHosted by SamuelTecs & Team1',
  'LOCATION:https://luma.com/event/evt-I6oNgVbP4LzcPbo',
  'GEO:21.933039017870865;-102.3005998616181',
  'END:VEVENT',
]

export const NO_GEO_EVENT = [
  'BEGIN:VEVENT',
  'DTSTART:20261013T030000Z',
  'DTEND:20261013T060000Z',
  'UID:evt-I8o36tFor58Ln4V@events.lu.ma',
  'SUMMARY:Team1 Vietnam x Greenwich Da Nang: Build on Avalanche',
  'DESCRIPTION:Get up-to-date information at: https://luma.com/9pzuwiju\\n\\nAddress:\\nCheck event page for more details.\\n\\nHosted by Tu Nguyen & Team1',
  'LOCATION:https://luma.com/event/evt-I8o36tFor58Ln4V',
  'END:VEVENT',
]

export function calendar(name: string, ...events: string[][]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Luma//Team1 Korea//EN',
    `X-WR-CALNAME:${name}`,
    ...events.flat(),
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
