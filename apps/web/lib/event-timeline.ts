import { calendarDay } from './editorial-discovery'

export function groupTimelineEvents<T extends {id:string;startsAt:string;endsAt:string|null}>(events:T[], target:string):[string,T[]][] {
  const groups=new Map<string,T[]>([[target,[]]])
  for(const event of events) {
    const start=calendarDay(event.startsAt)
    const items=groups.get(start)??[]
    items.push(event);groups.set(start,items)
    if(start<target && calendarDay(event.endsAt??event.startsAt)>=target) groups.get(target)!.push(event)
  }
  return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([date,items])=>[date,items.sort((a,b)=>a.startsAt.localeCompare(b.startsAt))])
}
