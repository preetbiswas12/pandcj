import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

export async function POST(req) {
  try {
    const body = await req.json()
    // accept either `filename` or `name` from various callers
    const { filename, name, data } = body || {}
    const resolvedFilename = filename || name

    if (!resolvedFilename || !data) {
      return new Response(JSON.stringify({ error: 'filename (or name) and data are required' }), { status: 400 })
    }

    // Data may be a data URL like 'data:image/png;base64,...'
    const matches = data.match(/^data:(image\/\w+);base64,(.+)$/)
    let buffer
    let mimeType = 'application/octet-stream'
    let base64Data = null
    if (matches) {
      mimeType = matches[1]
      base64Data = matches[2]
      buffer = Buffer.from(base64Data, 'base64')
    } else {
      // assume raw base64
      base64Data = data
      buffer = Buffer.from(data, 'base64')
    }

    const safeName = String(resolvedFilename).replace(/[^a-zA-Z0-9._-]/g, '_')

    // If Cloudinary is configured, attempt a signed server upload and return the secure URL.
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || ''
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    if (cloudName && apiKey && apiSecret) {
      try {
        const fileField = `data:${mimeType};base64,${base64Data}`

        // Build public_id without slashes (Cloudinary 'display name' may reject slashes).
        // Extract filename without extension
        const baseName = path.parse(safeName).name
        // Sanitize baseName: ONLY alphanumeric, dash, underscore (no dots, no slashes, no special chars)
        const sanitizedBaseName = baseName
          .replace(/[^a-zA-Z0-9_-]/g, '_')  // Replace ALL special chars (including dots) with underscore
          .replace(/_{2,}/g, '_')  // Collapse multiple underscores into one
          .replace(/^_+|_+$/g, '')  // Remove leading/trailing underscores
        
        const rawUserFolder = (body && body.userId) ? String(body.userId) : (process.env.DEFAULT_SELLER_ID ? String(process.env.DEFAULT_SELLER_ID) : null)
        // Sanitize userFolder to safe characters
        const userFolder = rawUserFolder 
          ? rawUserFolder.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '')
          : null
        
        // Use timestamp for uniqueness, avoid folder paths
        const timestamp = Math.floor(Date.now() / 1000)
        const publicId = `store_${timestamp}_${sanitizedBaseName}`

        // Collect params to sign (only non-empty, and exclude api_key and file)
        const paramsToSign = {}
        paramsToSign.timestamp = timestamp
        if (uploadPreset) paramsToSign.upload_preset = uploadPreset
        if (publicId) paramsToSign.public_id = publicId

        // Create the string to sign: keys sorted alphabetically
        const keys = Object.keys(paramsToSign).sort()
        const toSign = keys.map(k => `${k}=${paramsToSign[k]}`).join('&')
        const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')

        const form = new FormData()
        form.append('file', fileField)
        form.append('api_key', apiKey)
        form.append('timestamp', String(timestamp))
        form.append('signature', signature)
        form.append('public_id', publicId)
        if (uploadPreset) form.append('upload_preset', uploadPreset)

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: form,
        })

        if (!res.ok) {
          const text = await res.text()
          console.error('Cloudinary upload failed', res.status, text)
          try {
            const errorBody = JSON.parse(text)
            return new Response(JSON.stringify({ error: errorBody }), { status: res.status })
          } catch {
            return new Response(JSON.stringify({ error: { message: text } }), { status: res.status })
          }
        } else {
          const bodyJson = await res.json()
          // include the dataUrl for clients that want an immediate preview; primary preview should use `url`
          return new Response(JSON.stringify({ url: bodyJson.secure_url, provider: 'cloudinary', raw: bodyJson, dataUrl: `data:${mimeType};base64,${base64Data}` }), { status: 201 })
        }
      } catch (cloudErr) {
        console.error('Cloudinary upload error', cloudErr)
        // continue to fallback
      }
    } else {
      // Cloudinary not fully configured for signed uploads
      // console.debug('Cloudinary not configured for signed uploads')
    }

    // Fallback: try writing to public/uploads, then /tmp if necessary.
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    try {
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
      const filePath = path.join(uploadsDir, safeName)
      fs.writeFileSync(filePath, buffer)
      const publicUrl = `/uploads/${safeName}`
      return new Response(JSON.stringify({ url: publicUrl, dataUrl: `data:${mimeType};base64,${base64Data}` }), { status: 201 })
    } catch (err) {
      // If filesystem is read-only, fall back to tmp dir
      if (err && err.code === 'EROFS') {
        try {
          const tmpDir = path.join(os.tmpdir(), 'pandc-uploads')
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
          const tmpPath = path.join(tmpDir, safeName)
          fs.writeFileSync(tmpPath, buffer)
          // Return the original data URL for client-side preview / re-upload
          const dataUrl = `data:${mimeType};base64,${base64Data}`
          return new Response(JSON.stringify({ url: null, tempPath: tmpPath, dataUrl }), { status: 201 })
        } catch (tmpErr) {
          console.error('Failed to write to tmp dir', tmpErr)
          return new Response(JSON.stringify({ error: 'Upload failed (tmp)' }), { status: 500 })
        }
      }
      throw err
    }
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 })
  }
}
