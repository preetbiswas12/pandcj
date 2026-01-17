import { cookies } from 'next/headers'

export async function POST(req) {
  try {
    // Clear the session cookie
    const cookie = `pandc_user_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { 'Set-Cookie': cookie }
      }
    )
  } catch (err) {
    console.error('Logout error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Logout failed' }), { status: 500 })
  }
}

export async function GET() {
  return new Response(JSON.stringify({ message: 'POST only' }), { status: 405 })
}
