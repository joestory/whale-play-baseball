'use client'

import { useEffect, useState } from 'react'

function format(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0 }
  const s = Math.floor(ms / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}

export default function Countdown({ target }: { target: string }) {
  const [ms, setMs] = useState(() => new Date(target).getTime() - Date.now())

  useEffect(() => {
    const id = setInterval(() => setMs(new Date(target).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])

  if (ms <= 0) return <p className="text-lg font-bold text-green-400">Draft is open!</p>

  const { d, h, m, s } = format(ms)

  return (
    <div className="flex justify-center gap-4">
      {[
        { value: d, label: 'days' },
        { value: h, label: 'hrs' },
        { value: m, label: 'min' },
        { value: s, label: 'sec' },
      ].map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <span className="text-3xl font-bold text-white tabular-nums w-14 text-center">
            {String(value).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{label}</span>
        </div>
      ))}
    </div>
  )
}
