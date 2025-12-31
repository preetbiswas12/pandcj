;(async () => {
  try {
    const url = 'http://localhost:3000/api/auth/login'
    const payload = { email: 'pandcjewellery@gmail.com', password: 'preetb121106' }
    const fetchFn = global.fetch || (await import('node-fetch')).default
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    console.log('LOGIN STATUS', res.status)
    const setCookie = res.headers.get ? res.headers.get('set-cookie') : (res.headers && res.headers['set-cookie'])
    console.log('SET-COOKIE:', setCookie)

    if (!setCookie) {
      console.error('No Set-Cookie from login, aborting follow-up request')
      process.exit(1)
    }

    // extract cookie token (whole cookie string is fine)
    const cookieHeader = setCookie.split(';')[0]

    // call an admin-protected endpoint
    const adminUrl = 'http://localhost:3000/api/admin/stores'
    const follow = await fetchFn(adminUrl, {
      method: 'GET',
      headers: { Cookie: cookieHeader },
    })
    console.log('ADMIN GET STATUS', follow.status)
    const text = await follow.text()
    try { console.log('ADMIN BODY', JSON.parse(text)) } catch (e) { console.log('ADMIN BODY', text) }
  } catch (err) {
    console.error('ERROR:', err && err.message ? err.message : err)
    process.exit(2)
  }
})()
