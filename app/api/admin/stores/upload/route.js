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
        // Convert base64 buffer to proper Blob for Cloudinary
        const blob = new Blob([buffer], { type: mimeType })

        // Build public_id without slashes (Cloudinary 'display name' may reject slashes).
        // Extract filename without extension - use basename to avoid any path components
        const baseName = path.basename(safeName, path.extname(safeName))
        
        // Sanitize baseName: ONLY alphanumeric, dash, underscore (no dots, no slashes, no special chars)
        const sanitizedBaseName = baseName
          .replace(/\\/g, '_')  // Remove backslashes first (Windows paths)
          .replace(/\//g, '_')  // Remove forward slashes
          .replace(/[^a-zA-Z0-9_-]/g, '_')  // Replace ALL special chars (including dots) with underscore
          .replace(/_{2,}/g, '_')  // Collapse multiple underscores into one
          .replace(/^_+|_+$/g, '')  // Remove leading/trailing underscores
        
        // Use timestamp for uniqueness, avoid folder paths - no userFolder in public_id
        const timestamp = Math.floor(Date.now() / 1000)
        const publicId = `product_${timestamp}_${sanitizedBaseName}`
        
        // Final safety check - ensure absolutely no slashes
        if (publicId.includes('/') || publicId.includes('\\')) {
          throw new Error('Invalid filename: contains path separators after sanitization')
        }
        
        console.log('Cloudinary upload - public_id:', publicId)

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
        form.append('file', blob)
        form.append('api_key', apiKey)
        form.append('timestamp', String(timestamp))
        form.append('signature', signature)
        form.append('public_id', publicId)
        if (uploadPreset) form.append('upload_preset', uploadPreset)

        // Fetch with timeout to Cloudinary
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 12000) // 12s timeout for Cloudinary
        
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: form,
          signal: controller.signal,
        })

        clearTimeout(timeout)

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
          // Only return essential fields to avoid response size issues
          const responseBody = JSON.stringify({ 
            url: bodyJson.secure_url,
            provider: 'cloudinary'
          })
          return new Response(responseBody, { 
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      } catch (cloudErr) {
        console.error('Cloudinary upload error', cloudErr.message || cloudErr)
        // If it's our validation error, return it immediately
        if (cloudErr.message && cloudErr.message.includes('Invalid filename')) {
          return new Response(JSON.stringify({ error: { message: cloudErr.message } }), { status: 400 })
        }
        // If it's an abort error (timeout), return timeout error
        if (cloudErr.name === 'AbortError') {
          return new Response(JSON.stringify({ error: { message: 'Upload timeout - please try again' } }), { status: 408 })
        }
        // Otherwise continue to fallback
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
      return new Response(JSON.stringify({ url: publicUrl }), { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (err) {
      // If filesystem is read-only, fall back to tmp dir
      if (err && err.code === 'EROFS') {
        try {
          const tmpDir = path.join(os.tmpdir(), 'pandc-uploads')
          if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
          const tmpPath = path.join(tmpDir, safeName)
          fs.writeFileSync(tmpPath, buffer)
          // Return a minimal response
          return new Response(JSON.stringify({ url: tmpPath }), { 
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          })
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
