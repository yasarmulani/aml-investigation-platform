const BASE = import.meta.env.VITE_API_URL || ''

export const api = {
  get: async (path) => {
    const r = await fetch(BASE + path)
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
    return r.json()
  },
  post: async (path, body) => {
    const r = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
    return r.json()
  }
}
