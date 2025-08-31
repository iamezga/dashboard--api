import dayjs from 'dayjs'
import formatParser from 'dayjs/plugin/customParseFormat'
import isoWeek from 'dayjs/plugin/isoWeek'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(isoWeek)
dayjs.extend(formatParser)
dayjs.extend(utc)
dayjs.extend(timezone)
const extended = dayjs
export { extended as dayjs }
export type Dayjs = typeof dayjs
