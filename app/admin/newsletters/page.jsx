'use client'
import { useEffect, useState } from 'react'

export default function AdminNewslettersPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetch('/api/admin/newsletters')
      .then(r => r.json())
      .then(data => { if (mounted) setList(data || []) })
      .catch(() => { if (mounted) setList([]) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Newsletter Subscribers</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <div className="p-4 border-b">
            <p className="text-sm text-slate-600">Total subscribers: <strong>{list.length}</strong></p>
          </div>
          <div className="p-4">
            {list.length === 0 ? (
              <p className="text-slate-500">No subscribers yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-600 border-b">
                    <th className="py-2">Email</th>
                    <th className="py-2">Subscribed At</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3">{item.email}</td>
                      <td className="py-3 text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
